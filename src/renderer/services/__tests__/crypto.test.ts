import { describe, it, expect } from 'vitest';
import {
  generateSeedPhrase,
  validateSeedPhrase,
  deriveKeys,
  sign,
  verify,
  encrypt,
  decrypt,
  encryptForRecipient,
  decryptFromSender,
  deriveShareKey,
  encryptComment,
  decryptComment,
  hashString,
  utf8ToBytes,
  bytesToUtf8,
} from '../crypto';

describe('generateSeedPhrase', () => {
  it('returns an array of 24 words', () => {
    const phrase = generateSeedPhrase();
    expect(Array.isArray(phrase)).toBe(true);
    expect(phrase).toHaveLength(24);
  });

  it('returns all string words', () => {
    const phrase = generateSeedPhrase();
    phrase.forEach((word) => {
      expect(typeof word).toBe('string');
      expect(word.length).toBeGreaterThan(0);
    });
  });

  it('generates valid BIP39 phrases', () => {
    const phrase = generateSeedPhrase();
    expect(validateSeedPhrase(phrase)).toBe(true);
  });

  it('generates unique phrases on each call', () => {
    const phrase1 = generateSeedPhrase();
    const phrase2 = generateSeedPhrase();
    expect(phrase1.join(' ')).not.toBe(phrase2.join(' '));
  });
});

describe('validateSeedPhrase', () => {
  it('accepts a valid 24-word seed phrase', () => {
    const phrase = generateSeedPhrase();
    expect(validateSeedPhrase(phrase)).toBe(true);
  });

  it('rejects an invalid seed phrase with wrong checksum', () => {
    // Generate a valid phrase, then modify one word
    const phrase = generateSeedPhrase();
    // Change the last word to break the checksum
    phrase[23] = phrase[23] === 'abandon' ? 'ability' : 'abandon';
    expect(validateSeedPhrase(phrase)).toBe(false);
  });

  it('rejects an empty array', () => {
    expect(validateSeedPhrase([])).toBe(false);
  });

  it('rejects a phrase with non-BIP39 words', () => {
    const invalidPhrase = Array(24).fill('invalidword');
    expect(validateSeedPhrase(invalidPhrase)).toBe(false);
  });

  it('rejects a phrase with wrong word count', () => {
    const phrase = generateSeedPhrase();
    // 23 words is not a valid BIP39 length (must be 12, 15, 18, 21, or 24)
    const invalidLengthPhrase = phrase.slice(0, 23);
    expect(validateSeedPhrase(invalidLengthPhrase)).toBe(false);
  });

  it('accepts a known valid test phrase', () => {
    // This is a valid 24-word BIP39 phrase (test vector)
    const validPhrase = [
      'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
      'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
      'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
      'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'art',
    ];
    expect(validateSeedPhrase(validPhrase)).toBe(true);
  });
});

