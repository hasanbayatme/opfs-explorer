# Browser Extension Store Listing - OPFS Explorer v0.2.0

## Published Store Links

| Store | URL |
|-------|-----|
| Chrome Web Store | https://chromewebstore.google.com/detail/opfs-explorer/hhegfidnlemidclkkldeekjamkfcamic |
| Firefox Add-ons | https://addons.mozilla.org/en-US/firefox/addon/opfs-explorer/ |
| Edge Add-ons | https://microsoftedge.microsoft.com/addons/detail/odbpcdmkgeikdcmcdlfmdkbjiaeknnbd |

---

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

GitHub: https://github.com/hasanbayatme/opfs-explorer

The Origin Private File System (OPFS) is a powerful browser API for high-performance file storage, but browsers don't provide any way to see what's inside. OPFS Explorer fills this gap by adding a dedicated panel to Chrome DevTools.

WHAT'S NEW IN v0.2.0:
• JSON Formatting - One-click "Format" button with configurable indentation and key sorting
• On-Demand Directory Sizes - Calculate a folder's own size or its full recursive size, right from the context menu
• Settings Panel - Configure JSON formatting and directory-size behavior
• Duplicate & Collapse All - Duplicate any file/folder in place, or collapse the whole tree in one click

SECURITY HIGHLIGHTS:
• NO host permissions - doesn't access any websites
• NO content scripts - no code injected into pages
• ONLY permission: clipboard for "Copy Path" feature
• Uses DevTools native inspectedWindow.eval() API

KEY FEATURES:
📂 Visual File Tree - Browse directories with file sizes and type icons
📝 Code Editor - Syntax highlighting for JSON, JS, TS, HTML, CSS, and more
🧮 On-Demand Directory Sizes - Calculate a folder's own size or its full recursive size
� JSON Formatting - One-click reformatting with configurable indentation and key sorting
🖼️ Image Preview - Zoom, rotate, and inspect images up to 5MB
📑 Markdown Support - Preview or edit .md files
✅ Multi-Selection - Ctrl+Click, Shift+Click, Ctrl+A with bulk delete/download
🖱️ Drag & Drop - Upload files or reorganize your file structure (multi-drag)
⚡ Full CRUD - Create, rename, duplicate, move, and delete files/folders
⬇️ Download Files - Export from OPFS to your local machine
📊 Storage Stats - Monitor your OPFS quota usage
⚙️ Settings Panel - Configure JSON formatting and directory-size behavior
⌨️ Keyboard Shortcuts - 20+ shortcuts with platform-aware hints in context menus
🌗 Theme Support - Adapts to DevTools light/dark themes
♿ Fully Accessible - WCAG 2.1 AA with screen reader, keyboard, and high contrast support

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

## What's New (Version Notes for v0.2.0)

```
v0.2.0 - JSON Formatting, Directory Sizes & Settings Panel

JSON FORMATTING:
• One-click "Format" button in the editor toolbar for .json files
• Configurable indentation (2 spaces, 4 spaces, or tabs)
• Optional recursive alphabetical key sorting
• Invalid JSON shows a toast instead of corrupting the buffer

ON-DEMAND DIRECTORY SIZES:
• "Calculate Size (This Folder Only)" - direct child files, fast
• "Calculate Size (Recursive)" - full recursive tree total
• "Calculate Total Size" for an arbitrary multi-selection
• Results cached and shown as a badge next to the folder
• Never runs automatically unless explicitly enabled in Settings

SETTINGS PANEL:
• New gear icon in the Explorer toolbar
• Configure JSON formatting defaults
• Configure directory-size auto-calculate behavior

QUALITY OF LIFE:
• Duplicate action for files and folders
• Collapse All button to reset the tree in one click

This release focuses on making large OPFS trees easier to reason about
(on-demand sizing instead of always-on scanning) and on faster JSON
editing, while keeping every new feature off-by-default where it could
affect performance.
```

---

## What's New (Version Notes for v0.1.0)

```
v0.1.0 - Multi-Selection, Keyboard Shortcuts & Accessibility

MULTI-SELECTION:
• Ctrl+Click to toggle individual items
• Shift+Click for range selection
• Ctrl+A to select all visible items
• Bulk delete and download for multiple selections
• Visual checkbox indicators in multi-select mode

KEYBOARD SHORTCUTS:
• Ctrl+N / Cmd+N - New file
• Ctrl+Shift+N / Cmd+Shift+N - New folder
• F2 - Rename selected item
• Delete / Backspace - Delete selected items
• Arrow Up/Down - Navigate tree, Shift+Arrow to extend selection
• Home/End - Jump to first/last tree item
• Space - Toggle selection
• Context menus show platform-aware shortcut hints

ACCESSIBILITY (WCAG 2.1 AA):
• ARIA tree pattern with roving tabindex navigation
• Screen reader announcements via ARIA live regions
• Focus trap in modal dialogs with return-focus-to-trigger
• Skip navigation link for keyboard users
• prefers-reduced-motion support (disables animations)
• Windows High Contrast mode (forced-colors) support
• focus-visible styling on all interactive elements
• Descriptive aria-labels on all buttons and regions

UI ENHANCEMENTS:
• Context menus with icons, shortcut hints, and section separators
• Type-ahead character search in context menus
• Image preview keyboard shortcuts (+/- zoom, R rotate, 0 reset)
• Keyboard-accessible resize handle (Shift+Arrow for larger steps)
• Proper breadcrumb markup with aria-current
• Storage bar with progressbar role and ARIA values

This is a major UI/UX and accessibility update. The extension now meets WCAG 2.1 AA standards with comprehensive keyboard navigation and screen reader support.
```

---

## Privacy Policy Justifications

### Permission: clipboardWrite

**Justification:**
This permission is used solely for the "Copy Path" feature in the context menu. When users right-click a file or folder and select "Copy Path", the file's path is written to the clipboard so they can paste it elsewhere (e.g., in their code editor or terminal). No clipboard data is read or sent externally.

### No Content Scripts

**Note:**
As of v0.0.4, this extension does NOT use content scripts. It uses `chrome.devtools.inspectedWindow.eval()` to execute OPFS operations in the context of the inspected page. This is a DevTools-native API that:

1. Only works when DevTools is open
2. Does not require any host permissions
3. Does not inject persistent scripts into pages
4. Is the recommended approach for DevTools extensions

### No Host Permissions

**Note:**
This extension requires NO host permissions. It does not declare `<all_urls>` or any other match patterns. All operations are performed through the DevTools API.

---

## Screenshots Needed

Generated automatically by `npm run screenshots` (see [RELEASE.md](RELEASE.md#-automated-screenshots)) into `screenshots/`:

1. **01-welcome-screen.png** - File tree populated with sample files/folders
2. **02-file-editor.png** - Plain-text file open in the code editor
3. **03-markdown-preview.png** - Markdown file rendered in preview mode
4. **04-json-format.png** - JSON file after using the "Format" button
5. **05-context-menu.png** - Right-click context menu on a file
6. **06-folder-size.png** - Folder with an on-demand recursive size badge
7. **07-settings-panel.png** - Settings dialog (JSON formatting + directory-size options)
8. **08-keyboard-shortcuts.png** - Keyboard shortcuts panel
9. **09-search-filter.png** - Search/filter in action

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
