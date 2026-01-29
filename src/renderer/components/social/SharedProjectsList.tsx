/**
 * SharedProjectsList - List of projects shared with the user
 *
 * Shows cards for each project shared by friends.
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Share2, RefreshCw, Eye, Lock, User } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import type { SharedProjectInfo } from '@maplume/shared';

interface SharedProjectsListProps {
  onBack: () => void;
  onViewProject: (shareId: string) => void;
}

export function SharedProjectsList({ onBack, onViewProject }: SharedProjectsListProps) {
  const { t } = useI18n();
  const { state, actions } = useSocial();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShares = async () => {
      setLoading(true);
      await actions.refreshShares();
      setLoading(false);
    };
    loadShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="p-6 border-b border-warm-200 dark:border-warm-700">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <Share2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
              {t.sharedProjects || 'Shared Projects'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => actions.refreshShares()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-warm-400" />
          </div>
        ) : state.receivedShares.length === 0 ? (
          <div className="text-center py-12">
            <Share2 className="w-12 h-12 mx-auto text-warm-300 dark:text-warm-600 mb-4" />
            <p className="text-warm-500">
              {t.noSharedProjects || 'No projects have been shared with you yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Projects shared with me */}
            <div>
              <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-3">
                {t.sharedWithYou || 'Shared with you'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.receivedShares.map((share) => (
                  <SharedProjectCard
                    key={share.id}
                    share={share}
                    onClick={() => onViewProject(share.id)}
                    t={t}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Projects I'm sharing */}
        {state.ownedShares.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-3">
              {t.youAreSharing || 'You are sharing'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.ownedShares.map((share) => (
                <OwnedShareCard
                  key={share.id}
                  share={share}
                  t={t}
                  formatDate={formatDate}
                  onRevoke={() => actions.revokeShare(share.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Card for a project shared with the user
function SharedProjectCard({
  share,
  onClick,
  t,
  formatDate,
}: {
  share: SharedProjectInfo;
  onClick: () => void;
  t: Record<string, string>;
  formatDate: (ts: number) => string;
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50 text-left hover:border-primary-300 dark:hover:border-primary-700 hover:bg-warm-100/50 dark:hover:bg-warm-700/50 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium flex-shrink-0">
          {share.owner?.username?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-warm-900 dark:text-warm-100 truncate">
            {share.projectLocalId.split('-')[0] || 'Project'}
          </p>
          <div className="flex items-center gap-2 text-sm text-warm-500 mt-1">
            <User className="w-3 h-3" />
            <span>{share.owner?.username || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-warm-400 mt-1">
            {share.shareType === 'full' ? (
              <Eye className="w-3 h-3" />
            ) : (
              <Lock className="w-3 h-3" />
            )}
            <span>
              {share.shareType === 'full'
                ? (t.shareTypeFull || 'Full access')
                : (t.shareTypeStats || 'Stats only')}
            </span>
          </div>
          <p className="text-xs text-warm-400 mt-2">
            {t.lastUpdated || 'Last updated'}: {formatDate(share.updatedAt)}
          </p>
        </div>
      </div>
    </button>
  );
}

// Card for a project the user is sharing
function OwnedShareCard({
  share,
  t,
  formatDate,
  onRevoke,
}: {
  share: SharedProjectInfo;
  t: Record<string, string>;
  formatDate: (ts: number) => string;
  onRevoke: () => void;
}) {
  return (
    <div className="p-4 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400 font-medium flex-shrink-0">
          {share.sharedWith?.username?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-warm-900 dark:text-warm-100 truncate">
            {share.projectLocalId.split('-')[0] || 'Project'}
          </p>
          <div className="flex items-center gap-2 text-sm text-warm-500 mt-1">
            <span>{t.sharedBy || 'Shared with'}: {share.sharedWith?.username || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-warm-400 mt-1">
            {share.shareType === 'full' ? (
              <Eye className="w-3 h-3" />
            ) : (
              <Lock className="w-3 h-3" />
            )}
            <span>
              {share.shareType === 'full'
                ? (t.shareTypeFull || 'Full access')
                : (t.shareTypeStats || 'Stats only')}
            </span>
          </div>
          <p className="text-xs text-warm-400 mt-2">
            {t.lastUpdated || 'Last updated'}: {formatDate(share.updatedAt)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRevoke}
          className="text-warm-400 hover:text-red-500"
        >
          {t.revokeShare || 'Revoke'}
        </Button>
      </div>
    </div>
  );
}
