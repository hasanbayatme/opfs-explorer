# Changelog

All notable changes to OPFS Explorer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-02-24

### Fixed

- **Binary file corruption on download**: `URL.revokeObjectURL()` was called synchronously immediately after `a.click()`, before the browser had a chance to read the object URL. Downloads of binary files (Arrow, SQLite, Parquet, WASM, etc.) would produce 0-byte or truncated files. Revocation is now deferred by 30 seconds.
- **Binary write corruption for large files**: The entire base64 payload was inlined as a string literal inside the `inspectedWindow.eval()` call, which can silently fail or corrupt data beyond undocumented size limits. Binary uploads are now staged into the inspected page's `sessionStorage` in 64 KB chunks, then reassembled and decoded inside OPFS atomically.
- **Binary files incorrectly classified as text**: OPFS does not preserve MIME types — every file stored in OPFS has `file.type === ""`. The previous `__opfs_isTextFile` check treated an empty type as text, causing binary files (Arrow, SQLite, WASM, Protobuf, `.bin`, etc.) to be read with `file.text()`, producing garbled UTF-8 in the editor. Classification now relies exclusively on file extension when the MIME type is absent.
- **`btoa` / `Uint8Array.reduce` call-stack overflow**: Building the base64 binary string by reducing one character at a time over large `Uint8Array` buffers would exhaust the JavaScript call stack for images and binary previews beyond a few hundred KB. Replaced with an 8 KB chunked `String.fromCharCode.apply` loop.
- **`escapeString` missing null bytes and Unicode line separators**: Null bytes (`\x00`) and Unicode line/paragraph separators (`\u2028`, `\u2029`) were not escaped, causing injected JavaScript to be syntactically invalid when file paths or text content contained these characters.
- **`saveFile` could corrupt binary/image files**: The `Cmd/Ctrl+S` keyboard shortcut called `saveFile` even when viewing a binary file whose content was displayed as a `[BINARY]` or `data:…;base64,…` sentinel string. The sentinel text would be written back to OPFS, corrupting the file. A guard now blocks saves when the displayed content is a read-only sentinel.
- **`stageBinaryData` sessionStorage leak on error**: If staging a chunk failed (e.g. sessionStorage quota exceeded), already-stored chunks were never removed, leaking `__opfs_bin_*` keys in the inspected page's sessionStorage indefinitely. Staged chunks are now cleaned up on any staging error.
- **Undefined `base64` crashing upload**: `FileReader` produces a data URL; `content.split(',')[1]` returns `undefined` on a malformed result. This was passed into `stageBinaryData` which then crashed with a misleading error. An explicit guard now throws a descriptive error.
- **Conflict resolution applied wrong target directory to pending uploads**: After resolving a file conflict, remaining queued uploads were all sent to the first file's target directory, ignoring each file's own intended path. Each pending upload is now dispatched with its own original `targetPath`.
- **`[BINARY_OR_LARGE]` sentinel not recognised by read-only display**: The `isTooLarge` derived state was missing the `[BINARY_OR_LARGE]` prefix emitted by `api.read()`, so that sentinel could appear as editable text in CodeMirror instead of showing the download screen.
- **Redundant `Array.from` copy in image base64 encoding**: `String.fromCharCode.apply(null, Array.from(bytes.subarray(...)))` created an unnecessary intermediate JS array. The `Uint8Array` subarray is array-like and can be passed directly to `apply`.

## [0.1.0] - 2026-02-11

### Added

- **Multi-Selection**: Select multiple files and folders using Ctrl+Click (toggle), Shift+Click (range), and Ctrl+A (select all)
- **Bulk Operations**: Delete or download multiple selected items at once
- **Comprehensive Keyboard Shortcuts**:
  - `Ctrl+N` / `Cmd+N` — Create new file
  - `Ctrl+Shift+N` / `Cmd+Shift+N` — Create new folder
  - `F2` — Rename selected item
  - `Delete` / `Backspace` — Delete selected items
  - `Arrow Up/Down` — Navigate file tree
  - `Shift+Arrow Up/Down` — Extend selection in tree
  - `Home` / `End` — Jump to first/last tree item
  - `Space` — Toggle selection (like Ctrl+Click)
  - `Arrow Right/Left` — Expand/collapse directories
