import { useState, useEffect, useCallback, useRef } from 'react';
import { opfsApi } from './api';
import type { FileEntry } from './api';
import { TreeItem } from './components/TreeItem';
import { ContextMenu } from './components/ContextMenu';
import { FileEditor } from './components/FileEditor';
import { Modal } from './components/Modal';
import { ToastContainer } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import { RefreshCw, Save, FolderPlus, FilePlus, Home, ChevronRight, AlertCircle, Download } from 'lucide-react';

function App() {
  const [rootFiles, setRootFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [initialContent, setInitialContent] = useState<string>(''); // For diffing unsaved changes
  const [isLoading, setIsLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
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

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setConnectionError(false);
    try {
      const files = await opfsApi.list('');
      setRootFiles(files);
      setRefreshTrigger(prev => prev + 1);
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
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
    // Keeps the event alive
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

    // Determine target path
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
      
      // Check for internal move
      const opfsPath = e.dataTransfer.getData('application/opfs-path');
      if (opfsPath) {
          const targetPath = targetEntry.kind === 'directory' ? targetEntry.path : targetEntry.path.split('/').slice(0, -1).join('/');
          
          // Prevent moving into self or same directory
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

      // Handle external file upload
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      
      handleFileUpload(files, targetEntry.path);
  };

  const handleFileUpload = async (files: File[], targetPath: string) => {
      setIsLoading(true);
      let successCount = 0;

      for (const file of files) {
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
          addToast('success', `Uploaded ${successCount} files`);
          refresh();
      }
  };

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

  const handleDownload = useCallback(async (path: string) => {
      try {
          await opfsApi.download(path);
          addToast('success', 'Download started');
      } catch (err) {
          addToast('error', `Download failed: ${err instanceof Error ? err.message : String(err)}`);
      }
  }, [addToast]);

  // Keyboard shortcut for Save (Ctrl/Cmd + S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (selectedFile && selectedFile.kind === 'file') {
          saveFile();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, fileContent, saveFile]);

  const handleSelect = async (entry: FileEntry) => {
    if (selectedFile?.path === entry.path) return;
    
    setSelectedFile(entry);
    setContextMenu(null);

    if (entry.kind === 'file') {
        setContentLoading(true);
        try {
            const content = await opfsApi.read(entry.path);
            setFileContent(content);
            setInitialContent(content);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setFileContent(`Error reading file: ${message}`);
            addToast('error', message);
        } finally {
            setContentLoading(false);
        }
    } else {
        setFileContent('');
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
                    message: `Are you sure you want to delete ${entry.name}?`,
                    onConfirm: async () => {
                         try {
                            await opfsApi.delete(entry.path);
                            if (selectedFile?.path === entry.path) {
                                setSelectedFile(null);
                                setFileContent('');
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
  }

  const hasUnsavedChanges = fileContent !== initialContent && selectedFile?.kind === 'file';
  const isLargeOrBinary = fileContent.startsWith('[BINARY_OR_LARGE]');

  return (
    <div 
        className="flex h-screen w-full bg-dt-bg text-dt-text overflow-hidden font-sans text-[11px] relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-dt-bg/90 border-2 border-blue-500 border-dashed flex items-center justify-center pointer-events-none backdrop-blur-sm">
            <div className="text-center p-8 rounded-lg bg-dt-surface shadow-xl border border-dt-border">
                <FolderPlus size={48} className="mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-medium text-dt-text mb-1">Drop files to upload</h3>
                <p className="text-dt-text-secondary text-xs">to {selectedFile?.kind === 'directory' ? selectedFile.path : 'root'}</p>
            </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-64 flex flex-col border-r border-dt-border bg-dt-surface select-none">
        <div className="flex items-center justify-between p-2 border-b border-dt-border h-9">
            <span className="font-semibold text-xs text-dt-text-secondary uppercase tracking-wider pl-1">Explorer</span>
            <div className="flex space-x-1">
                <button onClick={() => handleRootCreate('file')} className="p-1 hover:bg-dt-hover rounded text-dt-text-secondary" title="New File">
                    <FilePlus size={14} />
                </button>
                <button onClick={() => handleRootCreate('directory')} className="p-1 hover:bg-dt-hover rounded text-dt-text-secondary" title="New Folder">
                    <FolderPlus size={14} />
                </button>
                <button onClick={refresh} className="p-1 hover:bg-dt-hover rounded text-dt-text-secondary" title="Refresh">
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-1">
            {connectionError ? (
                <div className="p-4 flex flex-col items-center text-center text-dt-text-secondary">
                    <RefreshCw size={24} className="mb-3 text-red-400" />
                    <p className="text-xs mb-3 font-medium">Connection Lost</p>
                    <p className="text-[10px] mb-3 opacity-75">The content script is missing. Please reload the page.</p>
                    <button 
                        onClick={() => {
                            if (chrome.devtools && chrome.devtools.inspectedWindow) {
                                chrome.devtools.inspectedWindow.reload(undefined);
                                // Give it time to reload and inject scripts before refreshing
                                setIsLoading(true);
                                setTimeout(refresh, 2000);
                            } else {
                                alert("Cannot reload: chrome.devtools not found");
                            }
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-500 transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            ) : error ? (
                <div className="p-4 text-red-400 flex flex-col items-center text-center">
                    <AlertCircle size={24} className="mb-2"/>
                    <span>{error}</span>
                </div>
            ) : (
                rootFiles.map(file => (
                    <TreeItem 
                        key={file.path} 
                        entry={file} 
                        onSelect={handleSelect} 
                        selectedPath={selectedFile?.path || null}
                        onContextMenu={handleContextMenu}
                        onDrop={handleTreeDrop}
                        refreshTrigger={refreshTrigger}
                    />
                ))
            )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full bg-dt-bg overflow-hidden">
        
        {/* Editor Toolbar / Breadcrumbs */}
        {selectedFile ? (
             <div className="flex items-center justify-between px-3 h-9 border-b border-dt-border bg-dt-surface">
                <div className="flex items-center text-dt-text-secondary overflow-hidden">
                     <Home size={12} className="mr-1" />
                     {selectedFile.path.split('/').map((part: string, i: number) => (
                         <div key={i} className="flex items-center">
                            <ChevronRight size={12} className="mx-1 opacity-50" />
                            <span className={i === selectedFile.path.split('/').length - 1 ? 'text-dt-text font-medium' : ''}>
                                {part}
                            </span>
                         </div>
                     ))}
                     {hasUnsavedChanges && <span className="ml-2 text-xs text-blue-400">● Modified</span>}
                </div>
                
                <div className="flex space-x-2">
                    {selectedFile.kind === 'file' && !isLargeOrBinary && (
                        <button 
                            onClick={saveFile}
                            className={`flex items-center px-2 py-1 rounded text-xs space-x-1 
                                ${hasUnsavedChanges ? 'bg-blue-600 text-white hover:bg-blue-500' : 'text-dt-text-secondary hover:bg-dt-hover'}
                            `}
                        >
                            <Save size={12} />
                            <span>Save</span>
                        </button>
                    )}
                     {selectedFile.kind === 'file' && (
                        <button 
                            onClick={() => handleDownload(selectedFile.path)}
                            className="flex items-center px-2 py-1 rounded text-xs space-x-1 text-dt-text-secondary hover:bg-dt-hover"
                            title="Download"
                        >
                            <Download size={12} />
                        </button>
                    )}
                </div>
             </div>
        ) : (
            <div className="h-9 border-b border-dt-border bg-dt-surface" />
        )}

        {/* Editor Content */}
        <div className="flex-1 relative overflow-hidden bg-dt-bg">
             {contentLoading ? (
                 <div className="absolute inset-0 flex items-center justify-center text-dt-text-secondary">
                     Loading...
                 </div>
             ) : selectedFile?.kind === 'file' ? (
                 isLargeOrBinary ? (
                     <div className="flex flex-col items-center justify-center h-full text-dt-text-secondary space-y-4 p-8 text-center">
                         <AlertCircle size={48} className="opacity-50" />
                         <p>{fileContent}</p>
                         <button 
                             onClick={() => handleDownload(selectedFile.path)}
                             className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
                         >
                             <Download size={16} className="mr-2" />
                             Download File
                         </button>
                     </div>
                 ) : (
                     <FileEditor 
                        content={fileContent} 
                        fileName={selectedFile.name} 
                        onChange={setFileContent} 
                     />
                 )
             ) : selectedFile?.kind === 'directory' ? (
                 <div className="flex flex-col items-center justify-center h-full text-dt-text-secondary opacity-50">
                     <FolderPlus size={48} className="mb-4" />
                     <p>Select a file to edit</p>
                 </div>
             ) : (
                 <div className="flex flex-col items-center justify-center h-full text-dt-text-secondary opacity-30">
                     <div className="text-6xl font-light mb-4">OPFS</div>
                     <p>Select a file to view contents</p>
                 </div>
             )}
        </div>

        {/* Status Bar */}
        <div className="h-6 border-t border-dt-border bg-dt-surface flex items-center px-3 text-[10px] text-dt-text-secondary justify-between">
            <div className="flex space-x-4">
                {selectedFile && (
                    <>
                        <span>{selectedFile.kind === 'file' ? 'File' : 'Directory'}</span>
                        <span>UTF-8</span>
                    </>
                )}
            </div>
            <div>
                OPFS Explorer v1.0
            </div>
        </div>

      </div>

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