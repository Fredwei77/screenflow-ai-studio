import React, { useState } from 'react';
import { X, Monitor, Camera, Layers, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import type { MediaSourceType } from '../types';

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: (source: MediaSourceType, backdropUrl: string | null) => void;
  onSkip: () => void;
  mediaSource: MediaSourceType;
  theme: 'dark' | 'light';
}

const STEPS = [
  {
    title: 'Choose Your Source',
    description: 'Pick what you want to record: screen, camera, or both.',
  },
  {
    title: 'Pick a Background',
    description: 'Choose a professional backdrop or upload your own image.',
  },
  {
    title: 'Ready to Record',
    description: 'Everything is set. Press start and go!',
  },
];

const BACKGROUNDS = [
  { id: 'none', name: 'No Background', preview: '' },
  {
    id: 'gradient-1',
    name: 'Gradient Blue',
    preview: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23667eea"/><stop offset="100%" style="stop-color:%23764ba2"/></linearGradient></defs><rect fill="url(%23g)" width="200" height="120"/></svg>',
  },
  {
    id: 'gradient-2',
    name: 'Gradient Sunset',
    preview: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23f093fb"/><stop offset="100%" style="stop-color:%23f5576c"/></linearGradient></defs><rect fill="url(%23g)" width="200" height="120"/></svg>',
  },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onComplete,
  onSkip,
  mediaSource,
  theme,
}) => {
  const [step, setStep] = useState(0);
  const [selectedSource, setSelectedSource] = useState<MediaSourceType>(mediaSource);
  const [selectedBg, setSelectedBg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      onComplete(selectedSource, selectedBg);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const getBackdropUrl = (id: string): string | null => {
    if (id === 'none') return null;
    const bg = BACKGROUNDS.find((b) => b.id === id);
    return bg?.preview || null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
          theme === 'dark'
            ? 'bg-gray-900 border border-gray-800'
            : 'bg-white border border-gray-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold">Quick Setup</h2>
          <button
            onClick={onSkip}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-2 px-4 pt-4">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`flex-1 h-1 rounded-full transition-colors ${
                index <= step ? 'bg-indigo-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2">{STEPS[step].title}</h3>
          <p className="text-gray-400 text-sm mb-6">{STEPS[step].description}</p>

          {/* Step 1: Source Selection */}
          {step === 0 && (
            <div className="grid grid-cols-3 gap-3">
              {(['screen', 'camera', 'both'] as MediaSourceType[]).map((source) => (
                <button
                  key={source}
                  onClick={() => setSelectedSource(source)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                    selectedSource === source
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {source === 'screen' && <Monitor className="w-8 h-8" />}
                  {source === 'camera' && <Camera className="w-8 h-8" />}
                  {source === 'both' && <Layers className="w-8 h-8" />}
                  <span className="text-sm font-medium capitalize">{source}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Background Selection */}
          {step === 1 && (
            <div className="grid grid-cols-3 gap-3">
              {BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setSelectedBg(getBackdropUrl(bg.id))}
                  className={`rounded-xl overflow-hidden border-2 transition-all ${
                    (bg.id === 'none' && !selectedBg) || selectedBg === getBackdropUrl(bg.id)
                      ? 'border-indigo-500 scale-105'
                      : 'border-transparent hover:border-gray-600'
                  }`}
                >
                  {bg.id === 'none' ? (
                    <div className="aspect-video bg-gray-800 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">None</span>
                    </div>
                  ) : (
                    <img src={bg.preview} alt={bg.name} className="w-full aspect-video object-cover" />
                  )}
                  <div className="p-2 bg-gray-800">
                    <span className="text-xs">{bg.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Summary */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-sm">
                  Recording source: <strong className="capitalize">{selectedSource}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-sm">
                  {selectedBg ? 'Background applied' : 'No background selected'}
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-sm">Press Ctrl+R or click Record to start</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <button
            onClick={onSkip}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Skip setup
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              {step === 2 ? 'Start Recording' : 'Next'}
              {step < 2 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
