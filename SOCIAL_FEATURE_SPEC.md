# MaPlume Social Features - Technical Specification

## Overview

This document specifies the social features for MaPlume, enabling users to create accounts, connect with friends, share projects, collaborate on novels, and participate in writing parties.

### Priorities

**V1 (Must Have):**
- User accounts with customizable avatars
- Friend system (follow + friend requests)
- Project sharing (read-only)
- End-to-end encryption
- TUI admin panel

**V2 (Nice to Have):**
- Collaborative projects (co-writing)
- Writing parties/sessions
- Party history & leaderboards
- Desktop notifications
- Custom badges

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MaPlume Desktop App                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Local Store  │  │  Encryption  │  │    Sync Service      │  │
│  │ (Source of   │◄─┤    Layer     │◄─┤  (Queue + Polling)   │  │
│  │   Truth)     │  │  (E2E Keys)  │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────┬───────────┘  │
└────────────────────────────────────────────────┼───────────────┘
                                                  │ HTTPS
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MaPlume Server                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   REST API   │  │   Auth &     │  │      SQLite          │  │
│  │  (Express)   │──┤   Sessions   │──┤    (Encrypted        │  │
│  │              │  │   (JWT)      │  │     Blobs Only)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ Rate Limiter │  │  TUI Admin   │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Local-first**: Local storage is the source of truth. Server is a sync/sharing layer.
2. **E2E Encryption**: Server stores only encrypted blobs. Zero knowledge of user data.
3. **Offline-capable**: App works fully offline; syncs when server available.
4. **Client wins**: On conflicts, local data takes precedence.

---

## 2. Server Specification

### 2.1 Technology Stack

- **Runtime**: Node.js with TypeScript (shared types with client)
- **Framework**: Express.js
- **Database**: SQLite (single file, easy backup/migration)
- **Authentication**: JWT with long-lived refresh tokens
- **TLS**: Let's Encrypt via Certbot
- **Deployment**: Docker container

### 2.2 Server Endpoints

#### Authentication

```
POST   /api/auth/register     # Create account (username, public key, encrypted seed backup)
POST   /api/auth/login        # Login (returns JWT + refresh token)
POST   /api/auth/refresh      # Refresh access token
POST   /api/auth/logout       # Invalidate refresh token
POST   /api/auth/recover      # Recover account with seed phrase
```

#### User Profile

```
GET    /api/users/me                    # Get own profile
PUT    /api/users/me                    # Update profile (avatar, bio, settings)
GET    /api/users/search?q=             # Search users by username (if not private)
GET    /api/users/:id                   # Get user public profile
DELETE /api/users/me                    # Soft delete account
```

#### Friends & Social

```
GET    /api/friends                     # List friends
POST   /api/friends/request/:userId     # Send friend request
POST   /api/friends/accept/:userId      # Accept friend request
DELETE /api/friends/:userId             # Unfriend / cancel request
GET    /api/friends/requests            # List pending requests (incoming/outgoing)
POST   /api/blocks/:userId              # Block user
DELETE /api/blocks/:userId              # Unblock user
GET    /api/followers                   # List followers (one-way follows)
POST   /api/follow/:userId              # Follow user
DELETE /api/follow/:userId              # Unfollow user
```

#### Projects & Sharing

```
POST   /api/projects/sync               # Sync encrypted project data (upload)
GET    /api/projects/sync               # Get all user's encrypted projects
GET    /api/projects/shared             # Get projects shared with me
POST   /api/projects/:id/share          # Share project with friend(s)
DELETE /api/projects/:id/share/:userId  # Revoke sharing
PUT    /api/projects/:id/share-settings # Update what's shared (granular)
POST   /api/projects/:id/share/accept   # Accept shared project
POST   /api/projects/:id/share/decline  # Decline shared project
```

#### Collaborative Projects (V2)

