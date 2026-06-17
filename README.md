# 🤫 403 Whisperer — Docs to Markdown for AI (Chrome Extension)

Turn any documentation page into a tidy set of Markdown files. Click the
toolbar button and the extension reads the current page, splits it into sections
at each top-level heading (`H1`/`H2`), converts each one to clean Markdown, and
downloads everything — plus an `index.md` describing each part — as a single ZIP.

No build step, no external libraries, fully offline. Manifest V3.

## What you get

```
<page-title>.zip
└── <page-title>/
    ├── index.md          ← overview + linked table of contents with summaries
    ├── 01-overview.md
    ├── 02-getting-started.md
    ├── 03-configuration.md
    └── …                  ← one file per H1/H2 section
```

`index.md` looks like:

```markdown
# React Router Docs

> Ingested from https://example.com/docs
> on 2026-06-17 · 7 sections

## Contents

1. **[Overview](./01-overview.md)** — React Router is a routing library…
2. **[Getting Started](./02-getting-started.md)** — Install the package with npm…
…
```

Tick **"Also include original `.html`"** to additionally save each section's raw
HTML under a `raw/` subfolder.

## Install (Load Unpacked)

1. Open `chrome://extensions` in Chrome (or Edge: `edge://extensions`).
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select this folder
   (`documentation-ingester`).
4. The 📚 icon appears in your toolbar. Pin it if you like.

## Use

1. Navigate to a documentation page.
2. Click the 📚 toolbar icon.
3. (Optional) Set an output folder name and toggle raw HTML.
4. Click **Ingest this page → ZIP**.
5. The ZIP lands in your Downloads folder. Unzip it.

## How it works

| File           | Role                                                                 |
| -------------- | ------------------------------------------------------------------- |
| `manifest.json`| MV3 config — `activeTab`, `scripting`, `downloads` permissions.     |
| `popup.html/.css/.js` | The UI and orchestration (extract → convert → zip → download). |
| `extractor.js` | Injected into the page; finds the main content, strips nav/asides/footers, resolves relative links, and splits on `H1`/`H2`. |
| `html2md.js`   | Dependency-free HTML→Markdown converter (headings, code, lists, tables, links, images, blockquotes). |
| `zip.js`       | Dependency-free ZIP writer (STORE method + CRC-32).                 |

The content detector tries `main`, `article`, `[role=main]`, `.markdown-body`,
`.content`, and similar containers, picking whichever holds the most text. If it
can't find a clear container it falls back to the whole page body.

## Notes & limits

- Browser-internal pages (`chrome://`, `about:`, the Web Store) can't be ingested
  — open a real docs site.
- Images and links are kept as **absolute URLs** pointing back to the source
  site; images are not downloaded into the ZIP.
- Pages that render content entirely via JavaScript work fine, since extraction
  reads the live DOM after the page has loaded.
- Splitting is by `H1`/`H2`. Pages whose sections are only `H3+` come out as a
  single file (still converted to Markdown).

## Customizing

- **Split depth:** in `extractor.js`, change the `isHeading` check to include
  `H3` if you want finer-grained files.
- **Content selectors:** add site-specific selectors to `candidateSelectors`
  (best content) or `SKIP_SELECTORS` (noise to remove) in `extractor.js`.