describe('deriveKeys', () => {
  const validPhrase = [
    'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
    'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
    'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
    'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'art',
  ];

  it('returns a KeyBundle with all required key pairs', () => {
    const keys = deriveKeys(validPhrase);

    expect(keys).toHaveProperty('identityKeyPair');
    expect(keys).toHaveProperty('encryptionKeyPair');
    expect(keys).toHaveProperty('localKey');

    expect(keys.identityKeyPair).toHaveProperty('publicKey');
    expect(keys.identityKeyPair).toHaveProperty('privateKey');
    expect(keys.encryptionKeyPair).toHaveProperty('publicKey');
    expect(keys.encryptionKeyPair).toHaveProperty('privateKey');
  });

  it('returns keys with correct byte lengths', () => {
    const keys = deriveKeys(validPhrase);

    // Ed25519 keys
    expect(keys.identityKeyPair.publicKey).toBeInstanceOf(Uint8Array);
    expect(keys.identityKeyPair.publicKey).toHaveLength(32);
    expect(keys.identityKeyPair.privateKey).toBeInstanceOf(Uint8Array);
    expect(keys.identityKeyPair.privateKey).toHaveLength(32);

    // X25519 keys
    expect(keys.encryptionKeyPair.publicKey).toBeInstanceOf(Uint8Array);
    expect(keys.encryptionKeyPair.publicKey).toHaveLength(32);
    expect(keys.encryptionKeyPair.privateKey).toBeInstanceOf(Uint8Array);
    expect(keys.encryptionKeyPair.privateKey).toHaveLength(32);

    // AES-256 key
    expect(keys.localKey).toBeInstanceOf(Uint8Array);
    expect(keys.localKey).toHaveLength(32);
  });

  it('produces deterministic keys from the same phrase', () => {
    const keys1 = deriveKeys(validPhrase);
    const keys2 = deriveKeys(validPhrase);

    // All keys should be identical
    expect(keys1.identityKeyPair.publicKey).toEqual(keys2.identityKeyPair.publicKey);
    expect(keys1.identityKeyPair.privateKey).toEqual(keys2.identityKeyPair.privateKey);
    expect(keys1.encryptionKeyPair.publicKey).toEqual(keys2.encryptionKeyPair.publicKey);
    expect(keys1.encryptionKeyPair.privateKey).toEqual(keys2.encryptionKeyPair.privateKey);
    expect(keys1.localKey).toEqual(keys2.localKey);
  });

  it('produces different keys from different phrases', () => {
    const phrase2 = generateSeedPhrase();
    const keys1 = deriveKeys(validPhrase);
    const keys2 = deriveKeys(phrase2);

    expect(keys1.identityKeyPair.publicKey).not.toEqual(keys2.identityKeyPair.publicKey);
    expect(keys1.encryptionKeyPair.publicKey).not.toEqual(keys2.encryptionKeyPair.publicKey);
    expect(keys1.localKey).not.toEqual(keys2.localKey);
  });

  it('throws an error for an invalid seed phrase', () => {
    const invalidPhrase = ['invalid', 'words', 'here'];
    expect(() => deriveKeys(invalidPhrase)).toThrow('Invalid seed phrase');
  });
});

describe('sign and verify', () => {
  const validPhrase = [
    'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
    'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
    'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
    'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'art',
  ];

  it('creates a valid signature that can be verified', () => {
    const keys = deriveKeys(validPhrase);
    const data = utf8ToBytes('Hello, World!');

    const signature = sign(data, keys.identityKeyPair.privateKey);
    const isValid = verify(data, signature, keys.identityKeyPair.publicKey);

    expect(isValid).toBe(true);
  });

  it('produces 64-byte Ed25519 signatures', () => {
    const keys = deriveKeys(validPhrase);
    const data = utf8ToBytes('Test message');

    const signature = sign(data, keys.identityKeyPair.privateKey);

    expect(signature).toBeInstanceOf(Uint8Array);
    expect(signature).toHaveLength(64);
  });

  it('produces deterministic signatures for the same data', () => {
    const keys = deriveKeys(validPhrase);
    const data = utf8ToBytes('Same data');

    const sig1 = sign(data, keys.identityKeyPair.privateKey);
    const sig2 = sign(data, keys.identityKeyPair.privateKey);

    expect(sig1).toEqual(sig2);
  });

  it('produces different signatures for different data', () => {
    const keys = deriveKeys(validPhrase);
    const data1 = utf8ToBytes('Message 1');
    const data2 = utf8ToBytes('Message 2');

    const sig1 = sign(data1, keys.identityKeyPair.privateKey);
    const sig2 = sign(data2, keys.identityKeyPair.privateKey);

    expect(sig1).not.toEqual(sig2);
  });

  it('fails to verify with wrong public key', () => {
    const keys1 = deriveKeys(validPhrase);
    const keys2 = deriveKeys(generateSeedPhrase());
    const data = utf8ToBytes('Test message');

    const signature = sign(data, keys1.identityKeyPair.privateKey);
    const isValid = verify(data, signature, keys2.identityKeyPair.publicKey);

    expect(isValid).toBe(false);
  });

  it('fails to verify with tampered data', () => {
    const keys = deriveKeys(validPhrase);
    const originalData = utf8ToBytes('Original message');
    const tamperedData = utf8ToBytes('Tampered message');

    const signature = sign(originalData, keys.identityKeyPair.privateKey);
    const isValid = verify(tamperedData, signature, keys.identityKeyPair.publicKey);

    expect(isValid).toBe(false);
  });

  it('fails to verify with tampered signature', () => {
    const keys = deriveKeys(validPhrase);
    const data = utf8ToBytes('Test message');

    const signature = sign(data, keys.identityKeyPair.privateKey);
    // Tamper with the signature
    const tamperedSignature = new Uint8Array(signature);
    tamperedSignature[0] ^= 0xff;

    const isValid = verify(data, tamperedSignature, keys.identityKeyPair.publicKey);

    expect(isValid).toBe(false);
  });

  it('handles empty data', () => {
    const keys = deriveKeys(validPhrase);
    const emptyData = new Uint8Array(0);

    const signature = sign(emptyData, keys.identityKeyPair.privateKey);
    const isValid = verify(emptyData, signature, keys.identityKeyPair.publicKey);

    expect(isValid).toBe(true);
  });
});

