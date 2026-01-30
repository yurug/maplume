// Social feature types for MaPlume

// User profile on the server
export interface User {
  id: string;
  username: string;
  avatarPreset: string | null;  // Keep for backwards compatibility
  avatarData: AvatarData | null; // New comprehensive field
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

// Avatar presets available for selection (legacy)
export const AVATAR_PRESETS = [
  'writer-1', 'writer-2', 'writer-3', 'writer-4',
  'quill-1', 'quill-2', 'quill-3', 'quill-4',
  'book-1', 'book-2', 'book-3', 'book-4',
  'cat-1', 'cat-2', 'owl-1', 'owl-2',
] as const;

export type AvatarPreset = typeof AVATAR_PRESETS[number];

// ===== DiceBear Avatar System =====

// Available DiceBear styles (curated selection of the best ones)
export const DICEBEAR_STYLES = [
  'adventurer',        // Cute illustrated characters
  'adventurer-neutral', // Same but neutral expression
  'avataaars',         // Classic customizable avatars
  'big-ears',          // Cute characters with big ears
  'big-ears-neutral',  // Same but neutral
  'lorelei',           // Beautiful illustrated portraits
  'lorelei-neutral',   // Same but neutral
  'micah',             // Modern illustrated style
  'open-peeps',        // Hand-drawn illustrations
  'personas',          // Simple stylized characters
  'pixel-art',         // Retro pixel art style
  'pixel-art-neutral', // Same but neutral
  'thumbs',            // Fun thumbs up characters
  'bottts',            // Cute robot avatars
  'fun-emoji',         // Emoji-style faces
  'shapes',            // Abstract geometric shapes
] as const;

export type DiceBearStyle = typeof DICEBEAR_STYLES[number];

// Style metadata for the UI
export const DICEBEAR_STYLE_INFO: Record<DiceBearStyle, { name: string; description: string }> = {
  'adventurer': { name: 'Adventurer', description: 'Cute illustrated characters with accessories' },
  'adventurer-neutral': { name: 'Adventurer Neutral', description: 'Adventurer style with neutral expression' },
  'avataaars': { name: 'Avataaars', description: 'Classic highly customizable avatars' },
  'big-ears': { name: 'Big Ears', description: 'Adorable characters with big ears' },
  'big-ears-neutral': { name: 'Big Ears Neutral', description: 'Big ears with neutral expression' },
  'lorelei': { name: 'Lorelei', description: 'Beautiful illustrated portraits' },
  'lorelei-neutral': { name: 'Lorelei Neutral', description: 'Lorelei with neutral expression' },
  'micah': { name: 'Micah', description: 'Modern colorful illustrations' },
  'open-peeps': { name: 'Open Peeps', description: 'Hand-drawn illustration style' },
  'personas': { name: 'Personas', description: 'Simple stylized characters' },
  'pixel-art': { name: 'Pixel Art', description: 'Retro 8-bit pixel style' },
  'pixel-art-neutral': { name: 'Pixel Art Neutral', description: 'Pixel art with neutral expression' },
  'thumbs': { name: 'Thumbs', description: 'Fun thumbs up characters' },
  'bottts': { name: 'Bottts', description: 'Cute friendly robots' },
  'fun-emoji': { name: 'Fun Emoji', description: 'Expressive emoji faces' },
  'shapes': { name: 'Shapes', description: 'Abstract geometric patterns' },
};

// DiceBear avatar configuration
export interface DiceBearConfig {
  style: DiceBearStyle;
  seed: string;                    // Seed for randomization
  backgroundColor?: string;        // Background color (hex without #)
  backgroundType?: 'solid' | 'gradientLinear'; // Background type
  flip?: boolean;                  // Flip horizontally
  rotate?: number;                 // Rotation angle
  scale?: number;                  // Scale (50-200)
  radius?: number;                 // Border radius (0-50)
  // Style-specific options stored as JSON
  options?: Record<string, unknown>;
}

// Avatar types
export type AvatarType = 'preset' | 'custom' | 'dicebear' | 'uploaded';

// Legacy custom avatar config (kept for backwards compatibility)
export type FaceShape = 'round' | 'oval' | 'square' | 'heart';
export type HairStyle = 'short' | 'medium' | 'long' | 'curly' | 'wavy' | 'bun' | 'ponytail' | 'bald' | 'buzz' | 'mohawk' | 'spiky' | 'sideSweep' | 'twintails';
export type EyeStyle = 'default' | 'round' | 'almond' | 'narrow' | 'wide' | 'sparkle' | 'determined' | 'gentle';
export type AccessoryType = 'none' | 'glasses' | 'sunglasses' | 'hat' | 'headband' | 'earrings';

export interface CustomAvatarConfig {
  faceShape: FaceShape;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  eyes: EyeStyle;
  eyeColor: string;
  accessory: AccessoryType;
  backgroundColor: string;
}

// Unified avatar data structure
export interface AvatarData {
  type: AvatarType;
  preset?: string;              // For type='preset'
  custom?: CustomAvatarConfig;  // For type='custom' (legacy)
  dicebear?: DiceBearConfig;    // For type='dicebear' (new)
  uploadedUrl?: string;         // For type='uploaded' (data URL)
}

// Preset colors for the UI
export const SKIN_TONE_PRESETS = [
  '#FFDFC4', '#F0D5BE', '#D4A88E',
  '#C68E6E', '#8D5524', '#5C3836',
] as const;

export const HAIR_COLOR_PRESETS = [
  '#090806', '#2C222B', '#71635A', '#B7A69E',
  '#D6C4C2', '#B55239', '#8D4A43', '#E6E6E6',
] as const;

export const AVATAR_BG_PRESETS = [
  '#E8D5B7', '#C5CAE9', '#B2DFDB', '#FFCCBC',
  '#F3E5F5', '#E1F5FE', '#FFF9C4', '#DCEDC8',
  '#FFE0B2', '#D7CCC8', '#CFD8DC', '#F8BBD9',
] as const;

export const EYE_COLOR_PRESETS = [
  '#4A3728', '#1E3A5F', '#2D5A27', '#614051',
  '#89CFF0', '#FFB347', '#C41E3A', '#50C878',
] as const;

// Helper to create default DiceBear config
export function createDefaultDiceBearConfig(username: string = 'user'): DiceBearConfig {
  return {
    style: 'adventurer',
    seed: username,
    backgroundColor: 'b6e3f4',
    backgroundType: 'solid',
  };
}

// Helper to create default avatar data
export function createDefaultAvatarData(username: string = 'user'): AvatarData {
  return {
    type: 'dicebear',
    dicebear: createDefaultDiceBearConfig(username),
  };
}
