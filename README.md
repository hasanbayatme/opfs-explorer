# OPFS Explorer

<div align="center">

![OPFS Explorer Icon](public/icons/icon-128.png)

**A powerful Chrome DevTools extension to inspect, edit, and manage the Origin Private File System.**

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Development](#development) • [Architecture](#architecture)

</div>

---

## 🚀 Overview

**OPFS Explorer** solves a common pain point for modern web developers: the **Origin Private File System (OPFS)** is invisible by default. Browsers do not provide a native way to inspect files stored via `navigator.storage.getDirectory()`, making it incredibly difficult to debug applications using **SQLite Wasm**, **File System Access API**, or offline PWA storage.

This extension bridges that gap by adding a native "OPFS Explorer" panel to your Chrome DevTools, providing a full-featured file manager and editor right inside the browser.

## ✨ Features

*   **📂 Visual File Tree:** Browse your directory structure with a familiar, collapsible folder interface. File sizes displayed inline.
*   **📝 Built-in Code Editor:** View and edit files instantly. Supports syntax highlighting for **JSON, JavaScript, TypeScript, HTML, CSS**, and plain text.
*   **🖼️ Image Preview:** View images directly with zoom (25%-400%), rotate, and reset controls. Supports PNG, JPG, GIF, WebP, SVG, and more.
*   **📑 Markdown Preview:** Preview markdown files with rendered formatting. Toggle between preview and edit modes.
*   **🔍 Search & Filter:** Quickly find files with Ctrl+F search functionality.
*   **📊 Storage Statistics:** View OPFS storage usage with a visual progress bar showing used/available space.
*   **🖱️ Drag & Drop Magic:**
    *   **Upload:** Drag files from your computer directly into the panel to upload them.
    *   **Organize:** Drag files and folders *inside* the tree to move/reparent them.
    *   **Conflict Resolution:** Choose to overwrite, rename, or skip when uploading duplicate files.
*   **⚡ Full CRUD Operations:**
    *   **Create** files and folders.
    *   **Rename** files/folders.
    *   **Delete** recursively.
*   **⬇️ Download Support:** Export files from the hidden OPFS to your local machine with a single click.
*   **🛡️ Binary Safety:** Intelligent detection of large or binary files (like SQLite databases) with a "Download Only" safety mode to prevent freezing.
*   **⌨️ Keyboard Shortcuts:** Comprehensive keyboard support including Ctrl+S (save), Ctrl+F (search), Ctrl+B (toggle sidebar), and more.
*   **↔️ Resizable Sidebar:** Drag to resize the file tree panel. Width persists across sessions.
*   **🧭 Clickable Breadcrumbs:** Navigate folder hierarchy by clicking path segments.
*   **🌗 Theme Aware:** Automatically adapts to Chrome DevTools' Light and Dark themes.
*   **♿ Accessible:** Full ARIA labels, keyboard navigation, and screen reader support.

## 📦 Installation

### From Chrome Web Store
*(Link pending publication)*

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
*   **No Content Scripts:** Uses DevTools' native `inspectedWindow.eval()` API - no code is injected into web pages.
*   **No Host Permissions:** Does not require access to any websites - operates only through the DevTools panel.

## 📄 License

MIT License © [Hasan Bayat](https://github.com/hasanbayat)