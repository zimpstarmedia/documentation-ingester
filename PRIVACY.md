# Privacy Policy — 403 Whisperer

_Last updated: 2026-06-17_

## Summary

**403 Whisperer does not collect, store, transmit, or share any
personal data.** Everything the extension does happens locally in your browser.

## What the extension does

When you click the extension's button on a documentation page, it:

1. Reads the content of the **current tab only**, and only at that moment.
2. Converts that content to Markdown entirely within your browser.
3. Saves the result as a ZIP file to your computer's Downloads folder.

## Data collection

- **No personal data is collected.**
- **No analytics, telemetry, or tracking** of any kind.
- **No data is sent to any server.** The extension makes no network requests.
- **No remote code** is loaded or executed; all logic ships inside the extension.
- The extension has **no account, login, or backend.**

## Permissions and why they are used

| Permission | Why it is needed |
| ---------- | ---------------- |
| `activeTab` | To read the page you are currently viewing, only when you click the button. |
| `scripting` | To run the content-extraction logic on that page. |
| `downloads` | To save the generated ZIP file to your Downloads folder. |
| `storage` | To pass the list of pages to crawl from the popup to the crawler tab, locally. It holds no personal data and is cleared after each crawl. |
| Host access (optional) | Only when you use "Crawl whole section," and only for the site you are on, so the extension can open that site's pages in a background tab and read them. You are prompted to grant this each time, and it is never requested up front. |

The page content the extension reads is used solely to produce your Markdown
files on your own device. When crawling multiple pages, those pages are loaded
in your own browser using your existing session and read locally. Nothing read
by the extension is ever stored after the ZIP is created, and nothing ever
leaves your computer.

## Contact

Questions about this policy can be sent to: zimpstarmedia@gmail.com
