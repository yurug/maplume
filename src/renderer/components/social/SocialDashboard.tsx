/**
 * SocialDashboard - Main view when logged in
 *
 * Shows user info and social features
 */

import React, { useState, useEffect } from 'react';
import { User, LogOut, Users, Share2, PartyPopper, Cloud, RefreshCw, Download, Check, ChevronRight } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import { ConnectionStatus } from './ConnectionStatus';
import { FriendsPanel } from './FriendsPanel';
import { SharedProjectsList } from './SharedProjectsList';
import { SharedProjectView } from './SharedProjectView';

type View = 'dashboard' | 'friends' | 'sharedProjects' | 'viewSharedProject';

export function SocialDashboard() {
  const { state, actions } = useSocial();
  const { state: appState, actions: appActions } = useApp();
  const { t } = useI18n();
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<'success' | 'error' | 'empty' | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null);

  // Load shares on mount
  useEffect(() => {
    if (state.user && state.isOnline) {
      actions.refreshShares();
    }
  }, [state.user, state.isOnline, actions]);

  const handleLogout = async () => {
    await actions.logout();
  };

  const handleRestoreFromCloud = async () => {
    setRestoring(true);
    setRestoreResult(null);
    try {
      const data = await actions.restoreFromCloud();
      if (data && data.projects && data.projects.length > 0) {
        // Replace local data with cloud data
        appActions.importData(data);
        setRestoreResult('success');
      } else {
        setRestoreResult('empty');
      }
    } catch (error) {
      console.error('Failed to restore from cloud:', error);
      setRestoreResult('error');
    } finally {
      setRestoring(false);
      // Clear result after 3 seconds
      setTimeout(() => setRestoreResult(null), 3000);
    }
  };

  const getSyncStatusText = () => {
    switch (state.syncStatus) {
      case 'syncing':
        return t.syncing || 'Syncing...';
      case 'error':
        return t.syncError || 'Sync error';
      default:
        return state.pendingOperations > 0
          ? `${state.pendingOperations} ${t.pendingChanges || 'pending changes'}`
          : (t.synced || 'Synced');
    }
  };

  if (!state.user) {
    return null;
  }

  // Show FriendsPanel if that view is active
  if (currentView === 'friends') {
    return <FriendsPanel onBack={() => setCurrentView('dashboard')} />;
  }

  // Show SharedProjectsList if that view is active
  if (currentView === 'sharedProjects') {
    return (
      <SharedProjectsList
        onBack={() => setCurrentView('dashboard')}
        onViewProject={(shareId) => {
          setSelectedShareId(shareId);
          setCurrentView('viewSharedProject');
        }}
      />
    );
  }

  // Show SharedProjectView if that view is active
  if (currentView === 'viewSharedProject' && selectedShareId) {
    return (
      <SharedProjectView
        shareId={selectedShareId}
        onBack={() => {
          setSelectedShareId(null);
          setCurrentView('sharedProjects');
        }}
      />
    );
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
          <button
            onClick={() => setCurrentView('friends')}
            className="p-6 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50 text-left hover:border-primary-300 dark:hover:border-primary-700 hover:bg-warm-100/50 dark:hover:bg-warm-700/50 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-medium text-warm-900 dark:text-warm-100">
                  {t.friends || 'Friends'}
                </h4>
              </div>
              <ChevronRight className="w-4 h-4 text-warm-400 group-hover:text-primary-500 transition-colors" />
            </div>
            <p className="text-sm text-warm-600 dark:text-warm-400">
              {t.friendsDescription || 'Connect with other writers and see their progress.'}
            </p>
          </button>

          {/* Project Sharing */}
          <button
            onClick={() => setCurrentView('sharedProjects')}
            className="p-6 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50 text-left hover:border-primary-300 dark:hover:border-primary-700 hover:bg-warm-100/50 dark:hover:bg-warm-700/50 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <Share2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium text-warm-900 dark:text-warm-100">
                    {t.sharedProjects || 'Shared Projects'}
                  </h4>
                  {state.receivedShares.length > 0 && (
                    <span className="text-xs text-warm-500">
                      {state.receivedShares.length} {t.sharedWithYou || 'shared with you'}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-warm-400 group-hover:text-primary-500 transition-colors" />
            </div>
            <p className="text-sm text-warm-600 dark:text-warm-400">
              {t.shareProjectsDescription || 'Share your writing progress with friends.'}
            </p>
          </button>

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

        {/* Cloud Backup Section */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-4">
            {t.cloudBackup || 'Cloud Backup'}
          </h3>

          <div className="p-6 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900">
                  <Cloud className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h4 className="font-medium text-warm-900 dark:text-warm-100">
                    {t.automaticBackup || 'Automatic Backup'}
                  </h4>
                  <p className="text-sm text-warm-500 flex items-center gap-2">
                    {state.syncStatus === 'syncing' && (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    )}
                    {state.syncStatus === 'idle' && state.pendingOperations === 0 && (
                      <Check className="w-3 h-3 text-green-500" />
                    )}
                    {getSyncStatusText()}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreFromCloud}
                disabled={restoring || !state.isOnline}
              >
                {restoring ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {t.restoreFromCloud || 'Restore from Cloud'}
              </Button>
            </div>

            <p className="text-sm text-warm-600 dark:text-warm-400">
              {t.cloudBackupDescription || 'Your projects are automatically backed up to the cloud. You can restore them on any device by logging in with your recovery phrase.'}
            </p>

            {restoreResult === 'success' && (
              <div className="mt-3 p-2 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm">
                {t.restoreSuccess || 'Projects restored successfully!'}
              </div>
            )}
            {restoreResult === 'empty' && (
              <div className="mt-3 p-2 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm">
                {t.restoreEmpty || 'No backup found in the cloud.'}
              </div>
            )}
            {restoreResult === 'error' && (
              <div className="mt-3 p-2 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                {t.restoreError || 'Failed to restore from cloud. Please try again.'}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
