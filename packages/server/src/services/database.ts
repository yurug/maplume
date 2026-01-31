import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { hashToken } from './auth';
import type { AvatarData } from '@maplume/shared';

let pool: Pool | null = null;

// User type matching database schema
export interface DbUser {
  id: string;
  username: string;
  usernameLower: string;
  publicKey: string;
  encryptionPublicKey: string | null; // X25519 key for encryption
  avatarPreset: string | null;
  avatarData: AvatarData | null; // New comprehensive avatar field
  avatarImage: string | null; // Base64 data URL for uploaded images
  bio: string | null;
  statsPublic: boolean;
  searchable: boolean;
  createdAt: number;
  deletedAt: number | null;
  lastSeenAt: number | null;
}

export interface DbAuthToken {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceName: string | null;
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
}

export interface DbProjectData {
  id: string;
  userId: string;
  encryptedBlob: string;
  blobHash: string;
  updatedAt: number;
}

export async function initDatabase(): Promise<void> {
  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });

  // Test connection
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('Connected to PostgreSQL database');
  } finally {
    client.release();
  }

  // Run migrations
  await runMigrations();
}

async function runMigrations(): Promise<void> {
  if (!pool) throw new Error('Database not initialized');

  const client = await pool.connect();
  try {
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at BIGINT NOT NULL
      )
    `);

    // Check which migrations have been applied
    const result = await client.query('SELECT name FROM migrations');
    const applied = new Set(result.rows.map((row) => row.name));

    // Migration 001: Initial schema
    if (!applied.has('001_initial')) {
      console.log('Applying migration: 001_initial');

      await client.query(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          username_lower TEXT UNIQUE NOT NULL,
          public_key TEXT NOT NULL,
          avatar_preset TEXT,
          bio TEXT,
          stats_public BOOLEAN DEFAULT FALSE,
          searchable BOOLEAN DEFAULT TRUE,
          created_at BIGINT NOT NULL,
          deleted_at BIGINT,
          last_seen_at BIGINT
        )
      `);

      await client.query(`
        CREATE TABLE auth_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          refresh_token_hash TEXT NOT NULL,
          device_name TEXT,
          created_at BIGINT NOT NULL,
          expires_at BIGINT NOT NULL,
          revoked_at BIGINT
        )
      `);

      await client.query(`
        CREATE TABLE login_attempts (
          ip_address TEXT NOT NULL,
          user_id TEXT,
          attempted_at BIGINT NOT NULL,
          success BOOLEAN NOT NULL
        )
      `);

      await client.query(`
        CREATE TABLE project_data (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
          encrypted_blob TEXT NOT NULL,
          blob_hash TEXT NOT NULL,
          updated_at BIGINT NOT NULL
        )
      `);

      await client.query(`CREATE INDEX idx_users_username_lower ON users(username_lower)`);
      await client.query(`CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, attempted_at)`);
      await client.query(`CREATE INDEX idx_project_data_user ON project_data(user_id)`);
      await client.query(`CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id)`);

      await client.query(`INSERT INTO migrations (name, applied_at) VALUES ($1, $2)`, [
        '001_initial',
        Date.now(),
      ]);

      console.log('Migration 001_initial applied');
    }

    // Migration 002: Friends system
    if (!applied.has('002_friends')) {
      console.log('Applying migration: 002_friends');

      // Friend requests table
      await client.query(`
        CREATE TABLE friend_requests (
          id TEXT PRIMARY KEY,
          from_user_id TEXT NOT NULL REFERENCES users(id),
          to_user_id TEXT NOT NULL REFERENCES users(id),
          message TEXT,
          created_at BIGINT NOT NULL,
          responded_at BIGINT,
          status TEXT NOT NULL DEFAULT 'pending',
          CONSTRAINT unique_friend_request UNIQUE (from_user_id, to_user_id)
        )
      `);

      // Friendships table (bidirectional - store both directions for easier querying)
      await client.query(`
        CREATE TABLE friendships (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          friend_id TEXT NOT NULL REFERENCES users(id),
          created_at BIGINT NOT NULL,
          CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
        )
      `);

      await client.query(`CREATE INDEX idx_friend_requests_to ON friend_requests(to_user_id, status)`);
      await client.query(`CREATE INDEX idx_friend_requests_from ON friend_requests(from_user_id)`);
      await client.query(`CREATE INDEX idx_friendships_user ON friendships(user_id)`);

      await client.query(`INSERT INTO migrations (name, applied_at) VALUES ($1, $2)`, [
        '002_friends',
        Date.now(),
      ]);

      console.log('Migration 002_friends applied');
    }

    // Migration 003: Project shares
    if (!applied.has('003_project_shares')) {
      console.log('Applying migration: 003_project_shares');

      await client.query(`
        CREATE TABLE project_shares (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL REFERENCES users(id),
          shared_with_id TEXT NOT NULL REFERENCES users(id),
          project_local_id TEXT NOT NULL,
          share_type TEXT NOT NULL DEFAULT 'full',
          encrypted_data TEXT,
          ephemeral_public_key TEXT,
          data_hash TEXT,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          revoked_at BIGINT,
          CONSTRAINT unique_share UNIQUE (owner_id, shared_with_id, project_local_id)
        )
      `);

      await client.query(`CREATE INDEX idx_project_shares_owner ON project_shares(owner_id) WHERE revoked_at IS NULL`);
      await client.query(`CREATE INDEX idx_project_shares_recipient ON project_shares(shared_with_id) WHERE revoked_at IS NULL`);

      await client.query(`INSERT INTO migrations (name, applied_at) VALUES ($1, $2)`, [
        '003_project_shares',
        Date.now(),
      ]);

      console.log('Migration 003_project_shares applied');
    }

    // Migration 004: Add encryption public key to users
    if (!applied.has('004_encryption_public_key')) {
      console.log('Applying migration: 004_encryption_public_key');

      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS encryption_public_key TEXT
      `);

      await client.query(`INSERT INTO migrations (name, applied_at) VALUES ($1, $2)`, [
        '004_encryption_public_key',
        Date.now(),
      ]);

      console.log('Migration 004_encryption_public_key applied');
    }

    // Migration 005: Writing parties
    if (!applied.has('005_parties')) {
      console.log('Applying migration: 005_parties');

      // Parties table
      await client.query(`
        CREATE TABLE parties (
          id TEXT PRIMARY KEY,
          creator_id TEXT NOT NULL REFERENCES users(id),
          title TEXT NOT NULL,
          scheduled_start BIGINT,
          actual_start BIGINT,
          duration_minutes INTEGER NOT NULL,
          ended_at BIGINT,
          join_code TEXT UNIQUE,
          ranking_enabled BOOLEAN DEFAULT TRUE,
          created_at BIGINT NOT NULL,
          status TEXT NOT NULL DEFAULT 'scheduled'
        )
      `);

      // Party participants table
      await client.query(`
        CREATE TABLE party_participants (
          id TEXT PRIMARY KEY,
          party_id TEXT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id),
          start_word_count INTEGER DEFAULT 0,
          current_word_count INTEGER DEFAULT 0,
          words_written INTEGER DEFAULT 0,
          joined_at BIGINT NOT NULL,
          left_at BIGINT,
          last_update BIGINT,
          CONSTRAINT unique_party_participant UNIQUE (party_id, user_id)
        )
      `);

      // Party invites table
      await client.query(`
        CREATE TABLE party_invites (
          id TEXT PRIMARY KEY,
          party_id TEXT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
          invited_by TEXT NOT NULL REFERENCES users(id),
          invited_user_id TEXT NOT NULL REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'pending',
          created_at BIGINT NOT NULL,
          responded_at BIGINT
        )
      `);

      // Indexes
      await client.query(`CREATE INDEX idx_parties_status ON parties(status)`);
      await client.query(`CREATE INDEX idx_parties_code ON parties(join_code)`);
      await client.query(`CREATE INDEX idx_parties_creator ON parties(creator_id)`);
      await client.query(`CREATE INDEX idx_party_participants_party ON party_participants(party_id)`);
      await client.query(`CREATE INDEX idx_party_participants_user ON party_participants(user_id)`);
      await client.query(`CREATE INDEX idx_party_invites_user ON party_invites(invited_user_id, status)`);

      await client.query(`INSERT INTO migrations (name, applied_at) VALUES ($1, $2)`, [
        '005_parties',
        Date.now(),
      ]);

      console.log('Migration 005_parties applied');
    }

    // Migration 006: Enhanced avatar system
    if (!applied.has('006_avatar_data')) {
      console.log('Applying migration: 006_avatar_data');

      // Add avatar_data JSONB column for new avatar system
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data JSONB
      `);

      // Add avatar_image column for storing uploaded image data URLs
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_image TEXT
      `);

      // Migrate existing presets to new avatar_data format
      await client.query(`
        UPDATE users
        SET avatar_data = jsonb_build_object('type', 'preset', 'preset', avatar_preset)
        WHERE avatar_preset IS NOT NULL AND avatar_data IS NULL
      `);

      await client.query(`INSERT INTO migrations (name, applied_at) VALUES ($1, $2)`, [
        '006_avatar_data',
        Date.now(),
      ]);

      console.log('Migration 006_avatar_data applied');
    }

    // Migration 007: Share comments and reactions
    if (!applied.has('007_share_interactions')) {
      console.log('Applying migration: 007_share_interactions');

      // Comments table
      await client.query(`
        CREATE TABLE share_comments (
          id TEXT PRIMARY KEY,
          share_id TEXT NOT NULL REFERENCES project_shares(id) ON DELETE CASCADE,
          author_id TEXT NOT NULL REFERENCES users(id),
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          encrypted_content TEXT NOT NULL,
          nonce TEXT NOT NULL,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          deleted_at BIGINT
        )
      `);

      // Reactions table
      await client.query(`
        CREATE TABLE share_reactions (
          id TEXT PRIMARY KEY,
          share_id TEXT NOT NULL REFERENCES project_shares(id) ON DELETE CASCADE,
          author_id TEXT NOT NULL REFERENCES users(id),
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          emoji TEXT NOT NULL,
          created_at BIGINT NOT NULL,
          CONSTRAINT unique_reaction UNIQUE (share_id, author_id, target_type, target_id, emoji)
        )
      `);

      // Indexes
      await client.query(`CREATE INDEX idx_share_comments_share ON share_comments(share_id) WHERE deleted_at IS NULL`);
      await client.query(`CREATE INDEX idx_share_comments_target ON share_comments(share_id, target_type, target_id) WHERE deleted_at IS NULL`);
      await client.query(`CREATE INDEX idx_share_reactions_share ON share_reactions(share_id)`);
      await client.query(`CREATE INDEX idx_share_reactions_target ON share_reactions(share_id, target_type, target_id)`);

      await client.query(`INSERT INTO migrations (name, applied_at) VALUES ($1, $2)`, [
        '007_share_interactions',
        Date.now(),
      ]);

      console.log('Migration 007_share_interactions applied');
    }
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

function getPool(): Pool {
  if (!pool) throw new Error('Database not initialized');
  return pool;
}

// User operations
export async function createUser(username: string, publicKey: string, encryptionPublicKey?: string): Promise<string> {
  const id = randomUUID();
  const now = Date.now();

  await getPool().query(
    `INSERT INTO users (id, username, username_lower, public_key, encryption_public_key, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, username, username.toLowerCase(), publicKey, encryptionPublicKey || null, now]
  );

  return id;
}

