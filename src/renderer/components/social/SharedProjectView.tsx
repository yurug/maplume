/**
 * SharedProjectView - Read-only view of a shared project
 *
 * Shows the project's progress chart, statistics, and allows comments/reactions.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Eye, Lock, User, Target, Calendar, TrendingUp, Award, MessageCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useSocial } from '../../context/SocialContext';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import { CommentSection } from './CommentSection';
import { ReactionBar, InlineReactions } from './ReactionBar';
import type { Project, WordEntry, ReactionCount } from '@maplume/shared';
import { calculateStatistics, getChartData } from '../../services/statistics';

interface SharedProjectViewProps {
  shareId: string;
  onBack: () => void;
}

interface DecryptedProject {
  project: Project;
  entries: WordEntry[];
}

export function SharedProjectView({ shareId, onBack }: SharedProjectViewProps) {
  const { t } = useI18n();
  const { state, actions } = useSocial();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DecryptedProject | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Find share info - check both received and owned shares
  const receivedShare = state.receivedShares.find(s => s.id === shareId);
  const ownedShare = state.ownedShares.find(s => s.id === shareId);
  const share = receivedShare || ownedShare;
  const isOwner = !!ownedShare;

  // Get owner's public key for encryption (either from share or from friends list)
  const ownerPublicKey = receivedShare?.owner?.publicKey ||
    state.friends.find(f => f.id === ownedShare?.sharedWith?.id)?.publicKey || '';

  // Get interactions for this share
  const interactions = state.shareInteractions[shareId];

  useEffect(() => {
    const loadProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const decrypted = await actions.decryptSharedProject(shareId);
        setData(decrypted);

        // Load interactions if we have the owner's public key
        if (ownerPublicKey) {
          await actions.loadShareInteractions(shareId, ownerPublicKey);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, [shareId, actions, ownerPublicKey]);

  // Get reaction counts for a target
  const getReactionCounts = useCallback((
    targetType: 'entry' | 'note' | 'comment',
    targetId: string
  ): ReactionCount[] => {
    return actions.getReactionCounts(shareId, targetType, targetId);
  }, [shareId, actions]);

  // Handle adding/removing reactions
  const handleAddReaction = useCallback(async (
    targetType: 'entry' | 'note' | 'comment',
    targetId: string,
    emoji: string
  ) => {
    try {
      await actions.addReaction(shareId, targetType, targetId, emoji);
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
  }, [shareId, actions]);

  const handleRemoveReaction = useCallback(async (reactionId: string) => {
    try {
      await actions.removeReaction(shareId, reactionId);
    } catch (err) {
      console.error('Failed to remove reaction:', err);
    }
  }, [shareId, actions]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-warm-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6 border-b border-warm-200 dark:border-warm-700">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon-sm" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
              {t.viewSharedProject || 'Shared Project'}
            </h2>
          </div>
        </div>
        <div className="p-6">
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.project) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6 border-b border-warm-200 dark:border-warm-700">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon-sm" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
              {t.viewSharedProject || 'Shared Project'}
            </h2>
          </div>
        </div>
        <div className="p-6 text-center text-warm-500">
          {t.noProjectData || 'No project data available.'}
        </div>
      </div>
    );
  }

  const { project, entries } = data;
  const stats = calculateStatistics(project, entries) || {
    currentWords: 0,
    percentage: 0,
    dailyAverage: 0,
    weeklyAverage: 0,
    bestDay: { date: null, count: 0 },
    currentStreak: 0,
    longestStreak: 0,
    wordsRemaining: project.targetWords || 0,
    daysRemaining: 0,
    projectedCompletion: null,
    onTrack: false,
  };
  const chartData = getChartData(project, entries) || [];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const getUnitLabel = () => {
    switch (project.unitType) {
      case 'pages': return t.unitPages || 'Pages';
      case 'chapters': return t.unitChapters || 'Chapters';
      default: return t.unitWords || 'Words';
    }
  };

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
              {project.title}
            </h2>
            <div className="flex items-center gap-3 text-sm text-warm-500 mt-1">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{share?.owner?.username || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-1">
                {share?.shareType === 'full' ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                <span>
                  {share?.shareType === 'full'
                    ? (t.shareTypeFull || 'Full access')
                    : (t.shareTypeStats || 'Stats only')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Progress chart */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-4">
            {t.progress || 'Progress'}
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2dcd4" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#8b7e6a"
                  fontSize={12}
                />
                <YAxis stroke="#8b7e6a" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2dcd4',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => formatDate(label as string)}
                  formatter={(value: number | undefined, name: string) => [
                    (value ?? 0).toLocaleString(),
                    name === 'actual' ? (t.actual || 'Actual') : (t.target || 'Target'),
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#d4a574"
                  strokeDasharray="5 5"
                  dot={false}
                  name="target"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#7c9a6c"
                  strokeWidth={2}
                  dot={false}
                  name="actual"
                />
                <ReferenceLine
                  x={new Date().toISOString().split('T')[0]}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  label={{
                    value: t.today || 'Today',
                    position: 'top',
                    fill: '#94a3b8',
                    fontSize: 12,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-4">
            {t.statistics || 'Statistics'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Target}
              label={t.progress || 'Progress'}
              value={`${(stats.percentage ?? 0).toFixed(1)}%`}
              detail={`${(stats.currentWords ?? 0).toLocaleString()} / ${(project.targetWords ?? 0).toLocaleString()} ${getUnitLabel().toLowerCase()}`}
              color="blue"
            />
            <StatCard
              icon={TrendingUp}
              label={t.dailyAverage || 'Daily Average'}
              value={(stats.dailyAverage ?? 0).toLocaleString()}
              detail={getUnitLabel().toLowerCase() + '/' + (t.day || 'day')}
              color="green"
            />
            <StatCard
              icon={Award}
              label={t.bestDay || 'Best Day'}
              value={(stats.bestDay?.count ?? 0).toLocaleString()}
              detail={stats.bestDay?.date ? formatDate(stats.bestDay.date) : '-'}
              color="purple"
            />
            <StatCard
              icon={Calendar}
              label={t.currentStreak || 'Current Streak'}
              value={(stats.currentStreak ?? 0).toString()}
              detail={(stats.currentStreak ?? 0) === 1 ? (t.day || 'day') : (t.days || 'days')}
              color="orange"
            />
          </div>
        </div>

        {/* Entries (only if full access) */}
        {share?.shareType === 'full' && entries.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-4">
              {t.entries || 'Entries'} ({entries.length})
            </h3>
            <div className="space-y-2">
              {entries.slice().reverse().slice(0, 10).map((entry) => {
                const entryId = entry.id || `${entry.date}-${entry.wordCount}`;
                const entryReactions = getReactionCounts('entry', entryId);
                const entryComments = interactions?.comments.filter(
                  c => c.targetType === 'entry' && c.targetId === entryId
                ) || [];
                const isExpanded = expandedEntryId === entryId;

                return (
                  <div
                    key={entryId}
                    className="group p-3 rounded-lg border border-warm-100 dark:border-warm-800 hover:border-warm-200 dark:hover:border-warm-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-warm-900 dark:text-warm-100 font-medium">
                          {formatDate(entry.date)}
                        </span>
                        <span className="text-warm-900 dark:text-warm-100 font-mono">
                          {entry.isIncrement ? '+' : ''}{entry.wordCount.toLocaleString()}
                        </span>
                        {entry.note && (
                          <span className="text-sm text-warm-500 truncate max-w-[200px]">
                            {entry.note}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Comment indicator */}
                        {entryComments.length > 0 && (
                          <button
                            onClick={() => setExpandedEntryId(isExpanded ? null : entryId)}
                            className="flex items-center gap-1 text-xs text-warm-400 hover:text-warm-600"
                          >
                            <MessageCircle className="w-3 h-3" />
                            {entryComments.length}
                          </button>
                        )}
                        {/* Reactions */}
                        <InlineReactions
                          reactions={entryReactions}
                          onAddReaction={(emoji) => handleAddReaction('entry', entryId, emoji)}
                          onRemoveReaction={handleRemoveReaction}
                        />
                      </div>
                    </div>

                    {/* Expanded comments section */}
                    {(isExpanded || entryComments.length === 0) && ownerPublicKey && (
                      <div className="mt-3 pt-3 border-t border-warm-100 dark:border-warm-800">
                        <CommentSection
                          shareId={shareId}
                          targetType="entry"
                          targetId={entryId}
                          ownerPublicKey={ownerPublicKey}
                          comments={interactions?.comments || []}
                          getReactionCounts={getReactionCounts}
                          expanded={isExpanded}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {entries.length > 10 && (
                <p className="text-center text-sm text-warm-500 mt-2">
                  ...{entries.length - 10} {t.moreEntries || 'more entries'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {project.notes && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-2">
              {t.projectNotes || 'Notes'}
            </h3>
            <div className="p-4 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50">
              <p className="text-warm-700 dark:text-warm-300 whitespace-pre-wrap mb-4">
                {project.notes}
              </p>

              {/* Reactions on notes */}
              <div className="flex items-center gap-4 pt-3 border-t border-warm-200 dark:border-warm-700">
                <ReactionBar
                  reactions={getReactionCounts('note', 'project-notes')}
                  onAddReaction={(emoji) => handleAddReaction('note', 'project-notes', emoji)}
                  onRemoveReaction={handleRemoveReaction}
                />
              </div>

              {/* Comments on notes */}
              {ownerPublicKey && (
                <div className="mt-4 pt-4 border-t border-warm-200 dark:border-warm-700">
                  <CommentSection
                    shareId={shareId}
                    targetType="note"
                    targetId="project-notes"
                    ownerPublicKey={ownerPublicKey}
                    comments={interactions?.comments || []}
                    getReactionCounts={getReactionCounts}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat card component
function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="p-4 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50">
      <div className={`inline-flex p-2 rounded-lg ${colorClasses[color]} mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-warm-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-warm-900 dark:text-warm-100">{value}</p>
      <p className="text-xs text-warm-500">{detail}</p>
    </div>
  );
}
