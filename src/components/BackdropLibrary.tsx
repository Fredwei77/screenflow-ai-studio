import React, { useState, useRef } from 'react';
import { X, Upload, Trash2, Image } from 'lucide-react';

interface Backdrop {
  id: string;
  name: string;
  url: string;
  isCustom: boolean;
}

interface BackdropLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string | null) => void;
  selectedId: string | null;
  theme: 'dark' | 'light';
}

const DEFAULT_BACKDROPS: Backdrop[] = [
  { id: 'none', name: 'None', url: '', isCustom: false },
  { id: 'blur', name: 'Blur', url: '', isCustom: false },
  { id: 'gradient-1', name: 'Gradient Blue', url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23667eea"/><stop offset="100%" style="stop-color:%23764ba2"/></linearGradient></defs><rect fill="url(%23g)" width="1920" height="1080"/></svg>', isCustom: false },
  { id: 'gradient-2', name: 'Gradient Sunset', url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23f093fb"/><stop offset="100%" style="stop-color:%23f5576c"/></linearGradient></defs><rect fill="url(%23g)" width="1920" height="1080"/></svg>', isCustom: false },
  { id: 'gradient-3', name: 'Gradient Ocean', url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%234facfe"/><stop offset="100%" style="stop-color:%2300f2fe"/></linearGradient></defs><rect fill="url(%23g)" width="1920" height="1080"/></svg>', isCustom: false },
  { id: 'solid-dark', name: 'Dark Gray', url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect fill="%231a1a2e" width="1920" height="1080"/></svg>', isCustom: false },
];

const MAX_CUSTOM_BACKDROPS = 10;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export const BackdropLibrary: React.FC<BackdropLibraryProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedId,
  theme,
}) => {
  const [customBackdrops, setCustomBackdrops] = useState<Backdrop[]>(() => {
    try {
      const stored = localStorage.getItem('screenflow-backdrops');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allBackdrops = [...DEFAULT_BACKDROPS, ...customBackdrops];

  const handleSelect = (backdrop: Backdrop) => {
    if (backdrop.id === 'none') {
      onSelect(null);
    } else if (backdrop.id === 'blur') {
      onSelect('blur');
    } else {
      onSelect(backdrop.url);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('Image must be under 2MB.');
      return;
    }

    if (customBackdrops.length >= MAX_CUSTOM_BACKDROPS) {
      alert('Storage full. Please delete some custom backdrops first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const newBackdrop: Backdrop = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url,
        isCustom: true,
      };

      const updated = [...customBackdrops, newBackdrop];
      setCustomBackdrops(updated);
      localStorage.setItem('screenflow-backdrops', JSON.stringify(updated));
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = (id: string) => {
    const updated = customBackdrops.filter((b) => b.id !== id);
    setCustomBackdrops(updated);
    localStorage.setItem('screenflow-backdrops', JSON.stringify(updated));
    if (selectedId === id) {
      onSelect(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          theme === 'dark'
            ? 'bg-gray-900 border border-gray-800'
            : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Image className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold">Background Library</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {allBackdrops.map((backdrop) => (
              <div
                key={backdrop.id}
                className={`relative group rounded-xl overflow-hidden cursor-pointer transition-all ${
                  selectedId === backdrop.id || (backdrop.id === 'none' && !selectedId)
                    ? 'ring-2 ring-indigo-500 scale-105'
                    : 'hover:scale-105'
                }`}
                onClick={() => handleSelect(backdrop)}
              >
                {backdrop.id === 'none' ? (
                  <div
                    className={`aspect-video flex items-center justify-center ${
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
                    }`}
                  >
                    <span className="text-gray-400 text-sm">None</span>
                  </div>
                ) : backdrop.id === 'blur' ? (
                  <div className="aspect-video bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Blur</span>
                  </div>
                ) : (
                  <img
                    src={backdrop.url}
                    alt={backdrop.name}
                    className="w-full aspect-video object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                  <div className="w-full p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <span className="text-white text-xs font-medium truncate block">
                      {backdrop.name}
                    </span>
                  </div>
                </div>

                {backdrop.isCustom && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(backdrop.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            ))}

            {/* Upload Button */}
            {customBackdrops.length < MAX_CUSTOM_BACKDROPS && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
                  theme === 'dark'
                    ? 'border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-400'
                    : 'border-gray-300 text-gray-600 hover:border-indigo-500 hover:text-indigo-600'
                }`}
              >
                <Upload className="w-6 h-6" />
                <span className="text-xs font-medium">Upload</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`p-3 border-t text-center ${
            theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <p className="text-xs text-gray-400">
            {customBackdrops.length} / {MAX_CUSTOM_BACKDROPS} custom backgrounds
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default BackdropLibrary;