export async function getUserByUsername(username: string): Promise<DbUser | null> {
  const result = await getPool().query(
    `SELECT id, username, username_lower, public_key, encryption_public_key, avatar_preset, avatar_data, avatar_image, bio,
            stats_public, searchable, created_at, deleted_at, last_seen_at
     FROM users WHERE username_lower = $1 AND deleted_at IS NULL`,
    [username.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    usernameLower: row.username_lower,
    publicKey: row.public_key,
    encryptionPublicKey: row.encryption_public_key,
    avatarPreset: row.avatar_preset,
    avatarData: row.avatar_data,
    avatarImage: row.avatar_image,
    bio: row.bio,
    statsPublic: row.stats_public,
    searchable: row.searchable,
    createdAt: parseInt(row.created_at),
    deletedAt: row.deleted_at ? parseInt(row.deleted_at) : null,
    lastSeenAt: row.last_seen_at ? parseInt(row.last_seen_at) : null,
  };
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const result = await getPool().query(
    `SELECT id, username, username_lower, public_key, encryption_public_key, avatar_preset, avatar_data, avatar_image, bio,
            stats_public, searchable, created_at, deleted_at, last_seen_at
     FROM users WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    usernameLower: row.username_lower,
    publicKey: row.public_key,
    encryptionPublicKey: row.encryption_public_key,
    avatarPreset: row.avatar_preset,
    avatarData: row.avatar_data,
    avatarImage: row.avatar_image,
    bio: row.bio,
    statsPublic: row.stats_public,
    searchable: row.searchable,
    createdAt: parseInt(row.created_at),
    deletedAt: row.deleted_at ? parseInt(row.deleted_at) : null,
    lastSeenAt: row.last_seen_at ? parseInt(row.last_seen_at) : null,
  };
}

export async function updateUser(id: string, updates: Record<string, unknown>): Promise<void> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const columnMap: Record<string, string> = {
    avatarPreset: 'avatar_preset',
    avatarData: 'avatar_data',
    avatarImage: 'avatar_image',
    bio: 'bio',
    statsPublic: 'stats_public',
    searchable: 'searchable',
  };

  for (const [key, value] of Object.entries(updates)) {
    const column = columnMap[key];
    if (column) {
      setClauses.push(`${column} = $${paramIndex}`);
      // Handle JSONB type for avatarData
      if (key === 'avatarData' && value !== null) {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return;

  values.push(id);
  await getPool().query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

export async function updateLastSeen(id: string): Promise<void> {
  await getPool().query(`UPDATE users SET last_seen_at = $1 WHERE id = $2`, [Date.now(), id]);
}

export async function updateEncryptionPublicKey(id: string, encryptionPublicKey: string): Promise<void> {
  await getPool().query(`UPDATE users SET encryption_public_key = $1 WHERE id = $2`, [encryptionPublicKey, id]);
}

export async function softDeleteUser(id: string): Promise<void> {
  await getPool().query(`UPDATE users SET deleted_at = $1 WHERE id = $2`, [Date.now(), id]);
}

export async function updateUserAvatar(id: string, avatarData: AvatarData, avatarImage: string | null): Promise<void> {
  await getPool().query(
    `UPDATE users SET avatar_data = $1, avatar_image = $2, avatar_preset = $3 WHERE id = $4`,
    [
      JSON.stringify(avatarData),
      avatarImage,
      avatarData.type === 'preset' ? avatarData.preset : null,
      id
    ]
  );
}

export async function deleteUserAvatar(id: string): Promise<void> {
  await getPool().query(
    `UPDATE users SET avatar_data = NULL, avatar_image = NULL, avatar_preset = NULL WHERE id = $1`,
    [id]
  );
}

export async function searchUsers(query: string, limit: number): Promise<DbUser[]> {
  const result = await getPool().query(
    `SELECT id, username, username_lower, public_key, encryption_public_key, avatar_preset, avatar_data, avatar_image, bio,
            stats_public, searchable, created_at, deleted_at, last_seen_at
     FROM users
     WHERE username_lower LIKE $1 AND searchable = TRUE AND deleted_at IS NULL
     LIMIT $2`,
    [`%${query.toLowerCase()}%`, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    username: row.username,
    usernameLower: row.username_lower,
    publicKey: row.public_key,
    encryptionPublicKey: row.encryption_public_key,
    avatarPreset: row.avatar_preset,
    avatarData: row.avatar_data,
    avatarImage: row.avatar_image,
    bio: row.bio,
    statsPublic: row.stats_public,
    searchable: row.searchable,
    createdAt: parseInt(row.created_at),
    deletedAt: row.deleted_at ? parseInt(row.deleted_at) : null,
    lastSeenAt: row.last_seen_at ? parseInt(row.last_seen_at) : null,
  }));
}

// Auth token operations
export async function createAuthToken(
  userId: string,
  refreshToken: string,
  deviceName: string
): Promise<string> {
  const id = randomUUID();
  const now = Date.now();
  const expiresAt = now + 365 * 24 * 60 * 60 * 1000; // 1 year

  await getPool().query(
    `INSERT INTO auth_tokens (id, user_id, refresh_token_hash, device_name, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, hashToken(refreshToken), deviceName, now, expiresAt]
  );

  return id;
}

export async function getAuthToken(tokenHash: string): Promise<DbAuthToken | null> {
  const result = await getPool().query(
    `SELECT id, user_id, refresh_token_hash, device_name, created_at, expires_at, revoked_at
     FROM auth_tokens WHERE refresh_token_hash = $1`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    deviceName: row.device_name,
    createdAt: parseInt(row.created_at),
    expiresAt: parseInt(row.expires_at),
    revokedAt: row.revoked_at ? parseInt(row.revoked_at) : null,
  };
}

export async function revokeAuthToken(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await getPool().query(`UPDATE auth_tokens SET revoked_at = $1 WHERE refresh_token_hash = $2`, [
    Date.now(),
    tokenHash,
  ]);
}

// Project data operations
export async function upsertProjectData(
  userId: string,
  encryptedBlob: string,
  blobHash: string
): Promise<void> {
  const now = Date.now();

  // Use PostgreSQL's UPSERT (ON CONFLICT)
  await getPool().query(
    `INSERT INTO project_data (id, user_id, encrypted_blob, blob_hash, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       encrypted_blob = EXCLUDED.encrypted_blob,
       blob_hash = EXCLUDED.blob_hash,
       updated_at = EXCLUDED.updated_at`,
    [randomUUID(), userId, encryptedBlob, blobHash, now]
  );
}

export async function getProjectData(userId: string): Promise<DbProjectData | null> {
  const result = await getPool().query(
    `SELECT id, user_id, encrypted_blob, blob_hash, updated_at FROM project_data WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    encryptedBlob: row.encrypted_blob,
    blobHash: row.blob_hash,
    updatedAt: parseInt(row.updated_at),
  };
}

// Friend request types
export interface DbFriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string | null;
  createdAt: number;
  respondedAt: number | null;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface DbFriendship {
  id: string;
  userId: string;
  friendId: string;
  createdAt: number;
}

export interface DbProjectShare {
  id: string;
  ownerId: string;
  sharedWithId: string;
  projectLocalId: string;
  shareType: 'full' | 'stats_only';
  encryptedData: string | null;
  ephemeralPublicKey: string | null;
  dataHash: string | null;
  createdAt: number;
  updatedAt: number;
  revokedAt: number | null;
}

// Friend request operations
export async function createFriendRequest(
  fromUserId: string,
  toUserId: string,
  message?: string
): Promise<string> {
  const id = randomUUID();
  const now = Date.now();

  await getPool().query(
    `INSERT INTO friend_requests (id, from_user_id, to_user_id, message, created_at, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     ON CONFLICT (from_user_id, to_user_id) DO UPDATE SET
       message = EXCLUDED.message,
       created_at = EXCLUDED.created_at,
       status = 'pending',
       responded_at = NULL`,
    [id, fromUserId, toUserId, message || null, now]
  );

  return id;
}

export async function getFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<DbFriendRequest | null> {
  const result = await getPool().query(
    `SELECT id, from_user_id, to_user_id, message, created_at, responded_at, status
     FROM friend_requests WHERE from_user_id = $1 AND to_user_id = $2`,
    [fromUserId, toUserId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    message: row.message,
    createdAt: parseInt(row.created_at),
    respondedAt: row.responded_at ? parseInt(row.responded_at) : null,
    status: row.status,
  };
}

export async function getPendingFriendRequests(userId: string): Promise<Array<DbFriendRequest & { fromUser: DbUser }>> {
  const result = await getPool().query(
    `SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.message, fr.created_at, fr.responded_at, fr.status,
            u.username, u.avatar_preset, u.avatar_data, u.avatar_image, u.bio
     FROM friend_requests fr
     JOIN users u ON u.id = fr.from_user_id
     WHERE fr.to_user_id = $1 AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    message: row.message,
    createdAt: parseInt(row.created_at),
    respondedAt: row.responded_at ? parseInt(row.responded_at) : null,
    status: row.status,
    fromUser: {
      id: row.from_user_id,
      username: row.username,
      usernameLower: row.username.toLowerCase(),
      publicKey: '',
      encryptionPublicKey: null,
      avatarPreset: row.avatar_preset,
      avatarData: row.avatar_data,
      avatarImage: row.avatar_image,
      bio: row.bio,
      statsPublic: false,
      searchable: true,
      createdAt: 0,
      deletedAt: null,
      lastSeenAt: null,
    },
  }));
}

