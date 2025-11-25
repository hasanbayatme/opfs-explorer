# Chrome Web Store Listing - OPFS Explorer v0.0.3

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

WHAT'S NEW IN v0.0.3:
• Image Preview - View images with zoom, rotate, and pan controls
• Markdown Preview - Render markdown files with edit/preview toggle
• Resizable Sidebar - Drag to resize, persists across sessions
• Search & Filter - Quickly find files with Ctrl+F
• Storage Statistics - Visual progress bar showing OPFS usage
• Keyboard Shortcuts - Full keyboard navigation support
• Upload Conflict Resolution - Choose overwrite/rename/skip for duplicates
• Clickable Breadcrumbs - Navigate by clicking path segments
• Preserved Tree State - Folders stay open on refresh

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
• Minimal permissions (clipboard only)
• Open source: github.com/hasanbayatme/opfs-explorer

HOW TO USE:
1. Open any website using OPFS
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

## What's New (Version Notes for v0.0.3)

```
v0.0.3 - Major Feature Update

NEW FEATURES:
• Image preview with zoom (25%-400%), rotate, and reset
• Markdown preview with edit/preview toggle
• Resizable sidebar (drag to resize, persists to localStorage)
• Collapsible sidebar (Ctrl+B)
• Search/filter files (Ctrl+F)
• Storage statistics with visual progress bar
• Keyboard shortcuts panel (Ctrl+Shift+?)
• Upload conflict resolution dialog
• Clickable breadcrumb navigation
• File sizes in tree view and toolbar
• Enhanced file type icons

IMPROVEMENTS:
• Tree state preserved on refresh - folders stay open!
• Better welcome screen when OPFS is empty
• Full accessibility support (ARIA labels, keyboard nav)

FIXES:
• Removed unused activeTab permission (Chrome Web Store compliance)
```

---

## Privacy Policy Justifications

### Permission: clipboardWrite

**Justification:**
This permission is used solely for the "Copy Path" feature in the context menu. When users right-click a file or folder and select "Copy Path", the file's path is written to the clipboard so they can paste it elsewhere (e.g., in their code editor or terminal). No clipboard data is read or sent externally.

### Content Script: <all_urls>

**Justification:**
The content script needs to run on all URLs because:

1. OPFS is available on any secure origin (https:// or localhost)
2. Users may need to inspect OPFS on any website they're developing
3. The script only activates when the DevTools panel is opened
4. It accesses only the standard navigator.storage.getDirectory() API
5. No data is collected or transmitted - all operations are local

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
