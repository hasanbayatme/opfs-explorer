# Chrome Web Store Listing - OPFS Explorer v0.0.5

## Extension Name

```
OPFS Explorer
```

## Short Description (132 characters max)

```
Inspect, edit, and manage Origin Private File System (OPFS) files directly in Chrome DevTools. Essential for PWA & SQLite Wasm devs.
```

## Detailed Description

```
OPFS Explorer - The Missing DevTools Panel for Origin Private File System

The Origin Private File System (OPFS) is a powerful browser API for high-performance file storage, but browsers don't provide any way to see what's inside. OPFS Explorer fills this gap by adding a dedicated panel to Chrome DevTools.

WHAT'S NEW IN v0.0.5:
• Enhanced Security - No content scripts, no host permissions required
• Verified CRX Support - Signed extension builds for verification
• New Logo - Redesigned with folder, file, and magnifying glass elements
• Improved Architecture - Uses DevTools native API for better performance

SECURITY HIGHLIGHTS:
• NO host permissions - doesn't access any websites
• NO content scripts - no code injected into pages
• ONLY permission: clipboard for "Copy Path" feature
• Uses DevTools native inspectedWindow.eval() API

KEY FEATURES:
📂 Visual File Tree - Browse directories with file sizes and type icons
📝 Code Editor - Syntax highlighting for JSON, JS, TS, HTML, CSS
🖼️ Image Preview - Zoom, rotate, and inspect images up to 5MB
📑 Markdown Support - Preview or edit .md files
🖱️ Drag & Drop - Upload files or reorganize your file structure
⚡ Full CRUD - Create, rename, move, and delete files/folders
⬇️ Download Files - Export from OPFS to your local machine
📊 Storage Stats - Monitor your OPFS quota usage
⌨️ Keyboard Shortcuts - Ctrl+S save, Ctrl+F search, Ctrl+B sidebar
🌗 Theme Support - Adapts to DevTools light/dark themes
♿ Accessible - Full ARIA support and keyboard navigation

PERFECT FOR:
• SQLite Wasm applications (sql.js, wa-sqlite, sqlite-wasm)
• Progressive Web Apps (PWAs) with offline storage
• File System Access API projects
• Browser-based IDEs and editors
• Any app using navigator.storage.getDirectory()

PRIVACY:
• Runs entirely locally - no external connections
• No data collection or telemetry
• Minimal permission (clipboard only)
• No content scripts or host permissions
• Open source: github.com/hasanbayatme/opfs-explorer

HOW TO USE:
1. Open any website using OPFS (https or localhost)
2. Open DevTools (F12)
3. Click the "OPFS Explorer" tab
4. Browse, edit, and manage your files!
```

## Category

```
Developer Tools
```

## Language

```
English
```

## Tags/Keywords

```
OPFS, Origin Private File System, DevTools, File System, SQLite, Wasm, PWA, Storage, Developer Tools, File Manager, Debug
```

---

## What's New (Version Notes for v0.0.5)

```
v0.0.5 - Security & Architecture Update

SECURITY IMPROVEMENTS:
• Removed content scripts entirely
• No host permissions required (<all_urls> removed)
• Uses DevTools native inspectedWindow.eval() API
• Only permission: clipboardWrite for "Copy Path"

NEW FEATURES:
• Verified CRX uploads support for Chrome Web Store
• Manual release workflow for GitHub Actions
• Automated asset generation scripts
• Redesigned SVG logo

This update significantly reduces the extension's permission footprint while maintaining full functionality. The extension no longer injects any code into web pages.
```

---

## Privacy Policy Justifications

### Permission: clipboardWrite

**Justification:**
This permission is used solely for the "Copy Path" feature in the context menu. When users right-click a file or folder and select "Copy Path", the file's path is written to the clipboard so they can paste it elsewhere (e.g., in their code editor or terminal). No clipboard data is read or sent externally.

### No Content Scripts

**Note:**
As of v0.0.5, this extension does NOT use content scripts. It uses `chrome.devtools.inspectedWindow.eval()` to execute OPFS operations in the context of the inspected page. This is a DevTools-native API that:

1. Only works when DevTools is open
2. Does not require any host permissions
3. Does not inject persistent scripts into pages
4. Is the recommended approach for DevTools extensions

### No Host Permissions

**Note:**
This extension requires NO host permissions. It does not declare `<all_urls>` or any other match patterns. All operations are performed through the DevTools API.

---

## Screenshots Needed

1. **Main Interface** - Show the file tree with some files/folders expanded, demonstrating the editor view
2. **Image Preview** - Show an image being previewed with zoom controls visible
3. **Markdown Preview** - Show a markdown file in preview mode with formatting
4. **Context Menu** - Show right-click menu with options
5. **Drag & Drop** - Show the upload overlay when dragging files
6. **Storage Stats** - Show the storage usage bar in the sidebar footer

Recommended screenshot size: 1280x800 or 640x400

---

## Promotional Tile Text

### Small Tile (440x280)

```
OPFS Explorer
See inside the invisible file system
```

### Large Tile (920x680)

```
OPFS Explorer
The DevTools panel for Origin Private File System

✓ Browse files & folders
✓ Edit with syntax highlighting
✓ Preview images & markdown
✓ Drag & drop uploads
✓ No host permissions required
```

---

## Support Information

### Support URL

```
https://github.com/hasanbayat/opfs-explorer/issues
```

### Homepage URL

```
https://github.com/hasanbayat/opfs-explorer
```