export async function getSentFriendRequests(userId: string): Promise<Array<DbFriendRequest & { toUser: DbUser }>> {
  const result = await getPool().query(
    `SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.message, fr.created_at, fr.responded_at, fr.status,
            u.username, u.avatar_preset, u.avatar_data, u.avatar_image, u.bio
     FROM friend_requests fr
     JOIN users u ON u.id = fr.to_user_id
     WHERE fr.from_user_id = $1 AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    message: row.message,
    createdAt: parseInt(row.created_at),
    respondedAt: row.responded_at ? parseInt(row.responded_at) : null,
    status: row.status,
    toUser: {
      id: row.to_user_id,
      username: row.username,
      usernameLower: row.username.toLowerCase(),
      publicKey: '',
      encryptionPublicKey: null,
      avatarPreset: row.avatar_preset,
      avatarData: row.avatar_data,
      avatarImage: row.avatar_image,
      bio: row.bio,
      statsPublic: false,
      searchable: true,
      createdAt: 0,
      deletedAt: null,
      lastSeenAt: null,
    },
  }));
}

export async function acceptFriendRequest(requestId: string, userId: string): Promise<boolean> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // Get the request and verify it's for this user
    const result = await client.query(
      `SELECT from_user_id, to_user_id FROM friend_requests
       WHERE id = $1 AND to_user_id = $2 AND status = 'pending'`,
      [requestId, userId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    const { from_user_id: fromUserId, to_user_id: toUserId } = result.rows[0];
    const now = Date.now();

    // Update request status
    await client.query(
      `UPDATE friend_requests SET status = 'accepted', responded_at = $1 WHERE id = $2`,
      [now, requestId]
    );

    // Create bidirectional friendship
    const friendshipId1 = randomUUID();
    const friendshipId2 = randomUUID();

    await client.query(
      `INSERT INTO friendships (id, user_id, friend_id, created_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, friend_id) DO NOTHING`,
      [friendshipId1, fromUserId, toUserId, now]
    );

    await client.query(
      `INSERT INTO friendships (id, user_id, friend_id, created_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, friend_id) DO NOTHING`,
      [friendshipId2, toUserId, fromUserId, now]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectFriendRequest(requestId: string, userId: string): Promise<boolean> {
  const result = await getPool().query(
    `UPDATE friend_requests SET status = 'rejected', responded_at = $1
     WHERE id = $2 AND to_user_id = $3 AND status = 'pending'`,
    [Date.now(), requestId, userId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function cancelFriendRequest(requestId: string, userId: string): Promise<boolean> {
  const result = await getPool().query(
    `DELETE FROM friend_requests WHERE id = $1 AND from_user_id = $2 AND status = 'pending'`,
    [requestId, userId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getFriends(userId: string): Promise<DbUser[]> {
  const result = await getPool().query(
    `SELECT u.id, u.username, u.username_lower, u.public_key, u.encryption_public_key, u.avatar_preset, u.avatar_data, u.avatar_image, u.bio,
            u.stats_public, u.searchable, u.created_at, u.deleted_at, u.last_seen_at
     FROM friendships f
     JOIN users u ON u.id = f.friend_id
     WHERE f.user_id = $1 AND u.deleted_at IS NULL
     ORDER BY u.username`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    username: row.username,
    usernameLower: row.username_lower,
    publicKey: row.public_key,
    encryptionPublicKey: row.encryption_public_key,
    avatarPreset: row.avatar_preset,
    avatarData: row.avatar_data,
    avatarImage: row.avatar_image,
    bio: row.bio,
    statsPublic: row.stats_public,
    searchable: row.searchable,
    createdAt: parseInt(row.created_at),
    deletedAt: row.deleted_at ? parseInt(row.deleted_at) : null,
    lastSeenAt: row.last_seen_at ? parseInt(row.last_seen_at) : null,
  }));
}

export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const result = await getPool().query(
    `SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2`,
    [userId1, userId2]
  );

  return result.rows.length > 0;
}

export async function removeFriend(userId: string, friendId: string): Promise<boolean> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // Remove both directions
    await client.query(
      `DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [userId, friendId]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Project share operations
export async function createProjectShare(
  ownerId: string,
  sharedWithId: string,
  projectLocalId: string,
  shareType: 'full' | 'stats_only',
  encryptedData: string,
  ephemeralPublicKey: string,
  dataHash: string
): Promise<string> {
  const id = randomUUID();
  const now = Date.now();

  // Use UPSERT to handle re-sharing after revoke
  await getPool().query(
    `INSERT INTO project_shares (id, owner_id, shared_with_id, project_local_id, share_type, encrypted_data, ephemeral_public_key, data_hash, created_at, updated_at, revoked_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, NULL)
     ON CONFLICT (owner_id, shared_with_id, project_local_id) DO UPDATE SET
       share_type = EXCLUDED.share_type,
       encrypted_data = EXCLUDED.encrypted_data,
       ephemeral_public_key = EXCLUDED.ephemeral_public_key,
       data_hash = EXCLUDED.data_hash,
       updated_at = EXCLUDED.updated_at,
       revoked_at = NULL`,
    [id, ownerId, sharedWithId, projectLocalId, shareType, encryptedData, ephemeralPublicKey, dataHash, now]
  );

  // Return the actual ID (might be existing if it was an update)
  const result = await getPool().query(
    `SELECT id FROM project_shares WHERE owner_id = $1 AND shared_with_id = $2 AND project_local_id = $3`,
    [ownerId, sharedWithId, projectLocalId]
  );

  return result.rows[0].id;
}

export async function updateProjectShare(
  shareId: string,
  ownerId: string,
  encryptedData: string,
  ephemeralPublicKey: string,
  dataHash: string
): Promise<boolean> {
  const result = await getPool().query(
    `UPDATE project_shares
     SET encrypted_data = $1, ephemeral_public_key = $2, data_hash = $3, updated_at = $4
     WHERE id = $5 AND owner_id = $6 AND revoked_at IS NULL`,
    [encryptedData, ephemeralPublicKey, dataHash, Date.now(), shareId, ownerId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getProjectSharesOwned(ownerId: string): Promise<Array<DbProjectShare & { sharedWith: DbUser }>> {
  const result = await getPool().query(
    `SELECT ps.id, ps.owner_id, ps.shared_with_id, ps.project_local_id, ps.share_type,
            ps.encrypted_data, ps.ephemeral_public_key, ps.data_hash,
            ps.created_at, ps.updated_at, ps.revoked_at,
            u.username, u.avatar_preset, u.avatar_data, u.avatar_image, u.bio
     FROM project_shares ps
     JOIN users u ON u.id = ps.shared_with_id
     WHERE ps.owner_id = $1 AND ps.revoked_at IS NULL
     ORDER BY ps.updated_at DESC`,
    [ownerId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    sharedWithId: row.shared_with_id,
    projectLocalId: row.project_local_id,
    shareType: row.share_type,
    encryptedData: row.encrypted_data,
    ephemeralPublicKey: row.ephemeral_public_key,
    dataHash: row.data_hash,
    createdAt: parseInt(row.created_at),
    updatedAt: parseInt(row.updated_at),
    revokedAt: row.revoked_at ? parseInt(row.revoked_at) : null,
    sharedWith: {
      id: row.shared_with_id,
      username: row.username,
      usernameLower: row.username.toLowerCase(),
      publicKey: '',
      encryptionPublicKey: null,
      avatarPreset: row.avatar_preset,
      avatarData: row.avatar_data,
      avatarImage: row.avatar_image,
      bio: row.bio,
      statsPublic: false,
      searchable: true,
      createdAt: 0,
      deletedAt: null,
      lastSeenAt: null,
    },
  }));
}

export async function getProjectSharesReceived(userId: string): Promise<Array<DbProjectShare & { owner: DbUser }>> {
  const result = await getPool().query(
    `SELECT ps.id, ps.owner_id, ps.shared_with_id, ps.project_local_id, ps.share_type,
            ps.encrypted_data, ps.ephemeral_public_key, ps.data_hash,
            ps.created_at, ps.updated_at, ps.revoked_at,
            u.username, u.avatar_preset, u.avatar_data, u.avatar_image, u.bio, u.public_key
     FROM project_shares ps
     JOIN users u ON u.id = ps.owner_id
     WHERE ps.shared_with_id = $1 AND ps.revoked_at IS NULL
     ORDER BY ps.updated_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    sharedWithId: row.shared_with_id,
    projectLocalId: row.project_local_id,
    shareType: row.share_type,
    encryptedData: row.encrypted_data,
    ephemeralPublicKey: row.ephemeral_public_key,
    dataHash: row.data_hash,
    createdAt: parseInt(row.created_at),
    updatedAt: parseInt(row.updated_at),
    revokedAt: row.revoked_at ? parseInt(row.revoked_at) : null,
    owner: {
      id: row.owner_id,
      username: row.username,
      usernameLower: row.username.toLowerCase(),
      publicKey: row.public_key,
      encryptionPublicKey: null,
      avatarPreset: row.avatar_preset,
      avatarData: row.avatar_data,
      avatarImage: row.avatar_image,
      bio: row.bio,
      statsPublic: false,
      searchable: true,
      createdAt: 0,
      deletedAt: null,
      lastSeenAt: null,
    },
  }));
}

export async function getProjectShare(shareId: string): Promise<(DbProjectShare & { owner: DbUser }) | null> {
  const result = await getPool().query(
    `SELECT ps.id, ps.owner_id, ps.shared_with_id, ps.project_local_id, ps.share_type,
            ps.encrypted_data, ps.ephemeral_public_key, ps.data_hash,
            ps.created_at, ps.updated_at, ps.revoked_at,
            u.username, u.avatar_preset, u.avatar_data, u.avatar_image, u.bio, u.public_key
     FROM project_shares ps
     JOIN users u ON u.id = ps.owner_id
     WHERE ps.id = $1`,
    [shareId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    ownerId: row.owner_id,
    sharedWithId: row.shared_with_id,
    projectLocalId: row.project_local_id,
    shareType: row.share_type,
    encryptedData: row.encrypted_data,
    ephemeralPublicKey: row.ephemeral_public_key,
    dataHash: row.data_hash,
    createdAt: parseInt(row.created_at),
    updatedAt: parseInt(row.updated_at),
    revokedAt: row.revoked_at ? parseInt(row.revoked_at) : null,
    owner: {
      id: row.owner_id,
      username: row.username,
      usernameLower: row.username.toLowerCase(),
      publicKey: row.public_key,
      encryptionPublicKey: null,
      avatarPreset: row.avatar_preset,
      avatarData: row.avatar_data,
      avatarImage: row.avatar_image,
      bio: row.bio,
      statsPublic: false,
      searchable: true,
      createdAt: 0,
      deletedAt: null,
      lastSeenAt: null,
    },
  };
}

export async function revokeProjectShare(shareId: string, ownerId: string): Promise<boolean> {
  const result = await getPool().query(
    `UPDATE project_shares SET revoked_at = $1
     WHERE id = $2 AND owner_id = $3 AND revoked_at IS NULL`,
    [Date.now(), shareId, ownerId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getShareByOwnerAndRecipient(
  ownerId: string,
  sharedWithId: string,
  projectLocalId: string
): Promise<DbProjectShare | null> {
  const result = await getPool().query(
    `SELECT id, owner_id, shared_with_id, project_local_id, share_type,
            encrypted_data, ephemeral_public_key, data_hash,
            created_at, updated_at, revoked_at
     FROM project_shares
     WHERE owner_id = $1 AND shared_with_id = $2 AND project_local_id = $3 AND revoked_at IS NULL`,
    [ownerId, sharedWithId, projectLocalId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    ownerId: row.owner_id,
    sharedWithId: row.shared_with_id,
    projectLocalId: row.project_local_id,
    shareType: row.share_type,
    encryptedData: row.encrypted_data,
    ephemeralPublicKey: row.ephemeral_public_key,
    dataHash: row.data_hash,
    createdAt: parseInt(row.created_at),
    updatedAt: parseInt(row.updated_at),
    revokedAt: row.revoked_at ? parseInt(row.revoked_at) : null,
  };
}

// Party types
export type PartyStatus = 'scheduled' | 'active' | 'ended' | 'cancelled';

export interface DbParty {
  id: string;
  creatorId: string;
  title: string;
  scheduledStart: number | null;
  actualStart: number | null;
  durationMinutes: number;
  endedAt: number | null;
  joinCode: string | null;
  rankingEnabled: boolean;
  createdAt: number;
  status: PartyStatus;
}

export interface DbPartyParticipant {
  id: string;
  partyId: string;
  userId: string;
  startWordCount: number;
  currentWordCount: number;
  wordsWritten: number;
  joinedAt: number;
  leftAt: number | null;
  lastUpdate: number | null;
}

export interface DbPartyInvite {
  id: string;
  partyId: string;
  invitedBy: string;
  invitedUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  respondedAt: number | null;
}

// Helper to generate a 6-character alphanumeric join code
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0, O, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Party operations
export async function createParty(
  creatorId: string,
  title: string,
  durationMinutes: number,
  scheduledStart: number | null,
  rankingEnabled: boolean
): Promise<DbParty> {
  const id = randomUUID();
  const now = Date.now();
  const joinCode = generateJoinCode();
  const status: PartyStatus = scheduledStart && scheduledStart > now ? 'scheduled' : 'active';
  const actualStart = status === 'active' ? now : null;

  await getPool().query(
    `INSERT INTO parties (id, creator_id, title, scheduled_start, actual_start, duration_minutes, join_code, ranking_enabled, created_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, creatorId, title, scheduledStart, actualStart, durationMinutes, joinCode, rankingEnabled, now, status]
  );

  // Auto-add creator as participant
  await addPartyParticipant(id, creatorId, 0);

  return {
    id,
    creatorId,
    title,
    scheduledStart,
    actualStart,
    durationMinutes,
    endedAt: null,
    joinCode,
    rankingEnabled,
    createdAt: now,
    status,
  };
}

export async function getPartyById(partyId: string): Promise<DbParty | null> {
  const result = await getPool().query(
    `SELECT id, creator_id, title, scheduled_start, actual_start, duration_minutes, ended_at, join_code, ranking_enabled, created_at, status
     FROM parties WHERE id = $1`,
    [partyId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    scheduledStart: row.scheduled_start ? parseInt(row.scheduled_start) : null,
    actualStart: row.actual_start ? parseInt(row.actual_start) : null,
    durationMinutes: row.duration_minutes,
    endedAt: row.ended_at ? parseInt(row.ended_at) : null,
    joinCode: row.join_code,
    rankingEnabled: row.ranking_enabled,
    createdAt: parseInt(row.created_at),
    status: row.status,
  };
}

export async function getPartyByJoinCode(joinCode: string): Promise<DbParty | null> {
  const result = await getPool().query(
    `SELECT id, creator_id, title, scheduled_start, actual_start, duration_minutes, ended_at, join_code, ranking_enabled, created_at, status
     FROM parties WHERE join_code = $1 AND status IN ('scheduled', 'active')`,
    [joinCode.toUpperCase()]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    scheduledStart: row.scheduled_start ? parseInt(row.scheduled_start) : null,
    actualStart: row.actual_start ? parseInt(row.actual_start) : null,
    durationMinutes: row.duration_minutes,
    endedAt: row.ended_at ? parseInt(row.ended_at) : null,
    joinCode: row.join_code,
    rankingEnabled: row.ranking_enabled,
    createdAt: parseInt(row.created_at),
    status: row.status,
  };
}

export async function getActivePartiesForUser(userId: string): Promise<Array<DbParty & { participantCount: number; isParticipating: boolean }>> {
  const result = await getPool().query(
    `SELECT p.id, p.creator_id, p.title, p.scheduled_start, p.actual_start, p.duration_minutes, p.ended_at, p.join_code, p.ranking_enabled, p.created_at, p.status,
            COUNT(DISTINCT pp.user_id) as participant_count,
            EXISTS(SELECT 1 FROM party_participants WHERE party_id = p.id AND user_id = $1 AND left_at IS NULL) as is_participating
     FROM parties p
     LEFT JOIN party_participants pp ON pp.party_id = p.id AND pp.left_at IS NULL
     WHERE p.status = 'active'
       AND (EXISTS(SELECT 1 FROM party_participants WHERE party_id = p.id AND user_id = $1 AND left_at IS NULL)
            OR p.creator_id = $1)
     GROUP BY p.id
     ORDER BY p.actual_start DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    scheduledStart: row.scheduled_start ? parseInt(row.scheduled_start) : null,
    actualStart: row.actual_start ? parseInt(row.actual_start) : null,
    durationMinutes: row.duration_minutes,
    endedAt: row.ended_at ? parseInt(row.ended_at) : null,
    joinCode: row.join_code,
    rankingEnabled: row.ranking_enabled,
    createdAt: parseInt(row.created_at),
    status: row.status,
    participantCount: parseInt(row.participant_count),
    isParticipating: row.is_participating,
  }));
}

export async function getUpcomingPartiesForUser(userId: string): Promise<Array<DbParty & { participantCount: number; isParticipating: boolean }>> {
  const result = await getPool().query(
    `SELECT p.id, p.creator_id, p.title, p.scheduled_start, p.actual_start, p.duration_minutes, p.ended_at, p.join_code, p.ranking_enabled, p.created_at, p.status,
            COUNT(DISTINCT pp.user_id) as participant_count,
            EXISTS(SELECT 1 FROM party_participants WHERE party_id = p.id AND user_id = $1 AND left_at IS NULL) as is_participating
     FROM parties p
     LEFT JOIN party_participants pp ON pp.party_id = p.id AND pp.left_at IS NULL
     WHERE p.status = 'scheduled'
       AND (EXISTS(SELECT 1 FROM party_participants WHERE party_id = p.id AND user_id = $1 AND left_at IS NULL)
            OR EXISTS(SELECT 1 FROM party_invites WHERE party_id = p.id AND invited_user_id = $1 AND status = 'pending')
            OR p.creator_id = $1)
     GROUP BY p.id
     ORDER BY p.scheduled_start ASC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    scheduledStart: row.scheduled_start ? parseInt(row.scheduled_start) : null,
    actualStart: row.actual_start ? parseInt(row.actual_start) : null,
    durationMinutes: row.duration_minutes,
    endedAt: row.ended_at ? parseInt(row.ended_at) : null,
    joinCode: row.join_code,
    rankingEnabled: row.ranking_enabled,
    createdAt: parseInt(row.created_at),
    status: row.status,
    participantCount: parseInt(row.participant_count),
    isParticipating: row.is_participating,
  }));
}

export async function getPartyHistoryForUser(userId: string, limit = 20): Promise<Array<DbParty & { participantCount: number }>> {
  const result = await getPool().query(
    `SELECT p.id, p.creator_id, p.title, p.scheduled_start, p.actual_start, p.duration_minutes, p.ended_at, p.join_code, p.ranking_enabled, p.created_at, p.status,
            COUNT(DISTINCT pp.user_id) as participant_count
     FROM parties p
     LEFT JOIN party_participants pp ON pp.party_id = p.id
     WHERE p.status = 'ended'
       AND EXISTS(SELECT 1 FROM party_participants WHERE party_id = p.id AND user_id = $1)
     GROUP BY p.id
     ORDER BY p.ended_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    scheduledStart: row.scheduled_start ? parseInt(row.scheduled_start) : null,
    actualStart: row.actual_start ? parseInt(row.actual_start) : null,
    durationMinutes: row.duration_minutes,
    endedAt: row.ended_at ? parseInt(row.ended_at) : null,
    joinCode: row.join_code,
    rankingEnabled: row.ranking_enabled,
    createdAt: parseInt(row.created_at),
    status: row.status,
    participantCount: parseInt(row.participant_count),
  }));
}

export async function startParty(partyId: string): Promise<void> {
  const now = Date.now();
  await getPool().query(
    `UPDATE parties SET status = 'active', actual_start = $1 WHERE id = $2 AND status = 'scheduled'`,
    [now, partyId]
  );
}

export async function endParty(partyId: string): Promise<void> {
  const now = Date.now();
  await getPool().query(
    `UPDATE parties SET status = 'ended', ended_at = $1 WHERE id = $2 AND status IN ('scheduled', 'active')`,
    [now, partyId]
  );
}

export async function cancelParty(partyId: string): Promise<void> {
  await getPool().query(
    `UPDATE parties SET status = 'cancelled' WHERE id = $1 AND status IN ('scheduled', 'active')`,
    [partyId]
  );
}

// Participant operations
export async function addPartyParticipant(partyId: string, userId: string, startWordCount: number): Promise<DbPartyParticipant> {
  const id = randomUUID();
  const now = Date.now();

  // Use UPSERT to handle rejoining
  await getPool().query(
    `INSERT INTO party_participants (id, party_id, user_id, start_word_count, current_word_count, words_written, joined_at)
     VALUES ($1, $2, $3, $4, $4, 0, $5)
     ON CONFLICT (party_id, user_id) DO UPDATE SET
       left_at = NULL,
       start_word_count = EXCLUDED.start_word_count,
       current_word_count = EXCLUDED.current_word_count,
       words_written = 0,
       joined_at = EXCLUDED.joined_at`,
    [id, partyId, userId, startWordCount, now]
  );

  return {
    id,
    partyId,
    userId,
    startWordCount,
    currentWordCount: startWordCount,
    wordsWritten: 0,
    joinedAt: now,
    leftAt: null,
    lastUpdate: null,
  };
}

export async function getPartyParticipants(partyId: string): Promise<Array<DbPartyParticipant & { user: DbUser }>> {
  const result = await getPool().query(
    `SELECT pp.id, pp.party_id, pp.user_id, pp.start_word_count, pp.current_word_count, pp.words_written, pp.joined_at, pp.left_at, pp.last_update,
            u.username, u.avatar_preset, u.avatar_data, u.avatar_image, u.bio
     FROM party_participants pp
     JOIN users u ON u.id = pp.user_id
     WHERE pp.party_id = $1 AND pp.left_at IS NULL
     ORDER BY pp.words_written DESC`,
    [partyId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    partyId: row.party_id,
    userId: row.user_id,
    startWordCount: row.start_word_count,
    currentWordCount: row.current_word_count,
    wordsWritten: row.words_written,
    joinedAt: parseInt(row.joined_at),
    leftAt: row.left_at ? parseInt(row.left_at) : null,
    lastUpdate: row.last_update ? parseInt(row.last_update) : null,
    user: {
      id: row.user_id,
      username: row.username,
      usernameLower: row.username.toLowerCase(),
      publicKey: '',
      encryptionPublicKey: null,
      avatarPreset: row.avatar_preset,
      avatarData: row.avatar_data,
      avatarImage: row.avatar_image,
      bio: row.bio,
      statsPublic: false,
      searchable: true,
      createdAt: 0,
      deletedAt: null,
      lastSeenAt: null,
    },
  }));
}

export async function updateParticipantProgress(partyId: string, userId: string, currentWordCount: number): Promise<number> {
  const now = Date.now();

  // Get current participant info
  const current = await getPool().query(
    `SELECT start_word_count FROM party_participants WHERE party_id = $1 AND user_id = $2 AND left_at IS NULL`,
    [partyId, userId]
  );

  if (current.rows.length === 0) {
    throw new Error('Not a participant');
  }

  const startWordCount = current.rows[0].start_word_count;
  const wordsWritten = Math.max(0, currentWordCount - startWordCount);

  await getPool().query(
    `UPDATE party_participants SET current_word_count = $1, words_written = $2, last_update = $3
     WHERE party_id = $4 AND user_id = $5 AND left_at IS NULL`,
    [currentWordCount, wordsWritten, now, partyId, userId]
  );

  return wordsWritten;
}

export async function leaveParty(partyId: string, userId: string): Promise<void> {
  const now = Date.now();
  await getPool().query(
    `UPDATE party_participants SET left_at = $1 WHERE party_id = $2 AND user_id = $3 AND left_at IS NULL`,
    [now, partyId, userId]
  );
}

export async function isParticipant(partyId: string, userId: string): Promise<boolean> {
  const result = await getPool().query(
    `SELECT 1 FROM party_participants WHERE party_id = $1 AND user_id = $2 AND left_at IS NULL`,
    [partyId, userId]
  );
  return result.rows.length > 0;
}

// Invite operations
export async function createPartyInvite(partyId: string, invitedBy: string, invitedUserId: string): Promise<string> {
  const id = randomUUID();
  const now = Date.now();

  // Use UPSERT
  await getPool().query(
    `INSERT INTO party_invites (id, party_id, invited_by, invited_user_id, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', $5)
     ON CONFLICT (party_id, invited_user_id) WHERE status = 'pending' DO NOTHING`,
    [id, partyId, invitedBy, invitedUserId, now]
  );

  return id;
}

export async function getPendingInvitesForUser(userId: string): Promise<Array<DbPartyInvite & { party: DbParty; inviter: DbUser }>> {
  const result = await getPool().query(
    `SELECT pi.id, pi.party_id, pi.invited_by, pi.invited_user_id, pi.status, pi.created_at, pi.responded_at,
            p.id as p_id, p.creator_id, p.title, p.scheduled_start, p.actual_start, p.duration_minutes, p.ended_at, p.join_code, p.ranking_enabled, p.created_at as p_created_at, p.status as p_status,
            u.username, u.avatar_preset, u.avatar_data, u.avatar_image
     FROM party_invites pi
     JOIN parties p ON p.id = pi.party_id
     JOIN users u ON u.id = pi.invited_by
     WHERE pi.invited_user_id = $1 AND pi.status = 'pending' AND p.status IN ('scheduled', 'active')
     ORDER BY pi.created_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    partyId: row.party_id,
    invitedBy: row.invited_by,
    invitedUserId: row.invited_user_id,
    status: row.status,
    createdAt: parseInt(row.created_at),
    respondedAt: row.responded_at ? parseInt(row.responded_at) : null,
    party: {
      id: row.p_id,
      creatorId: row.creator_id,
      title: row.title,
      scheduledStart: row.scheduled_start ? parseInt(row.scheduled_start) : null,
      actualStart: row.actual_start ? parseInt(row.actual_start) : null,
      durationMinutes: row.duration_minutes,
      endedAt: row.ended_at ? parseInt(row.ended_at) : null,
      joinCode: row.join_code,
      rankingEnabled: row.ranking_enabled,
      createdAt: parseInt(row.p_created_at),
      status: row.p_status,
    },
    inviter: {
      id: row.invited_by,
      username: row.username,
      usernameLower: row.username.toLowerCase(),
      publicKey: '',
      encryptionPublicKey: null,
      avatarPreset: row.avatar_preset,
      avatarData: row.avatar_data,
      avatarImage: row.avatar_image,
      bio: null,
      statsPublic: false,
      searchable: true,
      createdAt: 0,
      deletedAt: null,
      lastSeenAt: null,
    },
  }));
}

export async function respondToInvite(inviteId: string, userId: string, accept: boolean): Promise<void> {
  const now = Date.now();
  const status = accept ? 'accepted' : 'rejected';

  await getPool().query(
    `UPDATE party_invites SET status = $1, responded_at = $2
     WHERE id = $3 AND invited_user_id = $4 AND status = 'pending'`,
    [status, now, inviteId, userId]
  );
}

export async function getCreatorInfo(creatorId: string): Promise<{ id: string; username: string; avatarPreset: string | null } | null> {
  const result = await getPool().query(
    `SELECT id, username, avatar_preset FROM users WHERE id = $1`,
    [creatorId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    avatarPreset: row.avatar_preset,
  };
}

// ============ Share Comments ============

export interface DbShareComment {
  id: string;
  shareId: string;
  authorId: string;
  targetType: 'entry' | 'note';
  targetId: string;
  encryptedContent: string;
  nonce: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface DbShareReaction {
  id: string;
  shareId: string;
  authorId: string;
  targetType: 'entry' | 'note' | 'comment';
  targetId: string;
  emoji: string;
  createdAt: number;
}

export async function createShareComment(
  shareId: string,
  authorId: string,
  targetType: 'entry' | 'note',
  targetId: string,
  encryptedContent: string,
  nonce: string
): Promise<string> {
  const id = randomUUID();
  const now = Date.now();

  await getPool().query(
    `INSERT INTO share_comments (id, share_id, author_id, target_type, target_id, encrypted_content, nonce, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
    [id, shareId, authorId, targetType, targetId, encryptedContent, nonce, now]
  );

  return id;
}

export async function getShareComments(
  shareId: string
): Promise<Array<DbShareComment & { author: { id: string; username: string; avatarPreset: string | null; avatarData: AvatarData | null } }>> {
  const result = await getPool().query(
    `SELECT sc.id, sc.share_id, sc.author_id, sc.target_type, sc.target_id, sc.encrypted_content, sc.nonce,
            sc.created_at, sc.updated_at, sc.deleted_at,
            u.username, u.avatar_preset, u.avatar_data
     FROM share_comments sc
     JOIN users u ON u.id = sc.author_id
     WHERE sc.share_id = $1 AND sc.deleted_at IS NULL
     ORDER BY sc.created_at ASC`,
    [shareId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    shareId: row.share_id,
    authorId: row.author_id,
    targetType: row.target_type,
    targetId: row.target_id,
    encryptedContent: row.encrypted_content,
    nonce: row.nonce,
    createdAt: parseInt(row.created_at),
    updatedAt: parseInt(row.updated_at),
    deletedAt: row.deleted_at ? parseInt(row.deleted_at) : null,
    author: {
      id: row.author_id,
      username: row.username,
      avatarPreset: row.avatar_preset,
      avatarData: row.avatar_data,
    },
  }));
}

export async function getShareComment(commentId: string): Promise<DbShareComment | null> {
  const result = await getPool().query(
    `SELECT id, share_id, author_id, target_type, target_id, encrypted_content, nonce,
            created_at, updated_at, deleted_at
     FROM share_comments WHERE id = $1`,
    [commentId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    shareId: row.share_id,
    authorId: row.author_id,
    targetType: row.target_type,
    targetId: row.target_id,
    encryptedContent: row.encrypted_content,
    nonce: row.nonce,
    createdAt: parseInt(row.created_at),
    updatedAt: parseInt(row.updated_at),
    deletedAt: row.deleted_at ? parseInt(row.deleted_at) : null,
  };
}

export async function updateShareComment(
  commentId: string,
  authorId: string,
  encryptedContent: string,
  nonce: string
): Promise<boolean> {
  const now = Date.now();
  const result = await getPool().query(
    `UPDATE share_comments SET encrypted_content = $1, nonce = $2, updated_at = $3
     WHERE id = $4 AND author_id = $5 AND deleted_at IS NULL`,
    [encryptedContent, nonce, now, commentId, authorId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function deleteShareComment(commentId: string, authorId: string): Promise<boolean> {
  const now = Date.now();
  const result = await getPool().query(
    `UPDATE share_comments SET deleted_at = $1
     WHERE id = $2 AND author_id = $3 AND deleted_at IS NULL`,
    [now, commentId, authorId]
  );

  return (result.rowCount ?? 0) > 0;
}

// ============ Share Reactions ============

export async function addShareReaction(
  shareId: string,
  authorId: string,
  targetType: 'entry' | 'note' | 'comment',
  targetId: string,
  emoji: string
): Promise<string> {
  const id = randomUUID();
  const now = Date.now();

  // Use UPSERT - if same reaction exists, do nothing (return existing)
  await getPool().query(
    `INSERT INTO share_reactions (id, share_id, author_id, target_type, target_id, emoji, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (share_id, author_id, target_type, target_id, emoji) DO NOTHING`,
    [id, shareId, authorId, targetType, targetId, emoji, now]
  );

  // Get the actual ID (might be existing)
  const result = await getPool().query(
    `SELECT id FROM share_reactions
     WHERE share_id = $1 AND author_id = $2 AND target_type = $3 AND target_id = $4 AND emoji = $5`,
    [shareId, authorId, targetType, targetId, emoji]
  );

  return result.rows[0]?.id || id;
}

export async function removeShareReaction(reactionId: string, authorId: string): Promise<boolean> {
  const result = await getPool().query(
    `DELETE FROM share_reactions WHERE id = $1 AND author_id = $2`,
    [reactionId, authorId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getShareReactions(
  shareId: string
): Promise<Array<DbShareReaction & { author: { id: string; username: string } }>> {
  const result = await getPool().query(
    `SELECT sr.id, sr.share_id, sr.author_id, sr.target_type, sr.target_id, sr.emoji, sr.created_at,
            u.username
     FROM share_reactions sr
     JOIN users u ON u.id = sr.author_id
     WHERE sr.share_id = $1
     ORDER BY sr.created_at ASC`,
    [shareId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    shareId: row.share_id,
    authorId: row.author_id,
    targetType: row.target_type,
    targetId: row.target_id,
    emoji: row.emoji,
    createdAt: parseInt(row.created_at),
    author: {
      id: row.author_id,
      username: row.username,
    },
  }));
}

export async function getShareReaction(reactionId: string): Promise<DbShareReaction | null> {
  const result = await getPool().query(
    `SELECT id, share_id, author_id, target_type, target_id, emoji, created_at
     FROM share_reactions WHERE id = $1`,
    [reactionId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    shareId: row.share_id,
    authorId: row.author_id,
    targetType: row.target_type,
    targetId: row.target_id,
    emoji: row.emoji,
    createdAt: parseInt(row.created_at),
  };
}

// ============ Count Functions for Rate Limiting ============

export async function countUserShares(userId: string): Promise<number> {
  const result = await getPool().query(
    `SELECT COUNT(*) as count FROM project_shares WHERE owner_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}

export async function countShareComments(shareId: string): Promise<number> {
  const result = await getPool().query(
    `SELECT COUNT(*) as count FROM share_comments WHERE share_id = $1 AND deleted_at IS NULL`,
    [shareId]
  );
  return parseInt(result.rows[0].count);
}

export async function countShareReactions(shareId: string): Promise<number> {
  const result = await getPool().query(
    `SELECT COUNT(*) as count FROM share_reactions WHERE share_id = $1`,
    [shareId]
  );
  return parseInt(result.rows[0].count);
}

export async function countPendingFriendRequests(userId: string): Promise<number> {
  const result = await getPool().query(
    `SELECT COUNT(*) as count FROM friend_requests WHERE from_user_id = $1 AND status = 'pending'`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}

export async function countActivePartiesForUser(userId: string): Promise<number> {
  const result = await getPool().query(
    `SELECT COUNT(*) as count FROM parties
     WHERE creator_id = $1 AND status IN ('active', 'scheduled')`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}
