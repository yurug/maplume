/**
 * Parties routes - Writing party management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { config } from '../config';
import {
  createParty,
  getPartyById,
  getPartyByJoinCode,
  getActivePartiesForUser,
  getUpcomingPartiesForUser,
  getPartyHistoryForUser,
  startParty,
  endParty,
  addPartyParticipant,
  getPartyParticipants,
  updateParticipantProgress,
  leaveParty,
  isParticipant,
  createPartyInvitesBatch,
  getPendingInvitesForUser,
  respondToInvite,
  getCreatorInfo,
  filterFriends,
  countActivePartiesForUser,
  createPartyMessage,
  getPartyMessages,
  countPartyMessages,
  deleteOldestPartyMessages,
  DbParty,
} from '../services/database';
import type {
  Party,
  PartyParticipant,
  PartyInvite,
  PartyMessage,
  CreatePartyRequest,
  CreatePartyResponse,
  GetPartiesResponse,
  GetPartyHistoryResponse,
  JoinPartyByCodeResponse,
  UpdatePartyProgressRequest,
  UpdatePartyProgressResponse,
  SendPartyMessageRequest,
  SendPartyMessageResponse,
  GetPartyMessagesResponse,
} from '@maplume/shared';

const router = Router();

// Helper to convert DbParty to API Party type
async function toApiParty(dbParty: DbParty & { participantCount?: number; isParticipating?: boolean; creatorUsername?: string; creatorAvatarPreset?: string | null }, includeParticipants = false): Promise<Party> {
  // Use pre-fetched creator info from JOINed queries when available, avoiding N+1
  const creator = dbParty.creatorUsername
    ? { id: dbParty.creatorId, username: dbParty.creatorUsername, avatarPreset: dbParty.creatorAvatarPreset ?? null }
    : await getCreatorInfo(dbParty.creatorId);
  let participants: PartyParticipant[] | undefined;

  if (includeParticipants) {
    const dbParticipants = await getPartyParticipants(dbParty.id);
    participants = dbParticipants.map((p) => ({
      id: p.userId,
      username: p.user.username,
      avatarPreset: p.user.avatarPreset,
      wordsWritten: p.wordsWritten,
      startWordCount: p.startWordCount,
      currentWordCount: p.currentWordCount,
      joinedAt: p.joinedAt,
      lastUpdate: p.lastUpdate,
      isCreator: p.userId === dbParty.creatorId,
    }));
  }

  return {
    id: dbParty.id,
    title: dbParty.title,
    creator: creator || { id: dbParty.creatorId, username: 'Unknown', avatarPreset: null },
    scheduledStart: dbParty.scheduledStart,
    actualStart: dbParty.actualStart,
    durationMinutes: dbParty.durationMinutes,
    endedAt: dbParty.endedAt,
    joinCode: dbParty.joinCode,
    rankingEnabled: dbParty.rankingEnabled,
    status: dbParty.status,
    participantCount: dbParty.participantCount ?? 0,
    participants,
    isParticipating: dbParty.isParticipating,
  };
}

// Create a new party
router.post('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { title, durationMinutes, scheduledStart, rankingEnabled = true, inviteFriendIds } = req.body as CreatePartyRequest;

    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required', code: 'INVALID_TITLE' });
    }

    if (title.length > config.limits.maxTitleLength) {
      return res.status(400).json({
        error: `Title too long (max ${config.limits.maxTitleLength} characters)`,
        code: 'TITLE_TOO_LONG'
      });
    }

    if (!durationMinutes || durationMinutes < 5 || durationMinutes > 525600) {
      return res.status(400).json({ error: 'Duration must be between 5 minutes and 1 year', code: 'INVALID_DURATION' });
    }

    // Check active party limit
    const activePartyCount = await countActivePartiesForUser(userId);
    if (activePartyCount >= config.limits.maxActivePartiesPerUser) {
      return res.status(400).json({
        error: `Active party limit reached (max ${config.limits.maxActivePartiesPerUser})`,
        code: 'PARTY_LIMIT_REACHED'
      });
    }

    // Create party
    const dbParty = await createParty(userId, title.trim(), durationMinutes, scheduledStart ?? null, rankingEnabled);

    // Send invites if specified (using batch operations to avoid N+1 queries)
    if (inviteFriendIds && inviteFriendIds.length > 0) {
      const validFriendIds = await filterFriends(userId, inviteFriendIds);
      if (validFriendIds.length > 0) {
        await createPartyInvitesBatch(dbParty.id, userId, validFriendIds);
      }
    }

    const party = await toApiParty({ ...dbParty, participantCount: 1, isParticipating: true }, true);

    res.status(201).json({ party } as CreatePartyResponse);
  } catch (error) {
    next(error);
  }
});

// Get active, upcoming parties, and invites
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const [activeDb, upcomingDb, invitesDb] = await Promise.all([
      getActivePartiesForUser(userId),
      getUpcomingPartiesForUser(userId),
      getPendingInvitesForUser(userId),
    ]);

    const active = await Promise.all(activeDb.map((p) => toApiParty(p, true)));
    const upcoming = await Promise.all(upcomingDb.map((p) => toApiParty(p)));

    const invites: PartyInvite[] = invitesDb.map((inv) => ({
      id: inv.id,
      party: {
        id: inv.party.id,
        title: inv.party.title,
        creator: { id: inv.inviter.id, username: inv.inviter.username, avatarPreset: inv.inviter.avatarPreset },
        scheduledStart: inv.party.scheduledStart,
        durationMinutes: inv.party.durationMinutes,
        status: inv.party.status,
      },
      invitedBy: { id: inv.inviter.id, username: inv.inviter.username, avatarPreset: inv.inviter.avatarPreset },
      createdAt: inv.createdAt,
    }));

    res.json({ active, upcoming, invites } as GetPartiesResponse);
  } catch (error) {
    next(error);
  }
});

// Get party history
router.get('/history', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const historyDb = await getPartyHistoryForUser(userId);
    const parties = await Promise.all(historyDb.map((p) => toApiParty(p, true)));

    res.json({ parties } as GetPartyHistoryResponse);
  } catch (error) {
    next(error);
  }
});

// Preview party by join code (unauthenticated preview info)
router.get('/join/:code', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.params.code as string;

    const dbParty = await getPartyByJoinCode(code);
    if (!dbParty) {
      return res.status(404).json({ error: 'Party not found', code: 'PARTY_NOT_FOUND' });
    }

    const participants = await getPartyParticipants(dbParty.id);
    const party = await toApiParty({ ...dbParty, participantCount: participants.length });

    res.json({ party });
  } catch (error) {
    next(error);
  }
});

// Join party by code
router.post('/join/:code', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const code = req.params.code as string;
    const { startWordCount = 0 } = req.body;

    const dbParty = await getPartyByJoinCode(code);
    if (!dbParty) {
      return res.status(404).json({ error: 'Party not found', code: 'PARTY_NOT_FOUND' });
    }

    if (dbParty.status === 'ended' || dbParty.status === 'cancelled') {
      return res.status(400).json({ error: 'Party has ended', code: 'PARTY_ENDED' });
    }

    // Check if already a participant
    const alreadyIn = await isParticipant(dbParty.id, userId);
    if (!alreadyIn) {
      await addPartyParticipant(dbParty.id, userId, startWordCount);
    }

    const participants = await getPartyParticipants(dbParty.id);
    const party = await toApiParty({ ...dbParty, participantCount: participants.length, isParticipating: true }, true);

    res.json({ party } as JoinPartyByCodeResponse);
  } catch (error) {
    next(error);
  }
});

// Get specific party details
router.get('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const partyId = req.params.id as string;

    const dbParty = await getPartyById(partyId);
    if (!dbParty) {
      return res.status(404).json({ error: 'Party not found', code: 'PARTY_NOT_FOUND' });
    }

    const participants = await getPartyParticipants(dbParty.id);
    const isParticipating = participants.some((p) => p.userId === userId);
    const party = await toApiParty({ ...dbParty, participantCount: participants.length, isParticipating }, true);

    res.json({ party });
  } catch (error) {
    next(error);
  }
});

// Join party by invite
router.post('/:id/join', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const partyId = req.params.id as string;
    const { startWordCount = 0, inviteId } = req.body;

    const dbParty = await getPartyById(partyId);
    if (!dbParty) {
      return res.status(404).json({ error: 'Party not found', code: 'PARTY_NOT_FOUND' });
    }

    if (dbParty.status === 'ended' || dbParty.status === 'cancelled') {
      return res.status(400).json({ error: 'Party has ended', code: 'PARTY_ENDED' });
    }

    // Accept invite if provided
    if (inviteId) {
      await respondToInvite(inviteId, userId, true);
    }

    // Check if already a participant
    const alreadyIn = await isParticipant(dbParty.id, userId);
    if (!alreadyIn) {
      await addPartyParticipant(dbParty.id, userId, startWordCount);
    }

    const participants = await getPartyParticipants(dbParty.id);
    const party = await toApiParty({ ...dbParty, participantCount: participants.length, isParticipating: true }, true);

    res.json({ party });
  } catch (error) {
    next(error);
  }
});

// Leave party
router.post('/:id/leave', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const partyId = req.params.id as string;

    const dbParty = await getPartyById(partyId);
    if (!dbParty) {
      return res.status(404).json({ error: 'Party not found', code: 'PARTY_NOT_FOUND' });
    }

    await leaveParty(partyId, userId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Update word count progress
router.post('/:id/progress', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const partyId = req.params.id as string;
    const { currentWordCount } = req.body as UpdatePartyProgressRequest;

    if (typeof currentWordCount !== 'number' || currentWordCount < 0) {
      return res.status(400).json({ error: 'Invalid word count', code: 'INVALID_WORD_COUNT' });
    }

    const dbParty = await getPartyById(partyId);
    if (!dbParty) {
      return res.status(404).json({ error: 'Party not found', code: 'PARTY_NOT_FOUND' });
    }

    if (dbParty.status !== 'active') {
      return res.status(400).json({ error: 'Party is not active', code: 'PARTY_NOT_ACTIVE' });
    }

    const wordsWritten = await updateParticipantProgress(partyId, userId, currentWordCount);

    res.json({ success: true, wordsWritten } as UpdatePartyProgressResponse);
  } catch (error) {
    next(error);
  }
});

// Invite friends to party
router.post('/:id/invite', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const partyId = req.params.id as string;
    const { friendIds } = req.body;

    const dbParty = await getPartyById(partyId);
    if (!dbParty) {
      return res.status(404).json({ error: 'Party not found', code: 'PARTY_NOT_FOUND' });
    }

    // Only creator or participant can invite
    const isInParty = await isParticipant(dbParty.id, userId);
    if (!isInParty && dbParty.creatorId !== userId) {
      return res.status(403).json({ error: 'Not authorized to invite', code: 'NOT_AUTHORIZED' });
    }

    if (!friendIds || !Array.isArray(friendIds)) {
      return res.status(400).json({ error: 'Invalid friend IDs', code: 'INVALID_FRIENDS' });
    }

    // Use batch operations to avoid N+1 queries
    const validFriendIds = await filterFriends(userId, friendIds);
    if (validFriendIds.length > 0) {
      await createPartyInvitesBatch(dbParty.id, userId, validFriendIds);
    }

    res.json({ success: true, invited: validFriendIds });
  } catch (error) {
    next(error);
  }
});

// End party (creator only)
router.post('/:id/end', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const partyId = req.params.id as string;

    const dbParty = await getPartyById(partyId);
    if (!dbParty) {
      return res.status(404).json({ error: 'Party not found', code: 'PARTY_NOT_FOUND' });
    }

    if (dbParty.creatorId !== userId) {
      return res.status(403).json({ error: 'Only the creator can end the party', code: 'NOT_CREATOR' });
    }

    await endParty(partyId);

    const participants = await getPartyParticipants(dbParty.id);
    const party = await toApiParty({ ...dbParty, status: 'ended', endedAt: Date.now(), participantCount: participants.length }, true);

    res.json({ party });
  } catch (error) {
    next(error);
  }
});

// Start a scheduled party (creator only)
router.post('/:id/start', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const partyId = req.params.id as string;

    const dbParty = await getPartyById(partyId);
    if (!dbParty) {
      return res.status(404).json({ error: 'Party not found', code: 'PARTY_NOT_FOUND' });
    }

    if (dbParty.creatorId !== userId) {
      return res.status(403).json({ error: 'Only the creator can start the party', code: 'NOT_CREATOR' });
    }

    if (dbParty.status !== 'scheduled') {
      return res.status(400).json({ error: 'Party is not scheduled', code: 'NOT_SCHEDULED' });
    }

    await startParty(partyId);

    const updatedParty = await getPartyById(partyId);
    const participants = await getPartyParticipants(partyId);
    const party = await toApiParty({ ...updatedParty!, participantCount: participants.length, isParticipating: true }, true);

    res.json({ party });
  } catch (error) {
    next(error);
  }
});

// Decline an invite
router.post('/invites/:inviteId/decline', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const inviteId = req.params.inviteId as string;

    await respondToInvite(inviteId, userId, false);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============ Party Messages (Ephemeral Chat) ============

// Send a message to party chat
router.post('/:id/messages', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const partyId = req.params.id as string;
    const { content } = req.body as SendPartyMessageRequest;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required', code: 'INVALID_CONTENT' });
    }

    if (content.length > config.limits.maxPartyMessageLength) {
      return res.status(400).json({
        error: `Message too long (max ${config.limits.maxPartyMessageLength} characters)`,
        code: 'MESSAGE_TOO_LONG'
      });
    }

    // Check party exists and is active
    const dbParty = await getPartyById(partyId);
    if (!dbParty) {
      return res.status(404).json({ error: 'Party not found', code: 'PARTY_NOT_FOUND' });
    }

    if (dbParty.status !== 'active') {
      return res.status(400).json({ error: 'Party is not active', code: 'PARTY_NOT_ACTIVE' });
    }

    // Check user is a participant
    const isInParty = await isParticipant(partyId, userId);
    if (!isInParty) {
      return res.status(403).json({ error: 'Not a participant', code: 'NOT_PARTICIPANT' });
    }

    // Check message limit and delete oldest if needed
    const messageCount = await countPartyMessages(partyId);
    if (messageCount >= config.limits.maxMessagesPerParty) {
      // Delete oldest messages to make room (keep maxMessagesPerParty - 1)
      await deleteOldestPartyMessages(partyId, config.limits.maxMessagesPerParty - 1);
    }

    // Create message
    const dbMessage = await createPartyMessage(partyId, userId, content.trim());

    const message: PartyMessage = {
      id: dbMessage.id,
      partyId: dbMessage.partyId,
      author: dbMessage.author,
      content: dbMessage.content,
      createdAt: dbMessage.createdAt,
    };

    res.status(201).json({ message } as SendPartyMessageResponse);
  } catch (error) {
    next(error);
  }
});

// Get party messages
router.get('/:id/messages', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const partyId = req.params.id as string;
    const since = req.query.since ? parseInt(req.query.since as string, 10) : undefined;

    // Check party exists
    const dbParty = await getPartyById(partyId);
    if (!dbParty) {
      return res.status(404).json({ error: 'Party not found', code: 'PARTY_NOT_FOUND' });
    }

    // Check user is a participant
    const isInParty = await isParticipant(partyId, userId);
    if (!isInParty) {
      return res.status(403).json({ error: 'Not a participant', code: 'NOT_PARTICIPANT' });
    }

    // Get messages
    const dbMessages = await getPartyMessages(partyId, since);

    const messages: PartyMessage[] = dbMessages.map((m) => ({
      id: m.id,
      partyId: m.partyId,
      author: m.author,
      content: m.content,
      createdAt: m.createdAt,
    }));

    res.json({ messages } as GetPartyMessagesResponse);
  } catch (error) {
    next(error);
  }
});

export default router;
