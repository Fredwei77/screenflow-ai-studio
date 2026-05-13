import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pen, Eraser, Trash2 } from 'lucide-react';
import { useWhiteboardStore } from '../stores/useWhiteboardStore';
import type { DrawTool } from '../types';

interface WhiteboardToolbarProps {
  onClear: () => void;
}

const TOOLS: { tool: DrawTool; icon: React.ReactNode; labelKey: string }[] = [
  { tool: 'pen', icon: <Pen className="w-4 h-4" />, labelKey: 'whiteboard.pen' },
  { tool: 'eraser', icon: <Eraser className="w-4 h-4" />, labelKey: 'whiteboard.eraser' },
];

const COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

const WIDTHS = [2, 4, 6, 8];

export const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = ({ onClear }) => {
  const { t } = useTranslation();
  const { currentTool, currentColor, lineWidth, setTool, setColor, setLineWidth } = useWhiteboardStore();

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700 flex-wrap">
      {/* Tools */}
      {TOOLS.map(({ tool, icon, labelKey }) => (
        <button
          key={tool}
          onClick={() => setTool(tool)}
          className={`p-1.5 rounded-md transition-colors ${
            currentTool === tool ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          title={t(labelKey)}
        >
          {icon}
        </button>
      ))}

      <div className="w-px h-6 bg-gray-600 mx-1" />

      {/* Colors */}
      {COLORS.map((color) => (
        <button
          key={color}
          onClick={() => setColor(color)}
          className={`w-5 h-5 rounded-full border-2 transition-transform ${
            currentColor === color ? 'border-white scale-125' : 'border-gray-600 hover:border-gray-400'
          }`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}

      <div className="w-px h-6 bg-gray-600 mx-1" />

      {/* Line width */}
      {WIDTHS.map((w) => (
        <button
          key={w}
          onClick={() => setLineWidth(w)}
          className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
            lineWidth === w ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          title={t('whiteboard.width', { size: w })}
        >
          <div className="rounded-full bg-current" style={{ width: w + 2, height: w + 2 }} />
        </button>
      ))}

      <div className="w-px h-6 bg-gray-600 mx-1" />

      {/* Clear */}
      <button
        onClick={onClear}
        className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
        title={t('whiteboard.clearAll')}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
