/**
 * SocialDashboard - Main view when logged in
 *
 * Shows user info and social features
 */

import React, { useState, useEffect } from 'react';
import { LogOut, Users, Share2, PartyPopper, Cloud, RefreshCw, Download, Check, ChevronRight, Plus, History, Pencil } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import { ConnectionStatus } from './ConnectionStatus';
import { FriendsPanel } from './FriendsPanel';
import { SharedProjectsList } from './SharedProjectsList';
import { SharedProjectView } from './SharedProjectView';
import { CreatePartyModal } from './CreatePartyModal';
import { JoinPartyModal } from './JoinPartyModal';
import { ActivePartyPanel } from './ActivePartyPanel';
import { PartyHistory } from './PartyHistory';
import { Avatar } from './Avatar';
import { AvatarPicker } from './AvatarPicker';

type View = 'dashboard' | 'friends' | 'sharedProjects' | 'viewSharedProject' | 'activeParty' | 'partyHistory';

interface SocialDashboardProps {
  selectedPartyId?: string | null;
}

export function SocialDashboard({ selectedPartyId }: SocialDashboardProps) {
  const { state, actions } = useSocial();
  const { state: appState, actions: appActions } = useApp();
  const { t } = useI18n();
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<'success' | 'error' | 'empty' | null>(null);
  const [currentView, setCurrentView] = useState<View>(selectedPartyId ? 'activeParty' : 'dashboard');
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null);
  const [viewingPartyId, setViewingPartyId] = useState<string | null>(selectedPartyId || null);
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [showJoinParty, setShowJoinParty] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Load shares and parties on mount (only once when user is available and online)
  useEffect(() => {
    if (state.user && state.isOnline) {
      actions.refreshShares();
      actions.refreshParties();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user?.id, state.isOnline]);

  // Navigate to party when selectedPartyId prop changes
  useEffect(() => {
    if (selectedPartyId) {
      setViewingPartyId(selectedPartyId);
      setCurrentView('activeParty');
    }
  }, [selectedPartyId]);

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

  // Show ActivePartyPanel if that view is active
  if (currentView === 'activeParty' && viewingPartyId) {
    return (
      <ActivePartyPanel
        partyId={viewingPartyId}
        onBack={() => {
          setViewingPartyId(null);
          setCurrentView('dashboard');
        }}
      />
    );
  }

  // Show PartyHistory if that view is active
  if (currentView === 'partyHistory') {
    return <PartyHistory onBack={() => setCurrentView('dashboard')} />;
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header with user info */}
      <div className="p-6 border-b border-warm-200 dark:border-warm-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="relative group"
              title={t.changeAvatar || 'Change avatar'}
            >
              <Avatar preset={state.user.avatarPreset} username={state.user.username} size="lg" />
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="w-4 h-4 text-white" />
              </div>
            </button>
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                  <PartyPopper className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-medium text-warm-900 dark:text-warm-100">
                    {t.writingParties || 'Writing Parties'}
                  </h4>
                  {state.activeParties.length > 0 && (
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                      {state.activeParties.length} {state.activeParties.length === 1 ? (t.activeParty || 'party in progress') : 'parties in progress'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-warm-600 dark:text-warm-400 mb-4">
              {t.writingPartiesDescription || 'Join timed writing sessions with friends.'}
            </p>

            {/* Active parties list */}
            {state.activeParties.length > 0 && (
              <div className="space-y-2 mb-3">
                {state.activeParties.map((party) => (
                  <button
                    key={party.id}
                    onClick={() => {
                      setViewingPartyId(party.id);
                      setCurrentView('activeParty');
                    }}
                    className="w-full p-3 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-800 text-left hover:from-purple-200 hover:to-pink-200 dark:hover:from-purple-900/50 dark:hover:to-pink-900/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-purple-900 dark:text-purple-100">
                          {party.title}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          {party.participantCount} {t.participants || 'participants'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-purple-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Party invites */}
            {state.partyInvites.length > 0 && (
              <div className="mb-3 space-y-2">
                {state.partyInvites.slice(0, 2).map((invite) => (
                  <div
                    key={invite.id}
                    className="p-3 rounded-lg bg-warm-100 dark:bg-warm-700 border border-warm-200 dark:border-warm-600"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-warm-900 dark:text-warm-100">
                          {invite.party.title}
                        </p>
                        <p className="text-xs text-warm-500">
                          {t.invitedBy || 'Invited by'} {invite.invitedBy.username}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => actions.declinePartyInvite(invite.id)}
                        >
                          {t.decline || 'Decline'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={async () => {
                            await actions.joinPartyByInvite(invite.party.id, invite.id, 0);
                            setCurrentView('activeParty');
                          }}
                        >
                          {t.join || 'Join'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowJoinParty(true)}
                className="flex-1"
              >
                {t.joinWithCode || 'Join with Code'}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateParty(true)}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t.createParty || 'Create'}
              </Button>
            </div>

            {/* History link */}
            <button
              onClick={() => setCurrentView('partyHistory')}
              className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-warm-500 hover:text-warm-700 dark:hover:text-warm-300 transition-colors"
            >
              <History className="w-4 h-4" />
              {t.viewHistory || 'View History'}
            </button>
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

      {/* Create Party Modal */}
      {showCreateParty && (
        <CreatePartyModal
          onClose={() => setShowCreateParty(false)}
          onCreated={() => setCurrentView('activeParty')}
        />
      )}

      {/* Join Party Modal */}
      {showJoinParty && (
        <JoinPartyModal
          onClose={() => setShowJoinParty(false)}
          onJoined={() => setCurrentView('activeParty')}
        />
      )}

      {/* Avatar Picker Modal */}
      {showAvatarPicker && state.user && (
        <AvatarPicker
          currentPreset={state.user.avatarPreset}
          username={state.user.username}
          onSelect={actions.updateAvatar}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  );
}
