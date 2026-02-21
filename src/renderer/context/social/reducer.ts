/**
 * Social context reducer and initial state
 */

import type { SocialState, SocialAction } from './types';

// Initial state
export const initialState: SocialState = {
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

// Reducer
export function socialReducer(state: SocialState, action: SocialAction): SocialState {
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
      const existing = state.shareInteractions[action.shareId] || { comments: [], reactions: [], loading: false, error: null };
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
            comments: existing.comments.map(c =>
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
            comments: existing.comments.filter(c => c.id !== action.commentId),
          },
        },
      };
    }

    case 'SET_REACTIONS': {
      const existing = state.shareInteractions[action.shareId] || { comments: [], reactions: [], loading: false, error: null };
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
      const existing = state.shareInteractions[action.shareId] || { comments: [], reactions: [], loading: false, error: null };
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
            reactions: existing.reactions.filter(r => r.id !== action.reactionId),
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
      const existingIds = new Set(existingMessages.map(m => m.id));
      const newMessages = action.messages.filter(m => !existingIds.has(m.id));
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
      if (existingMessages.some(m => m.id === action.message.id)) {
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
