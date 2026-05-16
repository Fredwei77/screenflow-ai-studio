import React, { useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMeetingStore, BackgroundMode } from '../stores/useMeetingStore';

interface VirtualBackgroundSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  { color: '#1e293b', label: 'Slate' },
  { color: '#1e3a5f', label: 'Navy' },
  { color: '#2d1b3d', label: 'Purple' },
  { color: '#1a3c34', label: 'Forest' },
  { color: '#3d1f1f', label: 'Maroon' },
];

function generateGradientUrl(color1: string, color2: string, angle = 135): string {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 360;
  const ctx = c.getContext('2d')!;
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * c.width;
  const y = Math.sin(rad) * c.height;
  const grad = ctx.createLinearGradient(0, 0, x, y);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

export const VirtualBackgroundSelector: React.FC<VirtualBackgroundSelectorProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const virtualBgMode = useMeetingStore((s) => s.virtualBgMode);
  const virtualBgColor = useMeetingStore((s) => s.virtualBgColor);
  const virtualBgImageUrl = useMeetingStore((s) => s.virtualBgImageUrl);
  const setVirtualBgMode = useMeetingStore((s) => s.setVirtualBgMode);
  const setVirtualBgColor = useMeetingStore((s) => s.setVirtualBgColor);
  const setVirtualBgImageUrl = useMeetingStore((s) => s.setVirtualBgImageUrl);

  const gradientPresets = useMemo(() => [
    { key: 'ocean', url: generateGradientUrl('#1e3a5f', '#0f172a'), label: 'Ocean' },
    { key: 'sunset', url: generateGradientUrl('#92400e', '#7c2d12'), label: 'Sunset' },
    { key: 'aurora', url: generateGradientUrl('#1e40af', '#7c3aed'), label: 'Aurora' },
    { key: 'forest', url: generateGradientUrl('#14532d', '#052e16'), label: 'Forest' },
    { key: 'rose', url: generateGradientUrl('#9f1239', '#4c0519'), label: 'Rose' },
    { key: 'slate', url: generateGradientUrl('#334155', '#0f172a'), label: 'Slate' },
  ], []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleModeChange = (mode: BackgroundMode) => {
    setVirtualBgMode(mode);
    if (mode === 'none') {
      setVirtualBgImageUrl(null);
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full mb-2 right-0 w-72 bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-xl z-20 pointer-events-auto"
    >
      <h4 className="text-sm font-semibold text-white mb-3">{t('vbg.title')}</h4>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => handleModeChange('none')}
          className={`flex flex-col items-center gap-1 p-3 rounded-lg text-xs transition-colors ${
            virtualBgMode === 'none' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <div className="w-8 h-8 rounded bg-gray-600 flex items-center justify-center"><span className="text-lg"> </span></div>
          {t('vbg.none')}
        </button>
        <button
          onClick={() => handleModeChange('blur')}
          className={`flex flex-col items-center gap-1 p-3 rounded-lg text-xs transition-colors ${
            virtualBgMode === 'blur' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <div className="w-8 h-8 rounded bg-gradient-to-br from-gray-500 to-gray-700 blur-[2px]" />
          {t('vbg.blur')}
        </button>
        <button
          onClick={() => handleModeChange('solid')}
          className={`flex flex-col items-center gap-1 p-3 rounded-lg text-xs transition-colors ${
            virtualBgMode === 'solid' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <div className="w-8 h-8 rounded" style={{ backgroundColor: virtualBgColor }} />
          {t('vbg.solid')}
        </button>
        <button
          onClick={() => handleModeChange('image')}
          className={`flex flex-col items-center gap-1 p-3 rounded-lg text-xs transition-colors ${
            virtualBgMode === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600" />
          {t('vbg.image')}
        </button>
      </div>

      {virtualBgMode === 'solid' && (
        <div className="mb-3">
          <label className="text-xs text-gray-400 mb-2 block">{t('vbg.pickColor')}</label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.color}
                onClick={() => setVirtualBgColor(preset.color)}
                className={`w-8 h-8 rounded-full border-2 transition-colors ${
                  virtualBgColor === preset.color ? 'border-blue-400' : 'border-transparent hover:border-gray-500'
                }`}
                style={{ backgroundColor: preset.color }}
                title={preset.label}
              />
            ))}
            <label className="w-8 h-8 rounded-full border-2 border-dashed border-gray-600 hover:border-gray-400 cursor-pointer flex items-center justify-center transition-colors">
              <input type="color" value={virtualBgColor} onChange={(e) => setVirtualBgColor(e.target.value)} className="w-0 h-0 opacity-0" />
              <span className="text-xs text-gray-400">+</span>
            </label>
          </div>
        </div>
      )}

      {virtualBgMode === 'image' && (
        <div>
          <label className="text-xs text-gray-400 mb-2 block">{t('vbg.pickImage')}</label>
          <div className="grid grid-cols-3 gap-2">
            {gradientPresets.map((preset) => (
              <button
                key={preset.key}
                onClick={() => setVirtualBgImageUrl(preset.url)}
                className={`h-12 rounded-lg border transition-colors overflow-hidden ${
                  virtualBgImageUrl === preset.url ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-600 hover:border-blue-400'
                }`}
                title={preset.label}
              >
                <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};