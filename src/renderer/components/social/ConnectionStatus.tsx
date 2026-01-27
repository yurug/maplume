/**
 * ConnectionStatus - Discreet indicator showing server connection status
 *
 * Shows a small icon that is:
 * - Gray when offline
 * - Green when online and synced
 * - Yellow when syncing
 * - Red when there's an error
 */

import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useI18n } from '../../i18n';

export function ConnectionStatus() {
  const { state } = useSocial();
  const { t } = useI18n();

  // Don't show anything if not initialized or not logged in
  if (!state.initialized || !state.user) {
    return null;
  }

  const getStatusInfo = () => {
    if (!state.isOnline) {
      return {
        icon: CloudOff,
        color: 'text-warm-400',
        label: t.offline || 'Offline',
      };
    }

    if (state.syncStatus === 'syncing') {
      return {
        icon: RefreshCw,
        color: 'text-yellow-500',
        label: t.syncing || 'Syncing...',
        animate: true,
      };
    }

    if (state.syncStatus === 'error') {
      return {
        icon: AlertCircle,
        color: 'text-danger-500',
        label: t.syncError || 'Sync error',
      };
    }

    return {
      icon: Cloud,
      color: 'text-success-500',
      label: t.online || 'Online',
    };
  };

  const { icon: Icon, color, label, animate } = getStatusInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={`p-1.5 rounded-md hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors ${color}`}
            aria-label={label}
          >
            <Icon
              className={`w-4 h-4 ${animate ? 'animate-spin' : ''}`}
              strokeWidth={1.5}
            />
            {state.pendingOperations > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary-500 rounded-full text-[8px] text-white flex items-center justify-center">
                {state.pendingOperations > 9 ? '9+' : state.pendingOperations}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
          {state.pendingOperations > 0 && (
            <p className="text-xs text-warm-500">
              {state.pendingOperations} {t.pendingSync || 'pending'}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
