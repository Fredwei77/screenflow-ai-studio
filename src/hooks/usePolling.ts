import { useEffect, useCallback } from 'react';
import { usePollStore } from '../stores/usePollStore';
import { pollApi } from '../services/api';
import { sendPollCreated, sendPollVote, getSocket } from '../services/socket';
import type { PollWithVotes, Vote } from '../types';

export function usePolling(meetingId: string, userId: string, userName: string) {
  const { polls, activePoll, isPollPanelOpen, setPolls, addPoll, updatePoll, setActivePoll, addVote, togglePollPanel } = usePollStore();

  // Load existing polls
  useEffect(() => {
    if (!meetingId) return;
    pollApi.getPolls(meetingId).then(setPolls).catch(console.error);
  }, [meetingId, setPolls]);

  // Listen for real-time poll events
  useEffect(() => {
    if (!meetingId) return;
    const socket = getSocket();

    const handlePollCreated = (poll: PollWithVotes) => {
      // Guard: skip if poll already exists (sender already added it locally)
      const exists = usePollStore.getState().polls.some((p) => p.id === poll.id);
      if (exists) return;
      addPoll(poll);
    };

    const handlePollVote = (data: { pollId: string; userId: string; userName: string; optionIdx: number }) => {
      // Guard: skip if this user already voted on this poll (sender already added locally)
      const poll = usePollStore.getState().polls.find((p) => p.id === data.pollId);
      if (poll && poll.votes.some((v) => v.userId === data.userId)) return;

      const vote: Vote = {
        id: crypto.randomUUID(),
        pollId: data.pollId,
        userId: data.userId,
        userName: data.userName,
        optionIdx: data.optionIdx,
      };
      addVote(data.pollId, vote);
    };

    const handlePollClosed = (pollId: string) => {
      updatePoll(pollId, { isActive: false });
    };

    socket.on('poll:created', handlePollCreated);
    socket.on('poll:vote', handlePollVote);
    socket.on('poll:closed', handlePollClosed);

    return () => {
      socket.off('poll:created', handlePollCreated);
      socket.off('poll:vote', handlePollVote);
      socket.off('poll:closed', handlePollClosed);
    };
  }, [meetingId, addPoll, addVote, updatePoll]);

  const createPoll = useCallback(async (question: string, options: string[]) => {
    try {
      const poll = await pollApi.createPoll(meetingId, question, options, userName);
      addPoll(poll);
      sendPollCreated(meetingId, poll);
      return poll;
    } catch (err) {
      console.error('Failed to create poll:', err);
      throw err;
    }
  }, [meetingId, userName, addPoll]);

  const vote = useCallback(async (pollId: string, optionIdx: number) => {
    try {
      await pollApi.vote(pollId, userId, userName, optionIdx);
      const voteData: Vote = {
        id: crypto.randomUUID(),
        pollId,
        userId,
        userName,
        optionIdx,
      };
      addVote(pollId, voteData);
      sendPollVote(meetingId, { pollId, userId, userName, optionIdx });
    } catch (err) {
      console.error('Failed to vote:', err);
      throw err;
    }
  }, [meetingId, userId, userName, addVote]);

  const closePoll = useCallback(async (pollId: string) => {
    try {
      await pollApi.closePoll(pollId);
      updatePoll(pollId, { isActive: false });
      // Broadcast poll closure to other participants
      getSocket().emit('poll:closed', { meetingId, pollId });
    } catch (err) {
      console.error('Failed to close poll:', err);
      throw err;
    }
  }, [meetingId, updatePoll]);

  return {
    polls,
    activePoll,
    isPollPanelOpen,
    setActivePoll,
    togglePollPanel,
    createPoll,
    vote,
    closePoll,
  };
}