```
POST   /api/collab/projects             # Create collaborative project
POST   /api/collab/projects/:id/invite  # Invite collaborator
POST   /api/collab/projects/:id/join    # Accept collaboration invite
POST   /api/collab/projects/:id/leave   # Leave project
PUT    /api/collab/projects/:id/entry   # Add/edit word entry
GET    /api/collab/projects/:id/log     # Get audit log
POST   /api/collab/projects/:id/transfer # Transfer ownership
```

#### Writing Parties (V2)

```
POST   /api/parties                     # Create party
GET    /api/parties                     # List active/upcoming parties
GET    /api/parties/:id                 # Get party details
POST   /api/parties/:id/join            # Join party
POST   /api/parties/:id/leave           # Leave party
POST   /api/parties/:id/progress        # Report word count progress
GET    /api/parties/:id/leaderboard     # Get current standings
GET    /api/parties/history             # Past parties
POST   /api/parties/:id/invite          # Invite friends
GET    /api/parties/join/:code          # Join via code
```

#### Notifications

```
GET    /api/notifications               # Get notifications (friend requests, invites, etc.)
PUT    /api/notifications/:id/read      # Mark as read
PUT    /api/notifications/read-all      # Mark all as read
```

### 2.3 Database Schema

```sql
-- Users (minimal unencrypted data)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    username_lower TEXT UNIQUE NOT NULL,  -- for case-insensitive search
    public_key TEXT NOT NULL,             -- for E2E encryption
    encrypted_seed_backup TEXT,           -- optional email backup
    avatar_preset TEXT,                   -- avatar preset ID
    bio_encrypted TEXT,                   -- E2E encrypted bio
    stats_public BOOLEAN DEFAULT FALSE,
    searchable BOOLEAN DEFAULT TRUE,
    created_at INTEGER NOT NULL,
    deleted_at INTEGER,                   -- soft delete
    last_seen_at INTEGER
);

-- Authentication
CREATE TABLE auth_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    refresh_token_hash TEXT NOT NULL,
    device_name TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked_at INTEGER
);

-- Rate limiting
CREATE TABLE login_attempts (
    ip_address TEXT NOT NULL,
    user_id TEXT,
    attempted_at INTEGER NOT NULL,
    success BOOLEAN NOT NULL
);

-- Friend relationships
CREATE TABLE relationships (
    user_id TEXT NOT NULL REFERENCES users(id),
    target_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,  -- 'friend', 'pending_outgoing', 'pending_incoming', 'follow', 'blocked'
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, target_id)
);

-- Encrypted project data (blobs)
CREATE TABLE project_data (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    encrypted_blob TEXT NOT NULL,         -- compressed + encrypted project JSON
    blob_hash TEXT NOT NULL,              -- for change detection
    updated_at INTEGER NOT NULL
);

-- Project sharing
CREATE TABLE project_shares (
    project_id TEXT NOT NULL,
    owner_id TEXT NOT NULL REFERENCES users(id),
    shared_with_id TEXT NOT NULL REFERENCES users(id),
    encrypted_blob TEXT NOT NULL,         -- re-encrypted for recipient
    share_settings TEXT NOT NULL,         -- JSON: what's visible
    status TEXT NOT NULL,                 -- 'pending', 'accepted', 'declined'
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (project_id, shared_with_id)
);

-- Collaborative projects (V2)
CREATE TABLE collab_projects (
    id TEXT PRIMARY KEY,
    encrypted_metadata TEXT NOT NULL,     -- title, notes, target, dates
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE collab_members (
    project_id TEXT NOT NULL REFERENCES collab_projects(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL,                   -- 'owner', 'collaborator'
    encryption_key_encrypted TEXT NOT NULL, -- project key encrypted with user's public key
    individual_target INTEGER,
    joined_at INTEGER NOT NULL,
    left_at INTEGER,
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE collab_entries (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES collab_projects(id),
    contributor_id TEXT REFERENCES users(id), -- NULL if anonymous (user left)
    encrypted_entry TEXT NOT NULL,        -- word count, date, notes
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE collab_audit_log (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES collab_projects(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,                 -- 'entry_add', 'entry_edit', 'entry_delete', 'settings_change', etc.
    encrypted_details TEXT,
    created_at INTEGER NOT NULL
);

-- Writing parties (V2)
CREATE TABLE parties (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL REFERENCES users(id),
    encrypted_name TEXT,
    join_code TEXT UNIQUE,
    scheduled_start INTEGER,
    actual_start INTEGER,
    duration_minutes INTEGER NOT NULL,
    ended_at INTEGER,
    ranking_enabled BOOLEAN DEFAULT FALSE,
    created_at INTEGER NOT NULL
);

CREATE TABLE party_participants (
    party_id TEXT NOT NULL REFERENCES parties(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    start_word_count INTEGER,
    current_word_count INTEGER,
    last_update INTEGER,
    joined_at INTEGER NOT NULL,
    left_at INTEGER,
    PRIMARY KEY (party_id, user_id)
);

CREATE TABLE party_invites (
    party_id TEXT NOT NULL REFERENCES parties(id),
    invited_by TEXT NOT NULL REFERENCES users(id),
    invited_user_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL,                 -- 'pending', 'accepted', 'declined'
    created_at INTEGER NOT NULL,
    PRIMARY KEY (party_id, invited_user_id)
);

-- Notifications
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,                   -- 'friend_request', 'share_invite', 'collab_invite', 'party_invite', etc.
    encrypted_data TEXT,
    read_at INTEGER,
    created_at INTEGER NOT NULL
);

-- Badges (V2)
CREATE TABLE badges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL,
    created_by TEXT REFERENCES users(id), -- NULL for system badges
    created_at INTEGER NOT NULL
);

CREATE TABLE user_badges (
    user_id TEXT NOT NULL REFERENCES users(id),
    badge_id TEXT NOT NULL REFERENCES badges(id),
    party_id TEXT REFERENCES parties(id), -- if earned in party
    awarded_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, badge_id, party_id)
);

-- Indexes
CREATE INDEX idx_users_username_lower ON users(username_lower);
CREATE INDEX idx_relationships_target ON relationships(target_id, type);
CREATE INDEX idx_project_data_user ON project_data(user_id);
CREATE INDEX idx_project_shares_shared_with ON project_shares(shared_with_id, status);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);
CREATE INDEX idx_parties_code ON parties(join_code);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, attempted_at);
```

