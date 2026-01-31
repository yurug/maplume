import { Router, Request, Response } from 'express';
import { createError } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import * as db from '../services/database';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Helper to check if user can access a share (owner or recipient)
async function canAccessShare(shareId: string, userId: string): Promise<boolean> {
  const share = await db.getProjectShare(shareId);
  if (!share || share.revokedAt) return false;
  return share.ownerId === userId || share.sharedWithId === userId;
}

// ============ Comments ============

// POST /api/shares/:shareId/comments - Create a comment
router.post('/:shareId/comments', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const shareId = req.params.shareId as string;
    const { targetType, targetId, encryptedContent, nonce } = req.body;

    // Validate access
    if (!(await canAccessShare(shareId, userId))) {
      throw createError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Validate required fields
    if (!targetType || !['entry', 'note'].includes(targetType)) {
      throw createError('targetType must be "entry" or "note"', 400, 'INVALID_TARGET_TYPE');
    }
    if (!targetId || typeof targetId !== 'string') {
      throw createError('targetId is required', 400, 'INVALID_TARGET_ID');
    }
    if (!encryptedContent || typeof encryptedContent !== 'string') {
      throw createError('encryptedContent is required', 400, 'INVALID_CONTENT');
    }
    if (!nonce || typeof nonce !== 'string') {
      throw createError('nonce is required', 400, 'INVALID_NONCE');
    }

    const commentId = await db.createShareComment(
      shareId,
      userId,
      targetType,
      targetId,
      encryptedContent,
      nonce
    );

    // Get the created comment with author info
    const comments = await db.getShareComments(shareId);
    const comment = comments.find(c => c.id === commentId);

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

// GET /api/shares/:shareId/comments - List all comments for a share
router.get('/:shareId/comments', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const shareId = req.params.shareId as string;

    // Validate access
    if (!(await canAccessShare(shareId, userId))) {
      throw createError('Access denied', 403, 'ACCESS_DENIED');
    }

    const comments = await db.getShareComments(shareId);

    res.json({
      comments: comments.map(c => ({
        id: c.id,
        shareId: c.shareId,
        author: c.author,
        targetType: c.targetType,
        targetId: c.targetId,
        encryptedContent: c.encryptedContent,
        nonce: c.nonce,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/shares/:shareId/comments/:commentId - Update a comment
router.put('/:shareId/comments/:commentId', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const shareId = req.params.shareId as string;
    const commentId = req.params.commentId as string;
    const { encryptedContent, nonce } = req.body;

    // Validate access to share
    if (!(await canAccessShare(shareId, userId))) {
      throw createError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Validate required fields
    if (!encryptedContent || typeof encryptedContent !== 'string') {
      throw createError('encryptedContent is required', 400, 'INVALID_CONTENT');
    }
    if (!nonce || typeof nonce !== 'string') {
      throw createError('nonce is required', 400, 'INVALID_NONCE');
    }

    // Update (only author can update)
    const success = await db.updateShareComment(commentId, userId, encryptedContent, nonce);
    if (!success) {
      throw createError('Comment not found or not authorized', 404, 'COMMENT_NOT_FOUND');
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/shares/:shareId/comments/:commentId - Delete a comment
router.delete('/:shareId/comments/:commentId', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const shareId = req.params.shareId as string;
    const commentId = req.params.commentId as string;

    // Validate access to share
    if (!(await canAccessShare(shareId, userId))) {
      throw createError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Delete (only author can delete)
    const success = await db.deleteShareComment(commentId, userId);
    if (!success) {
      throw createError('Comment not found or not authorized', 404, 'COMMENT_NOT_FOUND');
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ============ Reactions ============

// POST /api/shares/:shareId/reactions - Add a reaction
router.post('/:shareId/reactions', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const shareId = req.params.shareId as string;
    const { targetType, targetId, emoji } = req.body;

    // Validate access
    if (!(await canAccessShare(shareId, userId))) {
      throw createError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Validate required fields
    if (!targetType || !['entry', 'note', 'comment'].includes(targetType)) {
      throw createError('targetType must be "entry", "note", or "comment"', 400, 'INVALID_TARGET_TYPE');
    }
    if (!targetId || typeof targetId !== 'string') {
      throw createError('targetId is required', 400, 'INVALID_TARGET_ID');
    }
    if (!emoji || typeof emoji !== 'string') {
      throw createError('emoji is required', 400, 'INVALID_EMOJI');
    }

    // Limit emoji to reasonable length (most emojis are 1-4 chars, but some are longer due to ZWJ)
    if (emoji.length > 20) {
      throw createError('Invalid emoji', 400, 'INVALID_EMOJI');
    }

    const reactionId = await db.addShareReaction(
      shareId,
      userId,
      targetType,
      targetId,
      emoji
    );

    res.status(201).json({ reactionId });
  } catch (err) {
    next(err);
  }
});

// GET /api/shares/:shareId/reactions - List all reactions for a share
router.get('/:shareId/reactions', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const shareId = req.params.shareId as string;

    // Validate access
    if (!(await canAccessShare(shareId, userId))) {
      throw createError('Access denied', 403, 'ACCESS_DENIED');
    }

    const reactions = await db.getShareReactions(shareId);

    res.json({
      reactions: reactions.map(r => ({
        id: r.id,
        shareId: r.shareId,
        author: r.author,
        targetType: r.targetType,
        targetId: r.targetId,
        emoji: r.emoji,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/shares/:shareId/reactions/:reactionId - Remove a reaction
router.delete('/:shareId/reactions/:reactionId', async (req: Request, res: Response, next) => {
  try {
    const userId = req.userId!;
    const shareId = req.params.shareId as string;
    const reactionId = req.params.reactionId as string;

    // Validate access to share
    if (!(await canAccessShare(shareId, userId))) {
      throw createError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Delete (only author can delete)
    const success = await db.removeShareReaction(reactionId, userId);
    if (!success) {
      throw createError('Reaction not found or not authorized', 404, 'REACTION_NOT_FOUND');
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
