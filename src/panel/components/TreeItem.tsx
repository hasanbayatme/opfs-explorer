import { useState, useEffect, useCallback } from 'react';
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
  onSelect: (entry: FileEntry) => void;
  selectedPath: string | null;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  onDrop?: (e: React.DragEvent, targetEntry: FileEntry) => void;
  onDragStart?: (e: React.DragEvent, entry: FileEntry) => void;
  refreshTrigger?: number;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
}

export function TreeItem({ entry, depth = 0, onSelect, selectedPath, onContextMenu, onDrop, onDragStart, refreshTrigger, expandedPaths, onToggleExpand }: TreeItemProps) {
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const expanded = entry.kind === 'directory' && expandedPaths.has(entry.path);
  const isSelected = selectedPath === entry.path;
  const paddingLeft = `${depth * 12 + 4}px`;

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

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(entry); // Also select on toggle click

    if (entry.kind === 'directory') {
        onToggleExpand(entry.path);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(entry); // Auto select on right click
      onContextMenu(e, entry);
  };

  const handleDragStart = (e: React.DragEvent) => {
      e.stopPropagation();
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
    if (name.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|bmp)$/)) return <Image size={14} className="text-purple-400" aria-hidden="true" />;
    if (name.match(/\.(md|markdown|txt|log)$/)) return <FileText size={14} className="text-gray-400" aria-hidden="true" />;
    if (name.match(/\.(db|sqlite|sqlite3)$/)) return <Database size={14} className="text-green-400" aria-hidden="true" />;
    if (name.match(/\.(wasm)$/)) return <File size={14} className="text-purple-500" aria-hidden="true" />;
    return <File size={14} className="text-gray-400" aria-hidden="true" />;
  };

  return (
    <div role="treeitem" aria-expanded={entry.kind === 'directory' ? expanded : undefined} aria-selected={isSelected}>
      <div
        draggable
        onDragStart={handleDragStart}
        className={`
            flex items-center py-0.5 pr-2 cursor-default select-none group
            ${isSelected ? 'bg-dt-selection text-dt-selection-text' : ''}
            ${!isSelected && !isDragOver ? 'hover:bg-dt-hover text-dt-text' : ''}
            ${isDragOver ? 'bg-blue-500/30 ring-1 ring-inset ring-blue-500 text-dt-text' : ''}
        `}
        style={{ paddingLeft }}
        onClick={handleToggle}
        onContextMenu={handleRightClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle(e as unknown as React.MouseEvent);
          }
        }}
        aria-label={`${entry.kind === 'directory' ? 'Folder' : 'File'}: ${entry.name}${entry.size ? `, ${formatSize(entry.size)}` : ''}`}
      >
        <span className="mr-1 w-4 flex justify-center shrink-0">
          {entry.kind === 'directory' && (
            <button className="focus:outline-none text-dt-text-secondary hover:text-dt-text">
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
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
          <div className="ml-8 text-red-500 text-[10px]">{error}</div>
      )}

      {expanded && (
        <div role="group">
          {loading ? (
             <div className="pl-8 text-gray-400 italic text-[10px]" role="status">Loading...</div>
          ) : (
            children.map(child => (
              <TreeItem
                key={child.path}
                entry={child}
                depth={depth + 1}
                onSelect={onSelect}
                selectedPath={selectedPath}
                onContextMenu={onContextMenu}
                onDrop={onDrop}
                onDragStart={onDragStart}
                refreshTrigger={refreshTrigger}
                expandedPaths={expandedPaths}
                onToggleExpand={onToggleExpand}
              />
            ))
          )}
          {children.length === 0 && !loading && (
              <div className="pl-8 text-gray-400 italic text-[10px] py-1">Empty</div>
          )}
        </div>
      )}
    </div>
  );
}
