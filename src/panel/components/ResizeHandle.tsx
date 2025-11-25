import { useCallback, useEffect, useState } from 'react';

interface ResizeHandleProps {
  onResize: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  initialWidth: number;
}

export function ResizeHandle({ onResize, minWidth = 150, maxWidth = 500, initialWidth }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Change cursor globally while dragging
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, minWidth, maxWidth, onResize]);

  return (
    <div
      className={`
        w-1 cursor-col-resize flex-shrink-0 relative group
        ${isDragging ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-500/50'}
        transition-colors
      `}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={initialWidth}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          onResize(Math.max(minWidth, initialWidth - 10));
        } else if (e.key === 'ArrowRight') {
          onResize(Math.min(maxWidth, initialWidth + 10));
        }
      }}
    >
      {/* Visual indicator */}
      <div className={`
        absolute inset-y-0 -left-0.5 -right-0.5
        ${isDragging ? 'bg-blue-500/20' : 'group-hover:bg-blue-500/10'}
      `} />
    </div>
  );
}
