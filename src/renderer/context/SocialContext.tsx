/**
 * SocialContext - Global state for social features
 *
 * Manages:
 * - User authentication state
 * - Connection status
 * - Sync status
 * - Social feature initialization
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { LocalUser, SyncStatus, KeyBundle, AppData, Project, WordEntry, AvatarData } from '@maplume/shared';
import type { SharedProjectInfo, FriendUser, Party, PartyInvite, FriendRequest } from '@maplume/shared';
import { apiClient } from '../services/api';
import { syncService } from '../services/sync';
import {
  generateSeedPhrase,
  validateSeedPhrase,
  deriveKeys,
  bytesToBase64,
  encryptForRecipient,
  decryptFromSender,
  hashString,
  utf8ToBytes,
  bytesToUtf8,
} from '../services/crypto';
import pako from 'pako';

// Storage keys
const ENCRYPTED_KEYS_KEY = 'maplume-encrypted-keys';
const USERNAME_KEY = 'maplume-username';

// Extended friend user with public key for encryption
interface FriendWithKey extends FriendUser {
  publicKey?: string;
}

// Progress snapshot for party charts
interface PartyProgressSnapshot {
  timestamp: number;
  participants: { [participantId: string]: number }; // participantId -> wordsWritten
}

// State interface
interface SocialState {
  initialized: boolean;
  user: LocalUser | null;
  keyBundle: KeyBundle | null;
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingOperations: number;
  error: string | null;
  ownedShares: SharedProjectInfo[];
  receivedShares: SharedProjectInfo[];
  friends: FriendWithKey[];
  friendRequests: FriendRequest[]; // Received friend requests
  // Writing parties
  activeParties: Party[];
  upcomingParties: Party[];
  partyInvites: PartyInvite[];
  // Progress history for party charts (keyed by partyId)
  partyProgressHistory: { [partyId: string]: PartyProgressSnapshot[] };
}

// Action types
type SocialAction =
  | { type: 'INITIALIZE'; user: LocalUser | null; keyBundle: KeyBundle | null }
  | { type: 'SET_USER'; user: LocalUser; keyBundle: KeyBundle }
  | { type: 'UPDATE_USER_AVATAR'; avatarPreset: string }
  | { type: 'UPDATE_USER_AVATAR_DATA'; avatarData: AvatarData }
  | { type: 'SET_ONLINE'; online: boolean }
  | { type: 'SET_SYNC_STATUS'; status: SyncStatus }
  | { type: 'SET_PENDING_COUNT'; count: number }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'LOGOUT' }
  | { type: 'SET_SHARES'; owned: SharedProjectInfo[]; received: SharedProjectInfo[] }
  | { type: 'SET_FRIENDS'; friends: FriendWithKey[] }
  | { type: 'SET_FRIEND_REQUESTS'; requests: FriendRequest[] }
  | { type: 'SET_PARTIES'; active: Party[]; upcoming: Party[]; invites: PartyInvite[] }
  | { type: 'UPDATE_ACTIVE_PARTY'; party: Party }
  | { type: 'ADD_PARTY_PROGRESS_SNAPSHOT'; partyId: string; snapshot: PartyProgressSnapshot };

// Initial state
const initialState: SocialState = {
  initialized: false,
  user: null,
  keyBundle: null,
  isOnline: false,
  syncStatus: 'idle',
  pendingOperations: 0,
  error: null,
  ownedShares: [],
  receivedShares: [],
  friends: [],
  friendRequests: [],
  activeParties: [],
  upcomingParties: [],
  partyInvites: [],
  partyProgressHistory: {},
};

// Reducer
function socialReducer(state: SocialState, action: SocialAction): SocialState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        initialized: true,
        user: action.user,
        keyBundle: action.keyBundle,
      };

    case 'SET_USER':
      return {
        ...state,
        user: action.user,
        keyBundle: action.keyBundle,
        error: null,
      };

    case 'UPDATE_USER_AVATAR':
      return {
        ...state,
        user: state.user ? {
          ...state.user,
          avatarPreset: action.avatarPreset,
          avatarData: { type: 'preset', preset: action.avatarPreset },
        } : null,
      };

    case 'UPDATE_USER_AVATAR_DATA':
      return {
        ...state,
        user: state.user ? {
          ...state.user,
          avatarData: action.avatarData,
          avatarPreset: action.avatarData.type === 'preset' ? action.avatarData.preset || null : null,
        } : null,
      };

    case 'SET_ONLINE':
      return {
        ...state,
        isOnline: action.online,
      };

    case 'SET_SYNC_STATUS':
      return {
        ...state,
        syncStatus: action.status,
      };

    case 'SET_PENDING_COUNT':
      return {
        ...state,
        pendingOperations: action.count,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
      };

    case 'LOGOUT':
      return {
        ...initialState,
        initialized: true,
      };

    case 'SET_SHARES':
      return {
        ...state,
        ownedShares: action.owned,
        receivedShares: action.received,
      };

    case 'SET_FRIENDS':
      return {
        ...state,
        friends: action.friends,
      };

    case 'SET_FRIEND_REQUESTS':
      return {
        ...state,
        friendRequests: action.requests,
      };

    case 'SET_PARTIES':
      return {
        ...state,
        activeParties: action.active,
        upcomingParties: action.upcoming,
        partyInvites: action.invites,
      };

    case 'UPDATE_ACTIVE_PARTY':
      return {
        ...state,
        activeParties: state.activeParties.map((p) =>
          p.id === action.party.id ? action.party : p
        ),
      };

    case 'ADD_PARTY_PROGRESS_SNAPSHOT': {
      const existingHistory = state.partyProgressHistory[action.partyId] || [];
      const newHistory = [...existingHistory, action.snapshot];
      // Keep last 100 snapshots per party
      const trimmedHistory = newHistory.length > 100 ? newHistory.slice(-100) : newHistory;
      return {
        ...state,
        partyProgressHistory: {
          ...state.partyProgressHistory,
          [action.partyId]: trimmedHistory,
        },
      };
    }

    default:
      return state;
  }
}

// Shared project data that gets encrypted
interface SharedProjectData {
  project: Project;
  entries: WordEntry[];
}

// Context interface
interface SocialContextValue {
  state: SocialState;
  actions: {
    generateNewSeedPhrase: () => string[];
    createAccount: (username: string, seedPhrase: string[]) => Promise<void>;
    login: (seedPhrase: string[], username?: string) => Promise<void>;
    logout: () => Promise<void>;
    setServerUrl: (url: string) => Promise<void>;
    getServerUrl: () => string;
    forceSync: () => Promise<void>;
    syncAppData: (data: AppData) => Promise<void>;
    restoreFromCloud: () => Promise<AppData | null>;
    isLoggedIn: () => boolean;
    refreshShares: () => Promise<void>;
    refreshFriends: () => Promise<void>;
    refreshFriendRequests: () => Promise<void>;
    acceptFriendRequest: (requestId: string) => Promise<void>;
    rejectFriendRequest: (requestId: string) => Promise<void>;
    shareProject: (
      project: Project,
      entries: WordEntry[],
      friendId: string,
      shareType: 'full' | 'stats_only'
    ) => Promise<string>;
    updateSharedProject: (
      shareId: string,
      project: Project,
      entries: WordEntry[],
      friendId: string
    ) => Promise<void>;
    revokeShare: (shareId: string) => Promise<void>;
    decryptSharedProject: (shareId: string) => Promise<SharedProjectData | null>;
    // Party actions
    refreshParties: () => Promise<void>;
    createParty: (title: string, durationMinutes: number, scheduledStart?: number | null, rankingEnabled?: boolean, inviteFriendIds?: string[]) => Promise<Party>;
    joinPartyByCode: (code: string, startWordCount?: number) => Promise<Party>;
    joinPartyByInvite: (partyId: string, inviteId: string, startWordCount?: number) => Promise<Party>;
    leaveParty: (partyId: string) => Promise<void>;
    updatePartyProgress: (partyId: string, currentWordCount: number) => Promise<number>;
    endParty: (partyId: string) => Promise<Party>;
    startParty: (partyId: string) => Promise<Party>;
    inviteToParty: (partyId: string, friendIds: string[]) => Promise<void>;
    declinePartyInvite: (inviteId: string) => Promise<void>;
    getPartyHistory: () => Promise<Party[]>;
    getPartyDetails: (partyId: string) => Promise<Party | null>;
    // Profile actions
    updateAvatar: (avatarPreset: string) => Promise<void>;
    updateAvatarData: (avatarData: AvatarData) => Promise<void>;
    uploadAvatar: (imageData: string) => Promise<void>;
  };
}

// Create context
const SocialContext = createContext<SocialContextValue | null>(null);

// Provider component
export function SocialProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(socialReducer, initialState);

  // Initialize on mount
  useEffect(() => {
    initializeSocial();
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

  // Initialize social features
  async function initializeSocial(): Promise<void> {
    try {
      // In test mode (set via localStorage), skip API calls and initialize immediately
      if (localStorage.getItem('maplume-test-mode') === 'true') {
        dispatch({ type: 'INITIALIZE', user: null, keyBundle: null });
        return;
      }

      // Initialize API client
      await apiClient.initialize();

      // Check if user is logged in
      if (apiClient.isLoggedIn()) {
        // Try to load stored keys
        const encryptedKeys = await window.electronAPI.secureStorage.get(ENCRYPTED_KEYS_KEY);
        const username = await window.electronAPI.secureStorage.get(USERNAME_KEY);

        if (encryptedKeys && username) {
          // Parse stored keys (they're stored as JSON with base64 encoded Uint8Arrays)
          const storedKeys = JSON.parse(encryptedKeys);
          const keyBundle: KeyBundle = {
            identityKeyPair: {
              publicKey: base64ToUint8Array(storedKeys.identityKeyPair.publicKey),
              privateKey: base64ToUint8Array(storedKeys.identityKeyPair.privateKey),
            },
            encryptionKeyPair: {
              publicKey: base64ToUint8Array(storedKeys.encryptionKeyPair.publicKey),
              privateKey: base64ToUint8Array(storedKeys.encryptionKeyPair.privateKey),
            },
            localKey: base64ToUint8Array(storedKeys.localKey),
          };

          // Get user profile
          try {
            const profile = await apiClient.getProfile();
            const user: LocalUser = {
              id: profile.id,
              username: profile.username,
              avatarPreset: profile.avatarPreset,
              avatarData: profile.avatarData,
              bio: profile.bio,
              statsPublic: profile.statsPublic,
              searchable: profile.searchable,
              createdAt: profile.createdAt,
              publicKey: bytesToBase64(keyBundle.identityKeyPair.publicKey),
            };

            // Initialize sync service
            await syncService.initialize(keyBundle.localKey);
            syncService.startPolling();

            dispatch({ type: 'INITIALIZE', user, keyBundle });
            dispatch({ type: 'SET_ONLINE', online: syncService.getIsOnline() });
            return;
          } catch {
            // Profile fetch failed, might be token expired
            console.warn('Failed to fetch profile, clearing session');
          }
        }
      }

      // No valid session
      dispatch({ type: 'INITIALIZE', user: null, keyBundle: null });
    } catch (error) {
      console.error('Failed to initialize social features:', error);
      dispatch({ type: 'INITIALIZE', user: null, keyBundle: null });
    }
  }

  // Actions
  const generateNewSeedPhrase = useCallback((): string[] => {
    return generateSeedPhrase();
  }, []);

  const createAccount = useCallback(async (username: string, seedPhrase: string[]): Promise<void> => {
    try {
      dispatch({ type: 'SET_ERROR', error: null });

      // Validate seed phrase
      if (!validateSeedPhrase(seedPhrase)) {
        throw new Error('Invalid seed phrase');
      }

      // Derive keys
      const keyBundle = deriveKeys(seedPhrase);

      // Register with server (send both identity and encryption public keys)
      await apiClient.register(
        username,
        keyBundle.identityKeyPair.publicKey,
        keyBundle.encryptionKeyPair.publicKey
      );

      // Get challenge and login
      const { challenge } = await apiClient.getChallenge(username);
      const loginResponse = await apiClient.login(username, challenge, keyBundle.identityKeyPair.privateKey);

      // Store keys securely
      const keysToStore = {
        identityKeyPair: {
          publicKey: bytesToBase64(keyBundle.identityKeyPair.publicKey),
          privateKey: bytesToBase64(keyBundle.identityKeyPair.privateKey),
        },
        encryptionKeyPair: {
          publicKey: bytesToBase64(keyBundle.encryptionKeyPair.publicKey),
          privateKey: bytesToBase64(keyBundle.encryptionKeyPair.privateKey),
        },
        localKey: bytesToBase64(keyBundle.localKey),
      };

      await window.electronAPI.secureStorage.set(ENCRYPTED_KEYS_KEY, JSON.stringify(keysToStore));
      await window.electronAPI.secureStorage.set(USERNAME_KEY, username);

      // Create user object
      const user: LocalUser = {
        id: loginResponse.user.id,
        username: loginResponse.user.username,
        avatarPreset: loginResponse.user.avatarPreset,
        avatarData: loginResponse.user.avatarData,
        bio: null,
        statsPublic: false,
        searchable: true,
        createdAt: Date.now(),
        publicKey: bytesToBase64(keyBundle.identityKeyPair.publicKey),
      };

      // Initialize sync service
      await syncService.initialize(keyBundle.localKey);
      syncService.startPolling();

      dispatch({ type: 'SET_USER', user, keyBundle });
      dispatch({ type: 'SET_ONLINE', online: syncService.getIsOnline() });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create account';
      dispatch({ type: 'SET_ERROR', error: message });
      throw error;
    }
  }, []);

  const login = useCallback(async (seedPhrase: string[], providedUsername?: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_ERROR', error: null });

      // Validate seed phrase
      if (!validateSeedPhrase(seedPhrase)) {
        throw new Error('Invalid seed phrase');
      }

      // Derive keys
      const keyBundle = deriveKeys(seedPhrase);

      // Try to get stored username, use provided one, or ask for it
      let username = providedUsername || await window.electronAPI.secureStorage.get(USERNAME_KEY);

      if (!username) {
        // This is a recovery - we need the username
        throw new Error('Please provide your username to recover your account');
      }

      // Get challenge and login
      const { challenge } = await apiClient.getChallenge(username);
      const loginResponse = await apiClient.login(username, challenge, keyBundle.identityKeyPair.privateKey);

      // Store keys securely
      const keysToStore = {
        identityKeyPair: {
          publicKey: bytesToBase64(keyBundle.identityKeyPair.publicKey),
          privateKey: bytesToBase64(keyBundle.identityKeyPair.privateKey),
        },
        encryptionKeyPair: {
          publicKey: bytesToBase64(keyBundle.encryptionKeyPair.publicKey),
          privateKey: bytesToBase64(keyBundle.encryptionKeyPair.privateKey),
        },
        localKey: bytesToBase64(keyBundle.localKey),
      };

      await window.electronAPI.secureStorage.set(ENCRYPTED_KEYS_KEY, JSON.stringify(keysToStore));
      await window.electronAPI.secureStorage.set(USERNAME_KEY, username);

      // Get full profile
      const profile = await apiClient.getProfile();

      const user: LocalUser = {
        id: profile.id,
        username: profile.username,
        avatarPreset: profile.avatarPreset,
        avatarData: profile.avatarData,
        bio: profile.bio,
        statsPublic: profile.statsPublic,
        searchable: profile.searchable,
        createdAt: profile.createdAt,
        publicKey: bytesToBase64(keyBundle.identityKeyPair.publicKey),
      };

      // Update encryption public key for existing users who registered before this feature
      await apiClient.updateProfile({
        encryptionPublicKey: bytesToBase64(keyBundle.encryptionKeyPair.publicKey),
      });

      // Initialize sync service
      await syncService.initialize(keyBundle.localKey);
      syncService.startPolling();

      dispatch({ type: 'SET_USER', user, keyBundle });
      dispatch({ type: 'SET_ONLINE', online: syncService.getIsOnline() });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to login';
      dispatch({ type: 'SET_ERROR', error: message });
      throw error;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Cleanup services
      syncService.cleanup();
      await apiClient.logout();

      // Clear stored data
      await window.electronAPI.secureStorage.delete(ENCRYPTED_KEYS_KEY);
      await window.electronAPI.secureStorage.delete(USERNAME_KEY);

      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even on error
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const setServerUrl = useCallback(async (url: string): Promise<void> => {
    await apiClient.setServerUrl(url);
  }, []);

  const getServerUrl = useCallback((): string => {
    return apiClient.getServerUrl();
  }, []);

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

  // Refresh shares from server
  const refreshShares = useCallback(async (): Promise<void> => {
    if (!state.user) return;

    try {
      const [ownedResponse, receivedResponse] = await Promise.all([
        apiClient.getOwnedShares(),
        apiClient.getReceivedShares(),
      ]);

      dispatch({
        type: 'SET_SHARES',
        owned: ownedResponse.shares,
        received: receivedResponse.shares,
      });
    } catch (error) {
      console.error('Failed to refresh shares:', error);
    }
  }, [state.user]);

  // Refresh friends list with public keys
  const refreshFriends = useCallback(async (): Promise<void> => {
    if (!state.user) return;

    try {
      const response = await apiClient.getFriends();
      // Friends from API include publicKey if available
      dispatch({
        type: 'SET_FRIENDS',
        friends: response.friends as FriendWithKey[],
      });
    } catch (error) {
      console.error('Failed to refresh friends:', error);
    }
  }, [state.user]);

  // Refresh friend requests
  const refreshFriendRequests = useCallback(async (): Promise<void> => {
    if (!state.user) return;

    try {
      const response = await apiClient.getFriendRequests();
      dispatch({
        type: 'SET_FRIEND_REQUESTS',
        requests: response.received,
      });
    } catch (error) {
      console.error('Failed to refresh friend requests:', error);
    }
  }, [state.user]);

  // Accept a friend request
  const acceptFriendRequest = useCallback(async (requestId: string): Promise<void> => {
    await apiClient.acceptFriendRequest(requestId);
    await refreshFriendRequests();
    await refreshFriends();
  }, [refreshFriendRequests, refreshFriends]);

  // Reject a friend request
  const rejectFriendRequest = useCallback(async (requestId: string): Promise<void> => {
    await apiClient.rejectFriendRequest(requestId);
    await refreshFriendRequests();
  }, [refreshFriendRequests]);

  // Share a project with a friend
  const shareProject = useCallback(async (
    project: Project,
    entries: WordEntry[],
    friendId: string,
    shareType: 'full' | 'stats_only'
  ): Promise<string> => {
    if (!state.keyBundle) {
      throw new Error('Not logged in');
    }

    // Find friend's public key
    const friend = state.friends.find(f => f.id === friendId);
    if (!friend || !friend.publicKey) {
      throw new Error('Friend public key not available');
    }

    // Prepare data to share
    const dataToShare: SharedProjectData = shareType === 'full'
      ? { project, entries }
      : { project: { ...project }, entries: [] }; // Stats only - no entries

    // Serialize and compress
    const json = JSON.stringify(dataToShare);
    const compressed = pako.gzip(json);

    // Get friend's X25519 public key
    const friendPublicKey = base64ToUint8Array(friend.publicKey);

    // Encrypt for recipient
    const { ephemeralPublicKey, encrypted } = encryptForRecipient(
      compressed,
      friendPublicKey,
      state.keyBundle.encryptionKeyPair.privateKey
    );

    // Create hash of unencrypted data for change detection
    const dataHash = hashString(json);

    // Serialize encrypted blob
    const encryptedData = bytesToBase64(utf8ToBytes(JSON.stringify(encrypted)));

    // Send to server
    const response = await apiClient.createShare({
      sharedWithId: friendId,
      projectLocalId: project.id,
      shareType,
      encryptedData,
      ephemeralPublicKey,
      dataHash,
    });

    // Refresh shares
    await refreshShares();

    return response.shareId;
  }, [state.keyBundle, state.friends, refreshShares]);

  // Update a shared project
  const updateSharedProject = useCallback(async (
    shareId: string,
    project: Project,
    entries: WordEntry[],
    friendId: string
  ): Promise<void> => {
    if (!state.keyBundle) {
      throw new Error('Not logged in');
    }

    // Find friend's public key
    const friend = state.friends.find(f => f.id === friendId);
    if (!friend || !friend.publicKey) {
      throw new Error('Friend public key not available');
    }

    // Find existing share to get share type
    const existingShare = state.ownedShares.find(s => s.id === shareId);
    const shareType = existingShare?.shareType || 'full';

    // Prepare data to share
    const dataToShare: SharedProjectData = shareType === 'full'
      ? { project, entries }
      : { project: { ...project }, entries: [] };

    // Serialize and compress
    const json = JSON.stringify(dataToShare);
    const compressed = pako.gzip(json);

    // Get friend's X25519 public key
    const friendPublicKey = base64ToUint8Array(friend.publicKey);

    // Encrypt for recipient
    const { ephemeralPublicKey, encrypted } = encryptForRecipient(
      compressed,
      friendPublicKey,
      state.keyBundle.encryptionKeyPair.privateKey
    );

    // Create hash of unencrypted data for change detection
    const dataHash = hashString(json);

    // Serialize encrypted blob
    const encryptedData = bytesToBase64(utf8ToBytes(JSON.stringify(encrypted)));

    // Update share on server (using create which handles upsert)
    await apiClient.createShare({
      sharedWithId: friendId,
      projectLocalId: project.id,
      shareType,
      encryptedData,
      ephemeralPublicKey,
      dataHash,
    });

    // Refresh shares
    await refreshShares();
  }, [state.keyBundle, state.friends, state.ownedShares, refreshShares]);

  // Revoke a share
  const revokeShare = useCallback(async (shareId: string): Promise<void> => {
    await apiClient.revokeShare(shareId);
    await refreshShares();
  }, [refreshShares]);

  // ============ Party Actions ============

  // Refresh parties state
  const refreshParties = useCallback(async (): Promise<void> => {
    if (!state.user || !state.isOnline) return;

    try {
      const response = await apiClient.getParties();
      // Filter to only include active parties (not ended)
      const activeParties = response.active.filter((p: Party) => p.status === 'active');
      dispatch({ type: 'SET_PARTIES', active: activeParties, upcoming: response.upcoming, invites: response.invites });
    } catch (error) {
      console.error('Failed to refresh parties:', error);
    }
  }, [state.user, state.isOnline]);

  // Create a new party
  const createParty = useCallback(async (
    title: string,
    durationMinutes: number,
    scheduledStart?: number | null,
    rankingEnabled = true,
    inviteFriendIds?: string[]
  ): Promise<Party> => {
    const response = await apiClient.createParty({
      title,
      durationMinutes,
      scheduledStart,
      rankingEnabled,
      inviteFriendIds,
    });
    await refreshParties();
    return response.party;
  }, [refreshParties]);

  // Join party by code
  const joinPartyByCode = useCallback(async (code: string, startWordCount = 0): Promise<Party> => {
    const response = await apiClient.joinPartyByCode(code, startWordCount);
    await refreshParties();
    return response.party;
  }, [refreshParties]);

  // Join party by invite
  const joinPartyByInvite = useCallback(async (
    partyId: string,
    inviteId: string,
    startWordCount = 0
  ): Promise<Party> => {
    const response = await apiClient.joinPartyByInvite(partyId, inviteId, startWordCount);
    await refreshParties();
    return response.party;
  }, [refreshParties]);

  // Leave party
  const leaveParty = useCallback(async (partyId: string): Promise<void> => {
    await apiClient.leaveParty(partyId);
    await refreshParties();
  }, [refreshParties]);

  // Update party progress
  const updatePartyProgress = useCallback(async (partyId: string, currentWordCount: number): Promise<number> => {
    try {
      const response = await apiClient.updatePartyProgress(partyId, currentWordCount);
      // Don't refresh all parties, just update the leaderboard in the active party if needed
      const isActiveParty = state.activeParties.some((p) => p.id === partyId);
      if (isActiveParty) {
        const partyResponse = await apiClient.getParty(partyId);
        dispatch({ type: 'UPDATE_ACTIVE_PARTY', party: partyResponse.party });

        // Add progress snapshot for the chart
        if (partyResponse.party.participants) {
          const snapshot: PartyProgressSnapshot = {
            timestamp: Date.now(),
            participants: {},
          };
          partyResponse.party.participants.forEach((p: { id: string; wordsWritten: number }) => {
            snapshot.participants[p.id] = p.wordsWritten;
          });
          dispatch({ type: 'ADD_PARTY_PROGRESS_SNAPSHOT', partyId, snapshot });
        }
      }
      return response.wordsWritten;
    } catch (error) {
      // If party is no longer active, refresh parties to get updated state
      if (error instanceof Error && error.message.includes('not active')) {
        await refreshParties();
      }
      throw error;
    }
  }, [state.activeParties, refreshParties]);

  // End party
  const endParty = useCallback(async (partyId: string): Promise<Party> => {
    const response = await apiClient.endParty(partyId);
    await refreshParties();
    return response.party;
  }, [refreshParties]);

  // Start a scheduled party
  const startParty = useCallback(async (partyId: string): Promise<Party> => {
    const response = await apiClient.startParty(partyId);
    await refreshParties();
    return response.party;
  }, [refreshParties]);

  // Invite friends to party
  const inviteToParty = useCallback(async (partyId: string, friendIds: string[]): Promise<void> => {
    await apiClient.inviteToParty(partyId, friendIds);
  }, []);

  // Decline party invite
  const declinePartyInvite = useCallback(async (inviteId: string): Promise<void> => {
    await apiClient.declinePartyInvite(inviteId);
    await refreshParties();
  }, [refreshParties]);

  // Get party history
  const getPartyHistory = useCallback(async (): Promise<Party[]> => {
    const response = await apiClient.getPartyHistory();
    return response.parties;
  }, []);

  // Get party details with participants
  const getPartyDetails = useCallback(async (partyId: string): Promise<Party | null> => {
    try {
      const response = await apiClient.getParty(partyId);
      return response.party;
    } catch (error) {
      console.error('Failed to get party details:', error);
      return null;
    }
  }, []);

  // Update user avatar (preset)
  const updateAvatar = useCallback(async (avatarPreset: string): Promise<void> => {
    if (!state.user) {
      throw new Error('Not logged in');
    }

    try {
      await apiClient.updateProfile({ avatarPreset });
      dispatch({ type: 'UPDATE_USER_AVATAR', avatarPreset });
    } catch (error) {
      console.error('Failed to update avatar:', error);
      throw error;
    }
  }, [state.user]);

  // Update user avatar data (custom or preset)
  const updateAvatarData = useCallback(async (avatarData: AvatarData): Promise<void> => {
    if (!state.user) {
      throw new Error('Not logged in');
    }

    try {
      await apiClient.updateProfile({ avatarData });
      dispatch({ type: 'UPDATE_USER_AVATAR_DATA', avatarData });
    } catch (error) {
      console.error('Failed to update avatar data:', error);
      throw error;
    }
  }, [state.user]);

  // Upload avatar image
  const uploadAvatar = useCallback(async (imageData: string): Promise<void> => {
    if (!state.user) {
      throw new Error('Not logged in');
    }

    try {
      const response = await apiClient.uploadAvatar(imageData);
      dispatch({ type: 'UPDATE_USER_AVATAR_DATA', avatarData: response.avatarData });
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      throw error;
    }
  }, [state.user]);

  // Decrypt a shared project
  const decryptSharedProject = useCallback(async (
    shareId: string
  ): Promise<SharedProjectData | null> => {
    if (!state.keyBundle) {
      throw new Error('Not logged in');
    }

    try {
      // Get share data from server
      const response = await apiClient.getShareData(shareId);

      if (!response.encryptedData || !response.ephemeralPublicKey) {
        return null;
      }

      // Parse encrypted blob
      const encryptedBlob = JSON.parse(bytesToUtf8(base64ToUint8Array(response.encryptedData)));

      // Decrypt using our private key
      const decrypted = decryptFromSender(
        response.ephemeralPublicKey,
        encryptedBlob,
        state.keyBundle.encryptionKeyPair.privateKey
      );

      // Decompress
      const json = pako.ungzip(decrypted, { to: 'string' });

      // Parse
      return JSON.parse(json) as SharedProjectData;
    } catch (error) {
      console.error('Failed to decrypt shared project:', error);
      throw error;
    }
  }, [state.keyBundle]);

  const value: SocialContextValue = {
    state,
    actions: {
      generateNewSeedPhrase,
      createAccount,
      login,
      logout,
      setServerUrl,
      getServerUrl,
      forceSync,
      syncAppData,
      restoreFromCloud,
      isLoggedIn,
      refreshShares,
      refreshFriends,
      refreshFriendRequests,
      acceptFriendRequest,
      rejectFriendRequest,
      shareProject,
      updateSharedProject,
      revokeShare,
      decryptSharedProject,
      // Party actions
      refreshParties,
      createParty,
      joinPartyByCode,
      joinPartyByInvite,
      leaveParty,
      updatePartyProgress,
      endParty,
      startParty,
      inviteToParty,
      declinePartyInvite,
      getPartyHistory,
      getPartyDetails,
      // Profile actions
      updateAvatar,
      updateAvatarData,
      uploadAvatar,
    },
  };

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

// Hook to use social context
export function useSocial(): SocialContextValue {
  const context = useContext(SocialContext);
  if (!context) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
}

// Utility function to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
