/**
 * Party message and share interaction actions for the Social Context
 */

import type { PartyMessage, ShareReaction, ReactionCount } from '@maplume/shared';
import type { SocialState, SocialAction, DecryptedComment } from '../types';
import { base64ToUint8Array } from '../types';
import { apiClient } from '../../../services/api';
import {
  deriveShareKey,
  encryptComment,
  decryptComment,
} from '../../../services/crypto';

export interface MessageActions {
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
}

export function createMessageActions(
  state: SocialState,
  dispatch: React.Dispatch<SocialAction>
): MessageActions {
  // ============ Share Interactions (Comments & Reactions) ============

  // Load all comments and reactions for a share
  const loadShareInteractions = async (
    shareId: string,
    ownerPublicKey: string
  ): Promise<void> => {
    if (!state.keyBundle) {
      throw new Error('Not logged in');
    }

    dispatch({
      type: 'SET_SHARE_INTERACTIONS',
      shareId,
      interactions: { comments: [], reactions: [], loading: true, error: null },
    });

    try {
      // Derive the shared key for decryption
      const theirPublicKey = base64ToUint8Array(ownerPublicKey);
      const shareKey = deriveShareKey(
        state.keyBundle.encryptionKeyPair.privateKey,
        theirPublicKey,
        shareId
      );

      // Fetch comments and reactions in parallel
      const [commentsResponse, reactionsResponse] = await Promise.all([
        apiClient.getComments(shareId),
        apiClient.getReactions(shareId),
      ]);

      // Decrypt comments
      const decryptedComments: DecryptedComment[] = commentsResponse.comments.map(c => {
        try {
          const content = decryptComment(c.encryptedContent, c.nonce, shareKey);
          return {
            id: c.id,
            shareId: c.shareId,
            author: c.author,
            targetType: c.targetType,
            targetId: c.targetId,
            content,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          };
        } catch {
          // If decryption fails, show placeholder
          return {
            id: c.id,
            shareId: c.shareId,
            author: c.author,
            targetType: c.targetType,
            targetId: c.targetId,
            content: '[Unable to decrypt]',
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          };
        }
      });

      dispatch({
        type: 'SET_SHARE_INTERACTIONS',
        shareId,
        interactions: {
          comments: decryptedComments,
          reactions: reactionsResponse.reactions,
          loading: false,
          error: null,
        },
      });
    } catch (error) {
      console.error('Failed to load share interactions:', error);
      dispatch({
        type: 'SET_SHARE_INTERACTIONS',
        shareId,
        interactions: {
          comments: [],
          reactions: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load',
        },
      });
    }
  };

  // Create a comment
  const createShareComment = async (
    shareId: string,
    targetType: 'entry' | 'note',
    targetId: string,
    content: string,
    ownerPublicKey: string
  ): Promise<DecryptedComment> => {
    if (!state.keyBundle || !state.user) {
      throw new Error('Not logged in');
    }

    // Derive the shared key for encryption
    const theirPublicKey = base64ToUint8Array(ownerPublicKey);
    const shareKey = deriveShareKey(
      state.keyBundle.encryptionKeyPair.privateKey,
      theirPublicKey,
      shareId
    );

    // Encrypt the comment
    const { encryptedContent, nonce } = encryptComment(content, shareKey);

    // Send to server
    const response = await apiClient.createComment(shareId, {
      targetType,
      targetId,
      encryptedContent,
      nonce,
    });

    // Create decrypted comment for local state
    const decryptedComment: DecryptedComment = {
      id: response.comment.id,
      shareId: response.comment.shareId,
      author: response.comment.author,
      targetType: response.comment.targetType,
      targetId: response.comment.targetId,
      content,
      createdAt: response.comment.createdAt,
      updatedAt: response.comment.updatedAt,
    };

    dispatch({ type: 'ADD_COMMENT', shareId, comment: decryptedComment });

    return decryptedComment;
  };

  // Update a comment
  const updateShareComment = async (
    shareId: string,
    commentId: string,
    content: string,
    ownerPublicKey: string
  ): Promise<void> => {
    if (!state.keyBundle) {
      throw new Error('Not logged in');
    }

    // Derive the shared key for encryption
    const theirPublicKey = base64ToUint8Array(ownerPublicKey);
    const shareKey = deriveShareKey(
      state.keyBundle.encryptionKeyPair.privateKey,
      theirPublicKey,
      shareId
    );

    // Encrypt the updated content
    const { encryptedContent, nonce } = encryptComment(content, shareKey);

    // Send to server
    await apiClient.updateComment(shareId, commentId, { encryptedContent, nonce });

    // Update local state
    dispatch({
      type: 'UPDATE_COMMENT',
      shareId,
      commentId,
      content,
      updatedAt: Date.now(),
    });
  };

  // Delete a comment
  const deleteShareComment = async (
    shareId: string,
    commentId: string
  ): Promise<void> => {
    await apiClient.deleteComment(shareId, commentId);
    dispatch({ type: 'DELETE_COMMENT', shareId, commentId });
  };

  // Add a reaction
  const addShareReaction = async (
    shareId: string,
    targetType: 'entry' | 'note' | 'comment',
    targetId: string,
    emoji: string
  ): Promise<string> => {
    if (!state.user) {
      throw new Error('Not logged in');
    }

    const response = await apiClient.addReaction(shareId, { targetType, targetId, emoji });

    // Add to local state
    const reaction: ShareReaction = {
      id: response.reactionId,
      shareId,
      author: { id: state.user.id, username: state.user.username },
      targetType,
      targetId,
      emoji,
      createdAt: Date.now(),
    };

    dispatch({ type: 'ADD_REACTION', shareId, reaction });

    return response.reactionId;
  };

  // Remove a reaction
  const removeShareReaction = async (
    shareId: string,
    reactionId: string
  ): Promise<void> => {
    await apiClient.removeReaction(shareId, reactionId);
    dispatch({ type: 'REMOVE_REACTION', shareId, reactionId });
  };

  // Get reaction counts for a specific target
  const getReactionCounts = (
    shareId: string,
    targetType: 'entry' | 'note' | 'comment',
    targetId: string
  ): ReactionCount[] => {
    const interactions = state.shareInteractions[shareId];
    if (!interactions) return [];

    const targetReactions = interactions.reactions.filter(
      r => r.targetType === targetType && r.targetId === targetId
    );

    // Group by emoji
    const counts = new Map<string, { count: number; userReacted: boolean; reactionId?: string }>();
    for (const r of targetReactions) {
      const existing = counts.get(r.emoji) || { count: 0, userReacted: false };
      existing.count++;
      if (state.user && r.author.id === state.user.id) {
        existing.userReacted = true;
        existing.reactionId = r.id;
      }
      counts.set(r.emoji, existing);
    }

    return Array.from(counts.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      userReacted: data.userReacted,
      reactionId: data.reactionId,
    }));
  };

  // ============ Party Messages (Ephemeral Chat) ============

  // Send a message to party chat
  const sendPartyMessage = async (
    partyId: string,
    content: string
  ): Promise<PartyMessage> => {
    if (!state.user) {
      throw new Error('Not logged in');
    }

    const response = await apiClient.sendPartyMessage(partyId, content);
    dispatch({ type: 'ADD_PARTY_MESSAGE', partyId, message: response.message });
    return response.message;
  };

  // Fetch messages from server (for initial load or polling)
  const fetchPartyMessages = async (
    partyId: string,
    since?: number
  ): Promise<PartyMessage[]> => {
    const response = await apiClient.getPartyMessages(partyId, since);

    if (since !== undefined && since > 0) {
      // Polling - append new messages
      dispatch({ type: 'ADD_PARTY_MESSAGES', partyId, messages: response.messages });
    } else {
      // Initial load - replace all messages
      dispatch({ type: 'SET_PARTY_MESSAGES', partyId, messages: response.messages });
    }

    return response.messages;
  };

  // Get messages from local state
  const getPartyMessagesLocal = (partyId: string): PartyMessage[] => {
    return state.partyMessages[partyId] || [];
  };

  // Clear messages (when leaving party or party ends)
  const clearPartyMessages = (partyId: string): void => {
    dispatch({ type: 'CLEAR_PARTY_MESSAGES', partyId });
  };

  return {
    loadShareInteractions,
    createComment: createShareComment,
    updateComment: updateShareComment,
    deleteComment: deleteShareComment,
    addReaction: addShareReaction,
    removeReaction: removeShareReaction,
    getReactionCounts,
    sendPartyMessage,
    fetchPartyMessages,
    getPartyMessages: getPartyMessagesLocal,
    clearPartyMessages,
  };
}
