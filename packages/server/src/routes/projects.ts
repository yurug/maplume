import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import * as db from '../services/database';

const router = Router();

// POST /api/projects/sync - Upload encrypted project data
router.post('/sync', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const { encryptedBlob, blobHash } = req.body;

    if (!encryptedBlob || typeof encryptedBlob !== 'string') {
      throw createError('Encrypted blob is required', 400, 'MISSING_BLOB');
    }

    if (!blobHash || typeof blobHash !== 'string') {
      throw createError('Blob hash is required', 400, 'MISSING_HASH');
    }

    // Store or update the project data
    await db.upsertProjectData(userId, encryptedBlob, blobHash);

    res.json({
      success: true,
      updatedAt: Date.now(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/sync - Download user's encrypted project data
router.get('/sync', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;

    const projectData = await db.getProjectData(userId);

    if (!projectData) {
      res.json({
        encryptedBlob: null,
        blobHash: null,
        updatedAt: null,
      });
      return;
    }

    res.json({
      encryptedBlob: projectData.encryptedBlob,
      blobHash: projectData.blobHash,
      updatedAt: projectData.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
