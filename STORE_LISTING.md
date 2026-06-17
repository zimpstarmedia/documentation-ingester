# Chrome Web Store — Listing Copy

Paste these into the Developer Dashboard fields. Everything here is ready to use.

---

## Product name
Documentation Ingester

## Summary (132 char max)
Save any docs page as clean Markdown — auto-split into sections with an index, downloaded as a ZIP. No accounts, no tracking.

## Category
Developer Tools

## Language
English (United States)

---

## Description (paste into "Description")

Documentation Ingester turns any documentation page into a tidy set of Markdown files with one click.

When you click the toolbar button, it reads the current page, splits it into sections at each top-level heading (H1/H2), converts each section to clean Markdown, and downloads everything — plus an index.md that summarizes each part — as a single ZIP.

WHAT YOU GET
• index.md — an overview with a linked table of contents and a one-line summary of each section
• One clean .md file per section (headings, code blocks, lists, tables, links, and images preserved)
• Optionally, the original HTML of each section

WHY YOU'LL LIKE IT
• One click — no setup, no copy-paste
• Smart content detection — strips navigation, sidebars, and footers automatically
• Works on JavaScript-rendered docs (reads the live page)
• 100% local — no accounts, no servers, no tracking, no network requests
• No external libraries; everything runs inside the extension

PERFECT FOR
• Feeding documentation into AI tools and note systems
• Offline reading and archiving
• Building a personal knowledge base from docs you rely on

HOW TO USE
1. Open a documentation page
2. Click the Documentation Ingester icon
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

Host permission / remote code: NONE.
The extension does not request host permissions beyond activeTab, makes no network requests, and contains no remote code. All processing is local.

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
