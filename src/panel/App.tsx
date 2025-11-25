import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { opfsApi, type StorageEstimate, type FileReadResult } from './api';
import type { FileEntry } from './api';
import { TreeItem } from './components/TreeItem';
import { ContextMenu } from './components/ContextMenu';
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
  FileText, Image as ImageIcon, Folder
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

function App() {
  const [rootFiles, setRootFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileMeta, setFileMeta] = useState<FileReadResult | null>(null);
  const [initialContent, setInitialContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
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

  // Tree expanded state - persisted to preserve across refreshes
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

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }[] } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // UI State
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt';
    title: string;
    message?: string;
    inputValue?: string;
    placeholder?: string;
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

  // Navigate to a folder via breadcrumb - expand all parents and select
  const handleBreadcrumbNavigate = useCallback(async (targetPath: string) => {
    // Expand all parent paths
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

    // Create a synthetic FileEntry for the folder and select it
    const entry: FileEntry = {
      name: parts[parts.length - 1] || 'root',
      kind: 'directory',
      path: targetPath
    };
    setSelectedFile(entry);
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

  // Define saveFile before keyboard shortcuts useEffect
  const saveFile = useCallback(async () => {
    if (!selectedFile || selectedFile.kind !== 'file') return;
    try {
      await opfsApi.write(selectedFile.path, fileContent);
      setInitialContent(fileContent);
      addToast('success', 'File saved');
    } catch (err) {
      addToast('error', `Failed to save: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [selectedFile, fileContent, addToast]);

  // Define handleDeleteSelected before keyboard shortcuts useEffect
  const handleDeleteSelected = useCallback(() => {
    if (!selectedFile) return;
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Delete',
      message: `Are you sure you want to delete "${selectedFile.name}"?`,
      onConfirm: async () => {
        try {
          await opfsApi.delete(selectedFile.path);
          setSelectedFile(null);
          setFileContent('');
          setFileMeta(null);
          refresh();
          addToast('success', 'Deleted successfully');
        } catch (err) {
          addToast('error', `Delete failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        setModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [selectedFile, addToast, refresh]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S - Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (selectedFile && selectedFile.kind === 'file') {
          saveFile();
        }
      }
      // Ctrl/Cmd + F - Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      // Ctrl/Cmd + B - Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
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
      }
      // Ctrl/Cmd + Shift + ? - Show shortcuts
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '?') {
        e.preventDefault();
        setShowShortcuts(true);
      }
      // Delete - Delete selected file
      if (e.key === 'Delete' && selectedFile && !modal.isOpen) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, modal.isOpen, showSearch, showShortcuts, saveFile, handleDeleteSelected]);

  // Drag and Drop Handlers
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
    if (selectedFile && selectedFile.kind === 'directory') {
        targetPath = selectedFile.path;
    } else if (selectedFile && selectedFile.kind === 'file') {
        const parts = selectedFile.path.split('/');
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

  const handleDownload = useCallback(async (path: string) => {
      try {
          await opfsApi.download(path);
          addToast('success', 'Download started');
      } catch (err) {
          addToast('error', `Download failed: ${err instanceof Error ? err.message : String(err)}`);
      }
  }, [addToast]);

  const handleSelect = async (entry: FileEntry) => {
    if (selectedFile?.path === entry.path) return;

    setSelectedFile(entry);
    setContextMenu(null);
    setMarkdownViewMode('preview');

    if (entry.kind === 'file') {
        setContentLoading(true);
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
    } else {
        setFileContent('');
        setFileMeta(null);
    }
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault();
    const items = [
        {
            label: 'Rename',
            onClick: () => {
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
                                setModal(prev => ({ ...prev, isOpen: false }));
                            } catch (err) {
                                addToast('error', `Rename failed: ${err instanceof Error ? err.message : String(err)}`);
                            }
                        } else {
                            setModal(prev => ({ ...prev, isOpen: false }));
                        }
                    }
                });
            }
        },
        {
            label: 'Delete',
            danger: true,
            onClick: () => {
                setModal({
                    isOpen: true,
                    type: 'confirm',
                    title: 'Delete',
                    message: `Are you sure you want to delete "${entry.name}"?`,
                    onConfirm: async () => {
                         try {
                            await opfsApi.delete(entry.path);
                            if (selectedFile?.path === entry.path) {
                                setSelectedFile(null);
                                setFileContent('');
                                setFileMeta(null);
                            }
                            refresh();
                            addToast('success', 'Deleted successfully');
                        } catch (err) {
                            addToast('error', `Delete failed: ${err instanceof Error ? err.message : String(err)}`);
                        }
                        setModal(prev => ({ ...prev, isOpen: false }));
                    }
                });
            }
        },
        {
           label: 'Copy Path',
           onClick: () => {
               navigator.clipboard.writeText(entry.path)
                .then(() => addToast('info', 'Path copied to clipboard'))
                .catch(() => addToast('error', 'Failed to copy path'));
           }
        }
    ];

    if (entry.kind === 'file') {
        items.unshift({
            label: 'Download',
            onClick: () => handleDownload(entry.path)
        });
    }

    if (entry.kind === 'directory') {
        items.unshift({
            label: 'New File',
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
                                 setModal(prev => ({ ...prev, isOpen: false }));
                             } catch (e) {
                                 addToast('error', e instanceof Error ? e.message : String(e));
                             }
                         }
                     }
                 });
            }
        }, {
            label: 'New Folder',
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
                                 setModal(prev => ({ ...prev, isOpen: false }));
                             } catch (e) {
                                 addToast('error', e instanceof Error ? e.message : String(e));
                             }
                         }
                     }
                 });
            }
        });
    }

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  }, [selectedFile, addToast, handleDownload, refresh]);

  const handleRootCreate = async (kind: 'file' | 'directory') => {
      setModal({
          isOpen: true,
          type: 'prompt',
          title: kind === 'file' ? 'New File' : 'New Folder',
          placeholder: kind === 'file' ? 'filename.txt' : 'folder_name',
          onConfirm: async (name) => {
              if (name) {
                  try {
                      await opfsApi.create(name, kind);
                      refresh();
                      setModal(prev => ({ ...prev, isOpen: false }));
                  } catch (e) {
                      addToast('error', e instanceof Error ? e.message : String(e));
                  }
              }
          }
      });
  };

  const hasUnsavedChanges = fileContent !== initialContent && selectedFile?.kind === 'file';
  const isImage = selectedFile && isImageFile(selectedFile.name);
  const isMarkdown = selectedFile && isMarkdownFile(selectedFile.name);
  const isTooLarge = fileContent.startsWith('[TOO_LARGE]') || fileContent.startsWith('[BINARY]');

  // Keyboard shortcuts list
  const shortcuts = [
    { keys: ['Ctrl', 'S'], action: 'Save file' },
    { keys: ['Ctrl', 'F'], action: 'Search files' },
    { keys: ['Ctrl', 'B'], action: 'Toggle sidebar' },
    { keys: ['Ctrl', 'Shift', '?'], action: 'Show shortcuts' },
    { keys: ['Delete'], action: 'Delete selected' },
    { keys: ['Escape'], action: 'Close panel/search' },
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
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-dt-bg/90 border-2 border-blue-500 border-dashed flex items-center justify-center pointer-events-none backdrop-blur-sm">
            <div className="text-center p-8 rounded-lg bg-dt-surface shadow-xl border border-dt-border">
                <FolderPlus size={48} className="mx-auto mb-4 text-blue-500" aria-hidden="true" />
                <h3 className="text-lg font-medium text-dt-text mb-1">Drop files to upload</h3>
                <p className="text-dt-text-secondary text-xs">to {selectedFile?.kind === 'directory' ? selectedFile.path : 'root'}</p>
            </div>
        </div>
      )}

      {/* Upload Conflict Dialog */}
      {uploadConflict && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
          <div className="bg-dt-surface border border-dt-border shadow-xl rounded-lg w-[360px] overflow-hidden" role="alertdialog" aria-labelledby="conflict-title">
            <div className="flex items-center justify-between px-4 py-2 border-b border-dt-border bg-dt-bg">
              <h3 id="conflict-title" className="font-semibold text-dt-text text-sm">File Already Exists</h3>
            </div>
            <div className="p-4">
              <p className="text-dt-text text-xs mb-4">
                A file named <span className="font-semibold">"{uploadConflict.file.name}"</span> already exists.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleConflictResolve('overwrite')}
                  className="w-full px-3 py-2 rounded text-xs bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 flex items-center justify-center gap-2"
                >
                  <Trash2 size={12} /> Replace existing file
                </button>
                <button
                  onClick={() => handleConflictResolve('rename')}
                  className="w-full px-3 py-2 rounded text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 hover:bg-blue-600/30"
                >
                  Keep both (rename new file)
                </button>
                <button
                  onClick={() => handleConflictResolve('skip')}
                  className="w-full px-3 py-2 rounded text-xs text-dt-text-secondary border border-dt-border hover:bg-dt-hover"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[1px]" onClick={() => setShowShortcuts(false)}>
          <div className="bg-dt-surface border border-dt-border shadow-xl rounded-lg w-[320px] overflow-hidden" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="shortcuts-title">
            <div className="flex items-center justify-between px-4 py-2 border-b border-dt-border bg-dt-bg">
              <h3 id="shortcuts-title" className="font-semibold text-dt-text text-sm flex items-center gap-2">
                <Keyboard size={14} /> Keyboard Shortcuts
              </h3>
              <button onClick={() => setShowShortcuts(false)} className="text-dt-text-secondary hover:text-dt-text" aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                {shortcuts.map((shortcut, i) => (
                  <li key={i} className="flex items-center justify-between text-xs">
                    <span className="text-dt-text-secondary">{shortcut.action}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, j) => (
                        <kbd key={j} className="px-1.5 py-0.5 bg-dt-bg border border-dt-border rounded text-[10px] font-mono">
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
            <div className="flex space-x-1">
                <button
                  onClick={() => {
                    setShowSearch(!showSearch);
                    if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className={`p-1 rounded text-dt-text-secondary ${showSearch ? 'bg-dt-hover' : 'hover:bg-dt-hover'}`}
                  title="Search (Ctrl+F)"
                  aria-label="Search files"
                  aria-pressed={showSearch}
                >
                    <Search size={14} />
                </button>
                <button onClick={() => handleRootCreate('file')} className="p-1 hover:bg-dt-hover rounded text-dt-text-secondary" title="New File" aria-label="Create new file">
                    <FilePlus size={14} />
                </button>
                <button onClick={() => handleRootCreate('directory')} className="p-1 hover:bg-dt-hover rounded text-dt-text-secondary" title="New Folder" aria-label="Create new folder">
                    <FolderPlus size={14} />
                </button>
                <button onClick={refresh} className="p-1 hover:bg-dt-hover rounded text-dt-text-secondary" title="Refresh" aria-label="Refresh file list">
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>

        {/* Search input */}
        {showSearch && (
          <div className="p-2 border-b border-dt-border">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-dt-text-secondary" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full bg-dt-bg border border-dt-border rounded pl-7 pr-7 py-1 text-xs text-dt-text focus:border-blue-500 focus:outline-none"
                aria-label="Search files"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-dt-text-secondary hover:text-dt-text"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-1" role="tree" aria-label="File tree">
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
                        className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-500"
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
                <div className="p-4 text-dt-text-secondary text-center text-xs">
                    No files matching "{searchQuery}"
                </div>
            ) : filteredFiles.length === 0 ? (
                <div className="p-4 text-dt-text-secondary text-center">
                    <Folder size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-xs mb-2">OPFS is empty</p>
                    <p className="text-[10px] opacity-60">Drop files here or create new ones</p>
                </div>
            ) : (
                filteredFiles.map(file => (
                    <TreeItem
                        key={file.path}
                        entry={file}
                        onSelect={handleSelect}
                        selectedPath={selectedFile?.path || null}
                        onContextMenu={handleContextMenu}
                        onDrop={handleTreeDrop}
                        refreshTrigger={refreshTrigger}
                        expandedPaths={expandedPaths}
                        onToggleExpand={handleToggleExpand}
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
              <span>{fileCount} files, {folderCount} folders</span>
            </div>
            <div className="w-full h-1.5 bg-dt-bg rounded-full overflow-hidden">
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
      <main className="flex-1 flex flex-col h-full bg-dt-bg overflow-hidden">

        {/* Editor Toolbar / Breadcrumbs */}
        <div className="flex items-center justify-between px-3 h-9 border-b border-dt-border bg-dt-surface">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className="p-1 mr-2 hover:bg-dt-hover rounded text-dt-text-secondary"
              title={sidebarCollapsed ? 'Show sidebar (Ctrl+B)' : 'Hide sidebar (Ctrl+B)'}
              aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {sidebarCollapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
            </button>

            {selectedFile ? (
              <nav className="flex items-center text-dt-text-secondary overflow-hidden" aria-label="Breadcrumb">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setFileContent('');
                    setFileMeta(null);
                  }}
                  className="hover:text-dt-text p-0.5 rounded hover:bg-dt-hover"
                  title="Go to root"
                >
                  <Home size={12} aria-hidden="true" />
                </button>
                {selectedFile.path.split('/').map((part: string, i: number, arr: string[]) => {
                  const isLast = i === arr.length - 1;
                  const pathUpToHere = arr.slice(0, i + 1).join('/');
                  return (
                    <div key={i} className="flex items-center">
                      <ChevronRight size={12} className="mx-1 opacity-50" aria-hidden="true" />
                      {isLast ? (
                        <span className="text-dt-text font-medium">{part}</span>
                      ) : (
                        <button
                          onClick={() => handleBreadcrumbNavigate(pathUpToHere)}
                          className="hover:text-dt-text hover:underline"
                          title={`Go to ${pathUpToHere}`}
                        >
                          {part}
                        </button>
                      )}
                    </div>
                  );
                })}
                {hasUnsavedChanges && <span className="ml-2 text-xs text-blue-400">* Modified</span>}
              </nav>
            ) : (
              <span className="text-dt-text-secondary">No file selected</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {selectedFile?.kind === 'file' && fileMeta && (
              <span className="text-[10px] text-dt-text-secondary">
                {formatFileSize(fileMeta.size)}
              </span>
            )}

            {/* Markdown view toggle */}
            {isMarkdown && !isTooLarge && (
              <div className="flex border border-dt-border rounded overflow-hidden">
                <button
                  onClick={() => setMarkdownViewMode('preview')}
                  className={`px-2 py-0.5 text-xs flex items-center gap-1 ${markdownViewMode === 'preview' ? 'bg-dt-hover text-dt-text' : 'text-dt-text-secondary hover:bg-dt-hover/50'}`}
                  title="Preview"
                >
                  <Eye size={10} /> Preview
                </button>
                <button
                  onClick={() => setMarkdownViewMode('edit')}
                  className={`px-2 py-0.5 text-xs flex items-center gap-1 ${markdownViewMode === 'edit' ? 'bg-dt-hover text-dt-text' : 'text-dt-text-secondary hover:bg-dt-hover/50'}`}
                  title="Edit"
                >
                  <Code size={10} /> Edit
                </button>
              </div>
            )}

            {selectedFile?.kind === 'file' && !isImage && !isTooLarge && (
              <button
                onClick={saveFile}
                className={`flex items-center px-2 py-1 rounded text-xs space-x-1
                  ${hasUnsavedChanges ? 'bg-blue-600 text-white hover:bg-blue-500' : 'text-dt-text-secondary hover:bg-dt-hover'}
                `}
                aria-label={hasUnsavedChanges ? 'Save changes' : 'No changes to save'}
              >
                <Save size={12} aria-hidden="true" />
                <span>Save</span>
              </button>
            )}
            {selectedFile?.kind === 'file' && (
              <button
                onClick={() => handleDownload(selectedFile.path)}
                className="flex items-center px-2 py-1 rounded text-xs space-x-1 text-dt-text-secondary hover:bg-dt-hover"
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
            <div className="absolute inset-0 flex items-center justify-center text-dt-text-secondary" role="status">
              <RefreshCw size={20} className="animate-spin mr-2" aria-hidden="true" />
              Loading...
            </div>
          ) : selectedFile?.kind === 'file' ? (
            isImage && fileMeta?.isBase64 ? (
              <ImagePreview
                src={fileContent}
                fileName={selectedFile.name}
              />
            ) : isTooLarge ? (
              <div className="flex flex-col items-center justify-center h-full text-dt-text-secondary space-y-4 p-8 text-center">
                {isImage ? <ImageIcon size={48} className="opacity-50" /> : <FileText size={48} className="opacity-50" />}
                <p className="text-sm">{fileContent}</p>
                <button
                  onClick={() => handleDownload(selectedFile.path)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
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
                fileName={selectedFile.name}
                onChange={setFileContent}
              />
            )
          ) : selectedFile?.kind === 'directory' ? (
            <div className="flex flex-col items-center justify-center h-full text-dt-text-secondary opacity-50">
              <Folder size={48} className="mb-4" aria-hidden="true" />
              <p>Select a file to edit</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-dt-text-secondary">
              <div className="text-center max-w-md">
                <div className="text-5xl font-light mb-6 opacity-20">OPFS</div>
                <h2 className="text-lg font-medium mb-2 text-dt-text opacity-60">Origin Private File System</h2>
                <p className="text-xs opacity-40 mb-6">
                  A sandboxed file system API for high-performance read/write operations
                </p>
                <div className="grid grid-cols-3 gap-4 text-[10px]">
                  <div className="p-3 rounded bg-dt-surface border border-dt-border">
                    <FilePlus size={20} className="mx-auto mb-2 opacity-40" />
                    <p className="opacity-60">Create files</p>
                  </div>
                  <div className="p-3 rounded bg-dt-surface border border-dt-border">
                    <FolderPlus size={20} className="mx-auto mb-2 opacity-40" />
                    <p className="opacity-60">Organize folders</p>
                  </div>
                  <div className="p-3 rounded bg-dt-surface border border-dt-border">
                    <Download size={20} className="mx-auto mb-2 opacity-40" />
                    <p className="opacity-60">Export files</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <footer className="h-6 border-t border-dt-border bg-dt-surface flex items-center px-3 text-[10px] text-dt-text-secondary justify-between">
          <div className="flex space-x-4">
            {selectedFile && (
              <>
                <span>{selectedFile.kind === 'file' ? 'File' : 'Directory'}</span>
                {fileMeta && <span>{fileMeta.mimeType}</span>}
                {selectedFile.lastModified && (
                  <span title="Last modified">
                    {new Date(selectedFile.lastModified).toLocaleString()}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowShortcuts(true)}
              className="hover:text-dt-text flex items-center gap-1"
              title="Keyboard shortcuts"
              aria-label="Show keyboard shortcuts"
            >
              <Keyboard size={10} aria-hidden="true" />
              <span>Shortcuts</span>
            </button>
            <span>OPFS Explorer v0.0.3</span>
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