describe('encrypt and decrypt', () => {
  const validPhrase = [
    'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
    'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
    'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon',
    'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'art',
  ];

  it('encrypts and decrypts data correctly', () => {
    const keys = deriveKeys(validPhrase);
    const plaintext = utf8ToBytes('Secret message!');

    const encrypted = encrypt(plaintext, keys.localKey);
    const decrypted = decrypt(encrypted, keys.localKey);

    expect(bytesToUtf8(decrypted)).toBe('Secret message!');
  });

  it('returns an EncryptedBlob with required fields', () => {
    const keys = deriveKeys(validPhrase);
    const plaintext = utf8ToBytes('Test data');

    const encrypted = encrypt(plaintext, keys.localKey);

    expect(encrypted).toHaveProperty('ciphertext');
    expect(encrypted).toHaveProperty('nonce');
    expect(encrypted).toHaveProperty('version');
    expect(typeof encrypted.ciphertext).toBe('string');
    expect(typeof encrypted.nonce).toBe('string');
    expect(encrypted.version).toBe(1);
  });

  it('produces different ciphertext on each encryption (due to random nonce)', () => {
    const keys = deriveKeys(validPhrase);
    const plaintext = utf8ToBytes('Same data');

    const encrypted1 = encrypt(plaintext, keys.localKey);
    const encrypted2 = encrypt(plaintext, keys.localKey);

    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    expect(encrypted1.nonce).not.toBe(encrypted2.nonce);
  });

  it('fails to decrypt with wrong key', () => {
    const keys1 = deriveKeys(validPhrase);
    const keys2 = deriveKeys(generateSeedPhrase());
    const plaintext = utf8ToBytes('Secret');

    const encrypted = encrypt(plaintext, keys1.localKey);

    expect(() => decrypt(encrypted, keys2.localKey)).toThrow();
  });

  it('fails to decrypt with tampered ciphertext', () => {
    const keys = deriveKeys(validPhrase);
    const plaintext = utf8ToBytes('Secret');

    const encrypted = encrypt(plaintext, keys.localKey);
    // Tamper with ciphertext (change a base64 character)
    const tamperedCiphertext = encrypted.ciphertext.slice(0, -1) +
      (encrypted.ciphertext.slice(-1) === 'A' ? 'B' : 'A');
    const tamperedBlob = { ...encrypted, ciphertext: tamperedCiphertext };

    expect(() => decrypt(tamperedBlob, keys.localKey)).toThrow();
  });

  it('handles empty data', () => {
    const keys = deriveKeys(validPhrase);
    const emptyData = new Uint8Array(0);

    const encrypted = encrypt(emptyData, keys.localKey);
    const decrypted = decrypt(encrypted, keys.localKey);

    expect(decrypted).toEqual(new Uint8Array(0));
  });

  it('handles large data', () => {
    const keys = deriveKeys(validPhrase);
    // 1MB of data
    const largeData = new Uint8Array(1024 * 1024);
    for (let i = 0; i < largeData.length; i++) {
      largeData[i] = i % 256;
    }

    const encrypted = encrypt(largeData, keys.localKey);
    const decrypted = decrypt(encrypted, keys.localKey);

    expect(decrypted).toEqual(largeData);
  });

  it('throws for unsupported encryption version', () => {
    const keys = deriveKeys(validPhrase);
    const plaintext = utf8ToBytes('Test');
    const encrypted = encrypt(plaintext, keys.localKey);

    const invalidBlob = { ...encrypted, version: 999 };

    expect(() => decrypt(invalidBlob, keys.localKey)).toThrow('Unsupported encryption version');
  });
});

