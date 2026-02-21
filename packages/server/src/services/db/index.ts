/**
 * Database module - Re-exports all database operations from domain modules
 */

// Connection management
export {
  initDatabase,
  closeDatabase,
  getPool,
  withClient,
  withTransaction,
} from './connection';

// User operations
export {
  DbUser,
  DbAuthToken,
  DbProjectData,
  createUser,
  getUserByUsername,
  getUserById,
  updateUser,
  updateLastSeen,
  updateEncryptionPublicKey,
  softDeleteUser,
  updateUserAvatar,
  deleteUserAvatar,
  searchUsers,
  createAuthToken,
  getAuthToken,
  revokeAuthToken,
  upsertProjectData,
  getProjectData,
  getCreatorInfo,
} from './users';

// Friend operations
export {
  DbFriendRequest,
  DbFriendship,
  createFriendRequest,
  getFriendRequest,
  getPendingFriendRequests,
  getSentFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getFriends,
  areFriends,
  filterFriends,
  removeFriend,
  countPendingFriendRequests,
} from './friends';

// Party operations
export {
  PartyStatus,
  DbParty,
  DbPartyParticipant,
  DbPartyInvite,
  createParty,
  getPartyById,
  getPartyByJoinCode,
  getActivePartiesForUser,
  getUpcomingPartiesForUser,
  getPartyHistoryForUser,
  startParty,
  endParty,
  cancelParty,
  addPartyParticipant,
  getPartyParticipants,
  updateParticipantProgress,
  leaveParty,
  isParticipant,
  createPartyInvite,
  createPartyInvitesBatch,
  getPendingInvitesForUser,
  respondToInvite,
  countActivePartiesForUser,
} from './parties';

// Share operations
export {
  DbProjectShare,
  DbShareComment,
  DbShareReaction,
  createProjectShare,
  updateProjectShare,
  getProjectSharesOwned,
  getProjectSharesReceived,
  getProjectShare,
  revokeProjectShare,
  getShareByOwnerAndRecipient,
  countUserShares,
  createShareComment,
  getShareComments,
  getShareComment,
  updateShareComment,
  deleteShareComment,
  countShareComments,
  addShareReaction,
  removeShareReaction,
  getShareReactions,
  getShareReaction,
  countShareReactions,
} from './shares';

// Party message operations
export {
  DbPartyMessage,
  createPartyMessage,
  getPartyMessages,
  deletePartyMessages,
  countPartyMessages,
  deleteOldestPartyMessages,
} from './messages';
