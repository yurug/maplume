/**
 * ShareProjectModal - Dialog for sharing a project with friends
 *
 * Allows users to select a friend and share type (full or stats only).
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Share2, Users, Eye, Lock, RefreshCw, Check, UserX } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import type { Project, WordEntry } from '@maplume/shared';
import { cn } from '../../lib/utils';

interface ShareProjectModalProps {
  project: Project;
  entries: WordEntry[];
  onClose: () => void;
}

export function ShareProjectModal({ project, entries, onClose }: ShareProjectModalProps) {
  const { t } = useI18n();
  const { state, actions } = useSocial();
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [shareType, setShareType] = useState<'full' | 'stats_only'>('full');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load friends when modal opens
  useEffect(() => {
    actions.refreshFriends();
    actions.refreshShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get shares for this project
  const projectShares = state.ownedShares.filter(s => s.projectLocalId === project.id);
  const sharedFriendIds = new Set(projectShares.map(s => s.sharedWith?.id));

  const handleShare = async () => {
    if (!selectedFriendId) return;

    setLoading(true);
    setError(null);

    try {
      await actions.shareProject(project, entries, selectedFriendId, shareType);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share project');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await actions.revokeShare(shareId);
    } catch (err) {
      console.error('Failed to revoke share:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-warm-200/80 bg-white p-6 shadow-warm-xl dark:border-warm-700 dark:bg-warm-850"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-100 p-2.5 dark:bg-green-900/30">
              <Share2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold text-warm-900 dark:text-warm-50">
                {t.shareProject || 'Share Project'}
              </h2>
              <p className="text-sm text-warm-500">{project.title}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-warm-400 hover:text-warm-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-medium text-warm-900 dark:text-warm-100">
              {t.projectShared || 'Project shared successfully!'}
            </p>
          </div>
        ) : (
          <>
            {/* Description */}
            <p className="text-warm-600 dark:text-warm-400 mb-6">
              {t.shareProjectDescription || 'Share your progress with a friend.'}
            </p>

            {/* Already shared */}
            {projectShares.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-3">
                  {t.youAreSharing || 'You are sharing'}
                </h3>
                <div className="space-y-2">
                  {projectShares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-warm-50 dark:bg-warm-800 border border-warm-200 dark:border-warm-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium text-sm">
                          {share.sharedWith?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-warm-900 dark:text-warm-100 text-sm">
                            {share.sharedWith?.username || 'Unknown'}
                          </p>
                          <p className="text-xs text-warm-500">
                            {share.shareType === 'full' ? (t.shareTypeFull || 'Full access') : (t.shareTypeStats || 'Stats only')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRevokeShare(share.id)}
                        className="text-warm-400 hover:text-red-500"
                        title={t.revokeShare || 'Revoke access'}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Select friend */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-warm-700 dark:text-warm-300 mb-3">
                {t.shareWith || 'Share with'}
              </h3>

              {state.friends.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="w-10 h-10 mx-auto text-warm-300 dark:text-warm-600 mb-2" />
                  <p className="text-sm text-warm-500">
                    {t.noFriendsYet || 'No friends yet. Add some friends to share your projects!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {state.friends.map((friend) => {
                    const alreadyShared = sharedFriendIds.has(friend.id);
                    const isSelected = selectedFriendId === friend.id;

                    return (
                      <button
                        key={friend.id}
                        type="button"
                        disabled={alreadyShared}
                        onClick={() => setSelectedFriendId(friend.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                          alreadyShared
                            ? 'border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-800 opacity-50 cursor-not-allowed'
                            : isSelected
                            ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20'
                            : 'border-warm-200 dark:border-warm-700 hover:border-warm-300 dark:hover:border-warm-600 hover:bg-warm-50 dark:hover:bg-warm-800'
                        )}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium">
                          {friend.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-warm-900 dark:text-warm-100">
                            {friend.username}
                          </p>
                          {alreadyShared && (
                            <p className="text-xs text-warm-500">
                              {t.alreadyShared || 'Already shared'}
                            </p>
                          )}
                        </div>
                        {isSelected && !alreadyShared && (
                          <Check className="w-5 h-5 text-primary-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Share type */}
            {selectedFriendId && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-warm-700 dark:text-warm-300 mb-3">
                  {t.shareType || 'Share Type'}
                </h3>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShareType('full')}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left',
                      shareType === 'full'
                        ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20'
                        : 'border-warm-200 dark:border-warm-700 hover:border-warm-300 dark:hover:border-warm-600'
                    )}
                  >
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                      <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-warm-900 dark:text-warm-100">
                        {t.shareTypeFull || 'Full access (progress + entries)'}
                      </p>
                      <p className="text-xs text-warm-500 mt-0.5">
                        {t.shareTypeFullDesc || 'Friend can see your complete writing history'}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShareType('stats_only')}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left',
                      shareType === 'stats_only'
                        ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20'
                        : 'border-warm-200 dark:border-warm-700 hover:border-warm-300 dark:hover:border-warm-600'
                    )}
                  >
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                      <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-warm-900 dark:text-warm-100">
                        {t.shareTypeStats || 'Stats only (no entries)'}
                      </p>
                      <p className="text-xs text-warm-500 mt-0.5">
                        {t.shareTypeStatsDesc || 'Friend can only see overall progress'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                {t.cancel || 'Cancel'}
              </Button>
              <Button
                onClick={handleShare}
                disabled={!selectedFriendId || loading}
                className="flex-1"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4 mr-2" />
                )}
                {t.shareProject || 'Share'}
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
