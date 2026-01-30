import { Router } from 'express';
import { Pool } from 'pg';
import { config } from '../config';

const router = Router();

// Initialize pool for stats queries
function getPool(): Pool {
  return new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });
}

interface ServerStats {
  users: {
    total: number;
    active: number;
    deleted: number;
    withAvatar: number;
    withBio: number;
    searchable: number;
    recentlyActive: number; // Last 7 days
  };
  social: {
    friendships: number;
    pendingFriendRequests: number;
  };
  parties: {
    total: number;
    active: number;
    scheduled: number;
    ended: number;
    cancelled: number;
  };
  projectShares: {
    total: number;
    active: number;
  };
  activity: {
    loginsLast24h: number;
    successfulLogins: number;
    failedLogins: number;
  };
  recentUsers: Array<{
    username: string;
    createdAt: number;
    hasAvatar: boolean;
  }>;
  timestamp: number;
}

// GET /api/stats - Get server statistics (public endpoint for admin use)
router.get('/', async (req, res) => {
  const pool = getPool();

  try {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Users stats
    const usersResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as active,
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted,
        COUNT(*) FILTER (WHERE (avatar_data IS NOT NULL OR avatar_preset IS NOT NULL) AND deleted_at IS NULL) as with_avatar,
        COUNT(*) FILTER (WHERE bio IS NOT NULL AND bio != '' AND deleted_at IS NULL) as with_bio,
        COUNT(*) FILTER (WHERE searchable = true AND deleted_at IS NULL) as searchable,
        COUNT(*) FILTER (WHERE last_seen_at > $1 AND deleted_at IS NULL) as recently_active
      FROM users
    `, [sevenDaysAgo]);

    // Friendships stats
    const friendshipsResult = await pool.query(`
      SELECT COUNT(*) / 2 as total FROM friendships
    `);

    const pendingRequestsResult = await pool.query(`
      SELECT COUNT(*) as count FROM friend_requests WHERE status = 'pending'
    `);

    // Parties stats
    const partiesResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'ended') as ended,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM parties
    `);

    // Project shares stats
    const sharesResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE revoked_at IS NULL) as active
      FROM project_shares
    `);

    // Login attempts last 24h
    const loginResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE success = true) as successful,
        COUNT(*) FILTER (WHERE success = false) as failed
      FROM login_attempts
      WHERE attempted_at > $1
    `, [oneDayAgo]);

    // Recent users (last 10)
    const recentUsersResult = await pool.query(`
      SELECT username, created_at,
             (avatar_data IS NOT NULL OR avatar_preset IS NOT NULL) as has_avatar
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const users = usersResult.rows[0];
    const friendships = friendshipsResult.rows[0];
    const pendingRequests = pendingRequestsResult.rows[0];
    const parties = partiesResult.rows[0];
    const shares = sharesResult.rows[0];
    const logins = loginResult.rows[0];

    const stats: ServerStats = {
      users: {
        total: parseInt(users.total),
        active: parseInt(users.active),
        deleted: parseInt(users.deleted),
        withAvatar: parseInt(users.with_avatar),
        withBio: parseInt(users.with_bio),
        searchable: parseInt(users.searchable),
        recentlyActive: parseInt(users.recently_active),
      },
      social: {
        friendships: parseInt(friendships.total),
        pendingFriendRequests: parseInt(pendingRequests.count),
      },
      parties: {
        total: parseInt(parties.total),
        active: parseInt(parties.active),
        scheduled: parseInt(parties.scheduled),
        ended: parseInt(parties.ended),
        cancelled: parseInt(parties.cancelled),
      },
      projectShares: {
        total: parseInt(shares.total),
        active: parseInt(shares.active),
      },
      activity: {
        loginsLast24h: parseInt(logins.total),
        successfulLogins: parseInt(logins.successful),
        failedLogins: parseInt(logins.failed),
      },
      recentUsers: recentUsersResult.rows.map(row => ({
        username: row.username,
        createdAt: parseInt(row.created_at),
        hasAvatar: row.has_avatar,
      })),
      timestamp: now,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  } finally {
    await pool.end();
  }
});

export default router;
