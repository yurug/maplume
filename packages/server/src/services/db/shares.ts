/**
 * Project shares database operations
 */

import { randomUUID } from 'crypto';
import { getPool } from './connection';
import type { DbUser } from './users';
import type { AvatarData } from '@maplume/shared';

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

export async function countUserShares(userId: string): Promise<number> {
  const result = await getPool().query(
    `SELECT COUNT(*) as count FROM project_shares WHERE owner_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}

// ============ Share Comments ============

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

export async function countShareComments(shareId: string): Promise<number> {
  const result = await getPool().query(
    `SELECT COUNT(*) as count FROM share_comments WHERE share_id = $1 AND deleted_at IS NULL`,
    [shareId]
  );
  return parseInt(result.rows[0].count);
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

export async function countShareReactions(shareId: string): Promise<number> {
  const result = await getPool().query(
    `SELECT COUNT(*) as count FROM share_reactions WHERE share_id = $1`,
    [shareId]
  );
  return parseInt(result.rows[0].count);
}
