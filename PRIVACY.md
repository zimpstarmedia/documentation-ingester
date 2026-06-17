# Privacy Policy — Documentation Ingester

_Last updated: 2026-06-17_

## Summary

**Documentation Ingester does not collect, store, transmit, or share any
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

The page content the extension reads is used solely to produce your Markdown
files on your own device. It is never stored by the extension after the ZIP is
created, and never leaves your computer.

## Contact

Questions about this policy can be sent to: simon.hagert@ica.se
