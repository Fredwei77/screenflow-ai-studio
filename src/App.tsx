import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RecordPage } from './pages/RecordPage';
import { MeetingRoom } from './pages/MeetingRoom';
import { SettingsPage } from './pages/SettingsPage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/record" element={<RecordPage />} />
      <Route path="/meeting/:meetingId" element={<MeetingRoom />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
};

export default App;
