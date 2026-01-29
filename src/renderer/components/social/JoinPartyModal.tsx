/**
 * JoinPartyModal - Enter code to join a writing party
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PartyPopper, Users, Clock } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import { apiClient } from '../../services/api';
import type { Party } from '@maplume/shared';

interface JoinPartyModalProps {
  onClose: () => void;
  onJoined: () => void;
}

export function JoinPartyModal({ onClose, onJoined }: JoinPartyModalProps) {
  const { actions: socialActions } = useSocial();
  const { state: appState } = useApp();
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewParty, setPreviewParty] = useState<Party | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // Get current word count from active project
  const activeProject = appState.projects.find((p) => p.id === appState.activeProjectId);
  const currentWordCount = activeProject
    ? appState.entries
        .filter((e) => e.projectId === activeProject.id)
        .reduce((total, e) => {
          if (e.isIncrement) return total + e.wordCount;
          return e.wordCount; // For totals, take the last one
        }, 0)
    : 0;

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCode(value);
    setPreviewParty(null);
    setError(null);
  };

  const handlePreview = async () => {
    if (code.length !== 6) {
      setError(t.invalidPartyCode || 'Please enter a 6-character code');
      return;
    }

    setPreviewing(true);
    setError(null);

    try {
      const response = await apiClient.previewPartyByCode(code);
      setPreviewParty(response.party);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Party not found');
    } finally {
      setPreviewing(false);
    }
  };

  const handleJoin = async () => {
    if (!previewParty) return;

    setJoining(true);
    setError(null);

    try {
      await socialActions.joinPartyByCode(code, currentWordCount);
      onJoined();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join party');
    } finally {
      setJoining(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-md mx-4 bg-white dark:bg-warm-800 rounded-xl shadow-xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-warm-200 dark:border-warm-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <PartyPopper className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
                {t.joinParty || 'Join Writing Party'}
              </h2>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Code input */}
            <div>
              <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-1">
                {t.partyCode || 'Party Code'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="ABC123"
                  maxLength={6}
                  className="flex-1 px-4 py-2 text-center text-xl font-mono tracking-widest rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-900 text-warm-900 dark:text-warm-100 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Button
                  variant="secondary"
                  onClick={handlePreview}
                  disabled={code.length !== 6 || previewing}
                >
                  {previewing ? '...' : (t.find || 'Find')}
                </Button>
              </div>
              <p className="mt-1 text-xs text-warm-500">
                {t.partyCodeHint || 'Enter the 6-character code from your friend'}
              </p>
            </div>

            {/* Preview */}
            {previewParty && (
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                  {previewParty.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-purple-700 dark:text-purple-300">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {previewParty.participantCount} {t.participants || 'participants'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {previewParty.durationMinutes} {t.minutes || 'min'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                  {t.hostedBy || 'Hosted by'} {previewParty.creator.username}
                </p>
              </div>
            )}

            {/* Current word count info */}
            {previewParty && activeProject && (
              <div className="p-3 rounded-lg bg-warm-100 dark:bg-warm-700 text-sm">
                <p className="text-warm-600 dark:text-warm-400">
                  {t.startingWordCount || 'Starting word count'}:{' '}
                  <span className="font-medium text-warm-900 dark:text-warm-100">
                    {currentWordCount.toLocaleString()}
                  </span>
                </p>
                <p className="text-xs text-warm-500 mt-1">
                  {t.fromProject || 'from'} "{activeProject.title}"
                </p>
              </div>
            )}

            {error && (
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-warm-200 dark:border-warm-700 flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              {t.cancel || 'Cancel'}
            </Button>
            <Button
              onClick={handleJoin}
              disabled={!previewParty || joining}
              className="flex-1"
            >
              {joining ? (t.joining || 'Joining...') : (t.joinParty || 'Join Party')}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
