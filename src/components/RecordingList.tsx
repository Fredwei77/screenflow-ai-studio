import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Video, Trash2, Clock, HardDrive } from 'lucide-react';
import { recordingApi } from '../services/api';
import type { RecordingMeta } from '../types';

interface RecordingListProps {
  meetingId: string;
}

export const RecordingList: React.FC<RecordingListProps> = ({ meetingId }) => {
  const { t } = useTranslation();
  const [recordings, setRecordings] = useState<RecordingMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetingId) return;
    setLoading(true);
    recordingApi.getRecordings(meetingId)
      .then(setRecordings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [meetingId]);

  const handleDelete = async (id: string) => {
    try {
      await recordingApi.deleteRecording(id);
      setRecordings((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete recording:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Video className="w-8 h-8 text-gray-600" />
        <p className="text-gray-500 text-sm">{t('recordings.noRecordings')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3">{t('recordings.heading', { count: recordings.length })}</h3>
      {recordings.map((rec) => (
        <div
          key={rec.id}
          className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
        >
          <Video className="w-5 h-5 text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{rec.fileName}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(rec.duration)}
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {formatSize(rec.fileSize)}
              </span>
              <span>{rec.userName}</span>
            </div>
          </div>
          <button
            onClick={() => handleDelete(rec.id)}
            className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
            title={t('recordings.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
