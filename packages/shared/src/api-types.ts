// API request and response types

// Authentication
export interface RegisterRequest {
  username: string;
  publicKey: string; // Base64 encoded Ed25519 public key
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
  bio?: string; // Encrypted by client
  statsPublic?: boolean;
  searchable?: boolean;
}

export interface UserProfileResponse {
  id: string;
  username: string;
  avatarPreset: string | null;
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
