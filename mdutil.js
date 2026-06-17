// Shared Markdown helpers used by both the single-page popup and the crawler.

export function slugify(text, fallback) {
  const s = (text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || fallback;
}

// Strip common site-name suffixes ("Page | Site", "Page – Docs", …). Picks the
// longest segment, which is almost always the descriptive title rather than the
// brand — works regardless of which side the brand is on.
export function cleanTitle(title) {
  if (!title) return title;
  let t = title.replace(/\s+/g, " ").trim();
  for (const sep of [" | ", " — ", " – ", " - ", " · ", " :: ", " » "]) {
    if (t.includes(sep)) {
      const parts = t.split(sep).map((p) => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        t = parts.reduce((a, b) => (b.length > a.length ? b : a));
      }
      break;
    }
  }
  return t || title.trim();
}

// Rough token estimate (~4 chars/token, the common GPT/Claude rule of thumb).
export function estimateTokens(text) {
  return Math.max(0, Math.round((text || "").length / 4));
}

export function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}

// First meaningful line of a Markdown blob, for index summaries.
export function summarize(markdown) {
  for (const line of (markdown || "").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("```") || t.startsWith("|") || t.startsWith("---")) continue;
    const clean = t.replace(/[*_`>#-]/g, "").trim();
    if (clean.length) return clean.length > 160 ? clean.slice(0, 157) + "…" : clean;
  }
  return "(no description)";
}

function yamlString(s) {
  return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

// Build a YAML frontmatter block from an object (skips empty values).
export function frontmatter(obj) {
  let out = "---\n";
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === "") continue;
    out += `${k}: ${typeof v === "number" ? v : yamlString(v)}\n`;
  }
  return out + "---\n\n";
}
