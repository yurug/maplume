/**
 * Script to create test accounts for friends feature testing
 */

import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { utf8ToBytes } from '@noble/ciphers/utils.js';

const SERVER_URL = 'https://maplumes3tyzv8f-maplume-server.functions.fnc.fr-par.scw.cloud';

// Constants for key derivation (must match crypto.ts)
const IDENTITY_KEY_INFO = 'maplume-identity-v1';

// Derive keys from seed phrase (same as client code)
function deriveKeys(seedPhrase) {
  const seed = mnemonicToSeedSync(seedPhrase);

  // Derive identity key (Ed25519) for signing
  const identityKeyMaterial = hkdf(sha256, seed, undefined, utf8ToBytes(IDENTITY_KEY_INFO), 32);
  const identityPrivateKey = identityKeyMaterial;
  const identityPublicKey = ed25519.getPublicKey(identityPrivateKey);

  return {
    identityKeyPair: {
      publicKey: identityPublicKey,
      privateKey: identityPrivateKey,
    },
  };
}

// Convert bytes to base64
function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

// Sign a message
function sign(message, privateKey) {
  return ed25519.sign(message, privateKey);
}

// Register a new user
async function registerUser(username, publicKey) {
  const response = await fetch(`${SERVER_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      publicKey: bytesToBase64(publicKey),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  return response.json();
}

// Get challenge for login
async function getChallenge(username) {
  const response = await fetch(`${SERVER_URL}/api/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Challenge failed');
  }

  return response.json();
}

// Login with signed challenge
async function login(username, challenge, privateKey) {
  const signature = sign(new TextEncoder().encode(challenge), privateKey);

  const response = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      challenge,
      signature: bytesToBase64(signature),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
}

// Create a test account
async function createTestAccount(username) {
  console.log(`\nCreating account: ${username}`);

  // Generate seed phrase
  const seedPhrase = generateMnemonic(wordlist, 256);
  console.log(`  Seed phrase: ${seedPhrase.split(' ').slice(0, 4).join(' ')}...`);

  // Derive keys
  const keys = deriveKeys(seedPhrase);

  try {
    // Register
    const registerResult = await registerUser(username, keys.identityKeyPair.publicKey);
    console.log(`  Registered with ID: ${registerResult.userId}`);

    // Login to verify
    const challengeResult = await getChallenge(username);
    const loginResult = await login(username, challengeResult.challenge, keys.identityKeyPair.privateKey);
    console.log(`  Login successful!`);

    return {
      username,
      seedPhrase,
      userId: registerResult.userId,
      accessToken: loginResult.accessToken,
    };
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    return null;
  }
}

// Main
async function main() {
  console.log('Creating test accounts for MaPlume friends feature testing...\n');

  const testUsers = [
    'alice_writer',
    'bob_author',
    'charlie_novelist',
    'diana_storyteller',
  ];

  const accounts = [];

  for (const username of testUsers) {
    const account = await createTestAccount(username);
    if (account) {
      accounts.push(account);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST ACCOUNTS CREATED');
  console.log('='.repeat(60));
  console.log('\nYou can send friend requests to these usernames:');
  accounts.forEach(acc => {
    console.log(`  - ${acc.username}`);
  });

  console.log('\nTo test accepting/rejecting requests, use these recovery phrases:');
  accounts.forEach(acc => {
    console.log(`\n${acc.username}:`);
    console.log(`  ${acc.seedPhrase}`);
  });
}

main().catch(console.error);
