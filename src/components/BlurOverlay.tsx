import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EyeOff, Undo2, Redo2, Trash2, Minus, Plus } from 'lucide-react';

export interface BlurRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
}

interface BlurOverlayProps {
  isVisible: boolean;
  theme: 'dark' | 'light';
  regions?: BlurRegion[];
  onRegionsChange?: (regions: BlurRegion[]) => void;
  className?: string;
}

const DEFAULT_CLICK_REGION = { width: 0.18, height: 0.08 };

export const BlurOverlay: React.FC<BlurOverlayProps> = ({
  isVisible,
  theme,
  regions,
  onRegionsChange,
  className = '',
}) => {
  const [localRegions, setLocalRegions] = useState<BlurRegion[]>([]);
  const blurRegions = regions ?? localRegions;
  const [undoStack, setUndoStack] = useState<BlurRegion[][]>([]);
  const [redoStack, setRedoStack] = useState<BlurRegion[][]>([]);
  const [activeIntensity, setActiveIntensity] = useState(14);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [draftRegion, setDraftRegion] = useState<BlurRegion | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const commitRegions = useCallback(
    (nextRegions: BlurRegion[], undoBase = blurRegions) => {
      setUndoStack((prev) => [...prev, undoBase]);
      setRedoStack([]);
      if (onRegionsChange) onRegionsChange(nextRegions);
      else setLocalRegions(nextRegions);
    },
    [blurRegions, onRegionsChange]
  );

  const getPoint = useCallback((e: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    return {
      x: Math.min(Math.max((e.clientX - rect.left) / Math.max(rect.width, 1), 0), 1),
      y: Math.min(Math.max((e.clientY - rect.top) / Math.max(rect.height, 1), 0), 1),
    };
  }, []);

  const createClickRegion = useCallback(
    (e: React.PointerEvent): BlurRegion | null => {
      const container = containerRef.current;
      if (!container) return null;

      container.style.pointerEvents = 'none';
      const elementUnder = document.elementFromPoint(e.clientX, e.clientY);
      container.style.pointerEvents = '';

      const containerRect = container.getBoundingClientRect();
      if (!elementUnder || elementUnder === container) {
        const point = getPoint(e);
        if (!point) return null;
        return {
          id: crypto.randomUUID(),
          x: Math.min(Math.max(point.x - DEFAULT_CLICK_REGION.width / 2, 0), 1 - DEFAULT_CLICK_REGION.width),
          y: Math.min(Math.max(point.y - DEFAULT_CLICK_REGION.height / 2, 0), 1 - DEFAULT_CLICK_REGION.height),
          width: DEFAULT_CLICK_REGION.width,
          height: DEFAULT_CLICK_REGION.height,
          intensity: activeIntensity,
        };
      }

      const targetRect = elementUnder.getBoundingClientRect();
      const tagName = elementUnder.tagName.toLowerCase();
      const isVideoSurface = tagName === 'video' || tagName === 'canvas';

      if (isVideoSurface) {
        const point = getPoint(e);
        if (!point) return null;
        return {
          id: crypto.randomUUID(),
          x: Math.min(Math.max(point.x - DEFAULT_CLICK_REGION.width / 2, 0), 1 - DEFAULT_CLICK_REGION.width),
          y: Math.min(Math.max(point.y - DEFAULT_CLICK_REGION.height / 2, 0), 1 - DEFAULT_CLICK_REGION.height),
          width: DEFAULT_CLICK_REGION.width,
          height: DEFAULT_CLICK_REGION.height,
          intensity: activeIntensity,
        };
      }

      const x = Math.max(0, (targetRect.left - containerRect.left) / Math.max(containerRect.width, 1));
      const y = Math.max(0, (targetRect.top - containerRect.top) / Math.max(containerRect.height, 1));
      const width = Math.min(targetRect.width / Math.max(containerRect.width, 1), 1 - x);
      const height = Math.min(targetRect.height / Math.max(containerRect.height, 1), 1 - y);

      if (width < 0.01 || height < 0.01) return null;

      return {
        id: crypto.randomUUID(),
        x, y, width, height, intensity: activeIntensity,
      };
    },
    [activeIntensity, getPoint]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('[data-blur-toolbar]')) return;
      const point = getPoint(e);
      if (!point) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragStart(point);
      setDraftRegion(null);
    },
    [getPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart) return;
      const point = getPoint(e);
      if (!point) return;
      const x = Math.min(dragStart.x, point.x);
      const y = Math.min(dragStart.y, point.y);
      const width = Math.abs(point.x - dragStart.x);
      const height = Math.abs(point.y - dragStart.y);
      if (width < 0.01 || height < 0.01) {
        setDraftRegion(null);
        return;
      }
      setDraftRegion({
        id: 'draft',
        x,
        y,
        width,
        height,
        intensity: activeIntensity,
      });
    },
    [activeIntensity, dragStart, getPoint]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart) return;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }

      const nextRegion = draftRegion && draftRegion.width >= 0.01 && draftRegion.height >= 0.01
        ? { ...draftRegion, id: crypto.randomUUID() }
        : createClickRegion(e);

      setDragStart(null);
      setDraftRegion(null);

      if (!nextRegion) return;
      commitRegions([...blurRegions, nextRegion]);
    },
    [blurRegions, commitRegions, createClickRegion, draftRegion, dragStart]
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const previousRegions = prev[prev.length - 1];
      setRedoStack((stack) => [...stack, blurRegions]);
      if (onRegionsChange) onRegionsChange(previousRegions);
      else setLocalRegions(previousRegions);
      return prev.slice(0, -1);
    });
  }, [blurRegions, onRegionsChange]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const lastState = prev[prev.length - 1];
      setUndoStack((stack) => [...stack, blurRegions]);
      if (onRegionsChange) onRegionsChange(lastState);
      else setLocalRegions(lastState);
      return prev.slice(0, -1);
    });
  }, [blurRegions, onRegionsChange]);

  const handleClearAll = useCallback(() => {
    if (blurRegions.length === 0) return;
    commitRegions([]);
  }, [blurRegions.length, commitRegions]);

  const handleIntensityChange = useCallback((nextIntensity: number) => {
    const intensity = Math.min(Math.max(nextIntensity, 4), 32);
    setActiveIntensity(intensity);
    if (blurRegions.length === 0) return;
    const nextRegions = blurRegions.map((region) => ({ ...region, intensity }));
    if (onRegionsChange) onRegionsChange(nextRegions);
    else setLocalRegions(nextRegions);
  }, [blurRegions, onRegionsChange]);

  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleUndo, handleRedo]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-20 cursor-crosshair ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { setDragStart(null); setDraftRegion(null); }}
    >
      {[...blurRegions, ...(draftRegion ? [draftRegion] : [])].map((region) => (
        <div
          key={region.id}
          className={region.id === 'draft' ? 'ring-2 ring-cyan-300/80' : ''}
          style={{
            position: 'absolute',
            left: `${region.x * 100}%`,
            top: `${region.y * 100}%`,
            width: `${region.width * 100}%`,
            height: `${region.height * 100}%`,
            backdropFilter: `blur(${region.intensity}px)`,
            WebkitBackdropFilter: `blur(${region.intensity}px)`,
            background: 'rgba(17, 24, 39, 0.08)',
          }}
        />
      ))}

      <div
        data-blur-toolbar
        className={`absolute top-4 right-4 rounded-xl p-2 flex gap-1 pointer-events-auto ${
          theme === 'dark'
            ? 'bg-gray-900/90 border border-gray-700/50'
            : 'bg-white/90 border border-gray-300/50'
        } backdrop-blur-sm shadow-lg`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); handleUndo(); }}
          disabled={blurRegions.length === 0}
          className={`p-1.5 rounded-lg transition-all ${
            blurRegions.length === 0
              ? 'opacity-30 cursor-not-allowed'
              : theme === 'dark'
              ? 'text-gray-400 hover:text-white hover:bg-gray-800'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleRedo(); }}
          disabled={redoStack.length === 0}
          className={`p-1.5 rounded-lg transition-all ${
            redoStack.length === 0
              ? 'opacity-30 cursor-not-allowed'
              : theme === 'dark'
              ? 'text-gray-400 hover:text-white hover:bg-gray-800'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <div className={`mx-1 w-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`} />
        <button
          onClick={(e) => { e.stopPropagation(); handleIntensityChange(activeIntensity - 2); }}
          className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
          title="Reduce blur"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="min-w-8 px-1 text-center text-xs leading-7 text-gray-400">{activeIntensity}px</span>
        <button
          onClick={(e) => { e.stopPropagation(); handleIntensityChange(activeIntensity + 2); }}
          className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
          title="Increase blur"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleClearAll(); }}
          disabled={blurRegions.length === 0}
          className={`p-1.5 rounded-lg transition-all ${
            blurRegions.length === 0
              ? 'opacity-30 cursor-not-allowed'
              : theme === 'dark'
              ? 'text-red-400 hover:text-red-300 hover:bg-gray-800'
              : 'text-red-500 hover:text-red-600 hover:bg-gray-200'
          }`}
          title="Clear All"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white/80 pointer-events-none">
        Click to blur a sensitive item, or drag to blur an area
      </div>
    </div>
  );
};

export default BlurOverlay;
