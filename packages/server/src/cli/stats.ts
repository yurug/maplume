#!/usr/bin/env node
/**
 * MaPlume Server Statistics CLI
 *
 * Fetches statistics from the server's /api/stats endpoint.
 *
 * Usage:
 *   npx tsx packages/server/src/cli/stats.ts [server-url]
 *
 * Examples:
 *   npx tsx packages/server/src/cli/stats.ts
 *   npx tsx packages/server/src/cli/stats.ts https://my-server.example.com
 */

const DEFAULT_SERVER_URL = 'https://maplumes3tyzv8f-maplume-server.functions.fnc.fr-par.scw.cloud';

interface ServerStats {
  users: {
    total: number;
    active: number;
    deleted: number;
    withAvatar: number;
    withBio: number;
    searchable: number;
    recentlyActive: number;
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

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().replace('T', ' ').substring(0, 19);
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

async function fetchStats(serverUrl: string): Promise<ServerStats> {
  const url = `${serverUrl}/api/stats`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function main() {
  const serverUrl = process.argv[2] || process.env.SERVER_URL || DEFAULT_SERVER_URL;

  console.log('MaPlume Server Statistics');
  console.log('='.repeat(50));
  console.log(`Server: ${serverUrl}`);
  console.log('');

  try {
    const stats = await fetchStats(serverUrl);

    console.log('USERS');
    console.log('-'.repeat(30));
    console.log(`  Total:           ${stats.users.total}`);
    console.log(`  Active:          ${stats.users.active}`);
    console.log(`  Deleted:         ${stats.users.deleted}`);
    console.log(`  With avatar:     ${stats.users.withAvatar}`);
    console.log(`  With bio:        ${stats.users.withBio}`);
    console.log(`  Searchable:      ${stats.users.searchable}`);
    console.log(`  Active (7 days): ${stats.users.recentlyActive}`);
    console.log('');

    console.log('SOCIAL');
    console.log('-'.repeat(30));
    console.log(`  Friendships:       ${stats.social.friendships}`);
    console.log(`  Pending requests:  ${stats.social.pendingFriendRequests}`);
    console.log('');

    console.log('WRITING PARTIES');
    console.log('-'.repeat(30));
    console.log(`  Total:      ${stats.parties.total}`);
    console.log(`  Active:     ${stats.parties.active}`);
    console.log(`  Scheduled:  ${stats.parties.scheduled}`);
    console.log(`  Ended:      ${stats.parties.ended}`);
    console.log(`  Cancelled:  ${stats.parties.cancelled}`);
    console.log('');

    console.log('PROJECT SHARES');
    console.log('-'.repeat(30));
    console.log(`  Total:   ${stats.projectShares.total}`);
    console.log(`  Active:  ${stats.projectShares.active}`);
    console.log('');

    console.log('LOGIN ACTIVITY (Last 24h)');
    console.log('-'.repeat(30));
    console.log(`  Total attempts:  ${stats.activity.loginsLast24h}`);
    console.log(`  Successful:      ${stats.activity.successfulLogins}`);
    console.log(`  Failed:          ${stats.activity.failedLogins}`);
    console.log('');

    if (stats.recentUsers.length > 0) {
      console.log('RECENT USERS');
      console.log('-'.repeat(30));
      for (const user of stats.recentUsers) {
        const avatar = user.hasAvatar ? '✓' : ' ';
        console.log(`  ${user.username.padEnd(20)} [${avatar}] ${formatRelativeTime(user.createdAt)}`);
      }
      console.log('');
    }

    console.log(`Data as of: ${formatDate(stats.timestamp)}`);

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

main();