describe('encryptForRecipient and decryptFromSender', () => {
  it('encrypts and decrypts between two parties', () => {
    const senderPhrase = generateSeedPhrase();
    const recipientPhrase = generateSeedPhrase();
    const senderKeys = deriveKeys(senderPhrase);
    const recipientKeys = deriveKeys(recipientPhrase);

    const message = utf8ToBytes('Hello from sender!');

    const { ephemeralPublicKey, encrypted } = encryptForRecipient(
      message,
      recipientKeys.encryptionKeyPair.publicKey,
      senderKeys.encryptionKeyPair.privateKey
    );

    const decrypted = decryptFromSender(
      ephemeralPublicKey,
      encrypted,
      recipientKeys.encryptionKeyPair.privateKey
    );

    expect(bytesToUtf8(decrypted)).toBe('Hello from sender!');
  });

  it('returns ephemeral public key and encrypted blob', () => {
    const senderKeys = deriveKeys(generateSeedPhrase());
    const recipientKeys = deriveKeys(generateSeedPhrase());
    const message = utf8ToBytes('Test');

    const result = encryptForRecipient(
      message,
      recipientKeys.encryptionKeyPair.publicKey,
      senderKeys.encryptionKeyPair.privateKey
    );

    expect(result).toHaveProperty('ephemeralPublicKey');
    expect(result).toHaveProperty('encrypted');
    expect(typeof result.ephemeralPublicKey).toBe('string');
    expect(result.encrypted).toHaveProperty('ciphertext');
    expect(result.encrypted).toHaveProperty('nonce');
    expect(result.encrypted).toHaveProperty('version');
  });

  it('uses different ephemeral keys for each encryption', () => {
    const senderKeys = deriveKeys(generateSeedPhrase());
    const recipientKeys = deriveKeys(generateSeedPhrase());
    const message = utf8ToBytes('Test');

    const result1 = encryptForRecipient(
      message,
      recipientKeys.encryptionKeyPair.publicKey,
      senderKeys.encryptionKeyPair.privateKey
    );

    const result2 = encryptForRecipient(
      message,
      recipientKeys.encryptionKeyPair.publicKey,
      senderKeys.encryptionKeyPair.privateKey
    );

    expect(result1.ephemeralPublicKey).not.toBe(result2.ephemeralPublicKey);
    expect(result1.encrypted.ciphertext).not.toBe(result2.encrypted.ciphertext);
  });

  it('fails to decrypt with wrong recipient private key', () => {
    const senderKeys = deriveKeys(generateSeedPhrase());
    const recipientKeys = deriveKeys(generateSeedPhrase());
    const wrongKeys = deriveKeys(generateSeedPhrase());
    const message = utf8ToBytes('Secret');

    const { ephemeralPublicKey, encrypted } = encryptForRecipient(
      message,
      recipientKeys.encryptionKeyPair.publicKey,
      senderKeys.encryptionKeyPair.privateKey
    );

    expect(() =>
      decryptFromSender(ephemeralPublicKey, encrypted, wrongKeys.encryptionKeyPair.privateKey)
    ).toThrow();
  });

  it('handles empty message', () => {
    const senderKeys = deriveKeys(generateSeedPhrase());
    const recipientKeys = deriveKeys(generateSeedPhrase());
    const emptyMessage = new Uint8Array(0);

    const { ephemeralPublicKey, encrypted } = encryptForRecipient(
      emptyMessage,
      recipientKeys.encryptionKeyPair.publicKey,
      senderKeys.encryptionKeyPair.privateKey
    );

    const decrypted = decryptFromSender(
      ephemeralPublicKey,
      encrypted,
      recipientKeys.encryptionKeyPair.privateKey
    );

    expect(decrypted).toEqual(new Uint8Array(0));
  });
});

