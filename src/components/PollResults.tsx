import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { PollWithVotes } from '../types';

interface PollResultsProps {
  poll: PollWithVotes;
  userId: string;
  onVote: (optionIdx: number) => void;
  onClose: () => void;
  isHost?: boolean;
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const PollResults: React.FC<PollResultsProps> = ({ poll, userId, onVote, onClose, isHost }) => {
  const { t } = useTranslation();
  const userVote = poll.votes.find((v) => v.userId === userId);
  const hasVoted = !!userVote;

  const data = poll.options.map((opt, i) => {
    const votesForOption = poll.votes.filter((v) => v.optionIdx === i).length;
    return {
      name: opt,
      votes: votesForOption,
      percentage: poll.totalVotes > 0 ? Math.round((votesForOption / poll.totalVotes) * 100) : 0,
    };
  });

  return (
    <div className="p-3">
      <h4 className="text-sm font-medium text-white mb-3">{poll.question}</h4>

      {/* Vote buttons or results */}
      {!hasVoted && poll.isActive ? (
        <div className="space-y-2 mb-3">
          {poll.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => onVote(i)}
              className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 rounded-lg text-sm text-white transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="h-40 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                  formatter={(value: number, _name: string, props: any) => [`${value} ${t('meeting.polls').toLowerCase()} (${props.payload.percentage}%)`, t('meeting.polls')]}
                />
                <Bar dataKey="votes" radius={[0, 4, 4, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-xs text-gray-400 mb-2">
            {t('polls.votes', { count: poll.totalVotes })}
            {userVote && <span className="ml-2 text-blue-400">{t('polls.youVoted', { option: poll.options[userVote.optionIdx] })}</span>}
          </div>
        </>
      )}

      {poll.isActive && isHost && (
        <button
          onClick={onClose}
          className="w-full px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors"
        >
          {t('polls.closePoll')}
        </button>
      )}

      {!poll.isActive && (
        <div className="text-xs text-gray-500 text-center">{t('polls.pollClosed')}</div>
      )}
    </div>
  );
};
