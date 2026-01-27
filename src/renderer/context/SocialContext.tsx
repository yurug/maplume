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
import type { LocalUser, SyncStatus, KeyBundle } from '@maplume/shared';
import { apiClient } from '../services/api';
import { syncService } from '../services/sync';
import {
  generateSeedPhrase,
  validateSeedPhrase,
  deriveKeys,
  bytesToBase64,
} from '../services/crypto';

// Storage keys
const ENCRYPTED_KEYS_KEY = 'maplume-encrypted-keys';
const USERNAME_KEY = 'maplume-username';

// State interface
interface SocialState {
  initialized: boolean;
  user: LocalUser | null;
  keyBundle: KeyBundle | null;
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingOperations: number;
  error: string | null;
}

// Action types
type SocialAction =
  | { type: 'INITIALIZE'; user: LocalUser | null; keyBundle: KeyBundle | null }
  | { type: 'SET_USER'; user: LocalUser; keyBundle: KeyBundle }
  | { type: 'SET_ONLINE'; online: boolean }
  | { type: 'SET_SYNC_STATUS'; status: SyncStatus }
  | { type: 'SET_PENDING_COUNT'; count: number }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'LOGOUT' };

// Initial state
const initialState: SocialState = {
  initialized: false,
  user: null,
  keyBundle: null,
  isOnline: false,
  syncStatus: 'idle',
  pendingOperations: 0,
  error: null,
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

    default:
      return state;
  }
}

// Context interface
interface SocialContextValue {
  state: SocialState;
  actions: {
    generateNewSeedPhrase: () => string[];
    createAccount: (username: string, seedPhrase: string[]) => Promise<void>;
    login: (seedPhrase: string[]) => Promise<void>;
    logout: () => Promise<void>;
    setServerUrl: (url: string) => Promise<void>;
    getServerUrl: () => string;
    forceSync: () => Promise<void>;
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

      // Register with server
      await apiClient.register(username, keyBundle.identityKeyPair.publicKey);

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

  const login = useCallback(async (seedPhrase: string[]): Promise<void> => {
    try {
      dispatch({ type: 'SET_ERROR', error: null });

      // Validate seed phrase
      if (!validateSeedPhrase(seedPhrase)) {
        throw new Error('Invalid seed phrase');
      }

      // Derive keys
      const keyBundle = deriveKeys(seedPhrase);

      // Try to get stored username or ask server
      let username = await window.electronAPI.secureStorage.get(USERNAME_KEY);

      if (!username) {
        // This is a recovery - we need to search for the user by public key
        // For now, we'll require the username to be entered separately
        throw new Error('Please create a new account or provide your username');
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

      // Get full profile
      const profile = await apiClient.getProfile();

      const user: LocalUser = {
        id: profile.id,
        username: profile.username,
        avatarPreset: profile.avatarPreset,
        bio: profile.bio,
        statsPublic: profile.statsPublic,
        searchable: profile.searchable,
        createdAt: profile.createdAt,
        publicKey: bytesToBase64(keyBundle.identityKeyPair.publicKey),
      };

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
