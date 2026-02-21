/**
 * Authentication actions for the Social Context
 */

import type { LocalUser, KeyBundle, AvatarData } from '@maplume/shared';
import type { SocialState, SocialAction } from '../types';
import { ENCRYPTED_KEYS_KEY, USERNAME_KEY, base64ToUint8Array } from '../types';
import { apiClient } from '../../../services/api';
import { syncService } from '../../../services/sync';
import {
  generateSeedPhrase,
  validateSeedPhrase,
  deriveKeys,
  bytesToBase64,
} from '../../../services/crypto';

export interface AuthActions {
  generateNewSeedPhrase: () => string[];
  createAccount: (username: string, seedPhrase: string[]) => Promise<void>;
  login: (seedPhrase: string[], username?: string) => Promise<void>;
  logout: () => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
  getServerUrl: () => string;
  updateAvatar: (avatarPreset: string) => Promise<void>;
  updateAvatarData: (avatarData: AvatarData) => Promise<void>;
  uploadAvatar: (imageData: string) => Promise<void>;
}

export function createAuthActions(
  state: SocialState,
  dispatch: React.Dispatch<SocialAction>
): AuthActions {
  const generateNewSeedPhrase = (): string[] => {
    return generateSeedPhrase();
  };

  const createAccount = async (username: string, seedPhrase: string[]): Promise<void> => {
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
  };

  const login = async (seedPhrase: string[], providedUsername?: string): Promise<void> => {
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
  };

  const logout = async (): Promise<void> => {
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
  };

  const setServerUrl = async (url: string): Promise<void> => {
    await apiClient.setServerUrl(url);
  };

  const getServerUrl = (): string => {
    return apiClient.getServerUrl();
  };

  const updateAvatar = async (avatarPreset: string): Promise<void> => {
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
  };

  const updateAvatarData = async (avatarData: AvatarData): Promise<void> => {
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
  };

  const uploadAvatar = async (imageData: string): Promise<void> => {
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
  };

  return {
    generateNewSeedPhrase,
    createAccount,
    login,
    logout,
    setServerUrl,
    getServerUrl,
    updateAvatar,
    updateAvatarData,
    uploadAvatar,
  };
}

// Initialize social features - used in the provider
export async function initializeSocial(dispatch: React.Dispatch<SocialAction>): Promise<void> {
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
