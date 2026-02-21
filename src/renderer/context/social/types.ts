/**
 * Type definitions for the Social Context
 */

import type { LocalUser, SyncStatus, KeyBundle, AvatarData } from '@maplume/shared';
import type { SharedProjectInfo, FriendUser, Party, PartyInvite, FriendRequest, PartyMessage } from '@maplume/shared';
import type { ShareReaction, ReactionCount } from '@maplume/shared';
import type { Project, WordEntry, AppData } from '@maplume/shared';

// Storage keys
export const ENCRYPTED_KEYS_KEY = 'maplume-encrypted-keys';
export const USERNAME_KEY = 'maplume-username';

// Extended friend user with public key for encryption
export interface FriendWithKey extends FriendUser {
  publicKey?: string;
}

// Progress snapshot for party charts
export interface PartyProgressSnapshot {
  timestamp: number;
  participants: { [participantId: string]: number }; // participantId -> wordsWritten
}

// Decrypted comment with content as plaintext
export interface DecryptedComment {
  id: string;
  shareId: string;
  author: { id: string; username: string; avatarPreset: string | null; avatarData?: import('@maplume/shared').AvatarData | null };
  targetType: 'entry' | 'note';
  targetId: string;
  content: string; // Decrypted content
  createdAt: number;
  updatedAt: number;
}

// Share interactions state (per share)
export interface ShareInteractions {
  comments: DecryptedComment[];
  reactions: ShareReaction[];
  loading: boolean;
  error: string | null;
}

// Shared project data that gets encrypted
export interface SharedProjectData {
  project: Project;
  entries: WordEntry[];
}

// State interface
export interface SocialState {
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
  sentFriendRequests: FriendRequest[]; // Sent friend requests
  // Writing parties
  activeParties: Party[];
  upcomingParties: Party[];
  partyInvites: PartyInvite[];
  // Progress history for party charts (keyed by partyId)
  partyProgressHistory: { [partyId: string]: PartyProgressSnapshot[] };
  // Share interactions (keyed by shareId)
  shareInteractions: { [shareId: string]: ShareInteractions };
  // Party messages (keyed by partyId)
  partyMessages: { [partyId: string]: PartyMessage[] };
}

// Action types
export type SocialAction =
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
  | { type: 'SET_FRIEND_REQUESTS'; received: FriendRequest[]; sent: FriendRequest[] }
  | { type: 'SET_PARTIES'; active: Party[]; upcoming: Party[]; invites: PartyInvite[] }
  | { type: 'UPDATE_ACTIVE_PARTY'; party: Party }
  | { type: 'ADD_PARTY_PROGRESS_SNAPSHOT'; partyId: string; snapshot: PartyProgressSnapshot }
  | { type: 'SET_SHARE_INTERACTIONS'; shareId: string; interactions: ShareInteractions }
  | { type: 'ADD_COMMENT'; shareId: string; comment: DecryptedComment }
  | { type: 'UPDATE_COMMENT'; shareId: string; commentId: string; content: string; updatedAt: number }
  | { type: 'DELETE_COMMENT'; shareId: string; commentId: string }
  | { type: 'SET_REACTIONS'; shareId: string; reactions: ShareReaction[] }
  | { type: 'ADD_REACTION'; shareId: string; reaction: ShareReaction }
  | { type: 'REMOVE_REACTION'; shareId: string; reactionId: string }
  | { type: 'SET_PARTY_MESSAGES'; partyId: string; messages: PartyMessage[] }
  | { type: 'ADD_PARTY_MESSAGES'; partyId: string; messages: PartyMessage[] }
  | { type: 'ADD_PARTY_MESSAGE'; partyId: string; message: PartyMessage }
  | { type: 'CLEAR_PARTY_MESSAGES'; partyId: string };

// Context interface
export interface SocialContextValue {
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
    cancelFriendRequest: (requestId: string) => Promise<void>;
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
    // Share interactions (comments and reactions)
    loadShareInteractions: (shareId: string, ownerPublicKey: string) => Promise<void>;
    createComment: (shareId: string, targetType: 'entry' | 'note', targetId: string, content: string, ownerPublicKey: string) => Promise<DecryptedComment>;
    updateComment: (shareId: string, commentId: string, content: string, ownerPublicKey: string) => Promise<void>;
    deleteComment: (shareId: string, commentId: string) => Promise<void>;
    addReaction: (shareId: string, targetType: 'entry' | 'note' | 'comment', targetId: string, emoji: string) => Promise<string>;
    removeReaction: (shareId: string, reactionId: string) => Promise<void>;
    getReactionCounts: (shareId: string, targetType: 'entry' | 'note' | 'comment', targetId: string) => ReactionCount[];
    // Party messages (ephemeral chat)
    sendPartyMessage: (partyId: string, content: string) => Promise<PartyMessage>;
    fetchPartyMessages: (partyId: string, since?: number) => Promise<PartyMessage[]>;
    getPartyMessages: (partyId: string) => PartyMessage[];
    clearPartyMessages: (partyId: string) => void;
  };
}

// Utility function to convert base64 to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
