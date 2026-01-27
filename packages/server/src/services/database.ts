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
