import { useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  fileName: string;
}

export function ImagePreview({ src, fileName }: ImagePreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev + 25, 400)), []);
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev - 25, 25)), []);
  const handleRotate = useCallback(() => setRotation(prev => (prev + 90) % 360), []);
  const handleReset = useCallback(() => {
    setZoom(100);
    setRotation(0);
  }, []);

  // Keyboard shortcuts for image manipulation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when not in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleRotate();
          }
          break;
        case '0':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleReset();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleRotate, handleReset]);

  return (
    <div className="flex flex-col h-full" role="region" aria-label={`Image preview: ${fileName}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-dt-border bg-dt-surface" role="toolbar" aria-label="Image controls">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-dt-hover rounded text-dt-text-secondary hover:text-dt-text disabled:opacity-30 transition-colors"
            title="Zoom out (−)"
            aria-label={`Zoom out. Current zoom: ${zoom}%`}
            disabled={zoom <= 25}
          >
            <ZoomOut size={14} aria-hidden="true" />
          </button>
          <span className="text-xs text-dt-text-secondary w-12 text-center tabular-nums" aria-live="polite" aria-atomic="true">
            {zoom}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-dt-hover rounded text-dt-text-secondary hover:text-dt-text disabled:opacity-30 transition-colors"
            title="Zoom in (+)"
            aria-label={`Zoom in. Current zoom: ${zoom}%`}
            disabled={zoom >= 400}
          >
            <ZoomIn size={14} aria-hidden="true" />
          </button>
          <div className="w-px h-4 bg-dt-border mx-1" aria-hidden="true" />
          <button
            onClick={handleRotate}
            className="p-1.5 hover:bg-dt-hover rounded text-dt-text-secondary hover:text-dt-text transition-colors"
            title="Rotate 90° (R)"
            aria-label={`Rotate image. Current rotation: ${rotation}°`}
          >
            <RotateCw size={14} aria-hidden="true" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-dt-hover rounded text-dt-text-secondary hover:text-dt-text transition-colors"
            title="Reset view (0)"
            aria-label="Reset zoom and rotation"
          >
            <Maximize2 size={14} aria-hidden="true" />
          </button>
        </div>
        {naturalSize && (
          <span className="text-[10px] text-dt-text-secondary" aria-label={`Image dimensions: ${naturalSize.width} by ${naturalSize.height} pixels`}>
            {naturalSize.width} × {naturalSize.height}
          </span>
        )}
      </div>

      {/* Image Container */}
      <div className="flex-1 overflow-auto bg-[repeating-conic-gradient(var(--dt-border)_0%_25%,var(--dt-bg)_0%_50%)] bg-[length:20px_20px] flex items-center justify-center p-4">
        <img
          src={src}
          alt={`Preview of ${fileName}`}
          className="max-w-none shadow-lg transition-transform duration-200"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
          onLoad={(e) => {
            const img = e.currentTarget;
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
