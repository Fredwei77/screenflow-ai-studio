import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, LogIn, Monitor, Camera, Mic } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useTheme } from '../hooks/useTheme';
import { generateMeetingId } from '../lib/formatters';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState(() => localStorage.getItem('screenflow-username') || '');

  const handleCreateRoom = () => {
    const name = userName.trim() || 'Anonymous';
    localStorage.setItem('screenflow-username', name);
    const newId = generateMeetingId();
    navigate(`/meeting/${newId}?name=${encodeURIComponent(name)}&host=true`);
  };

  const handleJoinRoom = () => {
    if (!meetingId.trim()) return;
    const name = userName.trim() || 'Anonymous';
    localStorage.setItem('screenflow-username', name);
    navigate(`/meeting/${meetingId.trim()}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-950">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-900/30">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            ScreenFlow AI
          </h1>
          <p className="text-gray-400">Video Teaching Platform</p>
        </div>

        {/* User Name */}
        <Input
          label="Your Name"
          placeholder="Enter your display name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />

        {/* Create Room */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-600/20">
                <Plus className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Create a Meeting</h2>
                <p className="text-sm text-gray-400">Start a new video session</p>
              </div>
            </div>
            <Button
              onClick={handleCreateRoom}
              variant="primary"
              size="lg"
              className="w-full"
              icon={<Plus className="w-5 h-5" />}
            >
              New Meeting
            </Button>
          </div>
        </Card>

        {/* Join Room */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-600/20">
                <LogIn className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Join a Meeting</h2>
                <p className="text-sm text-gray-400">Enter a meeting code to join</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Input
                placeholder="Meeting code"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value.toUpperCase())}
                className="flex-1"
                maxLength={6}
              />
              <Button
                onClick={handleJoinRoom}
                variant="secondary"
                disabled={!meetingId.trim()}
                icon={<LogIn className="w-4 h-4" />}
              >
                Join
              </Button>
            </div>
          </div>
        </Card>

        {/* Quick Record */}
        <div className="text-center">
          <button
            onClick={() => navigate('/record')}
            className="text-sm text-gray-500 hover:text-indigo-400 transition-colors"
          >
            Or start a solo recording session
          </button>
        </div>
      </div>
    </div>
  );
};
