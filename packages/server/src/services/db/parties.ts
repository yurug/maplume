/**
 * Party database operations
 */

import { randomUUID } from 'crypto';
import { getPool } from './connection';
import type { DbUser } from './users';

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
  // Delete all chat messages (ephemeral - messages don't persist after party ends)
  await getPool().query(
    `DELETE FROM party_messages WHERE party_id = $1`,
    [partyId]
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

/**
 * Create multiple party invites in a single transaction.
 * More efficient than calling createPartyInvite in a loop.
 */
export async function createPartyInvitesBatch(
  partyId: string,
  invitedBy: string,
  invitedUserIds: string[]
): Promise<void> {
  if (invitedUserIds.length === 0) return;

  const now = Date.now();
  const values: (string | number)[] = [];
  const placeholders: string[] = [];

  invitedUserIds.forEach((userId, index) => {
    const offset = index * 5;
    placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, 'pending', $${offset + 5})`);
    values.push(randomUUID(), partyId, invitedBy, userId, now);
  });

  await getPool().query(
    `INSERT INTO party_invites (id, party_id, invited_by, invited_user_id, status, created_at)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (party_id, invited_user_id) WHERE status = 'pending' DO NOTHING`,
    values
  );
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

export async function countActivePartiesForUser(userId: string): Promise<number> {
  const result = await getPool().query(
    `SELECT COUNT(*) as count FROM parties
     WHERE creator_id = $1 AND status IN ('active', 'scheduled')`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}
