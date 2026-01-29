/**
 * ActivePartyPanel - Main view when in an active writing party
 *
 * Shows timer, progress chart, leaderboard, and controls.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Clock,
  Trophy,
  Copy,
  Check,
  LogOut,
  Square,
  UserPlus,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useSocial } from '../../context/SocialContext';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { formatTimeRemaining } from './PartySection';
import { Avatar } from './Avatar';

interface ActivePartyPanelProps {
  partyId: string;
  onBack: () => void;
}

// Generate consistent colors for participants
const PARTICIPANT_COLORS = [
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#84cc16', // lime
];

export function ActivePartyPanel({ partyId, onBack }: ActivePartyPanelProps) {
  const { state: socialState, actions: socialActions } = useSocial();
  const { state: appState } = useApp();
  const { t } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [timeProgress, setTimeProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [ending, setEnding] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  // Get progress history from context (persists across unmounts)
  const progressHistory = socialState.partyProgressHistory[partyId] || [];

  // Find the party from activeParties
  const [party, setParty] = useState<typeof socialState.activeParties[0] | null>(
    socialState.activeParties.find((p) => p.id === partyId) || null
  );
  const isCreator = party?.creator.id === socialState.user?.id;

  // Fetch full party details on mount (to get participants)
  useEffect(() => {
    const fetchPartyDetails = async () => {
      try {
        const response = await socialActions.getPartyDetails(partyId);
        if (response) {
          setParty(response);
        }
      } catch (error) {
        console.error('Failed to fetch party details:', error);
      }
    };
    fetchPartyDetails();
  }, [partyId, socialActions]);

  // Update party from context when it changes
  useEffect(() => {
    const updatedParty = socialState.activeParties.find((p) => p.id === partyId);
    if (updatedParty) {
      setParty(updatedParty);
    }
  }, [socialState.activeParties, partyId]);

  // Get current word count from active project
  const activeProject = appState.projects.find((p) => p.id === appState.activeProjectId);
  const currentWordCount = activeProject
    ? appState.entries
        .filter((e) => e.projectId === activeProject.id)
        .reduce((total, e) => {
          if (e.isIncrement) return total + e.wordCount;
          return e.wordCount;
        }, 0)
    : 0;

  // Sort participants by words written - MUST be before any conditional return
  const sortedParticipants = useMemo(() => {
    if (!party?.participants) return [];
    return [...party.participants].sort((a, b) => b.wordsWritten - a.wordsWritten);
  }, [party?.participants]);

  // Find current user's rank - MUST be before any conditional return
  const myRank = useMemo(() => {
    return sortedParticipants.findIndex((p) => p.id === socialState.user?.id) + 1;
  }, [sortedParticipants, socialState.user?.id]);

  const myStats = useMemo(() => {
    return sortedParticipants.find((p) => p.id === socialState.user?.id);
  }, [sortedParticipants, socialState.user?.id]);

  // Create color map for participants - MUST be before any conditional return
  const participantColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    party?.participants?.forEach((p, index) => {
      map[p.username] = PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
    });
    return map;
  }, [party?.participants]);

  // Get friends not already in party - MUST be before any conditional return
  const invitableFriends = useMemo(() => {
    if (!party?.participants) return socialState.friends;
    const participantIds = new Set(party.participants.map((p) => p.id));
    return socialState.friends.filter((f) => !participantIds.has(f.id));
  }, [socialState.friends, party?.participants]);

  // Prepare chart data - MUST be before any conditional return
  // The chart shows progress from 0, so we subtract the initial values
  const chartData = useMemo(() => {
    if (!party?.actualStart || progressHistory.length === 0) return [];

    // Get initial values from first snapshot to calculate relative progress
    const initialValues: Record<string, number> = {};
    if (progressHistory.length > 0) {
      const firstSnapshot = progressHistory[0];
      party.participants?.forEach((p) => {
        initialValues[p.id] = firstSnapshot.participants[p.id] || 0;
      });
    }

    return progressHistory.map((snapshot) => {
      const dataPoint: Record<string, number | string> = {
        time: Math.floor((snapshot.timestamp - party.actualStart!) / 60000), // minutes since start
      };

      party.participants?.forEach((p) => {
        // Show progress relative to start (so chart starts at 0)
        const currentValue = snapshot.participants[p.id] || 0;
        const initialValue = initialValues[p.id] || 0;
        dataPoint[p.username] = Math.max(0, currentValue - initialValue);
      });

      return dataPoint;
    });
  }, [progressHistory, party?.actualStart, party?.participants]);

  // Update timer and progress
  useEffect(() => {
    if (!party?.actualStart || party.status !== 'active') return;

    const updateTimer = () => {
      const now = Date.now();
      const startTime = party.actualStart!;
      const endTime = startTime + party.durationMinutes * 60 * 1000;
      const totalDuration = party.durationMinutes * 60 * 1000;
      const elapsed = now - startTime;
      const remaining = Math.max(0, endTime - now);

      setTimeProgress(Math.min(100, (elapsed / totalDuration) * 100));
      setTimeRemaining(formatTimeRemaining(remaining));
    };

    updateTimer();
    // Update every second for short parties, every minute for long ones
    const intervalMs = party.durationMinutes > 60 ? 60000 : 1000;
    const interval = setInterval(updateTimer, intervalMs);
    return () => clearInterval(interval);
  }, [party?.actualStart, party?.durationMinutes, party?.status]);

  // Periodically update progress to server (this also updates the progress history in context)
  // We use a ref to track the last sent word count to avoid unnecessary API calls
  const lastSentWordCount = React.useRef<number | null>(null);

  useEffect(() => {
    if (!party || party.status !== 'active') return;

    const updateProgress = async () => {
      // Skip if word count hasn't changed since last update
      if (lastSentWordCount.current === currentWordCount) return;

      try {
        await socialActions.updatePartyProgress(party.id, currentWordCount);
        lastSentWordCount.current = currentWordCount;
      } catch (error) {
        // Don't spam console with auth errors - they'll be handled by the auth system
        if (!(error instanceof Error && error.message.includes('401'))) {
          console.error('Failed to update progress:', error);
        }
      }
    };

    // Update immediately if word count changed
    updateProgress();

    // Then poll every 30 seconds
    const interval = setInterval(updateProgress, 30000);
    return () => clearInterval(interval);
  }, [party?.id, party?.status, currentWordCount, socialActions]);

  const handleCopyCode = useCallback(async () => {
    if (!party?.joinCode) return;
    await navigator.clipboard.writeText(party.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [party?.joinCode]);

  const handleEndParty = useCallback(async () => {
    if (!party) return;
    setEnding(true);
    try {
      await socialActions.endParty(party.id);
    } catch (error) {
      console.error('Failed to end party:', error);
    } finally {
      setEnding(false);
    }
  }, [party, socialActions]);

  const handleLeaveParty = useCallback(async () => {
    if (!party) return;
    setLeaving(true);
    try {
      await socialActions.leaveParty(party.id);
      onBack();
    } catch (error) {
      console.error('Failed to leave party:', error);
    } finally {
      setLeaving(false);
    }
  }, [party, socialActions, onBack]);

  const handleInviteFriends = useCallback(async () => {
    if (!party || selectedFriends.length === 0) return;
    setInviting(true);
    try {
      await socialActions.inviteToParty(party.id, selectedFriends);
      setShowInviteModal(false);
      setSelectedFriends([]);
    } catch (error) {
      console.error('Failed to invite friends:', error);
    } finally {
      setInviting(false);
    }
  }, [party, selectedFriends, socialActions]);

  const toggleFriend = useCallback((friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  }, []);

  // Early return AFTER all hooks
  if (!party) {
    return (
      <div className="flex-1 flex items-center justify-center text-warm-500">
        {t.noActiveParty || 'No active party'}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="p-6 border-b border-warm-200 dark:border-warm-700">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
              {party.title}
            </h2>
            <p className="text-sm text-warm-500">
              {t.hostedBy || 'Hosted by'} {party.creator.username}
            </p>
          </div>

          {/* Invite button */}
          {invitableFriends.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteModal(true)}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {t.inviteFriends || 'Invite'}
            </Button>
          )}

          {/* Join code */}
          {party.joinCode && (
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warm-100 dark:bg-warm-700 text-warm-700 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-warm-600 transition-colors"
            >
              <span className="font-mono text-sm">{party.joinCode}</span>
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Timer Section */}
      <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              {t.timeRemaining || 'Time Remaining'}
            </span>
          </div>
          <div className="text-5xl font-mono font-bold text-purple-900 dark:text-purple-100 mb-4">
            {timeRemaining}
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
              style={{ width: `${timeProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* My Stats */}
      {myStats && (
        <div className="p-4 border-b border-warm-200 dark:border-warm-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-warm-500">{t.yourProgress || 'Your Progress'}</p>
              <p className="text-2xl font-bold text-warm-900 dark:text-warm-100">
                {myStats.wordsWritten.toLocaleString()} {t.wordsUnit || 'words'}
              </p>
            </div>
            {party.rankingEnabled && myRank > 0 && (
              <div className="text-right">
                <p className="text-sm text-warm-500">{t.rank || 'Rank'}</p>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    myRank === 1 && 'text-yellow-500',
                    myRank === 2 && 'text-gray-400',
                    myRank === 3 && 'text-amber-600',
                    myRank > 3 && 'text-warm-600 dark:text-warm-400'
                  )}
                >
                  #{myRank}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Chart */}
      {party.rankingEnabled && chartData.length >= 1 && (
        <div className="p-6 border-b border-warm-200 dark:border-warm-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider">
              {t.progress || 'Progress'}
            </h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#525252' : '#e5e5e5'}
                />
                <XAxis
                  dataKey="time"
                  stroke={isDark ? '#a3a3a3' : '#737373'}
                  fontSize={12}
                  tickFormatter={(value) => `${value}m`}
                />
                <YAxis
                  stroke={isDark ? '#a3a3a3' : '#737373'}
                  fontSize={12}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#262626' : '#ffffff',
                    border: `1px solid ${isDark ? '#404040' : '#e5e5e5'}`,
                    borderRadius: '8px',
                  }}
                  labelFormatter={(value) => `${value} min`}
                  formatter={(value: number) => [value.toLocaleString(), 'words']}
                />
                <Legend />
                {party.participants?.map((p) => (
                  <Line
                    key={p.id}
                    type="monotone"
                    dataKey={p.username}
                    stroke={participantColorMap[p.username]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {party.rankingEnabled && sortedParticipants.length > 0 && (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider">
              {t.leaderboard || 'Leaderboard'}
            </h3>
            <span className="text-xs text-warm-400">
              ({sortedParticipants.length} {t.participants || 'participants'})
            </span>
          </div>

          <div className="space-y-2">
            {sortedParticipants.map((participant, index) => {
              const rank = index + 1;
              const isMe = participant.id === socialState.user?.id;

              return (
                <div
                  key={participant.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg transition-colors',
                    isMe
                      ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800'
                      : 'bg-warm-50 dark:bg-warm-800'
                  )}
                >
                  {/* Rank */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                      rank === 1 && 'bg-yellow-100 text-yellow-700',
                      rank === 2 && 'bg-gray-100 text-gray-600',
                      rank === 3 && 'bg-amber-100 text-amber-700',
                      rank > 3 && 'bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-400'
                    )}
                  >
                    {rank}
                  </div>

                  {/* Avatar with color ring */}
                  <div
                    className="rounded-full p-0.5"
                    style={{ backgroundColor: participantColorMap[participant.username] }}
                  >
                    <Avatar
                      preset={participant.avatarPreset}
                      username={participant.username}
                      size="sm"
                    />
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'font-medium truncate',
                        isMe ? 'text-purple-900 dark:text-purple-100' : 'text-warm-900 dark:text-warm-100'
                      )}
                    >
                      {participant.username}
                      {participant.isCreator && (
                        <span className="ml-2 text-xs text-warm-500">(host)</span>
                      )}
                    </p>
                  </div>

                  {/* Words written */}
                  <div className="text-right">
                    <p className="font-mono font-medium text-warm-900 dark:text-warm-100">
                      {participant.wordsWritten.toLocaleString()}
                    </p>
                    <p className="text-xs text-warm-500">{t.wordsUnit || 'words'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-6 border-t border-warm-200 dark:border-warm-700 flex gap-3">
        {isCreator ? (
          <Button
            variant="outline"
            onClick={handleEndParty}
            disabled={ending}
            className="flex-1 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
          >
            <Square className="h-4 w-4 mr-2" />
            {ending ? t.ending || 'Ending...' : t.endParty || 'End Party'}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleLeaveParty}
            disabled={leaving}
            className="flex-1 text-warm-600 dark:text-warm-400"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {leaving ? t.leaving || 'Leaving...' : t.leaveParty || 'Leave Party'}
          </Button>
        )}
      </div>

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="relative w-full max-w-sm mx-4 bg-white dark:bg-warm-800 rounded-xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-warm-200 dark:border-warm-700">
              <h3 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
                {t.inviteFriends || 'Invite Friends'}
              </h3>
            </div>

            <div className="p-4 max-h-64 overflow-y-auto">
              {invitableFriends.length === 0 ? (
                <p className="text-sm text-warm-500 text-center py-4">
                  {t.allFriendsInParty || 'All your friends are already in this party!'}
                </p>
              ) : (
                <div className="space-y-2">
                  {invitableFriends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => toggleFriend(friend.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                        selectedFriends.includes(friend.id)
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-warm-50 dark:bg-warm-700 text-warm-700 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-600'
                      )}
                    >
                      <Avatar preset={friend.avatarPreset} username={friend.username} size="sm" />
                      <span className="text-sm flex-1">{friend.username}</span>
                      {selectedFriends.includes(friend.id) && (
                        <Check className="h-4 w-4 text-purple-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-warm-200 dark:border-warm-700 flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowInviteModal(false)}
                className="flex-1"
              >
                {t.cancel || 'Cancel'}
              </Button>
              <Button
                onClick={handleInviteFriends}
                disabled={inviting || selectedFriends.length === 0}
                className="flex-1"
              >
                {inviting ? '...' : t.inviteFriends || 'Invite'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
