/**
 * Friends database operations
 */

import { randomUUID } from 'crypto';
import { getPool } from './connection';
import type { DbUser } from './users';

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

/**
 * Filter an array of user IDs to only include those who are friends with userId.
 * Uses a single query instead of N queries.
 */
export async function filterFriends(userId: string, candidateIds: string[]): Promise<string[]> {
  if (candidateIds.length === 0) return [];

  const result = await getPool().query(
    `SELECT friend_id FROM friendships WHERE user_id = $1 AND friend_id = ANY($2)`,
    [userId, candidateIds]
  );

  return result.rows.map((row: { friend_id: string }) => row.friend_id);
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

export async function countPendingFriendRequests(userId: string): Promise<number> {
  const result = await getPool().query(
    `SELECT COUNT(*) as count FROM friend_requests WHERE from_user_id = $1 AND status = 'pending'`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}
