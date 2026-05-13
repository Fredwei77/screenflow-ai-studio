import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsProps {
  theme?: 'dark' | 'light';
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ theme = 'dark' }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const shortcuts = [
    { key: 'Ctrl + R', description: t('shortcuts.startStopRecording') },
    { key: 'Ctrl + D', description: t('shortcuts.downloadVideo') },
    { key: 'Ctrl + 1', description: t('shortcuts.switchToScreen') },
    { key: 'Ctrl + 2', description: t('shortcuts.switchToCamera') },
    { key: 'Ctrl + 3', description: t('shortcuts.switchToBoth') },
  ];

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`p-2 rounded-md transition-all ${
          theme === 'dark'
            ? 'text-gray-400 hover:text-white hover:bg-gray-800'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
        }`}
        title={t('shortcuts.title')}
        aria-label={t('shortcuts.showShortcuts')}
        aria-expanded={isOpen}
      >
        <Keyboard className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
        >
          <div className={`rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 ${
            theme === 'dark'
              ? 'bg-gray-900 border border-gray-700'
              : 'bg-white border border-gray-300'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Keyboard className="w-6 h-6 text-indigo-400" aria-hidden="true" />
                <h2
                  id="shortcuts-title"
                  className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                >
                  {t('shortcuts.title')}
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded-md transition-all ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
                aria-label={t('shortcuts.closeShortcuts')}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Shortcuts List */}
            <div className="space-y-3" role="list">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                  role="listitem"
                >
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    {shortcut.description}
                  </span>
                  <kbd className={`px-3 py-1 border rounded text-sm font-mono ${
                    theme === 'dark'
                      ? 'bg-gray-950 border-gray-700 text-indigo-400'
                      : 'bg-white border-gray-300 text-indigo-600'
                  }`}>
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className={`mt-6 pt-4 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
              <p className={`text-xs text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                {t('shortcuts.pressEsc')}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeyboardShortcuts;