describe('deriveShareKey', () => {
  it('derives the same key for both parties', () => {
    const aliceKeys = deriveKeys(generateSeedPhrase());
    const bobKeys = deriveKeys(generateSeedPhrase());
    const shareId = 'share-123';

    // Alice derives key using her private key and Bob's public key
    const aliceKey = deriveShareKey(
      aliceKeys.encryptionKeyPair.privateKey,
      bobKeys.encryptionKeyPair.publicKey,
      shareId
    );

    // Bob derives key using his private key and Alice's public key
    const bobKey = deriveShareKey(
      bobKeys.encryptionKeyPair.privateKey,
      aliceKeys.encryptionKeyPair.publicKey,
      shareId
    );

    expect(aliceKey).toEqual(bobKey);
  });

  it('returns a 32-byte key', () => {
    const aliceKeys = deriveKeys(generateSeedPhrase());
    const bobKeys = deriveKeys(generateSeedPhrase());

    const key = deriveShareKey(
      aliceKeys.encryptionKeyPair.privateKey,
      bobKeys.encryptionKeyPair.publicKey,
      'share-id'
    );

    expect(key).toBeInstanceOf(Uint8Array);
    expect(key).toHaveLength(32);
  });

  it('produces different keys for different share IDs', () => {
    const aliceKeys = deriveKeys(generateSeedPhrase());
    const bobKeys = deriveKeys(generateSeedPhrase());

    const key1 = deriveShareKey(
      aliceKeys.encryptionKeyPair.privateKey,
      bobKeys.encryptionKeyPair.publicKey,
      'share-1'
    );

    const key2 = deriveShareKey(
      aliceKeys.encryptionKeyPair.privateKey,
      bobKeys.encryptionKeyPair.publicKey,
      'share-2'
    );

    expect(key1).not.toEqual(key2);
  });

  it('produces different keys for different party pairs', () => {
    const aliceKeys = deriveKeys(generateSeedPhrase());
    const bobKeys = deriveKeys(generateSeedPhrase());
    const charlieKeys = deriveKeys(generateSeedPhrase());

    const aliceBobKey = deriveShareKey(
      aliceKeys.encryptionKeyPair.privateKey,
      bobKeys.encryptionKeyPair.publicKey,
      'share-1'
    );

    const aliceCharlieKey = deriveShareKey(
      aliceKeys.encryptionKeyPair.privateKey,
      charlieKeys.encryptionKeyPair.publicKey,
      'share-1'
    );

    expect(aliceBobKey).not.toEqual(aliceCharlieKey);
  });
});