### 2.4 Security

#### Rate Limiting

```typescript
const rateLimits = {
  login: { windowMs: 15 * 60 * 1000, max: 5 },      // 5 attempts per 15 min
  register: { windowMs: 60 * 60 * 1000, max: 3 },  // 3 registrations per hour per IP
  api: { windowMs: 60 * 1000, max: 100 },          // 100 requests per minute
  search: { windowMs: 60 * 1000, max: 20 },        // 20 searches per minute
};
```

#### JWT Configuration

```typescript
const jwtConfig = {
  accessTokenExpiry: '15m',           // Short-lived access token
  refreshTokenExpiry: '365d',         // 1 year refresh token (for UX)
  algorithm: 'ES256',                 // ECDSA for smaller tokens
};
```

#### HTTPS Setup

```bash
# Certbot with standalone mode (server handles renewal)
certbot certonly --standalone -d your-domain.example --agree-tos --email your@email.com
```

### 2.5 TUI Admin Panel

Simple terminal interface for server administration:

```
┌─────────────────── MaPlume Admin ───────────────────┐
│                                                      │
│  [1] View Users (100 total, 45 active today)        │
│  [2] View Active Parties (3 ongoing)                │
│  [3] View Server Stats                              │
│  [4] Ban/Unban User                                 │
│  [5] View Logs                                      │
│  [6] Backup Database                                │
│  [7] Exit                                           │
│                                                      │
│  > _                                                │
└──────────────────────────────────────────────────────┘
```

