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
