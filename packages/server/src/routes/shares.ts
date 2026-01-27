import { Router, Request, Response } from 'express';
import { createError } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import * as db from '../services/database';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/shares - Create or update a project share
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const { sharedWithId, projectLocalId, shareType, encryptedData, ephemeralPublicKey, dataHash } = req.body;

    // Validate required fields
    if (!sharedWithId || typeof sharedWithId !== 'string') {
      throw createError('sharedWithId is required', 400, 'INVALID_SHARED_WITH_ID');
    }
    if (!projectLocalId || typeof projectLocalId !== 'string') {
      throw createError('projectLocalId is required', 400, 'INVALID_PROJECT_LOCAL_ID');
    }
    if (!shareType || !['full', 'stats_only'].includes(shareType)) {
      throw createError('shareType must be "full" or "stats_only"', 400, 'INVALID_SHARE_TYPE');
    }
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw createError('encryptedData is required', 400, 'INVALID_ENCRYPTED_DATA');
    }
    if (!ephemeralPublicKey || typeof ephemeralPublicKey !== 'string') {
      throw createError('ephemeralPublicKey is required', 400, 'INVALID_EPHEMERAL_KEY');
    }
    if (!dataHash || typeof dataHash !== 'string') {
      throw createError('dataHash is required', 400, 'INVALID_DATA_HASH');
    }

    // Verify the recipient exists
    const recipient = await db.getUserById(sharedWithId);
    if (!recipient) {
      throw createError('Recipient user not found', 404, 'USER_NOT_FOUND');
    }

    // Verify they are friends
    const areFriends = await db.areFriends(userId, sharedWithId);
    if (!areFriends) {
      throw createError('You can only share projects with friends', 403, 'NOT_FRIENDS');
    }

    // Create or update the share
    const shareId = await db.createProjectShare(
      userId,
      sharedWithId,
      projectLocalId,
      shareType,
      encryptedData,
      ephemeralPublicKey,
      dataHash
    );

    res.status(201).json({ shareId });
  } catch (err) {
    next(err);
  }
});

// GET /api/shares/owned - List projects I'm sharing
router.get('/owned', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const shares = await db.getProjectSharesOwned(userId);

    res.json({
      shares: shares.map((s) => ({
        id: s.id,
        projectLocalId: s.projectLocalId,
        shareType: s.shareType,
        sharedWith: {
          id: s.sharedWith.id,
          username: s.sharedWith.username,
          avatarPreset: s.sharedWith.avatarPreset,
        },
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/shares/received - List projects shared with me
router.get('/received', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const shares = await db.getProjectSharesReceived(userId);

    res.json({
      shares: shares.map((s) => ({
        id: s.id,
        projectLocalId: s.projectLocalId,
        shareType: s.shareType,
        owner: {
          id: s.owner.id,
          username: s.owner.username,
          avatarPreset: s.owner.avatarPreset,
        },
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/shares/:shareId - Get specific share data
router.get('/:shareId', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const shareId = req.params.shareId as string;

    const share = await db.getProjectShare(shareId);
    if (!share) {
      throw createError('Share not found', 404, 'SHARE_NOT_FOUND');
    }

    // Only owner or recipient can access
    if (share.ownerId !== userId && share.sharedWithId !== userId) {
      throw createError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Check if revoked
    if (share.revokedAt) {
      throw createError('Share has been revoked', 404, 'SHARE_REVOKED');
    }

    res.json({
      share: {
        id: share.id,
        projectLocalId: share.projectLocalId,
        shareType: share.shareType,
        owner: {
          id: share.owner.id,
          username: share.owner.username,
          avatarPreset: share.owner.avatarPreset,
        },
        createdAt: share.createdAt,
        updatedAt: share.updatedAt,
      },
      encryptedData: share.encryptedData,
      ephemeralPublicKey: share.ephemeralPublicKey,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/shares/:shareId - Revoke a share
router.delete('/:shareId', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const shareId = req.params.shareId as string;

    const success = await db.revokeProjectShare(shareId, userId);
    if (!success) {
      throw createError('Share not found or already revoked', 404, 'SHARE_NOT_FOUND');
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
