import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { opfsApi, type StorageEstimate, type FileReadResult } from './api';
import type { FileEntry } from './api';
import { TreeItem } from './components/TreeItem';
import { ContextMenu } from './components/ContextMenu';
import type { ContextMenuItem } from './components/ContextMenu';
import { FileEditor } from './components/FileEditor';
import { ImagePreview } from './components/ImagePreview';
import { MarkdownPreview } from './components/MarkdownPreview';
import { ResizeHandle } from './components/ResizeHandle';
import { Modal } from './components/Modal';
import { ToastContainer } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import {
  RefreshCw, Save, FolderPlus, FilePlus, Home, ChevronRight, AlertCircle, Download,
  Search, X, Keyboard, HardDrive, Trash2, PanelLeftClose, PanelLeft, Eye, Code,
  FileText, Image as ImageIcon, Folder, Copy, Edit3
} from 'lucide-react';

// Helper to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper to check if file is an image
function isImageFile(fileName: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp', '.avif'];
  return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

// Helper to check if file is markdown
function isMarkdownFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.md') || fileName.toLowerCase().endsWith('.markdown');
}

// Platform-aware modifier key label
const modKey = navigator.platform?.includes('Mac') ? '\u2318' : 'Ctrl';

function App() {
  const [rootFiles, setRootFiles] = useState<FileEntry[]>([]);

  // Multi-selection state
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [primaryFile, setPrimaryFile] = useState<FileEntry | null>(null);
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);

  // File content state
  const [fileContent, setFileContent] = useState<string>('');
  const [fileMeta, setFileMeta] = useState<FileReadResult | null>(null);
  const [initialContent, setInitialContent] = useState<string>('');
  const [contentLoading, setContentLoading] = useState(false);

  // Loading and error state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // View mode for markdown files
  const [markdownViewMode, setMarkdownViewMode] = useState<'preview' | 'edit'>('preview');

  // Search/Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Storage statistics
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);

  // Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('opfs-sidebar-width');
    return saved ? parseInt(saved, 10) : 256;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Tree expanded state
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Keyboard shortcuts panel
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Upload conflict state
  const [uploadConflict, setUploadConflict] = useState<{
    file: File;
    targetPath: string;
    existingPath: string;
  } | null>(null);
  const [pendingUploads, setPendingUploads] = useState<{ file: File; targetPath: string }[]>([]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Refs
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);

  // ARIA live region announcements
  const [announcement, setAnnouncement] = useState('');

  const announce = useCallback((message: string) => {
    setAnnouncement('');
    // Small delay to ensure screen readers pick up the change
    setTimeout(() => setAnnouncement(message), 50);
  }, []);

  // UI State
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt';
    title: string;
    message?: string;
    inputValue?: string;
    placeholder?: string;
    danger?: boolean;
    onConfirm: (val?: string) => void;
  }>({ isOpen: false, type: 'alert', title: '', onConfirm: () => {} });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
      const id = Math.random().toString(36).substring(7);
      setToasts(prev => [...prev, { id, type, message }]);
      setTimeout(() => dismissToast(id), 5000);
  }, []);

  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // Save sidebar width to localStorage
  const handleSidebarResize = useCallback((width: number) => {
    setSidebarWidth(width);
    localStorage.setItem('opfs-sidebar-width', width.toString());
  }, []);

  // Toggle folder expand state
  const handleToggleExpand = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Navigate to a folder via breadcrumb
  const handleBreadcrumbNavigate = useCallback(async (targetPath: string) => {
    const parts = targetPath.split('/');
    const pathsToExpand: string[] = [];
    for (let i = 1; i <= parts.length; i++) {
      pathsToExpand.push(parts.slice(0, i).join('/'));
    }
    setExpandedPaths(prev => {
      const next = new Set(prev);
      pathsToExpand.forEach(p => next.add(p));
      return next;
    });

    const entry: FileEntry = {
      name: parts[parts.length - 1] || 'root',
      kind: 'directory',
      path: targetPath
    };
    setPrimaryFile(entry);
    setSelectedPaths(new Set([targetPath]));
    setFocusedPath(targetPath);
    setFileContent('');
    setFileMeta(null);
  }, []);

  // Fetch storage estimate
  const fetchStorageEstimate = useCallback(async () => {
    try {
      const estimate = await opfsApi.getStorageEstimate();
      setStorageEstimate(estimate);
    } catch {
      // Ignore - storage estimate is nice-to-have
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setConnectionError(false);
    try {
      const files = await opfsApi.list('');
      setRootFiles(files);
      setRefreshTrigger(prev => prev + 1);
      fetchStorageEstimate();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Could not establish connection') || message.includes('Receiving end does not exist')) {
          setConnectionError(true);
      } else {
          setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchStorageEstimate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Filter files based on search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return rootFiles;
    const query = searchQuery.toLowerCase();
    return rootFiles.filter(file =>
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
    );
  }, [rootFiles, searchQuery]);

  // ============================================================
  // DOM-based tree navigation helpers
  // ============================================================

  const getVisibleTreeItems = useCallback((): HTMLElement[] => {
    if (!treeContainerRef.current) return [];
    return Array.from(treeContainerRef.current.querySelectorAll<HTMLElement>('[data-path]'));
  }, []);

  const getVisiblePaths = useCallback((): string[] => {
    return getVisibleTreeItems().map(el => el.getAttribute('data-path')!).filter(Boolean);
  }, [getVisibleTreeItems]);

  const focusTreeItem = useCallback((path: string) => {
    setFocusedPath(path);
    const items = getVisibleTreeItems();
    const target = items.find(el => el.getAttribute('data-path') === path);
    target?.focus();
  }, [getVisibleTreeItems]);

  // ============================================================
  // Selection handling
  // ============================================================

  const loadFileContent = useCallback(async (entry: FileEntry) => {
    if (entry.kind !== 'file') {
      setFileContent('');
      setFileMeta(null);
      return;
    }

    setContentLoading(true);
    setMarkdownViewMode('preview');
    try {
      const result = await opfsApi.readWithMeta(entry.path);
      setFileMeta(result);
      setFileContent(result.content);
      setInitialContent(result.content);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFileContent(`Error reading file: ${message}`);
      setFileMeta(null);
      addToast('error', message);
    } finally {
      setContentLoading(false);
    }
  }, [addToast]);

  const handleSelect = useCallback((entry: FileEntry, event?: React.MouseEvent | React.KeyboardEvent) => {
    setContextMenu(null);

    const isCtrl = event && (event.ctrlKey || event.metaKey);
    const isShift = event && event.shiftKey;

    if (isCtrl && !isShift) {
      // Ctrl+Click: toggle this item in selection
      setSelectedPaths(prev => {
        const next = new Set(prev);
        if (next.has(entry.path)) {
          next.delete(entry.path);
          // If we deselected the primary, pick another
          if (primaryFile?.path === entry.path) {
            const remaining = [...next];
            if (remaining.length > 0) {
              // We don't have the FileEntry for the remaining path, but we keep primary
              // until next explicit click
            } else {
              setPrimaryFile(null);
              setFileContent('');
              setFileMeta(null);
            }
          }
        } else {
          next.add(entry.path);
          setPrimaryFile(entry);
          loadFileContent(entry);
        }
        announce(`${next.size} item${next.size !== 1 ? 's' : ''} selected`);
        return next;
      });
    } else if (isShift && selectionAnchor) {
      // Shift+Click: range selection
      const visiblePaths = getVisiblePaths();
      const anchorIdx = visiblePaths.indexOf(selectionAnchor);
      const targetIdx = visiblePaths.indexOf(entry.path);

      if (anchorIdx !== -1 && targetIdx !== -1) {
        const start = Math.min(anchorIdx, targetIdx);
        const end = Math.max(anchorIdx, targetIdx);
        const rangePaths = visiblePaths.slice(start, end + 1);
        setSelectedPaths(new Set(rangePaths));
        setPrimaryFile(entry);
        loadFileContent(entry);
        announce(`${rangePaths.length} items selected`);
      }
    } else {
      // Normal click: single selection
      if (primaryFile?.path === entry.path && selectedPaths.size === 1) return;

      setSelectedPaths(new Set([entry.path]));
      setSelectionAnchor(entry.path);
      setPrimaryFile(entry);
      loadFileContent(entry);
    }
  }, [primaryFile, selectedPaths, selectionAnchor, getVisiblePaths, loadFileContent, announce]);

  const handleFocusPath = useCallback((path: string) => {
    setFocusedPath(path);
  }, []);

  // Select all visible items
  const selectAll = useCallback(() => {
    const paths = getVisiblePaths();
    if (paths.length === 0) return;
    setSelectedPaths(new Set(paths));
    announce(`${paths.length} items selected`);
  }, [getVisiblePaths, announce]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set());
    setPrimaryFile(null);
    setFileContent('');
    setFileMeta(null);
    announce('Selection cleared');
  }, [announce]);

  // ============================================================
  // File operations
  // ============================================================

  const saveFile = useCallback(async () => {
    if (!primaryFile || primaryFile.kind !== 'file') return;
    try {
      await opfsApi.write(primaryFile.path, fileContent);
      setInitialContent(fileContent);
      addToast('success', 'File saved');
      announce('File saved');
    } catch (err) {
      addToast('error', `Failed to save: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [primaryFile, fileContent, addToast, announce]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedPaths.size === 0) return;
    const count = selectedPaths.size;
    const paths = [...selectedPaths];
    const message = count === 1
      ? `Are you sure you want to delete "${paths[0].split('/').pop()}"?`
      : `Are you sure you want to delete ${count} items?`;

    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Delete',
      message,
      danger: true,
      onConfirm: async () => {
        let deleted = 0;
        for (const path of paths) {
          try {
            await opfsApi.delete(path);
            deleted++;
          } catch (err) {
            addToast('error', `Failed to delete ${path}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        setSelectedPaths(new Set());
        setPrimaryFile(null);
        setFileContent('');
        setFileMeta(null);
        refresh();
        if (deleted > 0) {
          addToast('success', `Deleted ${deleted} item${deleted > 1 ? 's' : ''}`);
          announce(`${deleted} item${deleted > 1 ? 's' : ''} deleted`);
        }
        setModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [selectedPaths, addToast, refresh, announce]);

  const handleDownload = useCallback(async (path: string) => {
    try {
      await opfsApi.download(path);
      addToast('success', 'Download started');
    } catch (err) {
      addToast('error', `Download failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [addToast]);

  const handleDownloadSelected = useCallback(async () => {
    const paths = [...selectedPaths];
    let count = 0;
    for (const path of paths) {
      try {
        await opfsApi.download(path);
        count++;
      } catch (err) {
        addToast('error', `Download failed for ${path.split('/').pop()}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (count > 0) {
      addToast('success', `Started ${count} download${count > 1 ? 's' : ''}`);
    }
  }, [selectedPaths, addToast]);

  const handleRename = useCallback((entry: FileEntry) => {
    setModal({
      isOpen: true,
      type: 'prompt',
      title: 'Rename',
      inputValue: entry.name,
      onConfirm: async (newName) => {
        if (newName && newName !== entry.name) {
          try {
            await opfsApi.rename(entry.path, newName);
            refresh();
            announce(`Renamed to ${newName}`);
          } catch (err) {
            addToast('error', `Rename failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        setModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [addToast, refresh, announce]);

  const handleRootCreate = useCallback(async (kind: 'file' | 'directory') => {
    // If a directory is selected, create inside it
    const targetPath = primaryFile?.kind === 'directory' ? primaryFile.path : '';
    const prefix = targetPath ? `${targetPath}/` : '';

    setModal({
      isOpen: true,
      type: 'prompt',
      title: kind === 'file' ? 'New File' : 'New Folder',
      placeholder: kind === 'file' ? 'filename.txt' : 'folder_name',
      onConfirm: async (name) => {
        if (name) {
          try {
            await opfsApi.create(`${prefix}${name}`, kind);
            refresh();
            announce(`${kind === 'file' ? 'File' : 'Folder'} ${name} created`);
          } catch (e) {
            addToast('error', e instanceof Error ? e.message : String(e));
          }
        }
        setModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [primaryFile, addToast, refresh, announce]);

  // ============================================================
  // Keyboard shortcuts
  // ============================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when modal is open
      if (modal.isOpen) return;

      // Don't intercept when typing in CodeMirror or inputs
      const target = e.target as HTMLElement;
      const isInEditor = target.closest('.cm-editor');
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Ctrl/Cmd + S - Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (primaryFile?.kind === 'file') saveFile();
      }
      // Ctrl/Cmd + F - Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && !isInEditor) {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      // Ctrl/Cmd + B - Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b' && !isInEditor) {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
      // Ctrl/Cmd + A - Select all (when not in editor/input)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !isInEditor && !isInInput) {
        e.preventDefault();
        selectAll();
      }
      // Ctrl/Cmd + N - New file
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'n' && !isInEditor && !isInInput) {
        e.preventDefault();
        handleRootCreate('file');
      }
      // Ctrl/Cmd + Shift + N - New folder
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N' && !isInEditor && !isInInput) {
        e.preventDefault();
        handleRootCreate('directory');
      }
      // Escape - Close search or shortcuts
      if (e.key === 'Escape') {
        if (showSearch) {
          setShowSearch(false);
          setSearchQuery('');
        }
        if (showShortcuts) {
          setShowShortcuts(false);
        }
        if (contextMenu) {
          setContextMenu(null);
        }
        // Escape also clears multi-selection to single
        if (selectedPaths.size > 1) {
          if (primaryFile) {
            setSelectedPaths(new Set([primaryFile.path]));
          }
        }
      }
      // Ctrl/Cmd + Shift + ? - Show shortcuts
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '?') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
      // Delete/Backspace - Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPaths.size > 0 && !isInEditor && !isInInput) {
        e.preventDefault();
        handleDeleteSelected();
      }
      // F2 - Rename (single selection)
      if (e.key === 'F2' && primaryFile && selectedPaths.size === 1 && !isInEditor && !isInInput) {
        e.preventDefault();
        handleRename(primaryFile);
      }
      // Arrow Up/Down - Tree navigation
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !isInEditor && !isInInput) {
        e.preventDefault();
        const visiblePaths = getVisiblePaths();
        if (visiblePaths.length === 0) return;

        const currentIdx = focusedPath ? visiblePaths.indexOf(focusedPath) : -1;
        let nextIdx: number;

        if (e.key === 'ArrowUp') {
          nextIdx = currentIdx <= 0 ? visiblePaths.length - 1 : currentIdx - 1;
        } else {
          nextIdx = currentIdx >= visiblePaths.length - 1 ? 0 : currentIdx + 1;
        }

        const nextPath = visiblePaths[nextIdx];
        focusTreeItem(nextPath);

        // Shift+Arrow extends selection
        if (e.shiftKey) {
          setSelectedPaths(prev => {
            const next = new Set(prev);
            next.add(nextPath);
            return next;
          });
        }
      }
      // Home/End - Jump to first/last tree item
      if ((e.key === 'Home' || e.key === 'End') && !isInEditor && !isInInput) {
        e.preventDefault();
        const visiblePaths = getVisiblePaths();
        if (visiblePaths.length === 0) return;

        const targetPath = e.key === 'Home' ? visiblePaths[0] : visiblePaths[visiblePaths.length - 1];
        focusTreeItem(targetPath);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [primaryFile, modal.isOpen, showSearch, showShortcuts, contextMenu, selectedPaths,
      focusedPath, saveFile, handleDeleteSelected, handleRename, selectAll,
      getVisiblePaths, focusTreeItem, handleRootCreate]);

  // ============================================================
  // Drag and Drop
  // ============================================================

  const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current += 1;
      if (e.dataTransfer.types.includes('Files')) {
          setIsDragging(true);
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
        setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    let targetPath = '';
    if (primaryFile && primaryFile.kind === 'directory') {
        targetPath = primaryFile.path;
    } else if (primaryFile && primaryFile.kind === 'file') {
        const parts = primaryFile.path.split('/');
        parts.pop();
        targetPath = parts.join('/');
    }

    handleFileUpload(files, targetPath);
  };

  const handleTreeDrop = async (e: React.DragEvent, targetEntry: FileEntry) => {
      e.preventDefault();
      e.stopPropagation();

      const opfsPath = e.dataTransfer.getData('application/opfs-path');
      if (opfsPath) {
          const targetPath = targetEntry.kind === 'directory' ? targetEntry.path : targetEntry.path.split('/').slice(0, -1).join('/');

          if (opfsPath === targetPath || (targetPath + '/').startsWith(opfsPath + '/')) {
              return;
          }

          const fileName = opfsPath.split('/').pop();
          const newPath = targetPath ? `${targetPath}/${fileName}` : fileName;

          if (!newPath || opfsPath === newPath) return;

          try {
              await opfsApi.move(opfsPath, newPath);
              addToast('success', `Moved to ${targetPath || 'root'}`);
              refresh();
          } catch (err) {
              addToast('error', err instanceof Error ? err.message : String(err));
          }
          return;
      }

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      handleFileUpload(files, targetEntry.kind === 'directory' ? targetEntry.path : targetEntry.path.split('/').slice(0, -1).join('/'));
  };

  const handleFileUpload = async (files: File[], targetPath: string) => {
    const uploadsToProcess: { file: File; targetPath: string }[] = [];

    for (const file of files) {
      const filePath = targetPath ? `${targetPath}/${file.name}` : file.name;
      try {
        const exists = await opfsApi.exists(filePath);
        if (exists) {
          setPendingUploads(prev => [...prev, ...uploadsToProcess]);
          setUploadConflict({ file, targetPath, existingPath: filePath });
          return;
        }
        uploadsToProcess.push({ file, targetPath });
      } catch {
        uploadsToProcess.push({ file, targetPath });
      }
    }

    await processUploads(uploadsToProcess);
  };

  const processUploads = async (uploads: { file: File; targetPath: string }[]) => {
    if (uploads.length === 0) return;

    setIsLoading(true);
    let successCount = 0;

    for (const { file, targetPath } of uploads) {
        try {
            const reader = new FileReader();
            const content = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const base64 = content.split(',')[1];
            const filePath = targetPath ? `${targetPath}/${file.name}` : file.name;

            await opfsApi.write(filePath, base64, true);
            successCount++;
        } catch (err) {
            console.error(`Failed to upload ${file.name}`, err);
            addToast('error', `Failed to upload ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    setIsLoading(false);
    if (successCount > 0) {
        addToast('success', `Uploaded ${successCount} file${successCount > 1 ? 's' : ''}`);
        refresh();
    }
  };

  const handleConflictResolve = async (action: 'overwrite' | 'skip' | 'rename') => {
    if (!uploadConflict) return;

    const { file, targetPath } = uploadConflict;

    if (action === 'overwrite') {
      await processUploads([{ file, targetPath }]);
    } else if (action === 'rename') {
      const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
      const baseName = file.name.replace(ext, '');
      const newName = `${baseName}_${Date.now()}${ext}`;
      const newFile = new File([file], newName, { type: file.type });
      await processUploads([{ file: newFile, targetPath }]);
    }

    setUploadConflict(null);

    if (pendingUploads.length > 0) {
      const remaining = [...pendingUploads];
      setPendingUploads([]);
      await handleFileUpload(remaining.map(u => u.file), remaining[0]?.targetPath || '');
    }
  };

  // ============================================================
  // Context menu
  // ============================================================

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault();

    const multiSelected = selectedPaths.size > 1 && selectedPaths.has(entry.path);
    const items: ContextMenuItem[] = [];

    if (multiSelected) {
      // Multi-selection context menu
      items.push({
        label: `Delete ${selectedPaths.size} items`,
        icon: <Trash2 size={12} />,
        danger: true,
        shortcut: 'Del',
        onClick: () => handleDeleteSelected()
      });
      items.push({
        label: `Download ${selectedPaths.size} items`,
        icon: <Download size={12} />,
        onClick: () => handleDownloadSelected()
      });
      items.push({
        label: 'Copy paths',
        icon: <Copy size={12} />,
        onClick: () => {
          const paths = [...selectedPaths].join('\n');
          navigator.clipboard.writeText(paths)
            .then(() => addToast('info', 'Paths copied to clipboard'))
            .catch(() => addToast('error', 'Failed to copy paths'));
        }
      });
    } else {
      // Single item context menu
      if (entry.kind === 'directory') {
        items.push({
          label: 'New File',
          icon: <FilePlus size={12} />,
          shortcut: `${modKey}+N`,
          onClick: () => {
            setModal({
              isOpen: true,
              type: 'prompt',
              title: 'New File',
              placeholder: 'filename.txt',
              onConfirm: async (name) => {
                if (name) {
                  try {
                    await opfsApi.create(`${entry.path}/${name}`, 'file');
                    refresh();
                    announce(`File ${name} created`);
                  } catch (e) {
                    addToast('error', e instanceof Error ? e.message : String(e));
                  }
                }
                setModal(prev => ({ ...prev, isOpen: false }));
              }
            });
          }
        });
        items.push({
          label: 'New Folder',
          icon: <FolderPlus size={12} />,
          shortcut: `${modKey}+\u21E7+N`,
          onClick: () => {
            setModal({
              isOpen: true,
              type: 'prompt',
              title: 'New Folder',
              placeholder: 'folder_name',
              onConfirm: async (name) => {
                if (name) {
                  try {
                    await opfsApi.create(`${entry.path}/${name}`, 'directory');
                    refresh();
                    announce(`Folder ${name} created`);
                  } catch (e) {
                    addToast('error', e instanceof Error ? e.message : String(e));
                  }
                }
                setModal(prev => ({ ...prev, isOpen: false }));
              }
            });
          }
        });
      }

      if (entry.kind === 'file') {
        items.push({
          label: 'Download',
          icon: <Download size={12} />,
          onClick: () => handleDownload(entry.path)
        });
      }

      items.push({
        label: 'Rename',
        icon: <Edit3 size={12} />,
        shortcut: 'F2',
        onClick: () => handleRename(entry)
      });
      items.push({
        label: 'Copy Path',
        icon: <Copy size={12} />,
        onClick: () => {
          navigator.clipboard.writeText(entry.path)
            .then(() => addToast('info', 'Path copied to clipboard'))
            .catch(() => addToast('error', 'Failed to copy path'));
        }
      });
      items.push({
        label: 'Delete',
        icon: <Trash2 size={12} />,
        danger: true,
        shortcut: 'Del',
        onClick: () => {
          setModal({
            isOpen: true,
            type: 'confirm',
            title: 'Delete',
            message: `Are you sure you want to delete "${entry.name}"?`,
            danger: true,
            onConfirm: async () => {
              try {
                await opfsApi.delete(entry.path);
                if (primaryFile?.path === entry.path) {
                  setPrimaryFile(null);
                  setFileContent('');
                  setFileMeta(null);
                }
                setSelectedPaths(prev => {
                  const next = new Set(prev);
                  next.delete(entry.path);
                  return next;
                });
                refresh();
                addToast('success', 'Deleted successfully');
                announce(`${entry.name} deleted`);
              } catch (err) {
                addToast('error', `Delete failed: ${err instanceof Error ? err.message : String(err)}`);
              }
              setModal(prev => ({ ...prev, isOpen: false }));
            }
          });
        }
      });
    }

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  }, [selectedPaths, primaryFile, addToast, handleDownload, handleDownloadSelected, handleDeleteSelected, handleRename, refresh, announce]);


  // ============================================================
  // Derived state
  // ============================================================

  const hasUnsavedChanges = fileContent !== initialContent && primaryFile?.kind === 'file';
  const isImage = primaryFile && isImageFile(primaryFile.name);
  const isMarkdown = primaryFile && isMarkdownFile(primaryFile.name);
  const isTooLarge = fileContent.startsWith('[TOO_LARGE]') || fileContent.startsWith('[BINARY]');

  // Keyboard shortcuts list
  const shortcuts = [
    { keys: [modKey, 'S'], action: 'Save file' },
    { keys: [modKey, 'F'], action: 'Search files' },
    { keys: [modKey, 'B'], action: 'Toggle sidebar' },
    { keys: [modKey, 'N'], action: 'New file' },
    { keys: [modKey, '\u21E7', 'N'], action: 'New folder' },
    { keys: [modKey, 'A'], action: 'Select all' },
    { keys: [modKey, '\u21E7', '?'], action: 'Toggle shortcuts' },
    { keys: ['F2'], action: 'Rename' },
    { keys: ['Del'], action: 'Delete selected' },
    { keys: ['\u2191', '\u2193'], action: 'Navigate tree' },
    { keys: ['\u21E7', '\u2191\u2193'], action: 'Extend selection' },
    { keys: [modKey, 'Click'], action: 'Toggle select' },
    { keys: ['\u21E7', 'Click'], action: 'Range select' },
    { keys: ['Space'], action: 'Toggle select item' },
    { keys: ['\u2190', '\u2192'], action: 'Collapse/Expand' },
    { keys: ['Esc'], action: 'Close/Deselect' },
  ];

  // Count files and folders
  const fileCount = rootFiles.filter(f => f.kind === 'file').length;
  const folderCount = rootFiles.filter(f => f.kind === 'directory').length;

  return (
    <div
        className="flex h-screen w-full bg-dt-bg text-dt-text overflow-hidden font-sans text-[11px] relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="application"
        aria-label="OPFS Explorer"
    >
      {/* Skip Navigation */}
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>

      {/* ARIA Live Region for announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 z-50 bg-dt-bg/90 border-2 border-blue-500 border-dashed flex items-center justify-center pointer-events-none backdrop-blur-sm"
          aria-hidden="true"
        >
            <div className="text-center p-8 rounded-lg bg-dt-surface shadow-xl border border-dt-border">
                <FolderPlus size={48} className="mx-auto mb-4 text-blue-500" aria-hidden="true" />
                <h3 className="text-lg font-medium text-dt-text mb-1">Drop files to upload</h3>
                <p className="text-dt-text-secondary text-xs">to {primaryFile?.kind === 'directory' ? primaryFile.path : 'root'}</p>
            </div>
        </div>
      )}

      {/* Upload Conflict Dialog */}
      {uploadConflict && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
          <div
            className="bg-dt-surface border border-dt-border shadow-xl rounded-lg w-[360px] overflow-hidden modal-content-enter"
            role="alertdialog"
            aria-labelledby="conflict-title"
            aria-describedby="conflict-desc"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-dt-border bg-dt-bg">
              <h3 id="conflict-title" className="font-semibold text-dt-text text-sm">File Already Exists</h3>
            </div>
            <div className="p-4">
              <p id="conflict-desc" className="text-dt-text text-xs mb-4">
                A file named <span className="font-semibold">"{uploadConflict.file.name}"</span> already exists.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleConflictResolve('overwrite')}
                  className="w-full px-3 py-2 rounded text-xs bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 size={12} aria-hidden="true" /> Replace existing file
                </button>
                <button
                  onClick={() => handleConflictResolve('rename')}
                  className="w-full px-3 py-2 rounded text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 hover:bg-blue-600/30 transition-colors"
                >
                  Keep both (rename new file)
                </button>
                <button
                  onClick={() => handleConflictResolve('skip')}
                  className="w-full px-3 py-2 rounded text-xs text-dt-text-secondary border border-dt-border hover:bg-dt-hover transition-colors"
                >
                  Skip this file
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Panel */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[1px] modal-backdrop-enter"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-dt-surface border border-dt-border shadow-xl rounded-lg w-[380px] overflow-hidden modal-content-enter"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-labelledby="shortcuts-title"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-dt-border bg-dt-bg">
              <h3 id="shortcuts-title" className="font-semibold text-dt-text text-sm flex items-center gap-2">
                <Keyboard size={14} aria-hidden="true" /> Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-0.5 rounded text-dt-text-secondary hover:text-dt-text hover:bg-dt-hover transition-colors"
                aria-label="Close keyboard shortcuts"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <ul className="space-y-1.5" role="list">
                {shortcuts.map((shortcut, i) => (
                  <li key={i} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-dt-text-secondary">{shortcut.action}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, j) => (
                        <kbd key={j} className="px-1.5 py-0.5 bg-dt-bg border border-dt-border rounded text-[10px] font-mono min-w-[20px] text-center">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-dt-border bg-dt-surface select-none transition-all duration-200 ${sidebarCollapsed ? 'w-0 overflow-hidden' : ''}`}
        style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
        role="navigation"
        aria-label="File explorer"
      >
        <div className="flex items-center justify-between p-2 border-b border-dt-border h-9">
            <span className="font-semibold text-xs text-dt-text-secondary uppercase tracking-wider pl-1">Explorer</span>
            <div className="flex space-x-0.5" role="toolbar" aria-label="Explorer actions">
                <button
                  onClick={() => {
                    setShowSearch(!showSearch);
                    if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className={`p-1 rounded text-dt-text-secondary transition-colors ${showSearch ? 'bg-dt-hover' : 'hover:bg-dt-hover'}`}
                  title={`Search (${modKey}+F)`}
                  aria-label="Search files"
                  aria-pressed={showSearch}
                >
                    <Search size={14} aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleRootCreate('file')}
                  className="p-1 hover:bg-dt-hover rounded text-dt-text-secondary transition-colors"
                  title={`New File (${modKey}+N)`}
                  aria-label="Create new file"
                >
                    <FilePlus size={14} aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleRootCreate('directory')}
                  className="p-1 hover:bg-dt-hover rounded text-dt-text-secondary transition-colors"
                  title={`New Folder (${modKey}+\u21E7+N)`}
                  aria-label="Create new folder"
                >
                    <FolderPlus size={14} aria-hidden="true" />
                </button>
                <button
                  onClick={refresh}
                  className="p-1 hover:bg-dt-hover rounded text-dt-text-secondary transition-colors"
                  title="Refresh"
                  aria-label="Refresh file list"
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
                </button>
            </div>
        </div>

        {/* Search input */}
        {showSearch && (
          <div className="p-2 border-b border-dt-border">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-dt-text-secondary" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full bg-dt-bg border border-dt-border rounded pl-7 pr-7 py-1.5 text-xs text-dt-text focus:border-[var(--dt-focus)] focus:outline-none transition-colors"
                aria-label="Search files"
                role="searchbox"
                autoComplete="off"
                spellCheck="false"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-dt-text-secondary hover:text-dt-text transition-colors"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="text-[10px] text-dt-text-secondary mt-1 pl-1" aria-live="polite">
                {filteredFiles.length} result{filteredFiles.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        <div
          ref={treeContainerRef}
          className="flex-1 overflow-y-auto p-1"
          role="tree"
          aria-label="File tree"
          aria-multiselectable="true"
          onKeyDown={(e) => {
            // Handle keyboard shortcuts at tree level that TreeItem doesn't handle
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              // Handled by window listener
            }
          }}
        >
            {connectionError ? (
                <div className="p-4 flex flex-col items-center text-center text-dt-text-secondary">
                    <RefreshCw size={24} className="mb-3 text-red-400" aria-hidden="true" />
                    <p className="text-xs mb-3 font-medium">Connection Lost</p>
                    <p className="text-[10px] mb-3 opacity-75">Please reload the page.</p>
                    <button
                        onClick={() => {
                            if (chrome.devtools && chrome.devtools.inspectedWindow) {
                                chrome.devtools.inspectedWindow.reload(undefined);
                                setIsLoading(true);
                                setTimeout(refresh, 2000);
                            }
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-500 transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            ) : error ? (
                <div className="p-4 text-red-400 flex flex-col items-center text-center" role="alert">
                    <AlertCircle size={24} className="mb-2" aria-hidden="true" />
                    <span>{error}</span>
                </div>
            ) : filteredFiles.length === 0 && searchQuery ? (
                <div className="p-4 text-dt-text-secondary text-center text-xs" role="status">
                    No files matching "{searchQuery}"
                </div>
            ) : filteredFiles.length === 0 ? (
                <div className="p-4 text-dt-text-secondary text-center">
                    <Folder size={32} className="mx-auto mb-3 opacity-30" aria-hidden="true" />
                    <p className="text-xs mb-2">OPFS is empty</p>
                    <p className="text-[10px] opacity-60">Drop files here or create new ones</p>
                </div>
            ) : (
                filteredFiles.map(file => (
                    <TreeItem
                        key={file.path}
                        entry={file}
                        onSelect={handleSelect}
                        selectedPaths={selectedPaths}
                        focusedPath={focusedPath}
                        onContextMenu={handleContextMenu}
                        onDrop={handleTreeDrop}
                        refreshTrigger={refreshTrigger}
                        expandedPaths={expandedPaths}
                        onToggleExpand={handleToggleExpand}
                        onFocusPath={handleFocusPath}
                    />
                ))
            )}
        </div>

        {/* Storage Info */}
        {storageEstimate && (
          <div className="p-2 border-t border-dt-border text-[10px] text-dt-text-secondary">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <HardDrive size={10} aria-hidden="true" />
                <span>Storage</span>
              </div>
              <span>{fileCount} file{fileCount !== 1 ? 's' : ''}, {folderCount} folder{folderCount !== 1 ? 's' : ''}</span>
            </div>
            <div
              className="w-full h-1.5 bg-dt-bg rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round((storageEstimate.usage / storageEstimate.quota) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Storage usage: ${formatFileSize(storageEstimate.usage)} of ${formatFileSize(storageEstimate.quota)}`}
            >
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min((storageEstimate.usage / storageEstimate.quota) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span>{formatFileSize(storageEstimate.usage)}</span>
              <span>{formatFileSize(storageEstimate.quota)}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Resize Handle */}
      {!sidebarCollapsed && (
        <ResizeHandle
          onResize={handleSidebarResize}
          minWidth={180}
          maxWidth={400}
          initialWidth={sidebarWidth}
        />
      )}

      {/* Main Area */}
      <main
        id="main-content"
        ref={mainContentRef}
        className="flex-1 flex flex-col h-full bg-dt-bg overflow-hidden"
        aria-label="File content"
      >

        {/* Editor Toolbar / Breadcrumbs */}
        <div className="flex items-center justify-between px-3 h-9 border-b border-dt-border bg-dt-surface" role="toolbar" aria-label="Editor toolbar">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className="p-1 mr-2 hover:bg-dt-hover rounded text-dt-text-secondary transition-colors shrink-0"
              title={sidebarCollapsed ? `Show sidebar (${modKey}+B)` : `Hide sidebar (${modKey}+B)`}
              aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              aria-expanded={!sidebarCollapsed}
            >
              {sidebarCollapsed ? <PanelLeft size={14} aria-hidden="true" /> : <PanelLeftClose size={14} aria-hidden="true" />}
            </button>

            {primaryFile ? (
              <nav className="flex items-center text-dt-text-secondary overflow-hidden min-w-0" aria-label="Breadcrumb">
                <ol className="flex items-center min-w-0" role="list">
                  <li className="shrink-0">
                    <button
                      onClick={clearSelection}
                      className="hover:text-dt-text p-0.5 rounded hover:bg-dt-hover transition-colors"
                      title="Go to root"
                      aria-label="Navigate to root"
                    >
                      <Home size={12} aria-hidden="true" />
                    </button>
                  </li>
                  {primaryFile.path.split('/').map((part: string, i: number, arr: string[]) => {
                    const isLast = i === arr.length - 1;
                    const pathUpToHere = arr.slice(0, i + 1).join('/');
                    return (
                      <li key={i} className="flex items-center min-w-0">
                        <ChevronRight size={12} className="mx-1 opacity-50 shrink-0" aria-hidden="true" />
                        {isLast ? (
                          <span className="text-dt-text font-medium truncate" aria-current="page">{part}</span>
                        ) : (
                          <button
                            onClick={() => handleBreadcrumbNavigate(pathUpToHere)}
                            className="hover:text-dt-text hover:underline truncate"
                            title={`Go to ${pathUpToHere}`}
                          >
                            {part}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {hasUnsavedChanges && (
                  <span className="ml-2 text-xs text-blue-400 shrink-0" aria-label="File has unsaved changes">* Modified</span>
                )}
              </nav>
            ) : (
              <span className="text-dt-text-secondary">No file selected</span>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Selection indicator */}
            {selectedPaths.size > 1 && (
              <span className="text-[10px] text-blue-400 font-medium" aria-live="polite">
                {selectedPaths.size} selected
              </span>
            )}

            {primaryFile?.kind === 'file' && fileMeta && (
              <span className="text-[10px] text-dt-text-secondary">
                {formatFileSize(fileMeta.size)}
              </span>
            )}

            {/* Markdown view toggle */}
            {isMarkdown && !isTooLarge && (
              <div className="flex border border-dt-border rounded overflow-hidden" role="group" aria-label="View mode">
                <button
                  onClick={() => setMarkdownViewMode('preview')}
                  className={`px-2 py-0.5 text-xs flex items-center gap-1 transition-colors ${markdownViewMode === 'preview' ? 'bg-dt-hover text-dt-text' : 'text-dt-text-secondary hover:bg-dt-hover/50'}`}
                  title="Preview"
                  aria-pressed={markdownViewMode === 'preview'}
                >
                  <Eye size={10} aria-hidden="true" /> Preview
                </button>
                <button
                  onClick={() => setMarkdownViewMode('edit')}
                  className={`px-2 py-0.5 text-xs flex items-center gap-1 transition-colors ${markdownViewMode === 'edit' ? 'bg-dt-hover text-dt-text' : 'text-dt-text-secondary hover:bg-dt-hover/50'}`}
                  title="Edit"
                  aria-pressed={markdownViewMode === 'edit'}
                >
                  <Code size={10} aria-hidden="true" /> Edit
                </button>
              </div>
            )}

            {primaryFile?.kind === 'file' && !isImage && !isTooLarge && (
              <button
                onClick={saveFile}
                className={`flex items-center px-2 py-1 rounded text-xs space-x-1 transition-colors
                  ${hasUnsavedChanges ? 'bg-blue-600 text-white hover:bg-blue-500' : 'text-dt-text-secondary hover:bg-dt-hover'}
                `}
                title={`Save (${modKey}+S)`}
                aria-label={hasUnsavedChanges ? 'Save changes' : 'No changes to save'}
              >
                <Save size={12} aria-hidden="true" />
                <span>Save</span>
              </button>
            )}
            {primaryFile?.kind === 'file' && (
              <button
                onClick={() => handleDownload(primaryFile.path)}
                className="flex items-center px-2 py-1 rounded text-xs space-x-1 text-dt-text-secondary hover:bg-dt-hover transition-colors"
                title="Download"
                aria-label="Download file"
              >
                <Download size={12} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 relative overflow-hidden bg-dt-bg">
          {contentLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-dt-text-secondary" role="status" aria-label="Loading file content">
              <RefreshCw size={20} className="animate-spin mr-2" aria-hidden="true" />
              Loading...
            </div>
          ) : primaryFile?.kind === 'file' ? (
            isImage && fileMeta?.isBase64 ? (
              <ImagePreview
                src={fileContent}
                fileName={primaryFile.name}
              />
            ) : isTooLarge ? (
              <div className="flex flex-col items-center justify-center h-full text-dt-text-secondary space-y-4 p-8 text-center">
                {isImage ? <ImageIcon size={48} className="opacity-50" aria-hidden="true" /> : <FileText size={48} className="opacity-50" aria-hidden="true" />}
                <p className="text-sm">{fileContent}</p>
                <button
                  onClick={() => handleDownload(primaryFile.path)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                >
                  <Download size={16} className="mr-2" aria-hidden="true" />
                  Download File
                </button>
              </div>
            ) : isMarkdown && markdownViewMode === 'preview' ? (
              <MarkdownPreview content={fileContent} />
            ) : (
              <FileEditor
                content={fileContent}
                fileName={primaryFile.name}
                onChange={setFileContent}
              />
            )
          ) : primaryFile?.kind === 'directory' ? (
            <div className="flex flex-col items-center justify-center h-full text-dt-text-secondary opacity-50">
              <Folder size={48} className="mb-4" aria-hidden="true" />
              <p>Select a file to edit</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-dt-text-secondary">
              <div className="text-center max-w-md">
                <div className="text-5xl font-light mb-6 opacity-20" aria-hidden="true">OPFS</div>
                <h2 className="text-lg font-medium mb-2 text-dt-text opacity-60">Origin Private File System</h2>
                <p className="text-xs opacity-40 mb-6">
                  A sandboxed file system API for high-performance read/write operations
                </p>
                <div className="grid grid-cols-3 gap-4 text-[10px]">
                  <div className="p-3 rounded bg-dt-surface border border-dt-border">
                    <FilePlus size={20} className="mx-auto mb-2 opacity-40" aria-hidden="true" />
                    <p className="opacity-60">Create files</p>
                  </div>
                  <div className="p-3 rounded bg-dt-surface border border-dt-border">
                    <FolderPlus size={20} className="mx-auto mb-2 opacity-40" aria-hidden="true" />
                    <p className="opacity-60">Organize folders</p>
                  </div>
                  <div className="p-3 rounded bg-dt-surface border border-dt-border">
                    <Download size={20} className="mx-auto mb-2 opacity-40" aria-hidden="true" />
                    <p className="opacity-60">Export files</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <footer className="h-6 border-t border-dt-border bg-dt-surface flex items-center px-3 text-[10px] text-dt-text-secondary justify-between" role="contentinfo">
          <div className="flex space-x-4">
            {selectedPaths.size > 1 && (
              <span className="text-blue-400 font-medium">
                {selectedPaths.size} items selected
              </span>
            )}
            {primaryFile && (
              <>
                <span>{primaryFile.kind === 'file' ? 'File' : 'Directory'}</span>
                {fileMeta && <span>{fileMeta.mimeType}</span>}
                {primaryFile.lastModified && (
                  <span title="Last modified">
                    {new Date(primaryFile.lastModified).toLocaleString()}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowShortcuts(true)}
              className="hover:text-dt-text flex items-center gap-1 transition-colors"
              title="Keyboard shortcuts"
              aria-label="Show keyboard shortcuts"
            >
              <Keyboard size={10} aria-hidden="true" />
              <span>Shortcuts</span>
            </button>
            <span>OPFS Explorer v0.0.4</span>
          </div>
        </footer>

      </main>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      <Modal
        key={modal.isOpen ? 'open' : 'closed'}
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        inputValue={modal.inputValue}
        placeholder={modal.placeholder}
        danger={modal.danger}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal(prev => ({ ...prev, isOpen: false }))}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </div>
  );
}

export default App;