- **Skip Navigation Link**: "Skip to main content" link for keyboard and screen reader users
- **ARIA Live Announcements**: Screen readers are notified of file operations (create, delete, rename, selection changes)
- **Focus Trap in Modals**: Tab key cycles through focusable elements within dialogs
- **Context Menu Enhancements**: Icons, keyboard shortcut hints, section separators, type-ahead character search
- **Image Preview Keyboard Shortcuts**: `+`/`-` for zoom, `R` for rotate, `0` for reset
- **Resize Handle Keyboard Support**: `Shift+Arrow` for larger steps, `Home`/`End` for min/max width

### Changed

- **Tree Navigation**: Switched to DOM-based roving tabindex pattern for accessible keyboard navigation across nested tree items
- **Selection Model**: Upgraded from single-selection to multi-selection with visual checkbox indicators
- **Context Menu**: Now shows different options for single vs. multi-selection (e.g., "Delete 3 items")
- **Modal Dialogs**: Use `role="alertdialog"` for destructive confirmations, `role="dialog"` otherwise
- **Breadcrumbs**: Proper `<ol>`/`<li>` markup with `aria-current="page"` on the active segment
- **Storage Bar**: Uses `role="progressbar"` with proper ARIA value attributes
- **Toast Notifications**: Container uses `aria-live="polite"` with screen reader-only type prefixes

### Improved

- **Accessibility (WCAG 2.1 AA)**:
  - `aria-multiselectable="true"` on the file tree
  - `:focus-visible` styling throughout all interactive elements
  - `prefers-reduced-motion` media query disables animations for motion-sensitive users
  - `forced-colors` (Windows High Contrast) mode support
  - Firefox scrollbar styling (`scrollbar-width: thin`)
  - Descriptive `aria-label` attributes on all buttons, toolbar regions, and status indicators
  - Platform-aware modifier key labels (shows `Cmd` on macOS, `Ctrl` elsewhere)

## [0.0.4] - 2025-11-25

### Added

- **Verified CRX Uploads**: Support for signed CRX files for Chrome Web Store verification
- **Manual Release Workflow**: Trigger releases manually via GitHub Actions without pushing tags
- **Automated Asset Generation**: Scripts to generate promo tiles and icons from SVG source
- **New SVG Logo**: Redesigned logo with folder, file, and magnifying glass elements

### Changed

- **Release Workflow**: Now supports both tag-triggered and manual releases with test mode

### Security

- **Removed Content Scripts**: Refactored to use `chrome.devtools.inspectedWindow.eval()` instead of content scripts
- **No Host Permissions**: Removed `<all_urls>` content script injection - extension no longer injects into web pages
- **Minimal Permissions**: Now only requires `clipboardWrite` permission for copy functionality

## [0.0.3] - 2025-11-25

### Added

- **Image Preview**: View images directly in the panel with zoom (25%-400%), rotate, and reset controls
- **Markdown Preview**: Preview markdown files with rendered formatting, toggle between preview and edit modes
- **Resizable Sidebar**: Drag the sidebar edge to resize (150px-500px), width persists across sessions
- **Collapsible Sidebar**: Toggle sidebar visibility with Ctrl+B keyboard shortcut
- **Clickable Breadcrumbs**: Navigate folder hierarchy by clicking breadcrumb path segments
- **Search/Filter**: Quickly filter files with Ctrl+F search functionality
- **Storage Statistics**: View OPFS storage usage with visual progress bar
- **Keyboard Shortcuts Panel**: View all shortcuts with Ctrl+Shift+?
- **Upload Conflict Resolution**: Choose to overwrite, rename, or skip when uploading duplicate files
- **File Metadata Display**: See file sizes in tree view and toolbar, last modified timestamps
- **Enhanced File Icons**: Added icons for CSS, HTML, SQLite, WASM, and more file types

### Changed

- **Tree State Preservation**: Expanded folders now stay open when refreshing or after file operations
- **Improved Empty State**: Better welcome screen with feature hints when OPFS is empty
- **Enhanced Accessibility**: Added ARIA labels, keyboard navigation, and screen reader support throughout

### Removed

- **activeTab Permission**: Removed unused permission that was causing Chrome Web Store rejection

### Fixed

- Chrome Web Store policy violation (Purple Potassium) - removed unnecessary activeTab permission

## [0.0.2] - 2025-11-24

### Added

- Initial feature-complete release
- Visual file tree browser
- Built-in code editor with syntax highlighting
- Drag and drop file upload
- Internal drag and drop to move files/folders
- Create, rename, delete files and folders
- Download files from OPFS
- Binary file detection and safety handling
- Dark/Light theme support
- Context menu operations

## [0.0.1] - 2025-11-24

### Added

- Initial release
- Basic OPFS file system access
- DevTools panel integration
