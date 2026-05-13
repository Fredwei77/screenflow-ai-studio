import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useWhiteboard } from '../hooks/useWhiteboard';
import { WhiteboardToolbar } from './WhiteboardToolbar';

interface WhiteboardPanelProps {
  meetingId: string;
  userId: string;
  userName: string;
  onClose: () => void;
}

export const WhiteboardPanel: React.FC<WhiteboardPanelProps> = ({ meetingId, userId, userName, onClose }) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { startDrawing, draw, stopDrawing, handleClear } = useWhiteboard(canvasRef, meetingId, userId, userName);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <h3 className="text-sm font-medium text-white">{t('whiteboard.title')}</h3>
        <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Toolbar */}
      <WhiteboardToolbar onClear={handleClear} />

      {/* Canvas */}
      <div className="flex-1 relative bg-[#1a1a2e] overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    </div>
  );
};
