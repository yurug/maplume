import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface Config {
  port: number;
  host: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtAccessExpiry: string;
  jwtRefreshExpiry: string;
  domain: string;
  httpsEnabled: boolean;
  certPath: string | null;
  keyPath: string | null;
  rateLimit: {
    login: { windowMs: number; max: number };
    register: { windowMs: number; max: number };
    challenge: { windowMs: number; max: number };
    api: { windowMs: number; max: number };
  };
  limits: {
    // Field size limits (in characters/bytes)
    maxEncryptedBlobSize: number;      // Project sync blob
    maxEncryptedDataSize: number;      // Share encrypted data
    maxEncryptedContentSize: number;   // Comment encrypted content
    maxBioLength: number;
    maxMessageLength: number;
    maxTitleLength: number;
    maxTargetIdLength: number;
    maxEmojiLength: number;
    // Per-user resource limits
    maxCommentsPerShare: number;
    maxReactionsPerShare: number;
    maxSharesPerUser: number;
    maxActivePartiesPerUser: number;
    maxPendingFriendRequests: number;
    // Challenge limits
    maxChallengesPerUser: number;
  };
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadConfig(): Config {
  const httpsEnabled = getEnvOrDefault('HTTPS_ENABLED', 'false') === 'true';

  return {
    port: parseInt(getEnvOrDefault('PORT', '8443'), 10),
    host: getEnvOrDefault('HOST', '0.0.0.0'),
    databaseUrl: getEnvOrDefault('DATABASE_URL', 'postgresql://localhost:5432/maplume'),
    jwtSecret: getEnvOrDefault('JWT_SECRET', 'dev-secret-change-in-production'),
    jwtAccessExpiry: getEnvOrDefault('JWT_ACCESS_EXPIRY', '15m'),
    jwtRefreshExpiry: getEnvOrDefault('JWT_REFRESH_EXPIRY', '365d'),
    domain: getEnvOrDefault('DOMAIN', 'localhost'),
    httpsEnabled,
    certPath: httpsEnabled ? getEnvOrDefault('CERT_PATH', '/etc/letsencrypt/live/domain/fullchain.pem') : null,
    keyPath: httpsEnabled ? getEnvOrDefault('KEY_PATH', '/etc/letsencrypt/live/domain/privkey.pem') : null,
    rateLimit: {
      login: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts
      },
      register: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 registrations
      },
      challenge: {
        windowMs: 60 * 1000, // 1 minute
        max: 10, // 10 challenges per minute
      },
      api: {
        windowMs: 60 * 1000, // 1 minute
        max: 200, // 200 requests per minute
      },
    },
    limits: {
      // Field size limits (in characters for strings, decoded bytes for base64)
      maxEncryptedBlobSize: 5 * 1024 * 1024,      // 5MB for project sync
      maxEncryptedDataSize: 2 * 1024 * 1024,      // 2MB for share data
      maxEncryptedContentSize: 10 * 1024,         // 10KB for comments
      maxBioLength: 500,
      maxMessageLength: 500,
      maxTitleLength: 200,
      maxTargetIdLength: 100,
      maxEmojiLength: 10,
      // Per-user resource limits
      maxCommentsPerShare: 500,
      maxReactionsPerShare: 1000,
      maxSharesPerUser: 100,
      maxActivePartiesPerUser: 10,
      maxPendingFriendRequests: 50,
      // Challenge limits (in-memory)
      maxChallengesPerUser: 5,
    },
  };
}

export const config = loadConfig();
