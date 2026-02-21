/**
 * SocialContext - Re-export from modular structure
 *
 * This file maintains backwards compatibility by re-exporting
 * from the refactored modular structure in ./social/
 */

export { SocialProvider, useSocial } from './social';
export type {
  SocialState,
  SocialContextValue,
  DecryptedComment,
  SharedProjectData,
  FriendWithKey,
  PartyProgressSnapshot,
  ShareInteractions,
  SocialAction,
} from './social';
