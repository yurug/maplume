import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import * as db from '../services/database';
import type { AvatarData } from '@maplume/shared';

const router = Router();

// GET /api/users/me
router.get('/me', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const user = await db.getUserById(userId);

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Build avatarData with uploaded URL if present
    let avatarData = user.avatarData;
    if (avatarData?.type === 'uploaded' && user.avatarImage) {
      avatarData = { ...avatarData, uploadedUrl: user.avatarImage };
    }

    res.json({
      id: user.id,
      username: user.username,
      avatarPreset: user.avatarPreset,
      avatarData,
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
    const { avatarPreset, avatarData, bio, statsPublic, searchable, encryptionPublicKey } = req.body;

    const updates: Record<string, unknown> = {};

    // Handle new avatarData format
    if (avatarData !== undefined) {
      const data = avatarData as AvatarData;
      updates.avatarData = data;
      // Sync avatarPreset for backwards compatibility
      if (data?.type === 'preset' && data.preset) {
        updates.avatarPreset = data.preset;
      } else if (data) {
        updates.avatarPreset = null;
      }
    } else if (avatarPreset !== undefined) {
      // Legacy: update avatarPreset directly
      updates.avatarPreset = avatarPreset;
      // Also update avatarData for forward compatibility
      if (avatarPreset) {
        updates.avatarData = { type: 'preset', preset: avatarPreset };
      }
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

    // Update encryption public key separately (for existing users who didn't have one)
    if (encryptionPublicKey && typeof encryptionPublicKey === 'string') {
      await db.updateEncryptionPublicKey(userId, encryptionPublicKey);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/me/avatar - Upload an avatar image
router.post('/me/avatar', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const { imageData } = req.body;

    if (!imageData || typeof imageData !== 'string') {
      throw createError('Image data is required', 400, 'INVALID_REQUEST');
    }

    // Validate it's a data URL
    if (!imageData.startsWith('data:image/')) {
      throw createError('Invalid image format', 400, 'INVALID_IMAGE_FORMAT');
    }

    // Check size (max 500KB)
    const base64Data = imageData.split(',')[1] || '';
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    if (sizeInBytes > 500 * 1024) {
      throw createError('Image too large (max 500KB)', 400, 'IMAGE_TOO_LARGE');
    }

    // Create avatar data
    const avatarData: AvatarData = {
      type: 'uploaded',
      uploadedUrl: imageData, // Will be stored separately
    };

    // Store avatar data and image
    await db.updateUserAvatar(userId, { type: 'uploaded' }, imageData);

    res.json({
      avatarData: {
        type: 'uploaded',
        uploadedUrl: imageData,
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/me/avatar - Remove uploaded avatar
router.delete('/me/avatar', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    await db.deleteUserAvatar(userId);
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
      users: users.map((u) => {
        // Build avatarData with uploaded URL if present
        let avatarData = u.avatarData;
        if (avatarData?.type === 'uploaded' && u.avatarImage) {
          avatarData = { ...avatarData, uploadedUrl: u.avatarImage };
        }
        return {
          id: u.id,
          username: u.username,
          avatarPreset: u.avatarPreset,
          avatarData,
        };
      }),
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

    // Build avatarData with uploaded URL if present
    let avatarData = user.avatarData;
    if (avatarData?.type === 'uploaded' && user.avatarImage) {
      avatarData = { ...avatarData, uploadedUrl: user.avatarImage };
    }

    // Only return public info
    res.json({
      id: user.id,
      username: user.username,
      avatarPreset: user.avatarPreset,
      avatarData,
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
