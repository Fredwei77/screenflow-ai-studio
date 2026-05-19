import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, BarChart3 } from 'lucide-react';
import { usePolling } from '../hooks/usePolling';
import { CreatePollForm } from './CreatePollForm';
import { PollResults } from './PollResults';

interface PollPanelProps {
  meetingId: string;
  userId: string;
  userName: string;
  onClose: () => void;
  isHost?: boolean;
}

export const PollPanel: React.FC<PollPanelProps> = ({ meetingId, userId, userName, onClose, isHost }) => {
  const { t } = useTranslation();
  const { polls, createPoll, vote, closePoll } = usePolling(meetingId, userId, userName);
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = async (question: string, options: string[]) => {
    try {
      await createPoll(question, options);
      setShowCreate(false);
    } catch {
      alert(t('polls.failedCreate'));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-white">{t('polls.title')}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="p-1 rounded text-gray-400 hover:text-white transition-colors"
            title={t('polls.newPoll')}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreatePollForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
      )}

      {/* Poll list */}
      <div className="flex-1 overflow-y-auto">
        {polls.length === 0 && !showCreate ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <BarChart3 className="w-8 h-8 text-gray-600" />
            <p className="text-gray-500 text-xs">{t('polls.noPolls')}</p>
          </div>
        ) : (
          polls.map((poll) => (
            <div key={poll.id} className="border-b border-gray-800">
              <PollResults
                poll={poll}
                userId={userId}
                onVote={(idx) => vote(poll.id, idx)}
                onClose={() => closePoll(poll.id)}
                isHost={isHost}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
