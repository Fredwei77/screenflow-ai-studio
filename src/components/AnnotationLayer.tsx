import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Pencil, Circle, ArrowRight, Eraser, Trash2, Highlighter, Undo2, Redo2 } from 'lucide-react';

export type AnnotationTool = 'pen' | 'highlight' | 'arrow' | 'circle' | 'laser' | 'eraser';

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  tool: AnnotationTool;
  points: Point[];
  color: string;
  strokeWidth: number;
  startPoint?: Point;
  endPoint?: Point;
}

interface AnnotationLayerProps {
  isVisible: boolean;
  theme: 'dark' | 'light';
  onAnnotationChange?: (annotations: Annotation[]) => void;
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ffffff', // white
  '#000000', // black
];

const STROKE_WIDTHS = [2, 4, 6, 8, 12];

const CURSOR_STYLES: Record<AnnotationTool, string> = {
  pen: 'crosshair',
  highlight: 'crosshair',
  arrow: 'crosshair',
  circle: 'crosshair',
  laser: 'none',
  eraser: 'pointer',
};

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  isVisible,
  theme,
  onAnnotationChange,
}) => {
  const [activeTool, setActiveTool] = useState<AnnotationTool>('pen');
  const [activeColor, setActiveColor] = useState(PRESET_COLORS[0]);
  const [activeStrokeWidth, setActiveStrokeWidth] = useState(3);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [undoStack, setUndoStack] = useState<Annotation[][]>([]);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [laserPosition, setLaserPosition] = useState<Point | null>(null);
  const [laserTrail, setLaserTrail] = useState<Point[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const laserTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard shortcuts (1-6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      const toolMap: Record<string, AnnotationTool> = {
        '1': 'pen',
        '2': 'highlight',
        '3': 'arrow',
        '4': 'circle',
        '5': 'laser',
        '6': 'eraser',
      };

      if (toolMap[e.key]) {
        e.preventDefault();
        setActiveTool(toolMap[e.key]);
      }

      // Ctrl+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Ctrl+Shift+Z or Ctrl+Y for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  // Notify parent of annotation changes
  useEffect(() => {
    onAnnotationChange?.(annotations);
  }, [annotations, onAnnotationChange]);

  // Laser trail fade effect
  useEffect(() => {
    if (laserPosition) {
      setLaserTrail((prev) => [...prev.slice(-20), laserPosition]);

      if (laserTimerRef.current) clearTimeout(laserTimerRef.current);
      laserTimerRef.current = setTimeout(() => {
        setLaserTrail([]);
      }, 500);
    }
    return () => {
      if (laserTimerRef.current) clearTimeout(laserTimerRef.current);
    };
  }, [laserPosition]);

  const getPoint = useCallback((e: React.PointerEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleUndo = useCallback(() => {
    setAnnotations((prev) => {
      if (prev.length === 0) return prev;
      setUndoStack((stack) => [...stack, prev]);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const lastState = prev[prev.length - 1];
      setAnnotations(lastState);
      return prev.slice(0, -1);
    });
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (activeTool === 'eraser') return;

      const point = getPoint(e);
      setIsDrawing(true);

      const newAnnotation: Annotation = {
        id: crypto.randomUUID(),
        tool: activeTool,
        points: [point],
        color: activeTool === 'highlight' ? '#fbbf24' : activeColor,
        strokeWidth: activeTool === 'highlight' ? 12 : activeStrokeWidth,
        startPoint: point,
        endPoint: point,
      };

      setCurrentAnnotation(newAnnotation);
      setUndoStack([]);
    },
    [activeTool, activeColor, activeStrokeWidth, getPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const point = getPoint(e);

      // Laser tool
      if (activeTool === 'laser') {
        setLaserPosition(point);
        return;
      }

      if (!isDrawing || !currentAnnotation) return;

      if (activeTool === 'pen' || activeTool === 'highlight') {
        setCurrentAnnotation((prev) =>
          prev ? { ...prev, points: [...prev.points, point] } : null
        );
      } else {
        setCurrentAnnotation((prev) => (prev ? { ...prev, endPoint: point } : null));
      }
    },
    [activeTool, isDrawing, currentAnnotation, getPoint]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawing || !currentAnnotation) {
      setIsDrawing(false);
      return;
    }

    if (activeTool === 'eraser') {
      return;
    }

    setAnnotations((prev) => [...prev, currentAnnotation]);
    setCurrentAnnotation(null);
    setIsDrawing(false);
  }, [activeTool, currentAnnotation, isDrawing]);

  const handleEraserClick = useCallback(
    (annotationId: string) => {
      if (activeTool === 'eraser') {
        setUndoStack((prev) => [...prev, annotations]);
        setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
      }
    },
    [activeTool, annotations]
  );

  const clearAllAnnotations = useCallback(() => {
    setUndoStack((prev) => [...prev, annotations]);
    setAnnotations([]);
    setCurrentAnnotation(null);
  }, [annotations]);

  const renderAnnotation = useCallback(
    (annotation: Annotation, isEraserTarget = false) => {
      const { tool, points, color, strokeWidth, startPoint, endPoint } = annotation;
      const eraserClass = isEraserTarget ? 'cursor-pointer hover:opacity-50' : '';

      switch (tool) {
        case 'pen':
        case 'highlight':
          if (points.length < 2) return null;
          const pathData = points
            .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
            .join(' ');
          return (
            <path
              key={annotation.id}
              d={pathData}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={tool === 'highlight' ? 0.4 : 1}
              className={eraserClass}
              onClick={() => handleEraserClick(annotation.id)}
            />
          );

        case 'arrow':
          if (!startPoint || !endPoint) return null;
          const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
          const headLength = strokeWidth * 4;
          const head1X = endPoint.x - headLength * Math.cos(angle - Math.PI / 6);
          const head1Y = endPoint.y - headLength * Math.sin(angle - Math.PI / 6);
          const head2X = endPoint.x - headLength * Math.cos(angle + Math.PI / 6);
          const head2Y = endPoint.y - headLength * Math.sin(angle + Math.PI / 6);
          return (
            <g
              key={annotation.id}
              className={eraserClass}
              onClick={() => handleEraserClick(annotation.id)}
            >
              <line
                x1={startPoint.x}
                y1={startPoint.y}
                x2={endPoint.x}
                y2={endPoint.y}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              <polygon
                points={`${endPoint.x},${endPoint.y} ${head1X},${head1Y} ${head2X},${head2Y}`}
                fill={color}
              />
            </g>
          );

        case 'circle':
          if (!startPoint || !endPoint) return null;
          const cx = (startPoint.x + endPoint.x) / 2;
          const cy = (startPoint.y + endPoint.y) / 2;
          const rx = Math.abs(endPoint.x - startPoint.x) / 2;
          const ry = Math.abs(endPoint.y - startPoint.y) / 2;
          return (
            <ellipse
              key={annotation.id}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              className={eraserClass}
              onClick={() => handleEraserClick(annotation.id)}
            />
          );

        default:
          return null;
      }
    },
    [handleEraserClick]
  );

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Toolbar */}
      <div
        className={`absolute top-4 right-4 rounded-xl p-3 flex flex-col gap-2 pointer-events-auto ${
          theme === 'dark'
            ? 'bg-gray-900/90 border border-gray-700/50'
            : 'bg-white/90 border border-gray-300/50'
        } backdrop-blur-sm shadow-lg`}
      >
        {/* Tools */}
        <div className="flex flex-col gap-1">
          {([
            { tool: 'pen' as AnnotationTool, icon: Pencil, label: '1' },
            { tool: 'highlight' as AnnotationTool, icon: Highlighter, label: '2' },
            { tool: 'arrow' as AnnotationTool, icon: ArrowRight, label: '3' },
            { tool: 'circle' as AnnotationTool, icon: Circle, label: '4' },
            {
              tool: 'laser' as AnnotationTool,
              icon: () => <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse" />,
              label: '5',
            },
            { tool: 'eraser' as AnnotationTool, icon: Eraser, label: '6' },
          ]).map(({ tool, icon: Icon, label }) => (
            <button
              key={tool}
              onClick={() => setActiveTool(tool)}
              className={`p-2 rounded-lg transition-all ${
                activeTool === tool
                  ? 'bg-indigo-600 text-white'
                  : theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
              title={`${tool} (${label})`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className={`h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`} />

        {/* Color Picker */}
        {activeTool !== 'laser' && activeTool !== 'eraser' && (
          <div className="flex flex-wrap gap-1 w-[72px]">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setActiveColor(color)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  activeColor === color ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}

        {/* Stroke Width */}
        {activeTool !== 'laser' && activeTool !== 'eraser' && (
          <div className="flex flex-col gap-1">
            {STROKE_WIDTHS.map((width) => (
              <button
                key={width}
                onClick={() => setActiveStrokeWidth(width)}
                className={`flex items-center justify-center p-1 rounded transition-all ${
                  activeStrokeWidth === width
                    ? theme === 'dark'
                      ? 'bg-gray-700'
                      : 'bg-gray-200'
                    : ''
                }`}
                title={`${width}px`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{
                    width: `${width + 4}px`,
                    height: `${width + 4}px`,
                    color:
                      activeStrokeWidth === width
                        ? theme === 'dark'
                          ? '#ffffff'
                          : '#000000'
                        : theme === 'dark'
                        ? '#6b7280'
                        : '#9ca3af',
                  }}
                />
              </button>
            ))}
          </div>
        )}

        <div className={`h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`} />

        {/* Undo/Redo */}
        <div className="flex gap-1">
          <button
            onClick={handleUndo}
            disabled={annotations.length === 0}
            className={`p-2 rounded-lg transition-all ${
              annotations.length === 0
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
            onClick={handleRedo}
            disabled={undoStack.length === 0}
            className={`p-2 rounded-lg transition-all ${
              undoStack.length === 0
                ? 'opacity-30 cursor-not-allowed'
                : theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Clear All */}
        <button
          onClick={clearAllAnnotations}
          disabled={annotations.length === 0}
          className={`p-2 rounded-lg transition-all ${
            annotations.length === 0
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

      {/* SVG Drawing Area */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ cursor: CURSOR_STYLES[activeTool] }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {annotations.map((annotation) => renderAnnotation(annotation, activeTool === 'eraser'))}
        {currentAnnotation && renderAnnotation(currentAnnotation)}

        {/* Laser pointer with trail */}
        {activeTool === 'laser' && laserTrail.length > 0 && (
          <>
            {laserTrail.map((point, index) => {
              const opacity = ((index + 1) / laserTrail.length) * 0.8;
              const radius = 4 + (index / laserTrail.length) * 4;
              return (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  fill="#22c55e"
                  opacity={opacity}
                />
              );
            })}
            <circle
              cx={laserPosition?.x}
              cy={laserPosition?.y}
              r={8}
              fill="#22c55e"
              filter="url(#glow)"
            />
          </>
        )}

        {/* Glow filter for laser */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default AnnotationLayer;
