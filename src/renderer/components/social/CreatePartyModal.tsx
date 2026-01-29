/**
 * CreatePartyModal - Form to create a new writing party
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Users, PartyPopper, Settings2 } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { cn } from '../../lib/utils';

interface CreatePartyModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 1440, label: '1 day' },
  { value: 10080, label: '1 week' },
  { value: 43200, label: '30 days' },
  { value: -1, label: 'Custom' }, // -1 indicates custom duration
];

type DurationUnit = 'minutes' | 'hours' | 'days';

export function CreatePartyModal({ onClose, onCreated }: CreatePartyModalProps) {
  const { state, actions } = useSocial();
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [customDurationValue, setCustomDurationValue] = useState('');
  const [customDurationUnit, setCustomDurationUnit] = useState<DurationUnit>('hours');
  const [rankingEnabled, setRankingEnabled] = useState(true);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDurationSelect = (value: number) => {
    if (value === -1) {
      setShowCustomDuration(true);
    } else {
      setShowCustomDuration(false);
      setDuration(value);
    }
  };

  const getCustomDurationMinutes = (): number | null => {
    const num = parseFloat(customDurationValue);
    if (isNaN(num) || num <= 0) return null;

    switch (customDurationUnit) {
      case 'minutes':
        return Math.round(num);
      case 'hours':
        return Math.round(num * 60);
      case 'days':
        return Math.round(num * 24 * 60);
      default:
        return null;
    }
  };

  const getFinalDuration = (): number => {
    if (showCustomDuration) {
      return getCustomDurationMinutes() || 30;
    }
    return duration;
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError(t.partyTitleRequired || 'Please enter a title');
      return;
    }

    const finalDuration = getFinalDuration();
    if (finalDuration < 5) {
      setError('Duration must be at least 5 minutes');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await actions.createParty(
        title.trim(),
        finalDuration,
        null, // Start immediately
        rankingEnabled,
        selectedFriends.length > 0 ? selectedFriends : undefined
      );
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create party');
    } finally {
      setCreating(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
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
                {t.createParty || 'Create Writing Party'}
              </h2>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-1">
                {t.partyTitle || 'Party Title'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.partyTitlePlaceholder || 'Sprint Session'}
                className="w-full px-3 py-2 rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-900 text-warm-900 dark:text-warm-100 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={50}
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                {t.partyDuration || 'Duration'}
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleDurationSelect(opt.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      (opt.value === -1 && showCustomDuration) ||
                        (opt.value !== -1 && !showCustomDuration && duration === opt.value)
                        ? 'bg-purple-500 text-white'
                        : 'bg-warm-100 dark:bg-warm-700 text-warm-700 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-warm-600'
                    )}
                  >
                    {opt.value === -1 ? (
                      <span className="flex items-center gap-1">
                        <Settings2 className="h-3 w-3" />
                        {opt.label}
                      </span>
                    ) : (
                      opt.label
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Duration Input */}
              {showCustomDuration && (
                <div className="mt-3 p-3 rounded-lg bg-warm-50 dark:bg-warm-900 border border-warm-200 dark:border-warm-700">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={customDurationValue}
                      onChange={(e) => setCustomDurationValue(e.target.value)}
                      placeholder="Enter value"
                      min="1"
                      className="flex-1 px-3 py-2 rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-warm-900 dark:text-warm-100 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <select
                      value={customDurationUnit}
                      onChange={(e) => setCustomDurationUnit(e.target.value as DurationUnit)}
                      className="px-3 py-2 rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-warm-900 dark:text-warm-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                  {customDurationValue && getCustomDurationMinutes() && (
                    <p className="mt-2 text-xs text-warm-500">
                      = {getCustomDurationMinutes()?.toLocaleString()} minutes
                      {getCustomDurationMinutes()! >= 60 &&
                        ` (${Math.round((getCustomDurationMinutes()! / 60) * 10) / 10} hours)`}
                      {getCustomDurationMinutes()! >= 1440 &&
                        ` / ${Math.round((getCustomDurationMinutes()! / 1440) * 10) / 10} days`}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Ranking Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-warm-700 dark:text-warm-300">
                  {t.partyRanking || 'Show Leaderboard'}
                </p>
                <p className="text-xs text-warm-500">
                  {t.partyRankingDesc || 'Display word count rankings during the party'}
                </p>
              </div>
              <Switch checked={rankingEnabled} onCheckedChange={setRankingEnabled} />
            </div>

            {/* Invite Friends */}
            {state.friends.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-2">
                  <Users className="inline h-4 w-4 mr-1" />
                  {t.inviteFriends || 'Invite Friends'} ({t.optional || 'Optional'})
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {state.friends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => toggleFriend(friend.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                        selectedFriends.includes(friend.id)
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-warm-50 dark:bg-warm-700 text-warm-700 dark:text-warm-300 hover:bg-warm-100 dark:hover:bg-warm-600'
                      )}
                    >
                      <div className="w-6 h-6 rounded-full bg-warm-200 dark:bg-warm-600 flex items-center justify-center text-xs font-medium">
                        {friend.username[0].toUpperCase()}
                      </div>
                      <span className="text-sm">{friend.username}</span>
                      {selectedFriends.includes(friend.id) && (
                        <span className="ml-auto text-purple-500">✓</span>
                      )}
                    </button>
                  ))}
                </div>
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
            <Button onClick={handleCreate} disabled={creating} className="flex-1">
              {creating ? t.creating || 'Creating...' : t.startParty || 'Start Party'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
