# Privacy Policy for OPFS Explorer

**Last Updated:** February 11, 2026

This Privacy Policy describes how **OPFS Explorer** ("we", "us", or "our") handles your information when you use our browser extension.

## 1. Data Collection and Usage
**We do not collect, store, or transmit any personal data.**

*   **Local Processing:** The extension operates entirely locally within your browser's Developer Tools environment.
*   **No Analytics:** We do not use any third-party analytics services to track your usage.
*   **No Remote Servers:** The extension does not communicate with any external servers. All file operations (reading, writing, listing) happen directly on your device between the extension and the specific web page you are inspecting.

## 2. Permissions
To function correctly, OPFS Explorer requires a single permission:

*   **`clipboardWrite`:** Used solely to allow you to copy file paths or file contents to your clipboard upon your request.

**No content scripts or host permissions are required.** The extension uses the DevTools-native `inspectedWindow` API, which only operates when DevTools is open and does not inject any persistent scripts into web pages.

## 3. Changes to This Policy
We may update this Privacy Policy from time to time. Since we do not collect user contact information, we encourage you to review this page periodically for any changes.

## 4. Contact Us
If you have any questions about this Privacy Policy, please contact us via our GitHub repository.
