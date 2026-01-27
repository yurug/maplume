// Social feature types for MaPlume

// User profile on the server
export interface User {
  id: string;
  username: string;
  avatarPreset: string | null;
  bio: string | null;
  statsPublic: boolean;
  searchable: boolean;
  createdAt: number; // Unix timestamp
}

// Local user state (includes keys in memory)
export interface LocalUser extends User {
  publicKey: string; // Base64 encoded Ed25519 public key
}

// Encrypted blob stored on server
export interface EncryptedBlob {
  ciphertext: string; // Base64 encoded
  nonce: string; // Base64 encoded
  version: number; // Encryption version for future compatibility
}

// Sync operation to be queued
export interface SyncOperation {
  id: string;
  type: 'project_sync' | 'profile_update';
  payload: string; // JSON stringified data
  createdAt: number;
  retryCount: number;
}

// Key bundle derived from seed phrase
export interface KeyBundle {
  identityKeyPair: {
    publicKey: Uint8Array; // Ed25519 public key
    privateKey: Uint8Array; // Ed25519 private key
  };
  encryptionKeyPair: {
    publicKey: Uint8Array; // X25519 public key
    privateKey: Uint8Array; // X25519 private key
  };
  localKey: Uint8Array; // AES-256 key for local encryption
}

// Server sync status
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

// Avatar presets available for selection
export const AVATAR_PRESETS = [
  'writer-1', 'writer-2', 'writer-3', 'writer-4',
  'quill-1', 'quill-2', 'quill-3', 'quill-4',
  'book-1', 'book-2', 'book-3', 'book-4',
  'cat-1', 'cat-2', 'owl-1', 'owl-2',
] as const;

export type AvatarPreset = typeof AVATAR_PRESETS[number];
