/**
 * PartySection - Shows active party indicator in sidebar
 *
 * Displays a compact view of the active party with timer and participant count.
 */

import React, { useState, useEffect } from 'react';
import { PartyPopper, Users, Clock } from 'lucide-react';
import { useI18n } from '../../i18n';
import { cn } from '../../lib/utils';
import type { Party } from '@maplume/shared';

// Format remaining time for display (handles days, hours, minutes)
export function formatTimeRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return '00:00';

  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

interface PartySectionProps {
  party: Party;
  onClick: () => void;
  isActive: boolean;
}

export function PartySection({ party, onClick, isActive }: PartySectionProps) {
  const { t } = useI18n();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Update timer - frequency depends on duration
  useEffect(() => {
    if (!party?.actualStart || party.status !== 'active') {
      setTimeRemaining('');
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const endTime = party.actualStart! + party.durationMinutes * 60 * 1000;
      const remaining = Math.max(0, endTime - now);
      setTimeRemaining(formatTimeRemaining(remaining));
    };

    updateTimer();
    // Update every second for short parties, every minute for long ones
    const intervalMs = party.durationMinutes > 60 ? 60000 : 1000;
    const interval = setInterval(updateTimer, intervalMs);

    return () => clearInterval(interval);
  }, [party?.actualStart, party?.durationMinutes, party?.status]);

  if (party.status !== 'active') {
    return null;
  }

  return (
    <div className="px-1">
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
          'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30',
          'border border-purple-200 dark:border-purple-800',
          'hover:from-purple-200 hover:to-pink-200 dark:hover:from-purple-900/50 dark:hover:to-pink-900/50',
          isActive && 'ring-2 ring-purple-400 dark:ring-purple-600'
        )}
      >
        <div className="p-1.5 rounded-lg bg-purple-500 dark:bg-purple-600">
          <PartyPopper className="h-4 w-4 text-white" />
        </div>

        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-purple-900 dark:text-purple-100 truncate">
            {party.title}
          </p>
          <div className="flex items-center gap-3 text-xs text-purple-700 dark:text-purple-300">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeRemaining}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {party.participantCount}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
