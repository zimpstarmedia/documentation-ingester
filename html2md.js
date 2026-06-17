// Minimal, dependency-free HTML -> Markdown converter.
// Operates on a DOM node tree (parsed via DOMParser in the popup context).

const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DETAILS", "DIV", "DL", "DD",
  "DT", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2",
  "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P",
  "PRE", "SECTION", "TABLE", "UL"
]);

// Tags whose contents we drop entirely.
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "BUTTON", "FORM"]);

function escapeText(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/([*_`[\]])/g, "\\$1");
}

function collapseWs(text) {
  return text.replace(/\s+/g, " ");
}

function repeat(str, n) {
  return n > 0 ? str.repeat(n) : "";
}

// Convert inline-ish content to a single line of markdown.
function inline(node) {
  let out = "";
  node.childNodes.forEach((child) => {
    out += renderInline(child);
  });
  return out;
}

function renderInline(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeText(collapseWs(node.nodeValue));
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const tag = node.tagName;
  if (SKIP_TAGS.has(tag)) return "";

  switch (tag) {
    case "BR":
      return "  \n";
    case "STRONG":
    case "B": {
      const t = inline(node).trim();
      return t ? `**${t}**` : "";
    }
    case "EM":
    case "I": {
      const t = inline(node).trim();
      return t ? `*${t}*` : "";
    }
    case "DEL":
    case "S":
    case "STRIKE": {
      const t = inline(node).trim();
      return t ? `~~${t}~~` : "";
    }
    case "CODE": {
      const t = node.textContent;
      if (!t) return "";
      const fence = t.includes("`") ? "``" : "`";
      return `${fence}${t}${fence}`;
    }
    case "A": {
      const text = inline(node).trim() || node.getAttribute("href") || "";
      const href = node.getAttribute("href");
      if (!href || href.startsWith("javascript:")) return text;
      return `[${text}](${href})`;
    }
    case "IMG": {
      const alt = node.getAttribute("alt") || "";
      const src = node.getAttribute("src") || "";
      return src ? `![${alt}](${src})` : "";
    }
    default:
      // Unknown inline wrapper: render children.
      return inline(node);
  }
}

function renderList(node, indent, ordered) {
  let out = "";
  let i = 1;
  node.childNodes.forEach((child) => {
    if (child.nodeType !== Node.ELEMENT_NODE || child.tagName !== "LI") return;
    const marker = ordered ? `${i}.` : "-";
    i++;
    const pad = repeat("  ", indent);

    // Separate nested lists from the item's own content.
    const nested = [];
    const ownNodes = [];
    child.childNodes.forEach((n) => {
      if (n.nodeType === Node.ELEMENT_NODE && (n.tagName === "UL" || n.tagName === "OL")) {
        nested.push(n);
      } else {
        ownNodes.push(n);
      }
    });

    let text = "";
    ownNodes.forEach((n) => { text += renderInline(n); });
    text = text.replace(/\s+/g, " ").trim();

    out += `${pad}${marker} ${text}\n`;
    nested.forEach((n) => {
      out += renderList(n, indent + 1, n.tagName === "OL");
    });
  });
  return out;
}

function renderTable(node) {
  const rows = [];
  node.querySelectorAll("tr").forEach((tr) => {
    const cells = [];
    tr.querySelectorAll("th, td").forEach((cell) => {
      cells.push(inline(cell).replace(/\|/g, "\\|").replace(/\n/g, " ").trim());
    });
    if (cells.length) rows.push(cells);
  });
  if (!rows.length) return "";

  const cols = Math.max(...rows.map((r) => r.length));
  const norm = rows.map((r) => {
    while (r.length < cols) r.push("");
    return r;
  });

  let out = `| ${norm[0].join(" | ")} |\n`;
  out += `| ${Array(cols).fill("---").join(" | ")} |\n`;
  for (let i = 1; i < norm.length; i++) {
    out += `| ${norm[i].join(" | ")} |\n`;
  }
  return out + "\n";
}

function renderBlock(node, depth = 0) {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = collapseWs(node.nodeValue);
    return t.trim() ? escapeText(t) : "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const tag = node.tagName;
  if (SKIP_TAGS.has(tag)) return "";

  switch (tag) {
    case "H1": case "H2": case "H3": case "H4": case "H5": case "H6": {
      const level = Number(tag[1]);
      const t = inline(node).trim();
      return t ? `${repeat("#", level)} ${t}\n\n` : "";
    }
    case "P": {
      const t = inline(node).trim();
      return t ? `${t}\n\n` : "";
    }
    case "PRE": {
      const codeEl = node.querySelector("code");
      const raw = (codeEl || node).textContent.replace(/\n$/, "");
      let lang = "";
      const cls = (codeEl || node).getAttribute("class") || "";
      const m = cls.match(/language-([\w+-]+)/) || cls.match(/lang-([\w+-]+)/);
      if (m) lang = m[1];
      return "```" + lang + "\n" + raw + "\n```\n\n";
    }
    case "BLOCKQUOTE": {
      const inner = renderChildren(node, depth + 1).trim();
      if (!inner) return "";
      const quoted = inner.split("\n").map((l) => (l ? `> ${l}` : ">")).join("\n");
      return quoted + "\n\n";
    }
    case "UL":
      return renderList(node, 0, false) + "\n";
    case "OL":
      return renderList(node, 0, true) + "\n";
    case "HR":
      return "---\n\n";
    case "TABLE":
      return renderTable(node);
    case "IMG": {
      const md = renderInline(node);
      return md ? md + "\n\n" : "";
    }
    case "FIGURE": {
      return renderChildren(node, depth) ;
    }
    case "FIGCAPTION": {
      const t = inline(node).trim();
      return t ? `*${t}*\n\n` : "";
    }
    default:
      return renderChildren(node, depth);
  }
}

function renderChildren(node, depth) {
  let out = "";
  let inlineBuffer = "";

  const flush = () => {
    const t = inlineBuffer.replace(/\s+\n/g, "\n").trim();
    if (t) out += t + "\n\n";
    inlineBuffer = "";
  };

  node.childNodes.forEach((child) => {
    const isBlock =
      child.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(child.tagName);
    const isSkip =
      child.nodeType === Node.ELEMENT_NODE && SKIP_TAGS.has(child.tagName);
    if (isSkip) return;

    if (isBlock) {
      flush();
      out += renderBlock(child, depth);
    } else {
      inlineBuffer += renderInline(child);
    }
  });
  flush();
  return out;
}

// Public: convert an HTML string to Markdown.
export function htmlToMarkdown(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  let md = renderChildren(doc.body, 0);
  // Collapse 3+ blank lines down to 2.
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  return md + "\n";
}
