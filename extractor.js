// This function is serialized and injected into the documentation page via
// chrome.scripting.executeScript. It must be self-contained (no imports, no
// references to popup-scope variables) and return only JSON-serializable data.
//
// Returns: { ok, title, url, sections: [{ level, title, html }], error }

export function extractPageSections() {
  try {
    const SKIP = new Set([
      "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "NAV", "ASIDE",
      "FOOTER", "HEADER", "FORM",
    ]);
    const SKIP_SELECTORS = [
      "nav", "aside", "footer", "header",
      "[role=navigation]", "[role=banner]", "[role=contentinfo]",
      ".sidebar", ".toc", ".table-of-contents", ".breadcrumb", ".breadcrumbs",
      ".navbar", ".site-header", ".site-footer", ".edit-page", ".pagination",
      ".pager", ".next-prev", ".feedback", ".advertisement", ".ad",
      "[aria-hidden=true]",
    ];

    // 1. Pick the most content-rich candidate container.
    const candidateSelectors = [
      "main article", "article", "main", "[role=main]",
      ".markdown-body", ".markdown", ".md-content", ".doc-content",
      ".documentation", ".content", "#content", ".document", ".rst-content",
      ".prose", "#main-content",
    ];
    let root = null;
    let best = 0;
    for (const sel of candidateSelectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const len = (el.innerText || "").trim().length;
        if (len > best) {
          best = len;
          root = el;
        }
      });
    }
    if (!root || best < 100) root = document.body;

    // 2. Clone and strip noise.
    const clone = root.cloneNode(true);
    SKIP_SELECTORS.forEach((sel) => {
      clone.querySelectorAll(sel).forEach((el) => el.remove());
    });
    clone.querySelectorAll("script, style, noscript, template, button").forEach(
      (el) => el.remove()
    );

    // 3. Resolve relative URLs to absolute so links/images survive offline.
    clone.querySelectorAll("a[href]").forEach((a) => {
      try { a.setAttribute("href", new URL(a.getAttribute("href"), location.href).href); } catch (e) {}
    });
    clone.querySelectorAll("img[src]").forEach((img) => {
      try { img.setAttribute("src", new URL(img.getAttribute("src"), location.href).href); } catch (e) {}
      // prefer data-src lazy images
      const ds = img.getAttribute("data-src");
      if (ds) { try { img.setAttribute("src", new URL(ds, location.href).href); } catch (e) {} }
    });

    const pageTitle =
      (document.querySelector("h1") && document.querySelector("h1").innerText.trim()) ||
      document.title ||
      "Documentation";

    // 4. Flatten the tree into an ordered stream of blocks. Real docs nest
    //    their headings inside wrapper <div>/<section> elements, so we descend
    //    into any wrapper that contains an H1/H2 boundary; everything else is
    //    kept whole as a content block.
    const BOUNDARY = new Set(["H1", "H2"]);

    const containsBoundary = (el) =>
      typeof el.querySelector === "function" && el.querySelector("h1, h2") !== null;

    const stream = [];
    const flatten = (container) => {
      Array.from(container.childNodes).forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (SKIP.has(node.tagName)) return;
          if (BOUNDARY.has(node.tagName)) {
            stream.push(node);
          } else if (containsBoundary(node)) {
            flatten(node); // descend to surface the nested headings
          } else {
            stream.push(node); // self-contained content block (kept whole)
          }
        } else if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
          stream.push(node);
        }
      });
    };
    flatten(clone);

    // 5. Segment the stream on each H1/H2 boundary.
    const sections = [];
    let current = { level: 0, title: "Overview", nodes: [] };
    const pushCurrent = () => {
      const html = current.nodes.map((n) => n.outerHTML || n.textContent || "").join("");
      if (html.replace(/\s+/g, "").length > 0) {
        sections.push({ level: current.level, title: current.title, html });
      }
    };

    stream.forEach((node) => {
      const isHeading =
        node.nodeType === Node.ELEMENT_NODE && BOUNDARY.has(node.tagName);
      if (isHeading) {
        pushCurrent();
        current = {
          level: Number(node.tagName[1]),
          title: (node.textContent || "Section").trim().replace(/\s+/g, " "),
          nodes: [],
        };
      } else {
        current.nodes.push(node);
      }
    });
    pushCurrent();

    // If nothing split (e.g. headings nested deeper), fall back to one section.
    if (sections.length === 0) {
      sections.push({ level: 1, title: pageTitle, html: clone.innerHTML });
    }

    return {
      ok: true,
      title: pageTitle,
      url: location.href,
      sections,
    };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}
