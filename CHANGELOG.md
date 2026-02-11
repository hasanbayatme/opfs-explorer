# Changelog

All notable changes to OPFS Explorer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
