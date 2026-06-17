# Chrome Web Store — Listing Copy

Paste these into the Developer Dashboard fields. Everything here is ready to use.

---

## Product name
403 Whisperer — Docs to Markdown for AI

## Summary (132 char max)
Turn any docs page into clean, RAG-ready Markdown for AI. Beat 403/Cloudflare blocks, stale versions & missing context. 100% local.

## Category
Developer Tools

## Language
English (United States)

---

## Description (paste into "Description")

Tired of pointing your AI tools at documentation they can't actually read? Cloudflare 403s, login walls, and JavaScript-heavy pages mean your assistant often grabs the wrong version, an outdated cache, or nothing at all — and then confidently gives you answers based on docs it never saw.

403 Whisperer fixes that. With one click it captures the docs page you're actually looking at, splits it into clean Markdown sections, and downloads the whole thing as a ZIP you can drop straight into your AI workflow. Think of it as a quick way to build your own RAG source from any docs — so your assistant works from the real, current docs instead of guessing.

THE PROBLEM IT SOLVES
• AI tools hit 403 / Cloudflare blocks and can't fetch the page
• They read a stale or wrong version from their training data or cache
• They can't find the docs for a niche or internal library at all
• You end up copy-pasting docs by hand to give the model context

HOW IT HELPS
You're already authenticated and looking at the right page in your browser — so the extension reads exactly what you see and hands you clean, current Markdown. Feed those files to ChatGPT, Claude, Cursor, a local model, or any RAG pipeline for accurate, grounded answers about the libraries and APIs you actually use.

WHAT YOU GET
• index.md — an overview with a linked table of contents and a one-line summary of each section
• One clean .md file per section (headings, code blocks, lists, tables, links, and images preserved)
• Optionally, the original HTML of each section

WHY YOU'LL LIKE IT
• One click — no setup, no copy-paste
• Works on pages AI fetchers can't reach — you've already passed the Cloudflare check and any login
• Smart content detection — strips navigation, sidebars, and footers automatically
• Works on JavaScript-rendered docs (reads the live page)
• 100% local — no accounts, no servers, no tracking, no network requests
• No external libraries; everything runs inside the extension

PERFECT FOR
• Giving AI assistants accurate, current context for the docs you rely on
• Building a personal RAG knowledge base from custom, internal, or niche docs
• Capturing docs behind Cloudflare, logins, or heavy JavaScript
• Offline reading and archiving

HOW TO USE
1. Open a documentation page
2. Click the 403 Whisperer icon
3. (Optional) name the output folder
4. Click "Ingest this page → ZIP"
5. Unzip the file from your Downloads folder

Your data never leaves your computer.

---

## Single purpose (paste into "Single purpose description")
This extension has one purpose: to convert the documentation page the user is currently viewing into Markdown files and download them as a ZIP archive.

---

## Permission justifications (paste each into its field)

activeTab:
Used to access the content of the page the user is currently viewing, only at the moment the user clicks the extension button, so it can be converted to Markdown.

scripting:
Used to run the content-extraction script on the current page in order to read its headings and content for conversion to Markdown.

downloads:
Used to save the generated ZIP file (the Markdown files and index) to the user's Downloads folder.

storage:
Used to pass the list of pages to crawl from the popup to the crawler tab. It stores no personal data and is cleared after each crawl.

Host permissions (optional, requested at runtime):
The "Crawl whole section" feature opens the pages of the docs site the user is currently on in a background tab and reads them, so it can convert a whole documentation section to Markdown. Access is requested only for that one site, only when the user starts a crawl (never up front), via optional_host_permissions. The extension makes no requests to any third-party server and contains no remote code; all processing is local.

---

## Data usage disclosures (Privacy practices tab — check these)

- Does this item collect or use user data? → NO data is collected.
- For each data-type checkbox: leave UNCHECKED (none apply).
- Certifications (check all three — they are true):
  • I do not sell or transfer user data to third parties, outside of the approved use cases
  • I do not use or transfer user data for purposes that are unrelated to my item's single purpose
  • I do not use or transfer user data to determine creditworthiness or for lending purposes

## Privacy policy URL
Host PRIVACY.md somewhere public and paste its URL here.
Easiest: push this repo to GitHub and use the raw file URL, e.g.
https://raw.githubusercontent.com/<your-username>/documentation-ingester/main/PRIVACY.md
