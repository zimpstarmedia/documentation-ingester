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
    // Noise to strip from inside the chosen content root. Uses case-insensitive
    // attribute matching so it survives the varied class names of React/Vue doc
    // apps (Sidebar, sideBar, TableOfContents, toc, etc.).
    const SKIP_SELECTORS = [
      "nav", "aside", "footer", "header", "script", "style", "noscript",
      "template", "button", "form", "iframe", "svg",
      "[role=navigation]", "[role=banner]", "[role=contentinfo]",
      "[role=search]", "[role=tablist]", "[aria-hidden=true]", "[hidden]",
      // Sidebars / menus (clearly navigational substrings).
      '[class*="sidebar" i]', '[class*="side-nav" i]', '[class*="sidenav" i]',
      '[class*="navbar" i]', '[class*="navmenu" i]', '[class*="nav-menu" i]',
      '[class*="breadcrumb" i]', '[class*="pagination" i]',
      // Table-of-contents (avoid matching "protocol": use exact class token).
      '[class*="table-of-contents" i]', '[class*="tableofcontents" i]',
      '[class*="on-this-page" i]', '[class*="onthispage" i]', '[class~="toc" i]',
      // Chrome only — site furniture.
      '[class*="topbar" i]', '[class*="cookie" i]', '[class*="feedback" i]',
      '[class*="edit-page" i]', '[class*="editpage" i]', '[class*="skip-link" i]',
      '[id*="sidebar" i]', '[id*="navbar" i]', '[id~="toc" i]',
      '[data-testid*="sidebar" i]', '[data-testid*="toc" i]',
    ];

    // Link density = fraction of a node's text that sits inside <a> tags.
    // Navigation/sidebars are ~all links; prose is not. This is the key signal
    // that lets us tell content apart from menus regardless of class names.
    const linkDensity = (el) => {
      const total = (el.textContent || "").trim().length || 1;
      let linked = 0;
      el.querySelectorAll("a").forEach((a) => { linked += (a.textContent || "").length; });
      return linked / total;
    };

    // 1a. Try explicit content containers used by common doc platforms, in
    //     priority order. Accept the first that has real prose (low link density).
    const explicitSelectors = [
      "main article", "[role=main] article", "article[role=main]",
      ".theme-doc-markdown", ".docMainContainer", ".docItemContainer",   // Docusaurus
      "#content-area", ".prose-content", ".mdx-content",                  // Mintlify
      ".rm-Guides", ".rm-Article", ".markdown-body", ".content-body",     // ReadMe.io
      ".vp-doc", ".VPDoc .content-container",                             // VitePress
      ".nextra-content", "main .nextra-content",                          // Nextra
      ".sl-prose", ".sl-markdown-viewer", ".api-content",                 // Stoplight/Redoc
      ".page-inner", "[data-testid='page.contentEditor']",               // GitBook
      ".document .body", ".rst-content .document",                        // Sphinx/RTD
      ".markdown", ".md-content__inner", ".doc-content", ".documentation",
      "main", "[role=main]", "article", ".content", "#content",
      "#main-content", ".main-content",
    ];
    let root = null;
    for (const sel of explicitSelectors) {
      let chosen = null;
      document.querySelectorAll(sel).forEach((el) => {
        const len = (el.textContent || "").trim().length;
        if (len > 400 && linkDensity(el) < 0.5) {
          if (!chosen || len > (chosen.textContent || "").length) chosen = el;
        }
      });
      if (chosen) { root = chosen; break; }
    }

    // 1b. Fallback: Readability-style scan. Score content blocks, bubble the
    //     score up to parents, then pick the node with the best score after a
    //     link-density penalty. This finds the main column even in bespoke
    //     layouts where no known selector matches.
    if (!root) {
      const scores = new Map();
      const add = (el, s) => { if (el) scores.set(el, (scores.get(el) || 0) + s); };
      document.querySelectorAll("p, pre, blockquote, h1, h2, h3, td, li").forEach((node) => {
        const txt = (node.textContent || "").trim();
        if (txt.length < 25) return;
        const base = 1 + Math.min(Math.floor(txt.length / 100), 3) + (txt.match(/[,.;]/g) || []).length * 0.2;
        const p = node.parentElement;
        const gp = p && p.parentElement;
        add(p, base);
        add(gp, base / 2);
      });
      let bestScore = 0;
      scores.forEach((s, el) => {
        const adjusted = s * (1 - Math.min(linkDensity(el), 0.95));
        if (adjusted > bestScore) { bestScore = adjusted; root = el; }
      });
    }

    if (!root || (root.textContent || "").trim().length < 80) root = document.body;

    // 2. Clone and strip noise.
    const clone = root.cloneNode(true);
    SKIP_SELECTORS.forEach((sel) => {
      try { clone.querySelectorAll(sel).forEach((el) => el.remove()); } catch (e) {}
    });

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

// Injected into the page to harvest the sidebar/navigation links so the
// crawler can ingest a whole docs section. Self-contained, JSON-serializable.
//
// Returns: { ok, origin, baseSegment, pageTitle, current, links: [{url, text, sameSection}], error }
export function collectSidebarLinks() {
  try {
    const origin = location.origin;
    const here = location.origin + location.pathname;
    const segParts = location.pathname.split("/").filter(Boolean);
    const baseSegment = "/" + (segParts[0] || "");

    // Prefer anchors inside navigation/sidebar containers; fall back to all.
    const navSelectors = [
      "nav", "aside", "[role=navigation]",
      '[class*="sidebar" i]', '[class*="sidenav" i]', '[class*="side-nav" i]',
      '[class*="menu" i]', '[class*="toc" i]', '[class*="nav" i]',
      '[id*="sidebar" i]', '[id*="nav" i]', '[data-testid*="sidebar" i]',
    ];
    const anchorSet = new Set();
    navSelectors.forEach((sel) => {
      try {
        document.querySelectorAll(sel).forEach((c) => {
          c.querySelectorAll("a[href]").forEach((a) => anchorSet.add(a));
        });
      } catch (e) {}
    });
    let anchors = Array.from(anchorSet);
    const fromNav = anchors.length >= 3;
    if (!fromNav) anchors = Array.from(document.querySelectorAll("a[href]"));

    const seen = new Set();
    const links = [];
    anchors.forEach((a) => {
      const raw = a.getAttribute("href");
      if (!raw) return;
      let url;
      try { url = new URL(raw, location.href); } catch (e) { return; }
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (url.origin !== origin) return; // same-site only
      // Skip obvious asset/file links.
      if (/\.(png|jpe?g|gif|svg|webp|pdf|zip|css|js|json|xml|ico|woff2?)$/i.test(url.pathname)) return;
      const key = url.pathname + url.search;
      if (seen.has(key)) return;
      seen.add(key);
      const text = (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 140);
      links.push({
        url: url.origin + url.pathname + url.search,
        text: text || url.pathname,
        sameSection: url.pathname === baseSegment || url.pathname.startsWith(baseSegment + "/"),
      });
    });

    // Always include the current page (checked by default).
    if (!seen.has(location.pathname + location.search)) {
      links.unshift({
        url: here + location.search,
        text: document.title || location.pathname,
        sameSection: true,
      });
    }

    return {
      ok: true,
      origin,
      baseSegment,
      pageTitle: document.title || origin,
      current: here,
      fromNav,
      links,
    };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}
