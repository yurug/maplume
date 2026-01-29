/**
 * PartyHistory - List of past writing parties
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Trophy, Clock, Users, Calendar } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { Party } from '@maplume/shared';

interface PartyHistoryProps {
  onBack: () => void;
}

export function PartyHistory({ onBack }: PartyHistoryProps) {
  const { state, actions } = useSocial();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState<Party[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const history = await actions.getPartyHistory();
      setParties(history);
    } catch (error) {
      console.error('Failed to load party history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="p-6 border-b border-warm-200 dark:border-warm-700">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
            {t.partyHistory || 'Party History'}
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-warm-400" />
          </div>
        ) : parties.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 mx-auto text-warm-300 dark:text-warm-600 mb-4" />
            <p className="text-warm-500">{t.noPartyHistory || 'No past parties yet'}</p>
            <p className="text-sm text-warm-400 mt-1">
              {t.partyHistoryHint || 'Your completed writing parties will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {parties.map((party) => {
              // Find user's rank and words
              const myParticipant = party.participants?.find((p) => p.id === state.user?.id);
              const sortedParticipants = [...(party.participants || [])].sort(
                (a, b) => b.wordsWritten - a.wordsWritten
              );
              const myRank = sortedParticipants.findIndex((p) => p.id === state.user?.id) + 1;

              return (
                <div
                  key={party.id}
                  className="p-4 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-warm-900 dark:text-warm-100">
                        {party.title}
                      </h3>
                      <p className="text-sm text-warm-500 flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {party.endedAt ? formatDate(party.endedAt) : '-'}
                      </p>
                    </div>
                    {myRank > 0 && (
                      <div className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        myRank === 1 && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                        myRank === 2 && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                        myRank === 3 && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                        myRank > 3 && 'bg-warm-200 text-warm-600 dark:bg-warm-700 dark:text-warm-400'
                      )}>
                        #{myRank}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-warm-600 dark:text-warm-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(party.durationMinutes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {party.participantCount}
                    </span>
                    {myParticipant && (
                      <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                        <Trophy className="h-4 w-4" />
                        {myParticipant.wordsWritten.toLocaleString()} {t.wordsUnit || 'words'}
                      </span>
                    )}
                  </div>

                  {/* Leaderboard preview */}
                  {party.rankingEnabled && sortedParticipants.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-warm-200 dark:border-warm-700">
                      <div className="flex items-center gap-2">
                        {sortedParticipants.slice(0, 3).map((p, idx) => (
                          <div
                            key={p.id}
                            className={cn(
                              'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
                              p.id === state.user?.id
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                : 'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-400'
                            )}
                          >
                            <span className={cn(
                              'font-medium',
                              idx === 0 && 'text-yellow-600',
                              idx === 1 && 'text-gray-500',
                              idx === 2 && 'text-amber-600'
                            )}>
                              {idx + 1}.
                            </span>
                            <span className="truncate max-w-[60px]">{p.username}</span>
                            <span className="font-mono">{p.wordsWritten}</span>
                          </div>
                        ))}
                        {sortedParticipants.length > 3 && (
                          <span className="text-xs text-warm-400">
                            +{sortedParticipants.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
