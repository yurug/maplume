import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { ed25519 } from '@noble/curves/ed25519';
import { config } from '../config';
import * as db from './database';

// In-memory challenge storage (could use Redis in production)
const challenges = new Map<string, { challenge: string; expiresAt: number }>();

export function generateChallenge(): string {
  return randomBytes(32).toString('hex');
}

export function storeChallenge(userId: string, challenge: string, expiresAt: number): void {
  challenges.set(userId, { challenge, expiresAt });

  // Clean up expired challenges periodically
  setTimeout(() => {
    const stored = challenges.get(userId);
    if (stored && stored.challenge === challenge) {
      challenges.delete(userId);
    }
  }, expiresAt - Date.now() + 1000);
}

export async function verifyLogin(
  userId: string,
  publicKeyBase64: string,
  challenge: string,
  signatureBase64: string
): Promise<boolean> {
  // Check stored challenge
  const stored = challenges.get(userId);
  if (!stored) {
    return false;
  }

  if (stored.challenge !== challenge) {
    return false;
  }

  if (Date.now() > stored.expiresAt) {
    challenges.delete(userId);
    return false;
  }

  // Verify Ed25519 signature
  try {
    const publicKey = Buffer.from(publicKeyBase64, 'base64');
    const signature = Buffer.from(signatureBase64, 'base64');
    const message = new TextEncoder().encode(challenge);

    const isValid = ed25519.verify(signature, message, publicKey);

    if (isValid) {
      challenges.delete(userId);
    }

    return isValid;
  } catch {
    return false;
  }
}

export function generateTokens(userId: string): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    config.jwtSecret,
    { expiresIn: config.jwtAccessExpiry as jwt.SignOptions['expiresIn'] }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiry as jwt.SignOptions['expiresIn'] }
  );

  return { accessToken, refreshToken };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string } | null> {
  try {
    const decoded = jwt.verify(refreshToken, config.jwtSecret) as {
      userId: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      return null;
    }

    // Check if token is valid in database
    const tokenHash = hashToken(refreshToken);
    const storedToken = await db.getAuthToken(tokenHash);

    if (!storedToken || storedToken.revokedAt) {
      return null;
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, type: 'access' },
      config.jwtSecret,
      { expiresIn: config.jwtAccessExpiry as jwt.SignOptions['expiresIn'] }
    );

    return { accessToken };
  } catch {
    return null;
  }
}