Built with `blessed` or `ink` for Node.js.

---

## 3. Encryption Specification

### 3.1 Key Hierarchy

```
Seed Phrase (BIP39, 24 words)
    │
    ├──► Master Key (derived via PBKDF2 or Argon2)
    │        │
    │        ├──► Identity Key Pair (Ed25519 for signing)
    │        │
    │        ├──► Encryption Key Pair (X25519 for key exchange)
    │        │
    │        └──► Local Encryption Key (AES-256-GCM for local data)
    │
    └──► Public Key ──► Registered on server for receiving shared data
```

### 3.2 Data Encryption Flow

#### Own Project Data

```
1. Project JSON → Compress (gzip) → Encrypt (AES-256-GCM with Local Key) → Upload
2. Download → Decrypt → Decompress → Project JSON
```

#### Sharing a Project

```
1. Project JSON
2. Filter based on share settings (what recipient can see)
3. Compress (gzip)
4. Generate ephemeral key pair
5. ECDH with recipient's public key → shared secret
6. Encrypt with shared secret (AES-256-GCM)
7. Bundle: { ephemeralPublicKey, encryptedData, nonce }
8. Upload for recipient
```

#### Collaborative Project

```
1. Create symmetric Project Key (random 256-bit)
2. For each collaborator:
   - ECDH with collaborator's public key → shared secret
   - Encrypt Project Key with shared secret
   - Store encrypted key on server
3. All project data encrypted with Project Key
4. When collaborator joins: encrypt Project Key for them
5. When collaborator leaves: their entries become anonymous, key unchanged
   (entries already written remain accessible)
```

### 3.3 Seed Phrase Recovery

```typescript
interface SeedPhraseRecovery {
  // On account creation
  generateSeedPhrase(): string[];  // 24 words (BIP39)

  // User can optionally email seed to themselves
  emailSeedPhrase(email: string, encryptedSeed: string): void;

  // Recovery flow
  recoverFromSeed(seedPhrase: string[]): {
    identityKeyPair: KeyPair;
    encryptionKeyPair: KeyPair;
    localKey: Uint8Array;
  };
}
```

### 3.4 Libraries

- **Key derivation**: `@noble/hashes` (Argon2, PBKDF2)
- **Encryption**: `@noble/ciphers` (AES-256-GCM)
- **Key exchange**: `@noble/curves` (X25519, Ed25519)
- **Seed phrase**: `@scure/bip39`
- **Compression**: `pako` (gzip)

---

## 4. Client Changes

### 4.1 New Services

```typescript
// src/renderer/services/crypto.ts
export class CryptoService {
  generateSeedPhrase(): string[];
  deriveKeys(seedPhrase: string[]): KeyBundle;
  encrypt(data: Uint8Array, key: Uint8Array): EncryptedBlob;
  decrypt(blob: EncryptedBlob, key: Uint8Array): Uint8Array;
  encryptForRecipient(data: Uint8Array, recipientPublicKey: Uint8Array): EncryptedEnvelope;
  decryptFromSender(envelope: EncryptedEnvelope, privateKey: Uint8Array): Uint8Array;
}

// src/renderer/services/sync.ts
export class SyncService {
  private queue: SyncOperation[];

  isServerAvailable(): Promise<boolean>;
  queueOperation(op: SyncOperation): void;
  processQueue(): Promise<void>;
  syncProjects(): Promise<void>;
  getSharedProjects(): Promise<SharedProject[]>;
}

// src/renderer/services/api.ts
export class ApiClient {
  private baseUrl: string;
  private accessToken: string | null;

  register(username: string, publicKey: string): Promise<void>;
  login(username: string, signature: string): Promise<TokenPair>;
  refreshToken(): Promise<string>;
  // ... all API methods
}

// src/renderer/services/social.ts
export class SocialService {
  searchUsers(query: string): Promise<UserProfile[]>;
  sendFriendRequest(userId: string): Promise<void>;
  acceptFriendRequest(userId: string): Promise<void>;
  shareProject(projectId: string, userId: string, settings: ShareSettings): Promise<void>;
  // ... etc
}
```

