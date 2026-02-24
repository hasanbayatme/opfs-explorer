import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, ChevronDown, Folder, FileJson, FileCode, FileText, Image, File, FileType, Database } from 'lucide-react';
import { opfsApi } from '../api';
import type { FileEntry } from '../api';

// Helper to format file sizes compactly
function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === 0) return '';
  const k = 1024;
  if (bytes < k) return `${bytes}B`;
  if (bytes < k * k) return `${(bytes / k).toFixed(0)}K`;
  return `${(bytes / (k * k)).toFixed(1)}M`;
}

interface TreeItemProps {
  entry: FileEntry;
  depth?: number;
  onSelect: (entry: FileEntry, event?: React.MouseEvent | React.KeyboardEvent) => void;
  selectedPaths: Set<string>;
  focusedPath: string | null;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  onDrop?: (e: React.DragEvent, targetEntry: FileEntry) => void;
  onDragStart?: (e: React.DragEvent, entry: FileEntry) => void;
  refreshTrigger?: number;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  onFocusPath?: (path: string) => void;
}

export function TreeItem({
  entry,
  depth = 0,
  onSelect,
  selectedPaths,
  focusedPath,
  onContextMenu,
  onDrop,
  onDragStart,
  refreshTrigger,
  expandedPaths,
  onToggleExpand,
  onFocusPath,
}: TreeItemProps) {
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const expanded = entry.kind === 'directory' && expandedPaths.has(entry.path);
  const isSelected = selectedPaths.has(entry.path);
  const isFocused = focusedPath === entry.path;
  const isMultiSelect = selectedPaths.size > 1;
  const paddingLeft = `${depth * 12 + 4}px`;

  // Scroll into view when focused via keyboard
  useEffect(() => {
    if (isFocused && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isFocused]);

  const fetchChildren = useCallback(async () => {
      setLoading(true);
      try {
        const files = await opfsApi.list(entry.path);
        setChildren(files);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
  }, [entry.path]);

  useEffect(() => {
      if (expanded) {
          fetchChildren();
      }
  }, [expanded, refreshTrigger, fetchChildren]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // If clicking on a directory without modifier keys, toggle expansion
    if (entry.kind === 'directory' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      onToggleExpand(entry.path);
    }

    // Always pass event to parent for selection handling
    onSelect(entry, e);
    onFocusPath?.(entry.path);
  };

  const handleRightClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // If right-clicking on an unselected item, select it
      if (!isSelected) {
        onSelect(entry, e);
      }
      onFocusPath?.(entry.path);
      onContextMenu(e, entry);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onSelect(entry, e);
    } else if (e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      // Space toggles selection (like Ctrl+Click)
      const syntheticEvent = { ...e, ctrlKey: true } as React.KeyboardEvent;
      onSelect(entry, syntheticEvent);
    } else if (e.key === 'ArrowRight' && entry.kind === 'directory') {
      e.preventDefault();
      e.stopPropagation();
      if (!expanded) {
        onToggleExpand(entry.path);
      }
    } else if (e.key === 'ArrowLeft' && entry.kind === 'directory') {
      e.preventDefault();
      e.stopPropagation();
      if (expanded) {
        onToggleExpand(entry.path);
      }
    } else if (e.key === 'F2') {
      e.preventDefault();
      e.stopPropagation();
      // Trigger rename via context menu simulation
      onContextMenu(e as unknown as React.MouseEvent, entry);
    }
    // Arrow Up/Down are handled by App via the tree container
  };

  const handleDragStart = (e: React.DragEvent) => {
      e.stopPropagation();
      // If dragging a selected item and there are multiple selections,
      // include all selected paths
      if (isSelected && selectedPaths.size > 1) {
        e.dataTransfer.setData('application/opfs-paths', JSON.stringify([...selectedPaths]));
      }
      e.dataTransfer.setData('application/opfs-path', entry.path);
      e.dataTransfer.effectAllowed = 'move';
      if (onDragStart) onDragStart(e, entry);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (entry.kind === 'directory') {
          setIsDragOver(true);
          e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/opfs-path') ? 'move' : 'copy';
      }
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (onDrop && entry.kind === 'directory') {
          onDrop(e, entry);
      }
  };

  const getIcon = () => {
    if (entry.kind === 'directory') {
        if (expanded) return <Folder size={14} className="text-dt-text-secondary fill-blue-400/20" aria-hidden="true" />;
        return <Folder size={14} className="text-dt-text-secondary" aria-hidden="true" />;
    }
    const name = entry.name.toLowerCase();
    if (name.endsWith('.json')) return <FileJson size={14} className="text-yellow-400" aria-hidden="true" />;
    if (name.endsWith('.js') || name.endsWith('.jsx')) return <FileCode size={14} className="text-yellow-500" aria-hidden="true" />;
    if (name.endsWith('.ts') || name.endsWith('.tsx')) return <FileCode size={14} className="text-blue-400" aria-hidden="true" />;
    if (name.endsWith('.css') || name.endsWith('.scss') || name.endsWith('.sass')) return <FileType size={14} className="text-pink-400" aria-hidden="true" />;
    if (name.endsWith('.html') || name.endsWith('.htm')) return <FileCode size={14} className="text-orange-400" aria-hidden="true" />;
    if (name.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|bmp|avif)$/)) return <Image size={14} className="text-purple-400" aria-hidden="true" />;
    if (name.match(/\.(md|markdown|txt|log|csv|tsv)$/)) return <FileText size={14} className="text-gray-400" aria-hidden="true" />;
    if (name.match(/\.(scene|prefab|asset|meta|tscn|tres|gd|unity|godot|material|shader|glsl|wgsl|hlsl)$/)) return <FileCode size={14} className="text-green-300" aria-hidden="true" />;
    if (name.match(/\.(yaml|yml|toml|ini|cfg|conf|config|env|properties|lock)$/)) return <FileCode size={14} className="text-teal-400" aria-hidden="true" />;
    if (name.match(/\.(py|rb|php|go|rs|swift|kt|dart|lua|r|ex|exs|erl|hs|elm|clj)$/)) return <FileCode size={14} className="text-amber-400" aria-hidden="true" />;
    if (name.match(/\.(c|cpp|h|hpp|cc|java)$/)) return <FileCode size={14} className="text-blue-300" aria-hidden="true" />;
    if (name.match(/\.(xml|svg|plist|proto|graphql)$/)) return <FileCode size={14} className="text-orange-300" aria-hidden="true" />;
    if (name.match(/\.(sql)$/)) return <Database size={14} className="text-blue-400" aria-hidden="true" />;
    if (name.match(/\.(db|sqlite|sqlite3)$/)) return <Database size={14} className="text-green-400" aria-hidden="true" />;
    if (name.match(/\.(wasm)$/)) return <File size={14} className="text-purple-500" aria-hidden="true" />;
    if (name.match(/\.(zip|tar|gz|tgz|bz2|xz|7z|rar)$/)) return <File size={14} className="text-yellow-600" aria-hidden="true" />;
    return <File size={14} className="text-gray-400" aria-hidden="true" />;
  };

  return (
    <div
      role="treeitem"
      aria-expanded={entry.kind === 'directory' ? expanded : undefined}
      aria-selected={isSelected}
      aria-label={`${entry.kind === 'directory' ? 'Folder' : 'File'}: ${entry.name}${entry.size ? `, ${formatSize(entry.size)}` : ''}${isSelected && isMultiSelect ? ', selected' : ''}`}
    >
      <div
        ref={itemRef}
        data-path={entry.path}
        data-kind={entry.kind}
        draggable
        onDragStart={handleDragStart}
        className={`
            tree-item flex items-center py-0.5 pr-2 cursor-default select-none group transition-colors
            ${isSelected ? 'bg-dt-selection text-dt-selection-text' : ''}
            ${!isSelected && !isDragOver ? 'hover:bg-dt-hover text-dt-text' : ''}
            ${isDragOver ? 'bg-blue-500/30 ring-1 ring-inset ring-blue-500 text-dt-text' : ''}
            ${isFocused ? 'tree-item-focused' : ''}
        `}
        style={{ paddingLeft }}
        onClick={handleClick}
        onContextMenu={handleRightClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={isFocused ? 0 : -1}
        onKeyDown={handleKeyDown}
      >
        {/* Multi-select checkbox indicator */}
        {isMultiSelect && (
          <span className={`
            mr-1 w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 transition-colors
            ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-dt-border'}
          `} aria-hidden="true">
            {isSelected && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
        )}

        <span className="mr-1 w-4 flex justify-center shrink-0">
          {entry.kind === 'directory' && (
            <span className="text-dt-text-secondary hover:text-dt-text" aria-hidden="true">
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          )}
        </span>

        <span className="mr-1.5 shrink-0">
            {getIcon()}
        </span>

        <span className="truncate text-[11px] leading-tight flex-1">{entry.name}</span>

        {entry.kind === 'file' && entry.size !== undefined && (
          <span className="text-[9px] text-dt-text-secondary/60 ml-1 shrink-0 tabular-nums">
            {formatSize(entry.size)}
          </span>
        )}
      </div>

      {error && expanded && (
          <div className="ml-8 text-red-500 text-[10px]" role="alert">{error}</div>
      )}

      {expanded && (
        <div role="group" aria-label={`Contents of ${entry.name}`}>
          {loading ? (
             <div className="pl-8 text-gray-400 italic text-[10px]" role="status">Loading...</div>
          ) : (
            children.map(child => (
              <TreeItem
                key={child.path}
                entry={child}
                depth={depth + 1}
                onSelect={onSelect}
                selectedPaths={selectedPaths}
                focusedPath={focusedPath}
                onContextMenu={onContextMenu}
                onDrop={onDrop}
                onDragStart={onDragStart}
                refreshTrigger={refreshTrigger}
                expandedPaths={expandedPaths}
                onToggleExpand={onToggleExpand}
                onFocusPath={onFocusPath}
              />
            ))
          )}
          {children.length === 0 && !loading && (
              <div className="pl-8 text-gray-400 italic text-[10px] py-1" aria-label="Empty folder">Empty</div>
          )}
        </div>
      )}
    </div>
  );
}
