/**
 * Database module - Re-exports from db/ for backwards compatibility
 *
 * This file maintains the existing API for all consumers.
 * The actual implementations are in the db/ subdirectory, organized by domain:
 * - db/connection.ts - Pool management, migrations, connection utils
 * - db/users.ts - User CRUD, search, profile, auth tokens, project data
 * - db/friends.ts - Friend requests, friendships
 * - db/parties.ts - Party CRUD, participants, invites
 * - db/shares.ts - Project shares, comments, reactions
 * - db/messages.ts - Party messages
 */

export * from './db';
