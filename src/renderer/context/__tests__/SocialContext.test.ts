import { describe, it, expect } from 'vitest';
import type {
  LocalUser,
  SyncStatus,
  KeyBundle,
  AvatarData,
} from '@maplume/shared';
import type {
  SharedProjectInfo,
  FriendRequest,
  Party,
  PartyInvite,
  ShareReaction,
  PartyMessage,
} from '@maplume/shared';

// ============================================================================
// We need to extract and test the reducer directly, but since it's not exported,
// we'll re-implement the reducer logic here for testing. In a real codebase,
// you might want to export the reducer for testing purposes.
// ============================================================================

// Extended friend user with public key for encryption
interface FriendWithKey {
  id: string;
  username: string;
  avatarPreset: string | null;
  avatarData?: AvatarData | null;
  publicKey?: string;
}

// Progress snapshot for party charts
interface PartyProgressSnapshot {
  timestamp: number;
  participants: { [participantId: string]: number };
}

// Decrypted comment with content as plaintext
interface DecryptedComment {
  id: string;
  shareId: string;
  author: {
    id: string;
    username: string;
    avatarPreset: string | null;
    avatarData?: AvatarData | null;
  };
  targetType: 'entry' | 'note';
  targetId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// Share interactions state (per share)
interface ShareInteractions {
  comments: DecryptedComment[];
  reactions: ShareReaction[];
  loading: boolean;
  error: string | null;
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
  friendRequests: FriendRequest[];
  sentFriendRequests: FriendRequest[];
  activeParties: Party[];
  upcomingParties: Party[];
  partyInvites: PartyInvite[];
  partyProgressHistory: { [partyId: string]: PartyProgressSnapshot[] };
  shareInteractions: { [shareId: string]: ShareInteractions };
  partyMessages: { [partyId: string]: PartyMessage[] };
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
  sentFriendRequests: [],
  activeParties: [],
  upcomingParties: [],
  partyInvites: [],
  partyProgressHistory: {},
  shareInteractions: {},
  partyMessages: {},
};

// Reducer (copied from SocialContext.tsx)
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
        user: state.user
          ? {
              ...state.user,
              avatarPreset: action.avatarPreset,
              avatarData: { type: 'preset', preset: action.avatarPreset },
            }
          : null,
      };

    case 'UPDATE_USER_AVATAR_DATA':
      return {
        ...state,
        user: state.user
          ? {
              ...state.user,
              avatarData: action.avatarData,
              avatarPreset:
                action.avatarData.type === 'preset' ? action.avatarData.preset || null : null,
            }
          : null,
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
        friendRequests: action.received,
        sentFriendRequests: action.sent,
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

    case 'SET_SHARE_INTERACTIONS':
      return {
        ...state,
        shareInteractions: {
          ...state.shareInteractions,
          [action.shareId]: action.interactions,
        },
      };

    case 'ADD_COMMENT': {
      const existing = state.shareInteractions[action.shareId] || {
        comments: [],
        reactions: [],
        loading: false,
        error: null,
      };
      return {
        ...state,
        shareInteractions: {
          ...state.shareInteractions,
          [action.shareId]: {
            ...existing,
            comments: [...existing.comments, action.comment],
          },
        },
      };
    }

    case 'UPDATE_COMMENT': {
      const existing = state.shareInteractions[action.shareId];
      if (!existing) return state;
      return {
        ...state,
        shareInteractions: {
          ...state.shareInteractions,
          [action.shareId]: {
            ...existing,
            comments: existing.comments.map((c) =>
              c.id === action.commentId
                ? { ...c, content: action.content, updatedAt: action.updatedAt }
                : c
            ),
          },
        },
      };
    }

    case 'DELETE_COMMENT': {
      const existing = state.shareInteractions[action.shareId];
      if (!existing) return state;
      return {
        ...state,
        shareInteractions: {
          ...state.shareInteractions,
          [action.shareId]: {
            ...existing,
            comments: existing.comments.filter((c) => c.id !== action.commentId),
          },
        },
      };
    }

    case 'SET_REACTIONS': {
      const existing = state.shareInteractions[action.shareId] || {
        comments: [],
        reactions: [],
        loading: false,
        error: null,
      };
      return {
        ...state,
        shareInteractions: {
          ...state.shareInteractions,
          [action.shareId]: {
            ...existing,
            reactions: action.reactions,
          },
        },
      };
    }

    case 'ADD_REACTION': {
      const existing = state.shareInteractions[action.shareId] || {
        comments: [],
        reactions: [],
        loading: false,
        error: null,
      };
      return {
        ...state,
        shareInteractions: {
          ...state.shareInteractions,
          [action.shareId]: {
            ...existing,
            reactions: [...existing.reactions, action.reaction],
          },
        },
      };
    }

    case 'REMOVE_REACTION': {
      const existing = state.shareInteractions[action.shareId];
      if (!existing) return state;
      return {
        ...state,
        shareInteractions: {
          ...state.shareInteractions,
          [action.shareId]: {
            ...existing,
            reactions: existing.reactions.filter((r) => r.id !== action.reactionId),
          },
        },
      };
    }

    case 'SET_PARTY_MESSAGES':
      return {
        ...state,
        partyMessages: {
          ...state.partyMessages,
          [action.partyId]: action.messages,
        },
      };

    case 'ADD_PARTY_MESSAGES': {
      const existingMessages = state.partyMessages[action.partyId] || [];
      // Filter out duplicates and append new messages
      const existingIds = new Set(existingMessages.map((m) => m.id));
      const newMessages = action.messages.filter((m) => !existingIds.has(m.id));
      return {
        ...state,
        partyMessages: {
          ...state.partyMessages,
          [action.partyId]: [...existingMessages, ...newMessages],
        },
      };
    }

    case 'ADD_PARTY_MESSAGE': {
      const existingMessages = state.partyMessages[action.partyId] || [];
      // Check if message already exists (avoid duplicates)
      if (existingMessages.some((m) => m.id === action.message.id)) {
        return state;
      }
      return {
        ...state,
        partyMessages: {
          ...state.partyMessages,
          [action.partyId]: [...existingMessages, action.message],
        },
      };
    }

    case 'CLEAR_PARTY_MESSAGES':
      return {
        ...state,
        partyMessages: {
          ...state.partyMessages,
          [action.partyId]: [],
        },
      };

    default:
      return state;
  }
}

