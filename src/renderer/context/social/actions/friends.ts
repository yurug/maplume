/**
 * Friend-related actions for the Social Context
 */

import type { SocialState, SocialAction, FriendWithKey } from '../types';
import { apiClient } from '../../../services/api';

export interface FriendActions {
  refreshFriends: () => Promise<void>;
  refreshFriendRequests: () => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
}

export function createFriendActions(
  state: SocialState,
  dispatch: React.Dispatch<SocialAction>
): FriendActions {
  // Refresh friends list with public keys
  const refreshFriends = async (): Promise<void> => {
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
  };

  // Refresh friend requests
  const refreshFriendRequests = async (): Promise<void> => {
    if (!state.user) return;

    try {
      const response = await apiClient.getFriendRequests();
      dispatch({
        type: 'SET_FRIEND_REQUESTS',
        received: response.received,
        sent: response.sent,
      });
    } catch (error) {
      console.error('Failed to refresh friend requests:', error);
    }
  };

  // Accept a friend request
  const acceptFriendRequest = async (requestId: string): Promise<void> => {
    await apiClient.acceptFriendRequest(requestId);
    await refreshFriendRequests();
    await refreshFriends();
  };

  // Reject a friend request
  const rejectFriendRequest = async (requestId: string): Promise<void> => {
    await apiClient.rejectFriendRequest(requestId);
    await refreshFriendRequests();
  };

  // Cancel a sent friend request
  const cancelFriendRequest = async (requestId: string): Promise<void> => {
    await apiClient.cancelFriendRequest(requestId);
    await refreshFriendRequests();
  };

  return {
    refreshFriends,
    refreshFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
  };
}