### 4.2 New Context

```typescript
// src/renderer/context/SocialContext.tsx
interface SocialState {
  user: User | null;
  isOnline: boolean;
  friends: Friend[];
  pendingRequests: FriendRequest[];
  sharedProjects: SharedProject[];
  notifications: Notification[];
  unreadCount: number;
}

interface SocialActions {
  login(seedPhrase: string[]): Promise<void>;
  register(username: string): Promise<string[]>;  // returns seed phrase
  logout(): void;
  // ... social actions
}
```

### 4.3 New Components

```
src/renderer/components/
├── social/
│   ├── SocialTab.tsx              # Main social tab container
│   ├── AccountSetup.tsx           # Registration / seed phrase display
│   ├── LoginScreen.tsx            # Login with seed phrase
│   ├── ProfileCard.tsx            # User profile display
│   ├── ProfileEditor.tsx          # Edit avatar, bio, settings
│   ├── AvatarPicker.tsx           # Preset avatar selection
│   ├── FriendsList.tsx            # Friends with online status
│   ├── FriendRequests.tsx         # Incoming/outgoing requests
│   ├── UserSearch.tsx             # Search and follow users
│   ├── ShareProjectModal.tsx      # Share project with friends
│   ├── SharedProjectsList.tsx     # Projects shared with me
│   ├── NotificationBadge.tsx      # Notification counter
│   ├── NotificationList.tsx       # All notifications
│   ├── ConnectionStatus.tsx       # Online/offline indicator
│   └── SeedPhraseBackup.tsx       # Seed phrase display/email
├── collab/                        # V2
│   ├── CollabProjectView.tsx
│   ├── CollaboratorsList.tsx
│   ├── ContributionChart.tsx
│   └── AuditLog.tsx
└── party/                         # V2
    ├── PartyCreator.tsx
    ├── PartyLobby.tsx
    ├── PartyTimer.tsx
    ├── PartyLeaderboard.tsx
    └── PartyHistory.tsx
```

### 4.4 UI Integration

#### Main Layout Changes

```tsx
// App.tsx - Add Social tab
<TabBar>
  <Tab id="projects">Projects</Tab>
  <Tab id="statistics">Statistics</Tab>
  <Tab id="social">
    Social
    {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
  </Tab>
  <Tab id="settings">Settings</Tab>
</TabBar>
```

#### Connection Status Indicator

```tsx
// Small icon in header/status bar
<ConnectionStatus
  status={isOnline ? 'online' : 'offline'}
  className="text-gray-400"  // Discreet when offline
/>
```

### 4.5 Sync Queue

```typescript
interface SyncOperation {
  id: string;
  type: 'project_update' | 'share' | 'unshare' | 'friend_request' | etc;
  payload: unknown;
  createdAt: number;
  retryCount: number;
}

// Stored in localStorage, processed when server available
// On startup: check server, process queue
// On project change: queue update
// Polling interval: 30 seconds when online
```

---

## 5. Docker Deployment

### 5.1 Dockerfile

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache certbot

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Data directory for SQLite and certs
VOLUME /data

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=443

EXPOSE 443

# Entrypoint handles cert renewal and server start
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
```

### 5.2 docker-compose.yml

```yaml
version: '3.8'

services:
  maplume-server:
    build: .
    container_name: maplume-server
    restart: unless-stopped
    ports:
      - "8443:443"  # Change external port as needed
    volumes:
      - ./data:/data
      - ./certs:/etc/letsencrypt
    environment:
      - DOMAIN=your-domain.example
      - ADMIN_SECRET=${ADMIN_SECRET}
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "https://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 5.3 Environment Variables

