# Changelog

All notable changes to OPFS Explorer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3] - 2025-01-25

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

## [0.0.2] - 2025-01-24

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

## [0.0.1] - 2025-01-24

### Added

- Initial release
- Basic OPFS file system access
- DevTools panel integration
