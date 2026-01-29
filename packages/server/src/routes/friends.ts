import { Router, Request, Response } from 'express';
import { createError } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import * as db from '../services/database';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/friends - List friends
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const friends = await db.getFriends(userId);

    res.json({
      friends: friends.map((f) => ({
        id: f.id,
        username: f.username,
        avatarPreset: f.avatarPreset,
        bio: f.bio,
        lastSeenAt: f.lastSeenAt,
        publicKey: f.encryptionPublicKey, // X25519 encryption public key for sharing
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/friends/requests - List pending friend requests
router.get('/requests', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;

    const [received, sent] = await Promise.all([
      db.getPendingFriendRequests(userId),
      db.getSentFriendRequests(userId),
    ]);

    res.json({
      received: received.map((r) => ({
        id: r.id,
        fromUser: {
          id: r.fromUser.id,
          username: r.fromUser.username,
          avatarPreset: r.fromUser.avatarPreset,
        },
        message: r.message,
        createdAt: r.createdAt,
      })),
      sent: sent.map((r) => ({
        id: r.id,
        toUser: {
          id: r.toUser.id,
          username: r.toUser.username,
          avatarPreset: r.toUser.avatarPreset,
        },
        message: r.message,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/friends/request - Send friend request
router.post('/request', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const { username, message } = req.body;

    if (!username || typeof username !== 'string') {
      throw createError('Username is required', 400, 'INVALID_USERNAME');
    }

    // Find the user
    const targetUser = await db.getUserByUsername(username);
    if (!targetUser) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Can't friend yourself
    if (targetUser.id === userId) {
      throw createError('Cannot send friend request to yourself', 400, 'INVALID_REQUEST');
    }

    // Check if already friends
    const alreadyFriends = await db.areFriends(userId, targetUser.id);
    if (alreadyFriends) {
      throw createError('Already friends with this user', 400, 'ALREADY_FRIENDS');
    }

    // Check if there's already a pending request from them to us
    const existingRequest = await db.getFriendRequest(targetUser.id, userId);
    if (existingRequest && existingRequest.status === 'pending') {
      // Auto-accept their request instead
      await db.acceptFriendRequest(existingRequest.id, userId);
      return res.json({ success: true, autoAccepted: true });
    }

    // Create the friend request
    const requestId = await db.createFriendRequest(userId, targetUser.id, message);

    res.status(201).json({ requestId });
  } catch (err) {
    next(err);
  }
});

// POST /api/friends/accept - Accept friend request
router.post('/accept', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const { requestId } = req.body;

    if (!requestId || typeof requestId !== 'string') {
      throw createError('Request ID is required', 400, 'INVALID_REQUEST_ID');
    }

    const success = await db.acceptFriendRequest(requestId, userId);
    if (!success) {
      throw createError('Friend request not found or already responded', 404, 'REQUEST_NOT_FOUND');
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/friends/reject - Reject friend request
router.post('/reject', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const { requestId } = req.body;

    if (!requestId || typeof requestId !== 'string') {
      throw createError('Request ID is required', 400, 'INVALID_REQUEST_ID');
    }

    const success = await db.rejectFriendRequest(requestId, userId);
    if (!success) {
      throw createError('Friend request not found or already responded', 404, 'REQUEST_NOT_FOUND');
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/friends/cancel - Cancel sent friend request
router.post('/cancel', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const { requestId } = req.body;

    if (!requestId || typeof requestId !== 'string') {
      throw createError('Request ID is required', 400, 'INVALID_REQUEST_ID');
    }

    const success = await db.cancelFriendRequest(requestId, userId);
    if (!success) {
      throw createError('Friend request not found', 404, 'REQUEST_NOT_FOUND');
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/friends/:friendId - Remove friend
router.delete('/:friendId', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const friendId = req.params.friendId as string;

    // Verify they are friends
    const areFriends = await db.areFriends(userId, friendId);
    if (!areFriends) {
      throw createError('Not friends with this user', 404, 'NOT_FRIENDS');
    }

    await db.removeFriend(userId, friendId);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
