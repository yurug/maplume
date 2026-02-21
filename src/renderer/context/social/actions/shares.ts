/**
 * Share-related actions for the Social Context
 */

import type { Project, WordEntry } from '@maplume/shared';
import type { SocialState, SocialAction, SharedProjectData } from '../types';
import { base64ToUint8Array } from '../types';
import { apiClient } from '../../../services/api';
import {
  bytesToBase64,
  encryptForRecipient,
  decryptFromSender,
  hashString,
  utf8ToBytes,
  bytesToUtf8,
} from '../../../services/crypto';
import pako from 'pako';

export interface ShareActions {
  refreshShares: () => Promise<void>;
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
}

export function createShareActions(
  state: SocialState,
  dispatch: React.Dispatch<SocialAction>
): ShareActions {
  // Refresh shares from server
  const refreshShares = async (): Promise<void> => {
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
  };

  // Share a project with a friend
  const shareProject = async (
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
  };

  // Update a shared project
  const updateSharedProject = async (
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
  };

  // Revoke a share
  const revokeShare = async (shareId: string): Promise<void> => {
    await apiClient.revokeShare(shareId);
    await refreshShares();
  };

  // Decrypt a shared project
  const decryptSharedProject = async (
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
  };

  return {
    refreshShares,
    shareProject,
    updateSharedProject,
    revokeShare,
    decryptSharedProject,
  };
}
