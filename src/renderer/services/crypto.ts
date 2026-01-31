/**
 * CryptoService - End-to-end encryption for MaPlume social features
 *
 * Uses:
 * - BIP39 for seed phrase generation (24 words)
 * - Ed25519 for identity/signing (via @noble/curves)
 * - X25519 for key exchange (via @noble/curves)
 * - AES-256-GCM for symmetric encryption (via @noble/ciphers)
 * - Argon2 for key derivation (via @noble/hashes)
 * - Pako for compression
 */

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8, randomBytes } from '@noble/ciphers/utils.js';
import pako from 'pako';
import type { KeyBundle, EncryptedBlob } from '@maplume/shared';

// Constants for key derivation
const IDENTITY_KEY_INFO = 'maplume-identity-v1';
const ENCRYPTION_KEY_INFO = 'maplume-encryption-v1';
const LOCAL_KEY_INFO = 'maplume-local-v1';
const ENCRYPTION_VERSION = 1;

/**
 * Generate a new 24-word BIP39 seed phrase
 */
export function generateSeedPhrase(): string[] {
  const mnemonic = generateMnemonic(wordlist, 256); // 256 bits = 24 words
  return mnemonic.split(' ');
}

/**
 * Validate a seed phrase
 */
export function validateSeedPhrase(words: string[]): boolean {
  const mnemonic = words.join(' ');
  return validateMnemonic(mnemonic, wordlist);
}

/**
 * Derive all keys from a seed phrase
 */
export function deriveKeys(seedPhrase: string[]): KeyBundle {
  const mnemonic = seedPhrase.join(' ');

  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new Error('Invalid seed phrase');
  }

  // Get master seed from mnemonic
  const masterSeed = mnemonicToSeedSync(mnemonic);

  // Derive identity key (Ed25519 for signing)
  const identityMaterial = hkdf(sha256, masterSeed, undefined, utf8ToBytes(IDENTITY_KEY_INFO), 32);
  const identityPrivateKey = identityMaterial;
  const identityPublicKey = ed25519.getPublicKey(identityPrivateKey);

  // Derive encryption key (X25519 for key exchange)
  const encryptionMaterial = hkdf(sha256, masterSeed, undefined, utf8ToBytes(ENCRYPTION_KEY_INFO), 32);
  const encryptionPrivateKey = encryptionMaterial;
  const encryptionPublicKey = x25519.getPublicKey(encryptionPrivateKey);

  // Derive local encryption key (AES-256 for local data)
  const localKey = hkdf(sha256, masterSeed, undefined, utf8ToBytes(LOCAL_KEY_INFO), 32);

  return {
    identityKeyPair: {
      publicKey: identityPublicKey,
      privateKey: identityPrivateKey,
    },
    encryptionKeyPair: {
      publicKey: encryptionPublicKey,
      privateKey: encryptionPrivateKey,
    },
    localKey,
  };
}

/**
 * Sign data with Ed25519 private key
 */
export function sign(data: Uint8Array, privateKey: Uint8Array): Uint8Array {
  return ed25519.sign(data, privateKey);
}

/**
 * Verify Ed25519 signature
 */
export function verify(data: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
  try {
    return ed25519.verify(signature, data, publicKey);
  } catch {
    return false;
  }
}

/**
 * Encrypt data with AES-256-GCM
 */
export function encrypt(data: Uint8Array, key: Uint8Array): EncryptedBlob {
  const nonce = randomBytes(12); // 96-bit nonce for GCM
  const cipher = gcm(key, nonce);
  const ciphertext = cipher.encrypt(data);

  return {
    ciphertext: bytesToBase64(ciphertext),
    nonce: bytesToBase64(nonce),
    version: ENCRYPTION_VERSION,
  };
}

/**
 * Decrypt data with AES-256-GCM
 */
