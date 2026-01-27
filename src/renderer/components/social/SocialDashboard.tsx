/**
 * SocialDashboard - Main view when logged in
 *
 * Shows user info and social features (placeholder for Phase 2)
 */

import React from 'react';
import { User, LogOut, Users, Share2, PartyPopper } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import { ConnectionStatus } from './ConnectionStatus';

export function SocialDashboard() {
  const { state, actions } = useSocial();
  const { t } = useI18n();

  const handleLogout = async () => {
    await actions.logout();
  };

  if (!state.user) {
    return null;
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header with user info */}
      <div className="p-6 border-b border-warm-200 dark:border-warm-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
                {state.user.username}
              </h2>
              <div className="flex items-center gap-2 text-sm text-warm-500">
                <ConnectionStatus />
                <span>
                  {state.isOnline ? (t.online || 'Online') : (t.offline || 'Offline')}
                </span>
              </div>
            </div>
          </div>

          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            {t.logout || 'Log Out'}
          </Button>
        </div>
      </div>

      {/* Social features grid - placeholder for Phase 2 */}
      <div className="p-6">
        <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-4">
          {t.comingSoon || 'Coming Soon'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Friends */}
          <div className="p-6 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-medium text-warm-900 dark:text-warm-100">
                {t.friends || 'Friends'}
              </h4>
            </div>
            <p className="text-sm text-warm-600 dark:text-warm-400">
              {t.friendsDescription || 'Connect with other writers and see their progress.'}
            </p>
          </div>

          {/* Project Sharing */}
          <div className="p-6 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Share2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="font-medium text-warm-900 dark:text-warm-100">
                {t.shareProjects || 'Share Projects'}
              </h4>
            </div>
            <p className="text-sm text-warm-600 dark:text-warm-400">
              {t.shareProjectsDescription || 'Share your writing progress with friends.'}
            </p>
          </div>

          {/* Writing Parties */}
          <div className="p-6 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <PartyPopper className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-medium text-warm-900 dark:text-warm-100">
                {t.writingParties || 'Writing Parties'}
              </h4>
            </div>
            <p className="text-sm text-warm-600 dark:text-warm-400">
              {t.writingPartiesDescription || 'Join timed writing sessions with friends.'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