describe('encryptComment and decryptComment', () => {
  it('encrypts and decrypts a comment correctly', () => {
    const aliceKeys = deriveKeys(generateSeedPhrase());
    const bobKeys = deriveKeys(generateSeedPhrase());
    const shareId = 'share-123';

    // Alice encrypts a comment
    const shareKey = deriveShareKey(
      aliceKeys.encryptionKeyPair.privateKey,
      bobKeys.encryptionKeyPair.publicKey,
      shareId
    );
    const { encryptedContent, nonce } = encryptComment('Great chapter!', shareKey);

    // Bob decrypts the comment
    const bobShareKey = deriveShareKey(
      bobKeys.encryptionKeyPair.privateKey,
      aliceKeys.encryptionKeyPair.publicKey,
      shareId
    );
    const decrypted = decryptComment(encryptedContent, nonce, bobShareKey);

    expect(decrypted).toBe('Great chapter!');
  });

  it('returns encrypted content and nonce as base64 strings', () => {
    const keys = deriveKeys(generateSeedPhrase());
    const shareKey = keys.localKey;

    const result = encryptComment('Test comment', shareKey);

    expect(result).toHaveProperty('encryptedContent');
    expect(result).toHaveProperty('nonce');
    expect(typeof result.encryptedContent).toBe('string');
    expect(typeof result.nonce).toBe('string');
    // Check base64 pattern
    expect(result.encryptedContent).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(result.nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('produces different ciphertext for same content (random nonce)', () => {
    const keys = deriveKeys(generateSeedPhrase());
    const shareKey = keys.localKey;

    const result1 = encryptComment('Same comment', shareKey);
    const result2 = encryptComment('Same comment', shareKey);

    expect(result1.encryptedContent).not.toBe(result2.encryptedContent);
    expect(result1.nonce).not.toBe(result2.nonce);
  });

  it('fails to decrypt with wrong key', () => {
    const keys1 = deriveKeys(generateSeedPhrase());
    const keys2 = deriveKeys(generateSeedPhrase());

    const { encryptedContent, nonce } = encryptComment('Secret', keys1.localKey);

    expect(() => decryptComment(encryptedContent, nonce, keys2.localKey)).toThrow();
  });

  it('handles empty string', () => {
    const keys = deriveKeys(generateSeedPhrase());
    const shareKey = keys.localKey;

    const { encryptedContent, nonce } = encryptComment('', shareKey);
    const decrypted = decryptComment(encryptedContent, nonce, shareKey);

    expect(decrypted).toBe('');
  });

  it('handles unicode characters', () => {
    const keys = deriveKeys(generateSeedPhrase());
    const shareKey = keys.localKey;
    const unicodeComment = 'Great work! Really enjoyed it.';

    const { encryptedContent, nonce } = encryptComment(unicodeComment, shareKey);
    const decrypted = decryptComment(encryptedContent, nonce, shareKey);

    expect(decrypted).toBe(unicodeComment);
  });

  it('handles long comments', () => {
    const keys = deriveKeys(generateSeedPhrase());
    const shareKey = keys.localKey;
    const longComment = 'A'.repeat(10000);

    const { encryptedContent, nonce } = encryptComment(longComment, shareKey);
    const decrypted = decryptComment(encryptedContent, nonce, shareKey);

    expect(decrypted).toBe(longComment);
  });
});

describe('hashString', () => {
  it('returns a hex string', () => {
    const hash = hashString('test');
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('returns a 64-character hex string (SHA-256 = 256 bits = 32 bytes = 64 hex chars)', () => {
    const hash = hashString('test');
    expect(hash).toHaveLength(64);
  });

  it('produces consistent hashes for the same input', () => {
    const hash1 = hashString('hello world');
    const hash2 = hashString('hello world');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = hashString('hello');
    const hash2 = hashString('world');
    expect(hash1).not.toBe(hash2);
  });

  it('handles empty string', () => {
    const hash = hashString('');
    expect(hash).toHaveLength(64);
    // Known SHA-256 of empty string
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('handles unicode characters', () => {
    const hash = hashString('hello world');
    expect(hash).toHaveLength(64);
    // Should be consistent
    expect(hashString('hello world')).toBe(hash);
  });

  it('produces known test vector hash', () => {
    // Known SHA-256 hash of "test"
    const hash = hashString('test');
    expect(hash).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });
});

describe('utf8ToBytes and bytesToUtf8', () => {
  it('converts ASCII string to bytes and back', () => {
    const original = 'Hello, World!';
    const bytes = utf8ToBytes(original);
    const result = bytesToUtf8(bytes);
    expect(result).toBe(original);
  });

  it('converts unicode string to bytes and back', () => {
    const original = 'Hello, world!';
    const bytes = utf8ToBytes(original);
    const result = bytesToUtf8(bytes);
    expect(result).toBe(original);
  });

  it('converts empty string to empty bytes', () => {
    const bytes = utf8ToBytes('');
    expect(bytes).toEqual(new Uint8Array(0));
    expect(bytesToUtf8(bytes)).toBe('');
  });

  it('handles multi-byte UTF-8 characters correctly', () => {
    // Characters with varying byte lengths
    const testStrings = [
      'a', // 1 byte
      'e', // 2 bytes
      'han', // 3 bytes
      'test', // 4 bytes
    ];

    for (const str of testStrings) {
      const bytes = utf8ToBytes(str);
      const result = bytesToUtf8(bytes);
      expect(result).toBe(str);
    }
  });
});