```bash
# .env
DOMAIN=your-domain.example
PORT=443
DATA_DIR=/data
JWT_SECRET=<generated-secret>
ADMIN_SECRET=<admin-password-for-tui>
CERT_EMAIL=your@email.com
```

---

## 6. Implementation Phases

### Phase 1: Core Infrastructure (V1)

1. **Server skeleton**
   - Express app with TypeScript
   - SQLite setup with migrations
   - JWT authentication
   - Rate limiting
   - HTTPS with Let's Encrypt

2. **Encryption layer**
   - Seed phrase generation
   - Key derivation
   - Encrypt/decrypt functions
   - Project serialization

3. **Basic API**
   - User registration/login
   - Profile management
   - Project sync (encrypted blobs)

4. **Client integration**
   - Account creation flow
   - Seed phrase backup
   - Sync service
   - Connection status indicator

### Phase 2: Social Features (V1)

1. **Friend system**
   - User search
   - Friend requests
   - Follow/unfollow
   - Block list

2. **Project sharing**
   - Share with friends
   - Accept/decline shares
   - Granular share settings
   - Shared projects view

3. **Notifications**
   - Notification system
   - Badge counter
   - Mark as read

4. **TUI Admin**
   - Basic user management
   - Server stats
   - Database backup

### Phase 3: Collaboration (V2)

1. **Collaborative projects**
   - Multi-owner projects
   - Individual contribution tracking
   - Audit log
   - Color-coded progress chart

2. **Real-time sync**
   - Efficient polling
   - Change detection
   - Conflict resolution

### Phase 4: Writing Parties (V2)

1. **Party system**
   - Create/schedule parties
   - Join codes
   - Timer and countdown

2. **Leaderboards**
   - Live progress tracking
   - Opt-in ranking
   - Final results

3. **Badges**
   - User-created badges
   - Award system
   - Party history

---

## 7. Server Directory Structure

```
maplume-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Express app setup
│   ├── config.ts             # Configuration
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── friends.ts
│   │   ├── projects.ts
│   │   ├── collab.ts         # V2
│   │   ├── parties.ts        # V2
│   │   └── notifications.ts
│   ├── middleware/
│   │   ├── auth.ts           # JWT verification
│   │   ├── rateLimit.ts
│   │   └── errorHandler.ts
│   ├── services/
│   │   ├── database.ts       # SQLite wrapper
│   │   ├── auth.ts           # Token management
│   │   └── notifications.ts
│   ├── admin/
│   │   └── tui.ts            # Terminal UI
│   └── types/
│       └── index.ts          # Shared types
├── migrations/
│   └── 001_initial.sql
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## 8. Testing Strategy

### Server Tests

```typescript
// Unit tests for crypto, auth, business logic
// Integration tests for API endpoints
// Load tests for rate limiting validation
```

### Client Tests

```typescript
// Unit tests for encryption/decryption
// Integration tests for sync service
// E2E tests for account creation, sharing flows
```

### Security Testing

- Verify E2E encryption (server cannot read data)
- Test rate limiting effectiveness
- Validate JWT security
- Test offline/online transitions

---

## 9. Monitoring & Logging

### Server Logs

```typescript
// Structured logging with pino
logger.info({ userId, action: 'login' }, 'User logged in');
logger.warn({ ip, attempts }, 'Rate limit approaching');
logger.error({ err, userId }, 'Sync failed');
```

### Metrics (via TUI)

- Active users (daily/weekly/monthly)
- API request counts
- Error rates
- Database size
- Active parties (V2)

---

## 10. Migration Path to Cloud

When ready to move to cloud:

1. Same Docker image works anywhere
2. Replace Let's Encrypt with cloud provider's SSL
3. Consider PostgreSQL for better concurrency
4. Add Redis for session storage if scaling horizontally
5. Add CDN for static assets if needed

The architecture is designed to scale from single-user to 10,000+ users with minimal changes.
