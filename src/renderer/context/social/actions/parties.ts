/**
 * Party-related actions for the Social Context
 */

import type { Party } from '@maplume/shared';
import type { SocialState, SocialAction, PartyProgressSnapshot } from '../types';
import { apiClient } from '../../../services/api';

export interface PartyActions {
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
}

export function createPartyActions(
  state: SocialState,
  dispatch: React.Dispatch<SocialAction>
): PartyActions {
  // Refresh parties state
  const refreshParties = async (): Promise<void> => {
    if (!state.user || !state.isOnline) return;

    try {
      const response = await apiClient.getParties();
      // Filter to only include active parties (not ended)
      const activeParties = response.active.filter((p: Party) => p.status === 'active');
      dispatch({ type: 'SET_PARTIES', active: activeParties, upcoming: response.upcoming, invites: response.invites });
    } catch (error) {
      console.error('Failed to refresh parties:', error);
    }
  };

  // Create a new party
  const createParty = async (
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
  };

  // Join party by code
  const joinPartyByCode = async (code: string, startWordCount = 0): Promise<Party> => {
    const response = await apiClient.joinPartyByCode(code, startWordCount);
    await refreshParties();
    return response.party;
  };

  // Join party by invite
  const joinPartyByInvite = async (
    partyId: string,
    inviteId: string,
    startWordCount = 0
  ): Promise<Party> => {
    const response = await apiClient.joinPartyByInvite(partyId, inviteId, startWordCount);
    await refreshParties();
    return response.party;
  };

  // Leave party
  const leaveParty = async (partyId: string): Promise<void> => {
    await apiClient.leaveParty(partyId);
    await refreshParties();
  };

  // Update party progress
  const updatePartyProgress = async (partyId: string, currentWordCount: number): Promise<number> => {
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
  };

  // End party
  const endParty = async (partyId: string): Promise<Party> => {
    const response = await apiClient.endParty(partyId);
    await refreshParties();
    return response.party;
  };

  // Start a scheduled party
  const startParty = async (partyId: string): Promise<Party> => {
    const response = await apiClient.startParty(partyId);
    await refreshParties();
    return response.party;
  };

  // Invite friends to party
  const inviteToParty = async (partyId: string, friendIds: string[]): Promise<void> => {
    await apiClient.inviteToParty(partyId, friendIds);
  };

  // Decline party invite
  const declinePartyInvite = async (inviteId: string): Promise<void> => {
    await apiClient.declinePartyInvite(inviteId);
    await refreshParties();
  };

  // Get party history
  const getPartyHistory = async (): Promise<Party[]> => {
    const response = await apiClient.getPartyHistory();
    return response.parties;
  };

  // Get party details with participants
  const getPartyDetails = async (partyId: string): Promise<Party | null> => {
    try {
      const response = await apiClient.getParty(partyId);
      return response.party;
    } catch (error) {
      console.error('Failed to get party details:', error);
      return null;
    }
  };

  return {
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
  };
}
