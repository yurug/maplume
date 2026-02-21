/**
 * SocialContext - Global state for social features
 *
 * Manages:
 * - User authentication state
 * - Connection status
 * - Sync status
 * - Social feature initialization
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import type { AppData } from '@maplume/shared';
import { syncService } from '../../services/sync';

// Import types
import type { SocialState, SocialContextValue, DecryptedComment, SharedProjectData } from './types';
export type { SocialState, SocialContextValue, DecryptedComment, SharedProjectData };
export type { FriendWithKey, PartyProgressSnapshot, ShareInteractions, SocialAction } from './types';

// Import reducer
import { socialReducer, initialState } from './reducer';

// Import action creators
import { createAuthActions, initializeSocial } from './actions/auth';
import { createFriendActions } from './actions/friends';
import { createPartyActions } from './actions/parties';
import { createShareActions } from './actions/shares';
import { createMessageActions } from './actions/messages';

// Create context
const SocialContext = createContext<SocialContextValue | null>(null);

// Provider component
export function SocialProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(socialReducer, initialState);

  // Initialize on mount
  useEffect(() => {
    initializeSocial(dispatch);
  }, []);

  // Subscribe to sync service updates
  useEffect(() => {
    const unsubStatus = syncService.addStatusListener((status) => {
      dispatch({ type: 'SET_SYNC_STATUS', status });
      dispatch({ type: 'SET_PENDING_COUNT', count: syncService.getPendingCount() });
    });

    const unsubConnection = syncService.addConnectionListener((online) => {
      dispatch({ type: 'SET_ONLINE', online });
    });

    return () => {
      unsubStatus();
      unsubConnection();
    };
  }, []);

  // Create action groups
  const authActions = useMemo(() => createAuthActions(state, dispatch), [state]);
  const friendActions = useMemo(() => createFriendActions(state, dispatch), [state]);
  const partyActions = useMemo(() => createPartyActions(state, dispatch), [state]);
  const shareActions = useMemo(() => createShareActions(state, dispatch), [state]);
  const messageActions = useMemo(() => createMessageActions(state, dispatch), [state]);

  // Sync actions that need state
  const forceSync = useCallback(async (): Promise<void> => {
    await syncService.forceSync();
  }, []);

  const syncAppData = useCallback(async (data: AppData): Promise<void> => {
    if (!state.user) {
      // Not logged in, skip sync
      return;
    }
    try {
      await syncService.syncProjectData(data);
    } catch (error) {
      console.error('Failed to sync app data:', error);
      // Don't throw - local save already succeeded
    }
  }, [state.user]);

  const restoreFromCloud = useCallback(async (): Promise<AppData | null> => {
    if (!state.user) {
      throw new Error('Not logged in');
    }
    try {
      return await syncService.getProjectDataFromServer();
    } catch (error) {
      console.error('Failed to restore from cloud:', error);
      throw error;
    }
  }, [state.user]);

  const isLoggedIn = useCallback((): boolean => {
    return state.user !== null;
  }, [state.user]);

  // Combine all actions
  const value = useMemo<SocialContextValue>(() => ({
    state,
    actions: {
      // Auth actions
      generateNewSeedPhrase: authActions.generateNewSeedPhrase,
      createAccount: authActions.createAccount,
      login: authActions.login,
      logout: authActions.logout,
      setServerUrl: authActions.setServerUrl,
      getServerUrl: authActions.getServerUrl,
      updateAvatar: authActions.updateAvatar,
      updateAvatarData: authActions.updateAvatarData,
      uploadAvatar: authActions.uploadAvatar,
      // Sync actions
      forceSync,
      syncAppData,
      restoreFromCloud,
      isLoggedIn,
      // Friend actions
      refreshFriends: friendActions.refreshFriends,
      refreshFriendRequests: friendActions.refreshFriendRequests,
      acceptFriendRequest: friendActions.acceptFriendRequest,
      rejectFriendRequest: friendActions.rejectFriendRequest,
      cancelFriendRequest: friendActions.cancelFriendRequest,
      // Share actions
      refreshShares: shareActions.refreshShares,
      shareProject: shareActions.shareProject,
      updateSharedProject: shareActions.updateSharedProject,
      revokeShare: shareActions.revokeShare,
      decryptSharedProject: shareActions.decryptSharedProject,
      // Party actions
      refreshParties: partyActions.refreshParties,
      createParty: partyActions.createParty,
      joinPartyByCode: partyActions.joinPartyByCode,
      joinPartyByInvite: partyActions.joinPartyByInvite,
      leaveParty: partyActions.leaveParty,
      updatePartyProgress: partyActions.updatePartyProgress,
      endParty: partyActions.endParty,
      startParty: partyActions.startParty,
      inviteToParty: partyActions.inviteToParty,
      declinePartyInvite: partyActions.declinePartyInvite,
      getPartyHistory: partyActions.getPartyHistory,
      getPartyDetails: partyActions.getPartyDetails,
      // Message actions
      loadShareInteractions: messageActions.loadShareInteractions,
      createComment: messageActions.createComment,
      updateComment: messageActions.updateComment,
      deleteComment: messageActions.deleteComment,
      addReaction: messageActions.addReaction,
      removeReaction: messageActions.removeReaction,
      getReactionCounts: messageActions.getReactionCounts,
      sendPartyMessage: messageActions.sendPartyMessage,
      fetchPartyMessages: messageActions.fetchPartyMessages,
      getPartyMessages: messageActions.getPartyMessages,
      clearPartyMessages: messageActions.clearPartyMessages,
    },
  }), [
    state,
    authActions,
    friendActions,
    partyActions,
    shareActions,
    messageActions,
    forceSync,
    syncAppData,
    restoreFromCloud,
    isLoggedIn,
  ]);

  return React.createElement(SocialContext.Provider, { value }, children);
}

// Hook to use social context
export function useSocial(): SocialContextValue {
  const context = useContext(SocialContext);
  if (!context) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
}
