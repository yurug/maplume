/**
 * Party messages database operations
 */

import { randomUUID } from 'crypto';
import { getPool } from './connection';
import type { AvatarData } from '@maplume/shared';

export interface DbPartyMessage {
  id: string;
  partyId: string;
  authorId: string;
  content: string;
  createdAt: number;
}

export async function createPartyMessage(
  partyId: string,
  authorId: string,
  content: string
): Promise<DbPartyMessage & { author: { id: string; username: string; avatarPreset: string | null; avatarData: AvatarData | null } }> {
  const id = randomUUID();
  const now = Date.now();

  await getPool().query(
    `INSERT INTO party_messages (id, party_id, author_id, content, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, partyId, authorId, content, now]
  );

  // Fetch author info
  const authorResult = await getPool().query(
    `SELECT username, avatar_preset, avatar_data FROM users WHERE id = $1`,
    [authorId]
  );

  const author = authorResult.rows[0];

  return {
    id,
    partyId,
    authorId,
    content,
    createdAt: now,
    author: {
      id: authorId,
      username: author.username,
      avatarPreset: author.avatar_preset,
      avatarData: author.avatar_data,
    },
  };
}

export async function getPartyMessages(
  partyId: string,
  since?: number,
  limit = 100
): Promise<Array<DbPartyMessage & { author: { id: string; username: string; avatarPreset: string | null; avatarData: AvatarData | null } }>> {
  let query: string;
  let params: (string | number)[];

  if (since !== undefined && since > 0) {
    // Fetch only messages after the given timestamp
    query = `
      SELECT pm.id, pm.party_id, pm.author_id, pm.content, pm.created_at,
             u.username, u.avatar_preset, u.avatar_data
      FROM party_messages pm
      JOIN users u ON u.id = pm.author_id
      WHERE pm.party_id = $1 AND pm.created_at > $2
      ORDER BY pm.created_at ASC
      LIMIT $3
    `;
    params = [partyId, since, limit];
  } else {
    // Fetch last N messages
    query = `
      SELECT pm.id, pm.party_id, pm.author_id, pm.content, pm.created_at,
             u.username, u.avatar_preset, u.avatar_data
      FROM party_messages pm
      JOIN users u ON u.id = pm.author_id
      WHERE pm.party_id = $1
      ORDER BY pm.created_at DESC
      LIMIT $2
    `;
    params = [partyId, limit];
  }

  const result = await getPool().query(query, params);

  // If we fetched in DESC order, reverse to get chronological order
  const rows = since !== undefined && since > 0 ? result.rows : result.rows.reverse();

  return rows.map((row) => ({
    id: row.id,
    partyId: row.party_id,
    authorId: row.author_id,
    content: row.content,
    createdAt: parseInt(row.created_at),
    author: {
      id: row.author_id,
      username: row.username,
      avatarPreset: row.avatar_preset,
      avatarData: row.avatar_data,
    },
  }));
}

export async function deletePartyMessages(partyId: string): Promise<void> {
  await getPool().query(
    `DELETE FROM party_messages WHERE party_id = $1`,
    [partyId]
  );
}

export async function countPartyMessages(partyId: string): Promise<number> {
  const result = await getPool().query(
    `SELECT COUNT(*) as count FROM party_messages WHERE party_id = $1`,
    [partyId]
  );
  return parseInt(result.rows[0].count);
}

export async function deleteOldestPartyMessages(partyId: string, keepCount: number): Promise<void> {
  // Delete oldest messages, keeping only the most recent keepCount
  await getPool().query(
    `DELETE FROM party_messages
     WHERE party_id = $1
     AND id NOT IN (
       SELECT id FROM party_messages
       WHERE party_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     )`,
    [partyId, keepCount]
  );
}
