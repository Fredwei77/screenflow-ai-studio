import React from 'react';
import { Monitor, Camera, Columns, PictureInPicture, Layout } from 'lucide-react';
import type { LayoutMode } from '../hooks/useStreamCompositor';

interface LayoutSelectorProps {
  currentLayout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
  hasScreen: boolean;
  hasCamera: boolean;
  theme: 'dark' | 'light';
  disabled?: boolean;
}

const LAYOUTS: { mode: LayoutMode; icon: React.ReactNode; label: string; requires: ('screen' | 'camera')[] }[] = [
  { mode: 'camera-only', icon: <Camera className="w-4 h-4" />, label: 'Camera Only', requires: ['camera'] },
  { mode: 'screen-only', icon: <Monitor className="w-4 h-4" />, label: 'Screen Only', requires: ['screen'] },
  { mode: 'pip', icon: <PictureInPicture className="w-4 h-4" />, label: 'Picture in Picture', requires: ['screen', 'camera'] },
  { mode: 'side-by-side', icon: <Columns className="w-4 h-4" />, label: 'Side by Side', requires: ['screen', 'camera'] },
  { mode: 'floating-camera', icon: <Layout className="w-4 h-4" />, label: 'Floating Camera', requires: ['screen', 'camera'] },
];

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  currentLayout,
  onLayoutChange,
  hasScreen,
  hasCamera,
  theme,
  disabled = false,
}) => {
  const availableLayouts = LAYOUTS.filter((layout) =>
    layout.requires.every((req) => (req === 'screen' ? hasScreen : hasCamera))
  );

  return (
    <div
      className={`hidden sm:flex rounded-lg p-1 border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'
      }`}
      role="group"
      aria-label="Layout selector"
    >
      {availableLayouts.map((layout) => (
        <button
          key={layout.mode}
          onClick={() => onLayoutChange(layout.mode)}
          disabled={disabled}
          className={`p-2 rounded-md transition-all ${
            currentLayout === layout.mode
              ? 'bg-indigo-600 text-white shadow-lg'
              : theme === 'dark'
              ? 'text-gray-400 hover:text-white'
              : 'text-gray-600 hover:text-gray-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={layout.label}
        >
          {layout.icon}
        </button>
      ))}
    </div>
  );
};

export default LayoutSelector;
