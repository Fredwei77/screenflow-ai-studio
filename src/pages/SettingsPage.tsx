import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { Card } from '../components/ui/Card';
import { config } from '../config';
import { getConfigStatus } from '../config';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const status = getConfigStatus();

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <Card>
          <h2 className="text-lg font-semibold mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Theme</span>
            <button onClick={toggleTheme} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">Configuration</h2>
          <div className="space-y-3">
            {Object.entries(status).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">{key}</span>
                <span className="text-sm font-mono">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
