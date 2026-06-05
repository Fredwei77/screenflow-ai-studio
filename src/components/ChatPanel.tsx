import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { useChatStore } from '../stores/useChatStore';
import { sendMessage } from '../services/socket';
import { formatTime } from '../lib/formatters';

interface ChatPanelProps {
  roomId: string;
  currentUserId: string;
  userName: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ roomId, currentUserId, userName }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const messages = useChatStore((s) => s.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canSend = !!roomId && !!currentUserId && !sending;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !canSend) return;
    setSending(true);
    setSendError('');
    try {
      await sendMessage(roomId, text, userName);
      setInput('');
    } catch (error) {
      console.error('Failed to send chat message:', error);
      const message = error instanceof Error ? error.message : '';
      setSendError(
        message === 'Not in this room'
          ? t('chat.notInRoom')
          : message === 'Chat message timed out'
          ? t('chat.timeout')
          : t('chat.failedSend')
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">{t('chat.noMessages')}</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.userId === currentUserId ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-400">{msg.userName}</span>
                <span className="text-xs text-gray-600">{formatTime(msg.createdAt)}</span>
              </div>
              <div
                className={`px-3 py-2 rounded-xl text-sm max-w-[80%] ${
                  msg.userId === currentUserId
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-200'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-800">
        {!currentUserId && <p className="mb-2 text-xs text-amber-300">{t('chat.connecting')}</p>}
        {sendError && <p className="mb-2 text-xs text-red-400">{sendError}</p>}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            disabled={!currentUserId || sending}
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !canSend}
            className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={t('chat.send')}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
