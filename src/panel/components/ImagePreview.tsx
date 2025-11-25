import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  fileName: string;
}

export function ImagePreview({ src, fileName }: ImagePreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 400));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-dt-border bg-dt-surface">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-dt-hover rounded text-dt-text-secondary hover:text-dt-text disabled:opacity-30"
            title="Zoom out"
            disabled={zoom <= 25}
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-dt-text-secondary w-12 text-center tabular-nums">
            {zoom}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-dt-hover rounded text-dt-text-secondary hover:text-dt-text disabled:opacity-30"
            title="Zoom in"
            disabled={zoom >= 400}
          >
            <ZoomIn size={14} />
          </button>
          <div className="w-px h-4 bg-dt-border mx-1" />
          <button
            onClick={handleRotate}
            className="p-1.5 hover:bg-dt-hover rounded text-dt-text-secondary hover:text-dt-text"
            title="Rotate"
          >
            <RotateCw size={14} />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-dt-hover rounded text-dt-text-secondary hover:text-dt-text"
            title="Reset view"
          >
            <Maximize2 size={14} />
          </button>
        </div>
        {naturalSize && (
          <span className="text-[10px] text-dt-text-secondary">
            {naturalSize.width} × {naturalSize.height}
          </span>
        )}
      </div>

      {/* Image Container */}
      <div className="flex-1 overflow-auto bg-[repeating-conic-gradient(var(--dt-border)_0%_25%,var(--dt-bg)_0%_50%)] bg-[length:20px_20px] flex items-center justify-center p-4">
        <img
          src={src}
          alt={fileName}
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
