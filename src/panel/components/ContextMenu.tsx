import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  shortcut?: string;
  icon?: React.ReactNode;
}

export interface ContextMenuSection {
  items: ContextMenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  sections?: ContextMenuSection[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, sections, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Build flat list of all items with separator indices
  const allItems = sections
    ? sections.flatMap(s => s.items)
    : items;

  const separatorAfterIndices = new Set<number>();
  if (sections) {
    let offset = 0;
    for (let i = 0; i < sections.length - 1; i++) {
      offset += sections[i].items.length;
      separatorAfterIndices.add(offset - 1);
    }
  }

  const enabledIndices = allItems
    .map((item, i) => (!item.disabled ? i : -1))
    .filter(i => i !== -1);

  // Adjust position to stay within viewport using layout effect and direct DOM mutation
  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    if (x + rect.width > viewportW) {
      ref.current.style.left = `${Math.max(0, x - rect.width)}px`;
    }
    if (y + rect.height > viewportH) {
      ref.current.style.top = `${Math.max(0, y - rect.height)}px`;
    }
  }, [x, y]);

  // Close on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Focus the menu on mount
  useEffect(() => {
    ref.current?.focus();
  }, []);

  const getNextEnabledIndex = useCallback((current: number, direction: 1 | -1): number => {
    if (enabledIndices.length === 0) return current;
    const currentPos = enabledIndices.indexOf(current);
    if (currentPos === -1) return enabledIndices[0];
    const nextPos = (currentPos + direction + enabledIndices.length) % enabledIndices.length;
    return enabledIndices[nextPos];
  }, [enabledIndices]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => getNextEnabledIndex(prev, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => getNextEnabledIndex(prev, -1));
        break;
      case 'Home':
        e.preventDefault();
        if (enabledIndices.length > 0) setFocusedIndex(enabledIndices[0]);
        break;
      case 'End':
        e.preventDefault();
        if (enabledIndices.length > 0) setFocusedIndex(enabledIndices[enabledIndices.length - 1]);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (allItems[focusedIndex] && !allItems[focusedIndex].disabled) {
          allItems[focusedIndex].onClick();
          onClose();
        }
        break;
      default:
        // Type-ahead: jump to first item starting with typed character
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const char = e.key.toLowerCase();
          const matchIndex = allItems.findIndex(
            (item, i) => !item.disabled && item.label.toLowerCase().startsWith(char) && i > focusedIndex
          );
          if (matchIndex !== -1) {
            setFocusedIndex(matchIndex);
          } else {
            // Wrap around
            const wrapIndex = allItems.findIndex(
              (item) => !item.disabled && item.label.toLowerCase().startsWith(char)
            );
            if (wrapIndex !== -1) setFocusedIndex(wrapIndex);
          }
        }
        break;
    }
  };

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-dt-surface border border-dt-border shadow-lg rounded min-w-[180px] py-1 context-menu-enter"
      style={{ top: y, left: x }}
      role="menu"
      aria-label="Context menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {allItems.map((item, index) => (
        <div key={index}>
          <button
            className={`
              w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors
              ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-default'}
              ${item.danger && !item.disabled ? 'text-red-400' : 'text-dt-text'}
              ${focusedIndex === index && !item.disabled ? 'bg-dt-selection text-dt-selection-text' : ''}
              ${focusedIndex !== index && !item.disabled ? 'hover:bg-dt-hover' : ''}
            `}
            role="menuitem"
            aria-disabled={item.disabled || undefined}
            tabIndex={-1}
            onMouseEnter={() => !item.disabled && setFocusedIndex(index)}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
          >
            {item.icon && (
              <span className="w-4 flex justify-center shrink-0" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <kbd className="ml-4 text-[10px] text-dt-text-secondary/60 font-mono shrink-0">
                {item.shortcut}
              </kbd>
            )}
          </button>
          {separatorAfterIndices.has(index) && (
            <div className="my-1 border-t border-dt-border" role="separator" />
          )}
        </div>
      ))}
    </div>
  );
}
