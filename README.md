# OPFS Explorer

<div align="center">

![OPFS Explorer Icon](public/icons/icon-128.png)

**A powerful browser DevTools extension to inspect, edit, and manage the Origin Private File System.**

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/hhegfidnlemidclkkldeekjamkfcamic?label=Chrome&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/opfs-explorer/hhegfidnlemidclkkldeekjamkfcamic)
[![Firefox Add-on](https://img.shields.io/amo/v/opfs-explorer?label=Firefox&logo=firefox&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/opfs-explorer/)
[![Edge Add-on](https://img.shields.io/badge/dynamic/json?label=Edge&logo=microsoftedge&logoColor=white&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fodbpcdmkgeikdcmcdlfmdkbjiaeknnbd)](https://microsoftedge.microsoft.com/addons/detail/odbpcdmkgeikdcmcdlfmdkbjiaeknnbd)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Development](#development) • [Architecture](#architecture)

</div>

---

## 🚀 Overview

**OPFS Explorer** solves a common pain point for modern web developers: the **Origin Private File System (OPFS)** is invisible by default. Browsers do not provide a native way to inspect files stored via `navigator.storage.getDirectory()`, making it incredibly difficult to debug applications using **SQLite Wasm**, **File System Access API**, or offline PWA storage.

This extension bridges that gap by adding a native "OPFS Explorer" panel to your browser's DevTools, providing a full-featured file manager and editor right inside the browser.

## ✨ Features

*   **📂 Visual File Tree:** Browse your directory structure with a familiar, collapsible folder interface. File sizes displayed inline.
*   **📝 Built-in Code Editor:** View and edit files instantly. Supports syntax highlighting for **JSON, JavaScript, TypeScript, HTML, CSS**, and plain text.
*   **🖼️ Image Preview:** View images directly with zoom (25%-400%), rotate, and reset controls. Supports PNG, JPG, GIF, WebP, SVG, and more. Keyboard shortcuts: `+`/`-` zoom, `R` rotate, `0` reset.
*   **📑 Markdown Preview:** Preview markdown files with rendered formatting. Toggle between preview and edit modes.
*   **🔍 Search & Filter:** Quickly find files with Ctrl+F search functionality.
*   **📊 Storage Statistics:** View OPFS storage usage with a visual progress bar showing used/available space.
*   **✅ Multi-Selection:**
    *   **Ctrl+Click** to toggle individual items.
    *   **Shift+Click** to select a range.
    *   **Ctrl+A** to select all visible items.
    *   **Bulk delete and download** for multiple selected items.
*   **🖱️ Drag & Drop Magic:**
    *   **Upload:** Drag files from your computer directly into the panel to upload them.
    *   **Organize:** Drag files and folders *inside* the tree to move/reparent them. Multi-drag supported.
    *   **Conflict Resolution:** Choose to overwrite, rename, or skip when uploading duplicate files.
*   **⚡ Full CRUD Operations:**
    *   **Create** files and folders (`Ctrl+N`, `Ctrl+Shift+N`).
    *   **Rename** files/folders (`F2`).
    *   **Delete** recursively (`Delete`/`Backspace`).
*   **⬇️ Download Support:** Export files from the hidden OPFS to your local machine with a single click.
*   **🛡️ Binary Safety:** Intelligent detection of large or binary files (like SQLite databases) with a "Download Only" safety mode to prevent freezing.
*   **⌨️ Keyboard Shortcuts:** Comprehensive keyboard support including `Ctrl+S` (save), `Ctrl+F` (search), `Ctrl+B` (toggle sidebar), `Ctrl+N` (new file), `Ctrl+Shift+N` (new folder), `F2` (rename), `Delete` (delete), arrow keys for tree navigation, `Shift+Arrow` for extending selection, `Home`/`End` to jump, and more. Context menus display platform-aware shortcut hints.
*   **↔️ Resizable Sidebar:** Drag to resize the file tree panel. Width persists across sessions. Keyboard accessible with arrow keys.
*   **🧭 Clickable Breadcrumbs:** Navigate folder hierarchy by clicking path segments.
*   **🌗 Theme Aware:** Automatically adapts to Chrome DevTools' Light and Dark themes.
*   **♿ Fully Accessible (WCAG 2.1 AA):**
    *   ARIA tree pattern with `aria-multiselectable` support.
    *   Roving `tabindex` keyboard navigation across nested tree items.
    *   Focus-visible styling on all interactive elements.
    *   ARIA live regions for screen reader announcements of file operations.
    *   Focus trap in modal dialogs with return-focus-to-trigger.
    *   Skip navigation link.
    *   `prefers-reduced-motion` support (disables animations).
    *   Windows High Contrast mode (`forced-colors`) support.

## 📦 Installation

### From Browser Extension Stores

| Browser | Install Link |
|---------|--------------|
| **Chrome** | [Chrome Web Store](https://chromewebstore.google.com/detail/opfs-explorer/hhegfidnlemidclkkldeekjamkfcamic) |
| **Firefox** | [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/opfs-explorer/) |
| **Edge** | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/odbpcdmkgeikdcmcdlfmdkbjiaeknnbd) |
| **Brave, Vivaldi, Arc** | Use the [Chrome Web Store](https://chromewebstore.google.com/detail/opfs-explorer/hhegfidnlemidclkkldeekjamkfcamic) link |

### Manual Installation (Developer Mode)
1.  Clone this repository.
2.  Install dependencies: `npm install`
3.  Build the project: `npm run build`
4.  Open Chrome and navigate to `chrome://extensions`.
5.  Enable **Developer mode** (top right toggle).
6.  Click **Load unpacked**.
7.  Select the `dist/` directory generated in step 3.

## 🛠️ Usage

1.  Open the website you want to inspect (must be a Secure Context: `https://` or `localhost`).
2.  Open Chrome DevTools (`F12` or `Cmd+Option+I`).
3.  Look for the **"OPFS Explorer"** tab in the top panel (you may need to click the `>>` overflow menu).
4.  Navigate the file tree, right-click items for options, or drag and drop files to manage them.

> **Note:** OPFS is only available on secure contexts (HTTPS or localhost). If you see an error, ensure you're on a secure origin.

## ⌨️ Keyboard Shortcuts

All shortcuts use `Cmd` on macOS and `Ctrl` on Windows/Linux. Shortcut hints are displayed in context menus.

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current file |
| `Ctrl+F` | Search/filter files |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+N` | Create new file |
| `Ctrl+Shift+N` | Create new folder |
| `Ctrl+A` | Select all items |
| `Ctrl+Shift+?` | Show shortcuts panel |
| `F2` | Rename selected item |
| `Delete` / `Backspace` | Delete selected items |
| `Arrow Up/Down` | Navigate file tree |
| `Shift+Arrow Up/Down` | Extend selection |
| `Arrow Right` | Expand directory |
| `Arrow Left` | Collapse directory |
| `Home` / `End` | Jump to first/last item |
| `Space` | Toggle item selection |
| `Enter` | Open/confirm |
| `Escape` | Close search/modal |

**Image Preview:** `+`/`-` zoom, `R` rotate, `0` reset.

## 💻 Development

This project is built with a modern, type-safe stack:

*   **Frontend:** [React 19](https://react.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
*   **Bundler:** [Vite](https://vitejs.dev/)
*   **Editor Component:** [CodeMirror 6](https://codemirror.net/) via `@uiw/react-codemirror`

### Project Structure
```
src/
├── devtools/     # Entry point for creating the DevTools panel
├── panel/        # Main React application (UI)
│   ├── components/  # TreeItem, Editor, Modal, etc.
│   └── api.ts       # OPFS operations via inspectedWindow.eval()
├── test/         # Unit tests
└── types.ts      # TypeScript type definitions
```

### Commands
*   `npm run dev`: Start Vite in watch mode (useful for UI dev).
*   `npm run build`: specific build for Chrome Extension (generates `dist/`).
*   `npm run package`: Zips the `dist` folder for release.

## 🔒 Privacy & Security

*   **Local Execution:** This extension runs entirely within your browser's local sandbox.
*   **No Data Collection:** No telemetry, analytics, or file data is ever sent to external servers.
*   **Minimal Permissions:**
    *   `clipboardWrite`: To allow "Copy Path" functionality.
*   **No Content Scripts:** Uses the DevTools-native `inspectedWindow` API - no code is injected into web pages.
*   **No Host Permissions:** Does not require access to any websites - operates only through the DevTools panel.

## 📄 License

MIT License © [Hasan Bayat](https://github.com/hasanbayat)