import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config';
import { createError } from '../middleware/errorHandler';
import * as authService from '../services/auth';
import * as db from '../services/database';

const router = Router();

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: config.rateLimit.login.windowMs,
  max: config.rateLimit.login.max,
  message: { error: 'Too many login attempts', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: config.rateLimit.register.windowMs,
  max: config.rateLimit.register.max,
  message: { error: 'Too many registration attempts', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

const challengeLimiter = rateLimit({
  windowMs: config.rateLimit.challenge.windowMs,
  max: config.rateLimit.challenge.max,
  message: { error: 'Too many challenge requests', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/register
router.post('/register', registerLimiter, async (req: Request, res: Response, next) => {
  try {
    const { username, publicKey, encryptionPublicKey } = req.body;

    if (!username || typeof username !== 'string') {
      throw createError('Username is required', 400, 'INVALID_USERNAME');
    }

    if (!publicKey || typeof publicKey !== 'string') {
      throw createError('Public key is required', 400, 'INVALID_PUBLIC_KEY');
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      throw createError(
        'Username must be 3-30 characters, alphanumeric and underscores only',
        400,
        'INVALID_USERNAME_FORMAT'
      );
    }

    // Check if username exists
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      throw createError('Username already taken', 409, 'USERNAME_EXISTS');
    }

    // Create user (encryptionPublicKey is optional for backward compatibility)
    const userId = await db.createUser(username, publicKey, encryptionPublicKey);

    res.status(201).json({ userId });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/challenge
router.post('/challenge', challengeLimiter, async (req: Request, res: Response, next) => {
  try {
    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      throw createError('Username is required', 400, 'INVALID_USERNAME');
    }

    const user = await db.getUserByUsername(username);
    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    const challenge = authService.generateChallenge();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store challenge temporarily (in-memory for simplicity)
    authService.storeChallenge(user.id, challenge, expiresAt);

    res.json({ challenge, expiresAt });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response, next) => {
  try {
    const { username, challenge, signature } = req.body;

    if (!username || !challenge || !signature) {
      throw createError('Username, challenge, and signature are required', 400, 'MISSING_FIELDS');
    }

    const user = await db.getUserByUsername(username);
    if (!user) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Verify challenge and signature
    const isValid = await authService.verifyLogin(user.id, user.publicKey, challenge, signature);
    if (!isValid) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const { accessToken, refreshToken } = authService.generateTokens(user.id);

    // Store refresh token
    await db.createAuthToken(user.id, refreshToken, req.get('User-Agent') || 'Unknown');

    // Update last seen
    await db.updateLastSeen(user.id);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        avatarPreset: user.avatarPreset,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      throw createError('Refresh token is required', 400, 'MISSING_TOKEN');
    }

    // Verify and refresh
    const result = await authService.refreshAccessToken(refreshToken);
    if (!result) {
      throw createError('Invalid or expired refresh token', 401, 'INVALID_TOKEN');
    }

    res.json({ accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await db.revokeAuthToken(refreshToken);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
