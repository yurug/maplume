import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import * as db from '../services/database';

const router = Router();

// GET /api/users/me
router.get('/me', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const user = await db.getUserById(userId);

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      id: user.id,
      username: user.username,
      avatarPreset: user.avatarPreset,
      bio: user.bio,
      statsPublic: user.statsPublic,
      searchable: user.searchable,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/me
router.put('/me', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const { avatarPreset, bio, statsPublic, searchable } = req.body;

    const updates: Record<string, unknown> = {};

    if (avatarPreset !== undefined) {
      updates.avatarPreset = avatarPreset;
    }
    if (bio !== undefined) {
      updates.bio = bio;
    }
    if (statsPublic !== undefined) {
      updates.statsPublic = Boolean(statsPublic);
    }
    if (searchable !== undefined) {
      updates.searchable = Boolean(searchable);
    }

    await db.updateUser(userId, updates);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/search
router.get('/search', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const queryParam = req.query.q;
    const query = typeof queryParam === 'string' ? queryParam : '';

    if (!query || query.length < 2) {
      throw createError('Query must be at least 2 characters', 400, 'INVALID_QUERY');
    }

    const users = await db.searchUsers(query, 20);

    res.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        avatarPreset: u.avatarPreset,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const user = await db.getUserById(id);

    if (!user || user.deletedAt) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Only return public info
    res.json({
      id: user.id,
      username: user.username,
      avatarPreset: user.avatarPreset,
      statsPublic: user.statsPublic,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/me (soft delete)
router.delete('/me', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    await db.softDeleteUser(userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
