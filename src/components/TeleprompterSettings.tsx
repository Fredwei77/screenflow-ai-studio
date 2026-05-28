import React, { useRef } from 'react';
import { Settings2, Upload, Trash2, X } from 'lucide-react';

interface TeleprompterSettingsProps {
  script: string;
  onScriptChange: (script: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const TeleprompterSettings: React.FC<TeleprompterSettingsProps> = ({
  script,
  onScriptChange,
  onClear,
  isOpen,
  onToggle,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onScriptChange(text);
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const lineCount = script
    .split('\n')
    .filter((line) => line.trim().length > 0).length;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`p-2 rounded-md transition-all ${
          isOpen
            ? 'bg-indigo-600 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
        title="Teleprompter Settings"
      >
        <Settings2 className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <h3 className="font-semibold text-sm">Teleprompter Script</h3>
            <button
              onClick={onToggle}
              className="p-1 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            <textarea
              value={script}
              onChange={(e) => onScriptChange(e.target.value)}
              placeholder="Paste your script here...&#10;&#10;Each line or sentence becomes a segment."
              rows={8}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-indigo-500"
            />

            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{lineCount} segments</span>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  Import
                </button>
                <button
                  onClick={onClear}
                  className="flex items-center gap-1 px-2 py-1 bg-red-900/50 hover:bg-red-900 text-red-400 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TeleprompterSettings;
