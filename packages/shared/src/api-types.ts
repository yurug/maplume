// API request and response types

// Authentication
export interface RegisterRequest {
  username: string;
  publicKey: string; // Base64 encoded Ed25519 public key
  encryptionPublicKey?: string; // Base64 encoded X25519 public key for project sharing
}

export interface RegisterResponse {
  userId: string;
}

export interface ChallengeResponse {
  challenge: string; // Random string to sign
  expiresAt: number; // Unix timestamp
}

export interface LoginRequest {
  username: string;
  challenge: string;
  signature: string; // Base64 encoded Ed25519 signature of challenge
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    avatarPreset: string | null;
    avatarData: import('./social-types').AvatarData | null;
  };
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

// Profile
export interface UpdateProfileRequest {
  avatarPreset?: string;
  avatarData?: import('./social-types').AvatarData;
  bio?: string; // Encrypted by client
  statsPublic?: boolean;
  searchable?: boolean;
  encryptionPublicKey?: string; // X25519 public key for project sharing
}

// Avatar Upload
export interface UploadAvatarRequest {
  imageData: string; // Base64 encoded image data
}

export interface UploadAvatarResponse {
  avatarData: import('./social-types').AvatarData;
}

export interface UserProfileResponse {
  id: string;
  username: string;
  avatarPreset: string | null;
  avatarData: import('./social-types').AvatarData | null;
  bio: string | null; // Encrypted
  statsPublic: boolean;
  searchable: boolean;
  createdAt: number;
}

// Project sync
export interface SyncProjectsRequest {
  encryptedBlob: string; // Base64 encoded encrypted project data
  blobHash: string; // SHA-256 hash for change detection
}

export interface SyncProjectsResponse {
  success: boolean;
  updatedAt: number;
}

export interface GetProjectsResponse {
  encryptedBlob: string | null;
  blobHash: string | null;
  updatedAt: number | null;
}

// Friends
export interface FriendUser {
  id: string;
  username: string;
  avatarPreset: string | null;
  avatarData?: import('./social-types').AvatarData | null;
  bio?: string | null;
  lastSeenAt?: number | null;
  publicKey?: string; // X25519 public key for encryption
}

export interface FriendRequest {
  id: string;
  fromUser?: FriendUser;
  toUser?: FriendUser;
  message?: string | null;
  createdAt: number;
}

export interface GetFriendsResponse {
  friends: FriendUser[];
}

export interface GetFriendRequestsResponse {
  received: FriendRequest[];
  sent: FriendRequest[];
}

export interface SendFriendRequestRequest {
  username: string;
  message?: string;
}

export interface SendFriendRequestResponse {
  requestId?: string;
  autoAccepted?: boolean;
}

export interface AcceptFriendRequestRequest {
  requestId: string;
}

export interface RejectFriendRequestRequest {
  requestId: string;
}

export interface CancelFriendRequestRequest {
  requestId: string;
}

// Project Sharing
export interface SharedProjectInfo {
  id: string;
  projectLocalId: string;
  shareType: 'full' | 'stats_only';
  owner?: FriendUser;
  sharedWith?: FriendUser;
  createdAt: number;
  updatedAt: number;
}

export interface CreateShareRequest {
  sharedWithId: string;
  projectLocalId: string;
  shareType: 'full' | 'stats_only';
  encryptedData: string;
  ephemeralPublicKey: string;
  dataHash: string;
}

export interface CreateShareResponse {
  shareId: string;
}

export interface GetOwnedSharesResponse {
  shares: SharedProjectInfo[];
}

export interface GetReceivedSharesResponse {
  shares: SharedProjectInfo[];
}

export interface GetShareDataResponse {
  share: SharedProjectInfo;
  encryptedData: string | null;
  ephemeralPublicKey: string | null;
}

// Writing Parties
export type PartyStatus = 'scheduled' | 'active' | 'ended' | 'cancelled';

export interface PartyParticipant {
  id: string;
  username: string;
  avatarPreset: string | null;
  avatarData?: import('./social-types').AvatarData | null;
  wordsWritten: number;
  startWordCount: number;
  currentWordCount: number;
  joinedAt: number;
  lastUpdate: number | null;
  isCreator: boolean;
}

export interface Party {
  id: string;
  title: string;
  creator: { id: string; username: string; avatarPreset: string | null; avatarData?: import('./social-types').AvatarData | null };
  scheduledStart: number | null;
  actualStart: number | null;
  durationMinutes: number;
  endedAt: number | null;
  joinCode: string | null;
  rankingEnabled: boolean;
  status: PartyStatus;
  participantCount: number;
  participants?: PartyParticipant[];
  isParticipating?: boolean;
}

export interface PartyInvite {
  id: string;
  party: {
    id: string;
    title: string;
    creator: { id: string; username: string; avatarPreset: string | null; avatarData?: import('./social-types').AvatarData | null };
    scheduledStart: number | null;
    durationMinutes: number;
    status: PartyStatus;
  };
  invitedBy: { id: string; username: string; avatarPreset: string | null; avatarData?: import('./social-types').AvatarData | null };
  createdAt: number;
}

export interface CreatePartyRequest {
  title: string;
  durationMinutes: number;
  scheduledStart?: number | null;
  rankingEnabled?: boolean;
  inviteFriendIds?: string[];
}

export interface CreatePartyResponse {
  party: Party;
}

export interface GetPartiesResponse {
  active: Party[];
  upcoming: Party[];
  invites: PartyInvite[];
}

export interface GetPartyHistoryResponse {
  parties: Party[];
}

export interface JoinPartyByCodeResponse {
  party: Party;
}

export interface UpdatePartyProgressRequest {
  currentWordCount: number;
}

export interface UpdatePartyProgressResponse {
  success: boolean;
  wordsWritten: number;
}

export interface InviteToPartyRequest {
  friendIds: string[];
}

// Share Comments and Reactions
export interface ShareCommentAuthor {
  id: string;
  username: string;
  avatarPreset: string | null;
  avatarData?: import('./social-types').AvatarData | null;
}

export interface ShareComment {
  id: string;
  shareId: string;
  author: ShareCommentAuthor;
  targetType: 'entry' | 'note';
  targetId: string;
  encryptedContent: string;
  nonce: string;
  createdAt: number;
  updatedAt: number;
}

export interface ShareReaction {
  id: string;
  shareId: string;
  author: { id: string; username: string };
  targetType: 'entry' | 'note' | 'comment';
  targetId: string;
  emoji: string;
  createdAt: number;
}

export interface ReactionCount {
  emoji: string;
  count: number;
  userReacted: boolean;
  reactionId?: string; // ID of user's reaction, if they reacted
}

// Comment requests/responses
export interface CreateCommentRequest {
  targetType: 'entry' | 'note';
  targetId: string;
  encryptedContent: string;
  nonce: string;
}

export interface CreateCommentResponse {
  comment: ShareComment;
}

export interface GetCommentsResponse {
  comments: ShareComment[];
}

export interface UpdateCommentRequest {
  encryptedContent: string;
  nonce: string;
}

// Reaction requests/responses
export interface AddReactionRequest {
  targetType: 'entry' | 'note' | 'comment';
  targetId: string;
  emoji: string;
}

export interface AddReactionResponse {
  reactionId: string;
}

export interface GetReactionsResponse {
  reactions: ShareReaction[];
}

// Error response
export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

// API response wrapper
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };
