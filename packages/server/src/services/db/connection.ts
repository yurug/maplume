/**
 * Database connection management and migrations
 */

import { Pool, PoolClient } from 'pg';
import { config } from '../../config';

let pool: Pool | null = null;

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

    // Migration 008: Party messages (ephemeral chat)
    if (!applied.has('008_party_messages')) {
      console.log('Applying migration: 008_party_messages');

      await client.query(`
        CREATE TABLE party_messages (
          id TEXT PRIMARY KEY,
          party_id TEXT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
          author_id TEXT NOT NULL REFERENCES users(id),
          content TEXT NOT NULL,
          created_at BIGINT NOT NULL
        )
      `);

      await client.query(`CREATE INDEX idx_party_messages_party ON party_messages(party_id, created_at)`);

      await client.query(`INSERT INTO migrations (name, applied_at) VALUES ($1, $2)`, [
        '008_party_messages',
        Date.now(),
      ]);

      console.log('Migration 008_party_messages applied');
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

export function getPool(): Pool {
  if (!pool) throw new Error('Database not initialized');
  return pool;
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