export function decrypt(blob: EncryptedBlob, key: Uint8Array): Uint8Array {
  if (blob.version !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption version: ${blob.version}`);
  }

  const ciphertext = base64ToBytes(blob.ciphertext);
  const nonce = base64ToBytes(blob.nonce);

  const cipher = gcm(key, nonce);
  return cipher.decrypt(ciphertext);
}

/**
 * Compress and encrypt JSON data
 * Returns a base64-encoded string containing the encrypted blob
 */
export function compressAndEncrypt(data: object, key: Uint8Array): string {
  // Serialize to JSON
  const json = JSON.stringify(data);

  // Compress with gzip
  const compressed = pako.gzip(json);

  // Encrypt
  const blob = encrypt(compressed, key);

  // Serialize blob to JSON and base64 encode
  return bytesToBase64(utf8ToBytes(JSON.stringify(blob)));
}

/**
 * Decrypt and decompress data
 * Takes a base64-encoded string containing the encrypted blob
 */
export function decryptAndDecompress<T = unknown>(encryptedData: string, key: Uint8Array): T {
  // Decode base64 and parse blob
  const blobJson = bytesToUtf8(base64ToBytes(encryptedData));
  const blob: EncryptedBlob = JSON.parse(blobJson);

  // Decrypt
  const compressed = decrypt(blob, key);

  // Decompress
  const json = pako.ungzip(compressed, { to: 'string' });

  // Parse JSON
  return JSON.parse(json) as T;
}

/**
 * Encrypt data for a specific recipient using X25519 key exchange
 */
export function encryptForRecipient(
  data: Uint8Array,
  recipientPublicKey: Uint8Array,
  senderPrivateKey: Uint8Array
): { ephemeralPublicKey: string; encrypted: EncryptedBlob } {
  // Generate ephemeral key pair for this message
  const ephemeralPrivateKey = randomBytes(32);
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey);

  // Compute shared secret using ECDH
  const sharedSecret = x25519.getSharedSecret(ephemeralPrivateKey, recipientPublicKey);

  // Derive encryption key from shared secret
  const encryptionKey = hkdf(sha256, sharedSecret, undefined, utf8ToBytes('maplume-shared-v1'), 32);

  // Encrypt the data
  const encrypted = encrypt(data, encryptionKey);

  return {
    ephemeralPublicKey: bytesToBase64(ephemeralPublicKey),
    encrypted,
  };
}

/**
 * Decrypt data from a sender using X25519 key exchange
 */
export function decryptFromSender(
  ephemeralPublicKeyBase64: string,
  encrypted: EncryptedBlob,
  recipientPrivateKey: Uint8Array
): Uint8Array {
  const ephemeralPublicKey = base64ToBytes(ephemeralPublicKeyBase64);

  // Compute shared secret
  const sharedSecret = x25519.getSharedSecret(recipientPrivateKey, ephemeralPublicKey);

  // Derive encryption key
  const encryptionKey = hkdf(sha256, sharedSecret, undefined, utf8ToBytes('maplume-shared-v1'), 32);

  // Decrypt
  return decrypt(encrypted, encryptionKey);
}

/**
 * Derive a shared key for comment encryption between two parties
 * Both the owner and recipient can derive the same key using their private key
 * and the other's public key.
 */
export function deriveShareKey(
  myPrivateKey: Uint8Array,
  theirPublicKey: Uint8Array,
  shareId: string
): Uint8Array {
  // Compute ECDH shared secret
  const sharedSecret = x25519.getSharedSecret(myPrivateKey, theirPublicKey);

  // Derive a unique key for this share using HKDF
  const info = `maplume-comments-${shareId}`;
  return hkdf(sha256, sharedSecret, undefined, utf8ToBytes(info), 32);
}

/**
 * Encrypt a comment using the shared key
 * Returns the encrypted content and nonce as base64 strings
 */
export function encryptComment(
  content: string,
  shareKey: Uint8Array
): { encryptedContent: string; nonce: string } {
  const nonce = randomBytes(12);
  const cipher = gcm(shareKey, nonce);
  const plaintext = utf8ToBytes(content);
  const ciphertext = cipher.encrypt(plaintext);

  return {
    encryptedContent: bytesToBase64(ciphertext),
    nonce: bytesToBase64(nonce),
  };
}

/**
 * Decrypt a comment using the shared key
 */
export function decryptComment(
  encryptedContent: string,
  nonce: string,
  shareKey: Uint8Array
): string {
  const ciphertext = base64ToBytes(encryptedContent);
  const nonceBytes = base64ToBytes(nonce);

  const cipher = gcm(shareKey, nonceBytes);
  const plaintext = cipher.decrypt(ciphertext);

  return bytesToUtf8(plaintext);
}

/**
 * Hash data with SHA-256
 */
export function hash(data: Uint8Array): string {
  return bytesToHex(sha256(data));
}

/**
 * Hash a string with SHA-256
 */
export function hashString(str: string): string {
  return hash(utf8ToBytes(str));
}

// Utility functions for base64 encoding/decoding
function bytesToBase64(bytes: Uint8Array): string {
  // Use browser's btoa for base64 encoding
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Export utility functions
export { bytesToBase64, base64ToBytes, bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8 };