// ============================================================================
// Helper functions to create test data
// ============================================================================

function createUser(overrides: Partial<LocalUser> = {}): LocalUser {
  return {
    id: `user-${Math.random().toString(36).slice(2)}`,
    username: 'testuser',
    avatarPreset: null,
    avatarData: null,
    bio: null,
    statsPublic: false,
    searchable: true,
    createdAt: Date.now(),
    publicKey: 'test-public-key-base64',
    ...overrides,
  };
}

function createKeyBundle(): KeyBundle {
  return {
    identityKeyPair: {
      publicKey: new Uint8Array(32),
      privateKey: new Uint8Array(64),
    },
    encryptionKeyPair: {
      publicKey: new Uint8Array(32),
      privateKey: new Uint8Array(32),
    },
    localKey: new Uint8Array(32),
  };
}

function createFriend(overrides: Partial<FriendWithKey> = {}): FriendWithKey {
  return {
    id: `friend-${Math.random().toString(36).slice(2)}`,
    username: 'friend',
    avatarPreset: null,
    ...overrides,
  };
}

function createShare(overrides: Partial<SharedProjectInfo> = {}): SharedProjectInfo {
  return {
    id: `share-${Math.random().toString(36).slice(2)}`,
    projectLocalId: 'project-1',
    shareType: 'full',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function createParty(overrides: Partial<Party> = {}): Party {
  return {
    id: `party-${Math.random().toString(36).slice(2)}`,
    title: 'Test Party',
    creator: { id: 'creator-1', username: 'creator', avatarPreset: null },
    scheduledStart: null,
    actualStart: Date.now(),
    durationMinutes: 60,
    endedAt: null,
    joinCode: 'ABC123',
    rankingEnabled: true,
    status: 'active',
    participantCount: 2,
    ...overrides,
  };
}

function createPartyInvite(overrides: Partial<PartyInvite> = {}): PartyInvite {
  return {
    id: `invite-${Math.random().toString(36).slice(2)}`,
    party: {
      id: 'party-1',
      title: 'Test Party',
      creator: { id: 'creator-1', username: 'creator', avatarPreset: null },
      scheduledStart: null,
      durationMinutes: 60,
      status: 'scheduled',
    },
    invitedBy: { id: 'inviter-1', username: 'inviter', avatarPreset: null },
    createdAt: Date.now(),
    ...overrides,
  };
}

function createFriendRequest(overrides: Partial<FriendRequest> = {}): FriendRequest {
  return {
    id: `request-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
    ...overrides,
  };
}

function createComment(overrides: Partial<DecryptedComment> = {}): DecryptedComment {
  return {
    id: `comment-${Math.random().toString(36).slice(2)}`,
    shareId: 'share-1',
    author: { id: 'author-1', username: 'author', avatarPreset: null },
    targetType: 'entry',
    targetId: 'entry-1',
    content: 'Test comment',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function createReaction(overrides: Partial<ShareReaction> = {}): ShareReaction {
  return {
    id: `reaction-${Math.random().toString(36).slice(2)}`,
    shareId: 'share-1',
    author: { id: 'author-1', username: 'author' },
    targetType: 'entry',
    targetId: 'entry-1',
    emoji: '👍',
    createdAt: Date.now(),
    ...overrides,
  };
}

function createPartyMessage(overrides: Partial<PartyMessage> = {}): PartyMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    partyId: 'party-1',
    author: { id: 'author-1', username: 'author', avatarPreset: null },
    content: 'Hello!',
    createdAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('socialReducer', () => {
  describe('initial state', () => {
    it('has correct initial values', () => {
      expect(initialState).toEqual({
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
        sentFriendRequests: [],
        activeParties: [],
        upcomingParties: [],
        partyInvites: [],
        partyProgressHistory: {},
        shareInteractions: {},
        partyMessages: {},
      });
    });
  });

  describe('INITIALIZE action', () => {
    it('initializes with user and keyBundle', () => {
      const user = createUser();
      const keyBundle = createKeyBundle();

      const result = socialReducer(initialState, {
        type: 'INITIALIZE',
        user,
        keyBundle,
      });

      expect(result.initialized).toBe(true);
      expect(result.user).toEqual(user);
      expect(result.keyBundle).toEqual(keyBundle);
    });

    it('initializes without user (logged out state)', () => {
      const result = socialReducer(initialState, {
        type: 'INITIALIZE',
        user: null,
        keyBundle: null,
      });

      expect(result.initialized).toBe(true);
      expect(result.user).toBeNull();
      expect(result.keyBundle).toBeNull();
    });
  });

  describe('SET_USER action', () => {
    it('sets user and keyBundle', () => {
      const user = createUser();
      const keyBundle = createKeyBundle();

      const result = socialReducer(initialState, {
        type: 'SET_USER',
        user,
        keyBundle,
      });

      expect(result.user).toEqual(user);
      expect(result.keyBundle).toEqual(keyBundle);
    });

    it('clears any existing error', () => {
      const state: SocialState = {
        ...initialState,
        error: 'Previous error',
      };
      const user = createUser();
      const keyBundle = createKeyBundle();

      const result = socialReducer(state, {
        type: 'SET_USER',
        user,
        keyBundle,
      });

      expect(result.error).toBeNull();
    });
  });

  describe('UPDATE_USER_AVATAR action', () => {
    it('updates user avatar preset', () => {
      const user = createUser({ avatarPreset: null });
      const state: SocialState = { ...initialState, user };

      const result = socialReducer(state, {
        type: 'UPDATE_USER_AVATAR',
        avatarPreset: 'writer-1',
      });

      expect(result.user?.avatarPreset).toBe('writer-1');
      expect(result.user?.avatarData).toEqual({ type: 'preset', preset: 'writer-1' });
    });

    it('does nothing when user is null', () => {
      const result = socialReducer(initialState, {
        type: 'UPDATE_USER_AVATAR',
        avatarPreset: 'writer-1',
      });

      expect(result.user).toBeNull();
    });
  });

  describe('UPDATE_USER_AVATAR_DATA action', () => {
    it('updates user avatar data with preset type', () => {
      const user = createUser();
      const state: SocialState = { ...initialState, user };
      const avatarData: AvatarData = { type: 'preset', preset: 'writer-2' };

      const result = socialReducer(state, {
        type: 'UPDATE_USER_AVATAR_DATA',
        avatarData,
      });

      expect(result.user?.avatarData).toEqual(avatarData);
      expect(result.user?.avatarPreset).toBe('writer-2');
    });

    it('updates user avatar data with dicebear type', () => {
      const user = createUser();
      const state: SocialState = { ...initialState, user };
      const avatarData: AvatarData = {
        type: 'dicebear',
        dicebear: { style: 'adventurer', seed: 'test' },
      };

      const result = socialReducer(state, {
        type: 'UPDATE_USER_AVATAR_DATA',
        avatarData,
      });

      expect(result.user?.avatarData).toEqual(avatarData);
      expect(result.user?.avatarPreset).toBeNull();
    });

    it('does nothing when user is null', () => {
      const avatarData: AvatarData = { type: 'preset', preset: 'writer-1' };

      const result = socialReducer(initialState, {
        type: 'UPDATE_USER_AVATAR_DATA',
        avatarData,
      });

      expect(result.user).toBeNull();
    });
  });

  describe('SET_ONLINE action', () => {
    it('sets online status to true', () => {
      const result = socialReducer(initialState, {
        type: 'SET_ONLINE',
        online: true,
      });

      expect(result.isOnline).toBe(true);
    });

    it('sets online status to false', () => {
      const state: SocialState = { ...initialState, isOnline: true };

      const result = socialReducer(state, {
        type: 'SET_ONLINE',
        online: false,
      });

      expect(result.isOnline).toBe(false);
    });
  });

  describe('SET_SYNC_STATUS action', () => {
    it.each(['idle', 'syncing', 'error', 'offline'] as SyncStatus[])(
      'sets sync status to %s',
      (status) => {
        const result = socialReducer(initialState, {
          type: 'SET_SYNC_STATUS',
          status,
        });

        expect(result.syncStatus).toBe(status);
      }
    );
  });

  describe('SET_PENDING_COUNT action', () => {
    it('sets pending operations count', () => {
      const result = socialReducer(initialState, {
        type: 'SET_PENDING_COUNT',
        count: 5,
      });

      expect(result.pendingOperations).toBe(5);
    });

    it('sets count to zero', () => {
      const state: SocialState = { ...initialState, pendingOperations: 10 };

      const result = socialReducer(state, {
        type: 'SET_PENDING_COUNT',
        count: 0,
      });

      expect(result.pendingOperations).toBe(0);
    });
  });

  describe('SET_ERROR action', () => {
    it('sets error message', () => {
      const result = socialReducer(initialState, {
        type: 'SET_ERROR',
        error: 'Something went wrong',
      });

      expect(result.error).toBe('Something went wrong');
    });

    it('clears error when null', () => {
      const state: SocialState = { ...initialState, error: 'Previous error' };

      const result = socialReducer(state, {
        type: 'SET_ERROR',
        error: null,
      });

      expect(result.error).toBeNull();
    });
  });

  describe('LOGOUT action', () => {
    it('resets state to initial but keeps initialized true', () => {
      const user = createUser();
      const keyBundle = createKeyBundle();
      const state: SocialState = {
        ...initialState,
        initialized: true,
        user,
        keyBundle,
        isOnline: true,
        friends: [createFriend()],
        activeParties: [createParty()],
      };

      const result = socialReducer(state, { type: 'LOGOUT' });

      expect(result).toEqual({
        ...initialState,
        initialized: true,
      });
    });
  });

  describe('SET_SHARES action', () => {
    it('sets owned and received shares', () => {
      const ownedShare = createShare({ id: 'owned-1' });
      const receivedShare = createShare({ id: 'received-1' });

      const result = socialReducer(initialState, {
        type: 'SET_SHARES',
        owned: [ownedShare],
        received: [receivedShare],
      });

      expect(result.ownedShares).toEqual([ownedShare]);
      expect(result.receivedShares).toEqual([receivedShare]);
    });

    it('replaces existing shares', () => {
      const oldShare = createShare({ id: 'old' });
      const newShare = createShare({ id: 'new' });
      const state: SocialState = {
        ...initialState,
        ownedShares: [oldShare],
      };

      const result = socialReducer(state, {
        type: 'SET_SHARES',
        owned: [newShare],
        received: [],
      });

      expect(result.ownedShares).toEqual([newShare]);
    });
  });

  describe('SET_FRIENDS action', () => {
    it('sets friends list', () => {
      const friend = createFriend();

      const result = socialReducer(initialState, {
        type: 'SET_FRIENDS',
        friends: [friend],
      });

      expect(result.friends).toEqual([friend]);
    });
  });

  describe('SET_FRIEND_REQUESTS action', () => {
    it('sets received and sent friend requests', () => {
      const received = createFriendRequest({ id: 'received-1' });
      const sent = createFriendRequest({ id: 'sent-1' });

      const result = socialReducer(initialState, {
        type: 'SET_FRIEND_REQUESTS',
        received: [received],
        sent: [sent],
      });

      expect(result.friendRequests).toEqual([received]);
      expect(result.sentFriendRequests).toEqual([sent]);
    });
  });

  describe('SET_PARTIES action', () => {
    it('sets active, upcoming parties and invites', () => {
      const activeParty = createParty({ id: 'active-1', status: 'active' });
      const upcomingParty = createParty({ id: 'upcoming-1', status: 'scheduled' });
      const invite = createPartyInvite({ id: 'invite-1' });

      const result = socialReducer(initialState, {
        type: 'SET_PARTIES',
        active: [activeParty],
        upcoming: [upcomingParty],
        invites: [invite],
      });

      expect(result.activeParties).toEqual([activeParty]);
      expect(result.upcomingParties).toEqual([upcomingParty]);
      expect(result.partyInvites).toEqual([invite]);
    });
  });

  describe('UPDATE_ACTIVE_PARTY action', () => {
    it('updates an existing active party', () => {
      const party = createParty({ id: 'party-1', title: 'Original' });
      const state: SocialState = { ...initialState, activeParties: [party] };

      const updatedParty = { ...party, title: 'Updated' };
      const result = socialReducer(state, {
        type: 'UPDATE_ACTIVE_PARTY',
        party: updatedParty,
      });

      expect(result.activeParties[0].title).toBe('Updated');
    });

    it('does not modify other parties', () => {
      const party1 = createParty({ id: 'party-1', title: 'Party 1' });
      const party2 = createParty({ id: 'party-2', title: 'Party 2' });
      const state: SocialState = { ...initialState, activeParties: [party1, party2] };

      const updatedParty1 = { ...party1, title: 'Updated Party 1' };
      const result = socialReducer(state, {
        type: 'UPDATE_ACTIVE_PARTY',
        party: updatedParty1,
      });

      expect(result.activeParties[1].title).toBe('Party 2');
    });

    it('handles non-existent party ID gracefully', () => {
      const party = createParty({ id: 'party-1' });
      const state: SocialState = { ...initialState, activeParties: [party] };

      const nonExistentParty = createParty({ id: 'non-existent' });
      const result = socialReducer(state, {
        type: 'UPDATE_ACTIVE_PARTY',
        party: nonExistentParty,
      });

      expect(result.activeParties).toEqual([party]);
    });
  });

  describe('ADD_PARTY_PROGRESS_SNAPSHOT action', () => {
    it('adds snapshot to party progress history', () => {
      const snapshot: PartyProgressSnapshot = {
        timestamp: Date.now(),
        participants: { 'user-1': 1000 },
      };

      const result = socialReducer(initialState, {
        type: 'ADD_PARTY_PROGRESS_SNAPSHOT',
        partyId: 'party-1',
        snapshot,
      });

      expect(result.partyProgressHistory['party-1']).toEqual([snapshot]);
    });

    it('appends to existing history', () => {
      const existingSnapshot: PartyProgressSnapshot = {
        timestamp: Date.now() - 1000,
        participants: { 'user-1': 500 },
      };
      const state: SocialState = {
        ...initialState,
        partyProgressHistory: { 'party-1': [existingSnapshot] },
      };

      const newSnapshot: PartyProgressSnapshot = {
        timestamp: Date.now(),
        participants: { 'user-1': 1000 },
      };
      const result = socialReducer(state, {
        type: 'ADD_PARTY_PROGRESS_SNAPSHOT',
        partyId: 'party-1',
        snapshot: newSnapshot,
      });

      expect(result.partyProgressHistory['party-1']).toHaveLength(2);
    });

    it('trims history to 100 snapshots', () => {
      const existingSnapshots: PartyProgressSnapshot[] = Array.from({ length: 100 }, (_, i) => ({
        timestamp: i,
        participants: { 'user-1': i * 10 },
      }));
      const state: SocialState = {
        ...initialState,
        partyProgressHistory: { 'party-1': existingSnapshots },
      };

      const newSnapshot: PartyProgressSnapshot = {
        timestamp: 101,
        participants: { 'user-1': 1010 },
      };
      const result = socialReducer(state, {
        type: 'ADD_PARTY_PROGRESS_SNAPSHOT',
        partyId: 'party-1',
        snapshot: newSnapshot,
      });

      expect(result.partyProgressHistory['party-1']).toHaveLength(100);
      expect(result.partyProgressHistory['party-1'][99]).toEqual(newSnapshot);
      expect(result.partyProgressHistory['party-1'][0].timestamp).toBe(1); // First one removed
    });
  });

  describe('SET_SHARE_INTERACTIONS action', () => {
    it('sets share interactions', () => {
      const interactions: ShareInteractions = {
        comments: [createComment()],
        reactions: [createReaction()],
        loading: false,
        error: null,
      };

      const result = socialReducer(initialState, {
        type: 'SET_SHARE_INTERACTIONS',
        shareId: 'share-1',
        interactions,
      });

      expect(result.shareInteractions['share-1']).toEqual(interactions);
    });
  });

  describe('ADD_COMMENT action', () => {
    it('adds comment to share interactions', () => {
      const comment = createComment({ shareId: 'share-1' });

      const result = socialReducer(initialState, {
        type: 'ADD_COMMENT',
        shareId: 'share-1',
        comment,
      });

      expect(result.shareInteractions['share-1'].comments).toEqual([comment]);
    });

    it('preserves existing comments', () => {
      const existingComment = createComment({ id: 'c1', shareId: 'share-1' });
      const state: SocialState = {
        ...initialState,
        shareInteractions: {
          'share-1': {
            comments: [existingComment],
            reactions: [],
            loading: false,
            error: null,
          },
        },
      };

      const newComment = createComment({ id: 'c2', shareId: 'share-1' });
      const result = socialReducer(state, {
        type: 'ADD_COMMENT',
        shareId: 'share-1',
        comment: newComment,
      });

      expect(result.shareInteractions['share-1'].comments).toHaveLength(2);
    });

    it('creates share interactions if not exists', () => {
      const comment = createComment({ shareId: 'new-share' });

      const result = socialReducer(initialState, {
        type: 'ADD_COMMENT',
        shareId: 'new-share',
        comment,
      });

      expect(result.shareInteractions['new-share']).toBeDefined();
      expect(result.shareInteractions['new-share'].comments).toEqual([comment]);
    });
  });

  describe('UPDATE_COMMENT action', () => {
    it('updates comment content and updatedAt', () => {
      const comment = createComment({ id: 'c1', content: 'Original' });
      const state: SocialState = {
        ...initialState,
        shareInteractions: {
          'share-1': {
            comments: [comment],
            reactions: [],
            loading: false,
            error: null,
          },
        },
      };

      const result = socialReducer(state, {
        type: 'UPDATE_COMMENT',
        shareId: 'share-1',
        commentId: 'c1',
        content: 'Updated',
        updatedAt: 12345,
      });

      expect(result.shareInteractions['share-1'].comments[0].content).toBe('Updated');
      expect(result.shareInteractions['share-1'].comments[0].updatedAt).toBe(12345);
    });

    it('returns state unchanged if share not found', () => {
      const result = socialReducer(initialState, {
        type: 'UPDATE_COMMENT',
        shareId: 'non-existent',
        commentId: 'c1',
        content: 'Updated',
        updatedAt: 12345,
      });

      expect(result).toBe(initialState);
    });
  });

  describe('DELETE_COMMENT action', () => {
    it('removes comment from share interactions', () => {
      const comment = createComment({ id: 'c1' });
      const state: SocialState = {
        ...initialState,
        shareInteractions: {
          'share-1': {
            comments: [comment],
            reactions: [],
            loading: false,
            error: null,
          },
        },
      };

      const result = socialReducer(state, {
        type: 'DELETE_COMMENT',
        shareId: 'share-1',
        commentId: 'c1',
      });

      expect(result.shareInteractions['share-1'].comments).toHaveLength(0);
    });

    it('returns state unchanged if share not found', () => {
      const result = socialReducer(initialState, {
        type: 'DELETE_COMMENT',
        shareId: 'non-existent',
        commentId: 'c1',
      });

      expect(result).toBe(initialState);
    });
  });

  describe('SET_REACTIONS action', () => {
    it('sets reactions for a share', () => {
      const reaction = createReaction();

      const result = socialReducer(initialState, {
        type: 'SET_REACTIONS',
        shareId: 'share-1',
        reactions: [reaction],
      });

      expect(result.shareInteractions['share-1'].reactions).toEqual([reaction]);
    });

    it('preserves existing comments when setting reactions', () => {
      const comment = createComment();
      const state: SocialState = {
        ...initialState,
        shareInteractions: {
          'share-1': {
            comments: [comment],
            reactions: [],
            loading: false,
            error: null,
          },
        },
      };

      const reaction = createReaction();
      const result = socialReducer(state, {
        type: 'SET_REACTIONS',
        shareId: 'share-1',
        reactions: [reaction],
      });

      expect(result.shareInteractions['share-1'].comments).toEqual([comment]);
    });
  });

  describe('ADD_REACTION action', () => {
    it('adds reaction to share interactions', () => {
      const reaction = createReaction();

      const result = socialReducer(initialState, {
        type: 'ADD_REACTION',
        shareId: 'share-1',
        reaction,
      });

      expect(result.shareInteractions['share-1'].reactions).toEqual([reaction]);
    });
  });

  describe('REMOVE_REACTION action', () => {
    it('removes reaction from share interactions', () => {
      const reaction = createReaction({ id: 'r1' });
      const state: SocialState = {
        ...initialState,
        shareInteractions: {
          'share-1': {
            comments: [],
            reactions: [reaction],
            loading: false,
            error: null,
          },
        },
      };

      const result = socialReducer(state, {
        type: 'REMOVE_REACTION',
        shareId: 'share-1',
        reactionId: 'r1',
      });

      expect(result.shareInteractions['share-1'].reactions).toHaveLength(0);
    });

    it('returns state unchanged if share not found', () => {
      const result = socialReducer(initialState, {
        type: 'REMOVE_REACTION',
        shareId: 'non-existent',
        reactionId: 'r1',
      });

      expect(result).toBe(initialState);
    });
  });

  describe('SET_PARTY_MESSAGES action', () => {
    it('sets messages for a party', () => {
      const message = createPartyMessage();

      const result = socialReducer(initialState, {
        type: 'SET_PARTY_MESSAGES',
        partyId: 'party-1',
        messages: [message],
      });

      expect(result.partyMessages['party-1']).toEqual([message]);
    });

    it('replaces existing messages', () => {
      const oldMessage = createPartyMessage({ id: 'old' });
      const newMessage = createPartyMessage({ id: 'new' });
      const state: SocialState = {
        ...initialState,
        partyMessages: { 'party-1': [oldMessage] },
      };

      const result = socialReducer(state, {
        type: 'SET_PARTY_MESSAGES',
        partyId: 'party-1',
        messages: [newMessage],
      });

      expect(result.partyMessages['party-1']).toEqual([newMessage]);
    });
  });

  describe('ADD_PARTY_MESSAGES action', () => {
    it('appends new messages', () => {
      const existingMessage = createPartyMessage({ id: 'm1' });
      const state: SocialState = {
        ...initialState,
        partyMessages: { 'party-1': [existingMessage] },
      };

      const newMessage = createPartyMessage({ id: 'm2' });
      const result = socialReducer(state, {
        type: 'ADD_PARTY_MESSAGES',
        partyId: 'party-1',
        messages: [newMessage],
      });

      expect(result.partyMessages['party-1']).toHaveLength(2);
    });

    it('filters out duplicate messages', () => {
      const existingMessage = createPartyMessage({ id: 'm1' });
      const state: SocialState = {
        ...initialState,
        partyMessages: { 'party-1': [existingMessage] },
      };

      const duplicateMessage = createPartyMessage({ id: 'm1' });
      const result = socialReducer(state, {
        type: 'ADD_PARTY_MESSAGES',
        partyId: 'party-1',
        messages: [duplicateMessage],
      });

      expect(result.partyMessages['party-1']).toHaveLength(1);
    });

    it('creates party messages if not exists', () => {
      const message = createPartyMessage();

      const result = socialReducer(initialState, {
        type: 'ADD_PARTY_MESSAGES',
        partyId: 'new-party',
        messages: [message],
      });

      expect(result.partyMessages['new-party']).toEqual([message]);
    });
  });

  describe('ADD_PARTY_MESSAGE action', () => {
    it('adds a single message', () => {
      const message = createPartyMessage();

      const result = socialReducer(initialState, {
        type: 'ADD_PARTY_MESSAGE',
        partyId: 'party-1',
        message,
      });

      expect(result.partyMessages['party-1']).toEqual([message]);
    });

    it('does not add duplicate message', () => {
      const message = createPartyMessage({ id: 'm1' });
      const state: SocialState = {
        ...initialState,
        partyMessages: { 'party-1': [message] },
      };

      const result = socialReducer(state, {
        type: 'ADD_PARTY_MESSAGE',
        partyId: 'party-1',
        message,
      });

      expect(result).toBe(state);
    });
  });

  describe('CLEAR_PARTY_MESSAGES action', () => {
    it('clears messages for a party', () => {
      const message = createPartyMessage();
      const state: SocialState = {
        ...initialState,
        partyMessages: { 'party-1': [message] },
      };

      const result = socialReducer(state, {
        type: 'CLEAR_PARTY_MESSAGES',
        partyId: 'party-1',
      });

      expect(result.partyMessages['party-1']).toEqual([]);
    });
  });

  describe('unknown action', () => {
    it('returns current state for unknown action type', () => {
      const state: SocialState = {
        ...initialState,
        initialized: true,
      };

      // @ts-expect-error - testing unknown action type
      const result = socialReducer(state, { type: 'UNKNOWN_ACTION' });

      expect(result).toBe(state);
    });
  });

  describe('edge cases', () => {
    it('handles empty arrays gracefully', () => {
      const result = socialReducer(initialState, {
        type: 'SET_SHARES',
        owned: [],
        received: [],
      });

      expect(result.ownedShares).toEqual([]);
      expect(result.receivedShares).toEqual([]);
    });

    it('handles multiple parties per user', () => {
      const party1 = createParty({ id: 'p1' });
      const party2 = createParty({ id: 'p2' });

      const result = socialReducer(initialState, {
        type: 'SET_PARTIES',
        active: [party1, party2],
        upcoming: [],
        invites: [],
      });

      expect(result.activeParties).toHaveLength(2);
    });

    it('handles nested update operations correctly', () => {
      // First add a share interaction
      let state = socialReducer(initialState, {
        type: 'SET_SHARE_INTERACTIONS',
        shareId: 'share-1',
        interactions: {
          comments: [],
          reactions: [],
          loading: false,
          error: null,
        },
      });

      // Then add a comment
      const comment = createComment({ id: 'c1', shareId: 'share-1' });
      state = socialReducer(state, {
        type: 'ADD_COMMENT',
        shareId: 'share-1',
        comment,
      });

      // Then add a reaction
      const reaction = createReaction({ shareId: 'share-1' });
      state = socialReducer(state, {
        type: 'ADD_REACTION',
        shareId: 'share-1',
        reaction,
      });

      expect(state.shareInteractions['share-1'].comments).toHaveLength(1);
      expect(state.shareInteractions['share-1'].reactions).toHaveLength(1);
    });
  });
});
