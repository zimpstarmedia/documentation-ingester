import { htmlToMarkdown } from "./html2md.js";
import { createZip } from "./zip.js";
import { extractPageSections } from "./extractor.js";
import { slugify, cleanTitle, summarize, estimateTokens, formatCount, frontmatter } from "./mdutil.js";

const els = {
  sourceLine: document.getElementById("sourceLine"),
  folderName: document.getElementById("folderName"),
  settleMs: document.getElementById("settleMs"),
  includeRaw: document.getElementById("includeRaw"),
  includeCombined: document.getElementById("includeCombined"),
  selCount: document.getElementById("selCount"),
  selAll: document.getElementById("selAll"),
  selNone: document.getElementById("selNone"),
  selSection: document.getElementById("selSection"),
  startBtn: document.getElementById("startBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  permHint: document.getElementById("permHint"),
  linkList: document.getElementById("linkList"),
  progressPanel: document.getElementById("progressPanel"),
  progressTitle: document.getElementById("progressTitle"),
  progressCount: document.getElementById("progressCount"),
  barFill: document.getElementById("barFill"),
  status: document.getElementById("status"),
  log: document.getElementById("log"),
};

let job = null;
let cancelled = false;

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pageMarkdown(res) {
  return res.sections
    .map((s) => {
      const md = htmlToMarkdown(s.html);
      const h = "#".repeat(Math.max(1, s.level || 1));
      return `${h} ${s.title}\n\n${md}`;
    })
    .join("\n");
}

function setStatus(msg, kind) {
  els.status.hidden = false;
  els.status.textContent = msg;
  els.status.className = "status" + (kind ? " " + kind : "");
}

function logLine(msg, kind) {
  const li = document.createElement("li");
  li.textContent = msg;
  if (kind) li.className = kind;
  els.log.appendChild(li);
  els.log.scrollTop = els.log.scrollHeight;
}

function checkboxes() {
  return Array.from(els.linkList.querySelectorAll("input[type=checkbox]"));
}

function updateSelCount() {
  const n = checkboxes().filter((c) => c.checked).length;
  els.selCount.textContent = `${n} selected`;
}

// ---------- render ----------
function render() {
  els.sourceLine.textContent = `${job.links.length} links found on ${job.origin}${job.fromNav ? " (from sidebar)" : ""}`;
  if (job.folderHint) els.folderName.value = job.folderHint;
  els.includeRaw.checked = !!job.includeRaw;
  els.includeCombined.checked = !!job.includeCombined;

  els.linkList.innerHTML = "";
  job.links.forEach((link, i) => {
    const li = document.createElement("li");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = link.sameSection; // default: same docs section
    cb.dataset.index = String(i);
    cb.addEventListener("change", updateSelCount);

    const meta = document.createElement("div");
    meta.className = "meta";
    const t = document.createElement("span");
    t.className = "ltext";
    t.textContent = link.text;
    const u = document.createElement("span");
    u.className = "lurl";
    u.textContent = link.url.replace(job.origin, "");
    meta.appendChild(t);
    meta.appendChild(u);

    li.appendChild(cb);
    li.appendChild(meta);
    if (!link.sameSection) {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = "other section";
      li.appendChild(b);
    }
    els.linkList.appendChild(li);
  });
  updateSelCount();
}

els.selAll.addEventListener("click", () => { checkboxes().forEach((c) => (c.checked = true)); updateSelCount(); });
els.selNone.addEventListener("click", () => { checkboxes().forEach((c) => (c.checked = false)); updateSelCount(); });
els.selSection.addEventListener("click", () => {
  checkboxes().forEach((c) => (c.checked = job.links[Number(c.dataset.index)].sameSection));
  updateSelCount();
});

// ---------- crawl ----------
function waitForComplete(tabId, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(ok);
    };
    const listener = (id, info) => {
      if (id === tabId && info.status === "complete") finish(true);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function extractTab(tabId) {
  const [inj] = await chrome.scripting.executeScript({
    target: { tabId },
    func: extractPageSections,
  });
  return inj && inj.result;
}

async function startCrawl() {
  const selected = checkboxes()
    .filter((c) => c.checked)
    .map((c) => job.links[Number(c.dataset.index)]);

  if (!selected.length) {
    setStatus("Select at least one page to crawl.", "err");
    return;
  }

  els.startBtn.disabled = true;
  els.selAll.disabled = els.selNone.disabled = els.selSection.disabled = true;
  els.progressPanel.hidden = false;
  els.permHint.hidden = true;
  setStatus("Requesting access to " + job.origin + " …");

  // Host permission for this origin (needed to script the background tab).
  let granted = false;
  try {
    granted = await chrome.permissions.request({ origins: [job.origin + "/*"] });
  } catch (e) {
    granted = false;
  }
  if (!granted) {
    setStatus("Permission denied — cannot read pages on " + job.origin, "err");
    els.startBtn.disabled = false;
    return;
  }

  cancelled = false;
  els.cancelBtn.hidden = false;
  els.cancelBtn.disabled = false;

  const settle = Math.max(300, Number(els.settleMs.value) || 1500);
  const siteTitle = cleanTitle(job.pageTitle) || job.origin;
  const folder = slugify(els.folderName.value || siteTitle, "documentation");
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const total = selected.length;

  let crawlTabId = null;
  const pages = [];
  const usedNames = new Set();

  try {
    const first = await chrome.tabs.create({ url: selected[0].url, active: false });
    crawlTabId = first.id;

    for (let i = 0; i < total; i++) {
      if (cancelled) { logLine("⏹ Cancelled — finishing with pages captured so far.", "skip"); break; }
      const link = selected[i];
      els.progressTitle.textContent = "Crawling…";
      els.progressCount.textContent = `${i + 1} / ${total}`;
      els.barFill.style.width = `${Math.round((i / total) * 100)}%`;

      if (i > 0) await chrome.tabs.update(crawlTabId, { url: link.url });
      const loaded = await waitForComplete(crawlTabId, 20000);
      await sleep(settle); // let SPA content hydrate
      if (cancelled) { logLine("⏹ Cancelled — finishing with pages captured so far.", "skip"); break; }

      let res = null;
      try {
        res = await extractTab(crawlTabId);
      } catch (e) {
        res = { ok: false, error: String(e && e.message ? e.message : e) };
      }

      if (!res || !res.ok || !res.sections || !res.sections.length) {
        logLine(`✗ skipped: ${link.url.replace(job.origin, "")} (${(res && res.error) || "no content"})`, "skip");
        continue;
      }

      const title = cleanTitle(res.title) || link.text || link.url;
      const num = String(pages.length + 1).padStart(2, "0");
      let base = `${num}-${slugify(title, "page")}`;
      let name = `${base}.md`;
      let d = 2;
      while (usedNames.has(name)) name = `${base}-${d++}.md`;
      usedNames.add(name);

      const md = pageMarkdown(res);
      const tokens = estimateTokens(md);
      pages.push({ title, url: res.url || link.url, file: name, base, md, sections: res.sections, summary: summarize(md), tokens });
      logLine(`✓ ${title} — ${res.sections.length} sections, ~${formatCount(tokens)} tok${loaded ? "" : " (load timed out, captured anyway)"}`, "ok");
    }

    if (crawlTabId) { try { await chrome.tabs.remove(crawlTabId); } catch (e) {} }
    els.cancelBtn.hidden = true;

    if (!pages.length) {
      throw new Error(cancelled ? "Cancelled before any page was captured." : "No pages could be captured.");
    }

    const totalTokens = pages.reduce((s, p) => s + p.tokens, 0);

    // Build files (each page gets RAG-friendly frontmatter).
    const files = [];
    const combinedParts = [];
    pages.forEach((p) => {
      const fm = frontmatter({ title: p.title, source: p.url, site: siteTitle, retrieved: dateStr, tokens_est: p.tokens });
      files.push({ name: `${folder}/${p.file}`, text: fm + p.md });
      combinedParts.push(`# ${p.title}\n\n_Source: ${p.url}_\n\n${p.md}`);
      if (els.includeRaw.checked) {
        files.push({ name: `${folder}/raw/${p.base}.html`, text: p.sections.map((s) => s.html).join("\n<hr>\n") });
      }
    });

    let index = frontmatter({ title: siteTitle, source: job.origin, retrieved: dateStr, pages: pages.length, tokens_est: totalTokens });
    index += `# ${siteTitle}\n\n`;
    index += `> Crawled from ${job.origin} on ${dateStr} · ${pages.length} pages · ~${formatCount(totalTokens)} tokens${cancelled ? " (cancelled early)" : ""}\n\n`;
    index += `## Pages\n\n`;
    pages.forEach((p, i) => {
      index += `${i + 1}. **[${p.title}](./${p.file})** — ${p.summary} _(~${formatCount(p.tokens)} tok)_\n`;
    });
    index += `\n---\n\n_Generated by 403 Whisperer — Docs to Markdown for AI (Chrome extension)._\n`;
    files.unshift({ name: `${folder}/index.md`, text: index });

    if (els.includeCombined.checked) {
      const combined = frontmatter({ title: siteTitle, source: job.origin, retrieved: dateStr, pages: pages.length, tokens_est: totalTokens }) +
        `# ${siteTitle}\n\n_Crawled from ${job.origin} · ${pages.length} pages_\n\n` + combinedParts.join("\n\n---\n\n");
      files.push({ name: `${folder}/combined.md`, text: combined });
    }

    const blob = createZip(files, now);
    const url = URL.createObjectURL(blob);
    await chrome.downloads.download({ url, filename: `${folder}.zip`, saveAs: false });

    els.barFill.style.width = "100%";
    els.progressTitle.textContent = cancelled ? "Cancelled" : "Done";
    setStatus(`${cancelled ? "⏹ Stopped early — saved" : "✓ Crawled"} ${pages.length} pages → ${folder}.zip · ~${formatCount(totalTokens)} tokens`, "ok");
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    chrome.storage.local.remove("crawlJob");
  } catch (err) {
    if (crawlTabId) { try { await chrome.tabs.remove(crawlTabId); } catch (e) {} }
    els.cancelBtn.hidden = true;
    setStatus("Error: " + (err && err.message ? err.message : String(err)), "err");
    els.startBtn.disabled = false;
  }
}

els.startBtn.addEventListener("click", startCrawl);
els.cancelBtn.addEventListener("click", () => {
  cancelled = true;
  els.cancelBtn.disabled = true;
  els.progressTitle.textContent = "Cancelling…";
});

// ---------- init ----------
(async () => {
  const { crawlJob } = await chrome.storage.local.get("crawlJob");
  if (!crawlJob) {
    els.sourceLine.textContent = "No crawl job found. Open the popup on a docs page and click “Crawl whole section”.";
    els.startBtn.disabled = true;
    return;
  }
  job = crawlJob;
  render();
})();
