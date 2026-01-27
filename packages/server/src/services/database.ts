import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { hashToken } from './auth';

let pool: Pool | null = null;

// User type matching database schema
export interface DbUser {
  id: string;
  username: string;
  usernameLower: string;
  publicKey: string;
  avatarPreset: string | null;
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
export async function createUser(username: string, publicKey: string): Promise<string> {
  const id = randomUUID();
  const now = Date.now();

  await getPool().query(
    `INSERT INTO users (id, username, username_lower, public_key, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, username, username.toLowerCase(), publicKey, now]
  );

  return id;
}

export async function getUserByUsername(username: string): Promise<DbUser | null> {
  const result = await getPool().query(
    `SELECT id, username, username_lower, public_key, avatar_preset, bio,
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
    avatarPreset: row.avatar_preset,
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
    `SELECT id, username, username_lower, public_key, avatar_preset, bio,
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
    avatarPreset: row.avatar_preset,
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
    bio: 'bio',
    statsPublic: 'stats_public',
    searchable: 'searchable',
  };

  for (const [key, value] of Object.entries(updates)) {
    const column = columnMap[key];
    if (column) {
      setClauses.push(`${column} = $${paramIndex}`);
      values.push(value);
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

export async function softDeleteUser(id: string): Promise<void> {
  await getPool().query(`UPDATE users SET deleted_at = $1 WHERE id = $2`, [Date.now(), id]);
}

export async function searchUsers(query: string, limit: number): Promise<DbUser[]> {
  const result = await getPool().query(
    `SELECT id, username, username_lower, public_key, avatar_preset, bio,
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
    avatarPreset: row.avatar_preset,
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
            u.username, u.avatar_preset, u.bio
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
      avatarPreset: row.avatar_preset,
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
            u.username, u.avatar_preset, u.bio
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
      avatarPreset: row.avatar_preset,
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
    `SELECT u.id, u.username, u.username_lower, u.public_key, u.avatar_preset, u.bio,
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
    avatarPreset: row.avatar_preset,
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
            u.username, u.avatar_preset, u.bio
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
      avatarPreset: row.avatar_preset,
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
            u.username, u.avatar_preset, u.bio, u.public_key
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
      avatarPreset: row.avatar_preset,
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
            u.username, u.avatar_preset, u.bio, u.public_key
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
      avatarPreset: row.avatar_preset,
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
