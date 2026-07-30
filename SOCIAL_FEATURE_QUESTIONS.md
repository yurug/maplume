# Social Features - Clarification Questions

## 1. User Identity & Avatars

### Account Creation
- **Authentication method**: Password only? Email + password? OAuth (Google, GitHub)?
- **Email verification**: Required before using social features?
- **Username constraints**: Unique globally? Min/max length? Allowed characters?

### Generated Profile
- What does "generated-profile" mean exactly?
  - [ ] AI-generated avatar image (like robohash, dicebear, identicon)?
  - [ ] Randomly generated attributes (writing style, favorite genre, etc.)?
  - [x] User-customizable avatar from preset options?
  - [ ] Something else?

### Profile Management
- Can users change their display name after creation? Yes
- Can users regenerate their avatar? Yes
- Should there be a bio/description field? Yes
- Should writing statistics be part of the public profile? Opt-in

---

## 2. Server & Security

### Network Access
- **Domain name**: Do you have a domain, or will this be accessed via IP + port?

your-domain.example and the port of your choice

- **Dynamic IP**: Does your home connection have a static IP, or do you need dynamic DNS (e.g., DuckDNS, No-IP)?

It can be accessed with the name above.


- **Port forwarding**: Are you comfortable configuring your router?

Of course

- **HTTPS**: Required (self-signed cert, Let's Encrypt, Cloudflare tunnel)?

Let's Encrypt

### Authentication Security
- **Session management**: JWT tokens? Session cookies? Token expiration duration?

The one that provides the best UX: someone that has logged in once on
her desktop app should be able to stay connected as long as they want (even months!)

- **Rate limiting**: How aggressive? (e.g., 5 failed logins = 15 min lockout?)

Aggressive

- **Two-factor authentication**: Required? Optional? Not needed?

Not needed.

### Access Control
- **Registration**: Open to anyone? Invite-only? Approval required?

Open to anyone

- **Admin panel**: Do you need one to manage users, view stats, etc.?

Yes, but a simple TUI will be enough for me!

---

## 3. Encryption

### Scope
- What exactly should be encrypted?
  - [ ] Project titles and notes
  - [ ] Word counts and entry dates
  - [x] Everything (including metadata)

### Encryption Model
- **End-to-end encryption**: Only users hold keys, server sees nothing (complex but most secure)

This one. We need to explain to the user that the server sees nothing
and that they are responsible to keep the seed phrases on their own to
be able to restore their account if their machine crashes. We can
propose to send the seed phrase to an email for a immediate backup.

- **Server-side encryption**: Server encrypts at rest, but can read data (simpler, enables server features)
- **Transport only**: Just HTTPS, data stored in plain text on server

### Key Management (if E2E)
- How should users recover their data if they lose their key/password?

Seed phrase: see above.

- Should shared projects be re-encrypted with recipient's key?

Yes. Given the low amount of data a project represents it is fine to
duplicate them encrypted in another way (also simplifies stopping
sharing etc). So essentially, the user will encrypt a project data
multiple time before sending it to the server. Use a compression
algorithm to get the data compact.

---

## 4. Friend System

### Discovery
- How do users find each other?
  - [x] Search by username
  - [ ] Share an invite code/link
  - [ ] Import contacts (email)
  - [ ] QR code in the app

### Friend Requests
- Should there be a friend request that needs acceptance?

Yes

- Or is it one-way "follow" (like Twitter)?

Good idea

- Can users block other users?

Yes

### Privacy
- Can users see each other's friend lists?

Nope

- Can users set their profile to "private" (not searchable)?

Yes

---

## 5. Project Sharing

### Shared Data
- What is shared with friends?
  - [x] Just current word count and target
  - [x] Full progress history (all entries)
  - [x] Project title and notes
  - [x] Daily/weekly statistics

That must be customizable

### Update Frequency
- What does "updated regularly" mean?
  - [x] Real-time (every word count update)
  - [ ] Every few minutes
  - [ ] When user manually syncs
  - [ ] Once per hour/day

### Permissions
- Can the owner revoke sharing at any time?

Yes

- Should there be a "pending" state where friend must accept to see the project?

Yes

- Can one project be shared with multiple friends?

### Presentation
- How should shared projects appear in the friend's UI?
  - [x] Separate "Friends' Projects" section
  - [ ] Mixed with own projects but clearly marked
  - [ ] Dedicated "Social" tab

---

## 6. Collaborative Projects (Co-writing)

### Ownership & Permissions
- Is there one owner with full control, or equal co-ownership?

co-ownership

- Can the owner transfer ownership to another collaborator?

Yes

- Can collaborators invite other collaborators, or only the owner?

They can

### Word Count Tracking
- How should word counts work with multiple writers?
  - [ ] Single shared total (everyone adds to the same count)
  - [ ] Individual contributions tracked separately (Alice: 5000, Bob: 3000, Total: 8000)
  - [x] Both views available

### Editing Entries
- Can any collaborator edit/delete any entry?

Yes

- Or can collaborators only edit their own entries?

No

- Should there be an edit history/audit log?

Yes

### Project Settings
- Who can modify project settings (title, target, dates)?
  - [ ] Only the owner
  - [x] Any collaborator
  - [ ] Configurable per-project

### Target & Progress
- Is the word target shared (e.g., 80,000 words together)?

Yes

- Or individual targets per collaborator?

Yes

- How is the progress chart calculated?

As usual: we see the distance with the target and the color of the points distinguishes contributions from each collaborator.

### Leaving & Removal
- What happens when a collaborator leaves or is removed?
  - [ ] Their word entries stay (attributed to them)
  - [x] Their word entries stay (become anonymous/unattributed)
  - [ ] Their word entries are removed
- Can the owner remove collaborators?
No.

- Can collaborators leave voluntarily?
Yes. If they destroy their account, they also leave.

### Conflict Handling
- What if two collaborators log words at the same time?

It does not matter: just add an epsilon the the first one.

- What if both edit the same entry simultaneously?
First arrived first served

### Notifications
- Notify collaborators when someone logs words?

Yes

- Notify when project settings change?

Yes

- Notify when someone joins/leaves?

Yes

### Limits
- Maximum number of collaborators per project?

No limit.

- Can a user be a collaborator on unlimited projects?

Yes.

---

## 7. Writing Parties/Sessions

### Creation
- Who can create a party? Anyone? Only "premium" users?

Anyone

- **Duration options**: Fixed choices (15min, 30min, 1h, 2h) or custom?

Custom.

- **Maximum duration**: Any limit?

Nope.

- **Scheduling**: Start immediately only, or schedule for later?

Both available

### Invitations
- How are participants invited?
  - [ ] Direct invite to specific friends
  - [ ] Share a join code/link (anyone with link can join)
  - [x] Both options

### Participation
- **Minimum participants**: Just 2, or can you party solo?

You can.

- **Maximum participants**: Any limit?

No limit.

- Can people join after the party has started?

Yes.

- Can people leave mid-party?

Yes.

### Word Counting
- Is it total words written during party, or just increment from start?

Increment from start.

- What if someone starts with 0 vs. continuing a project?

Not an issue.

- Should users select which project they're writing on?

No. They can contribute to two projects during a party.

### Display
- **Countdown**: Just time remaining, or also show others' progress live?

Both

- **Leaderboard**: Show ranking during party or only at end?

Ranking must be opt-in

- **Updates**: Real-time (WebSocket) or polling every X seconds?

Polling every 2 minutes should be fine.

### After Party
- Show final results/leaderboard?

Yes

- Save party history (who participated, who won)?

Yes

- Any rewards/badges for winning?

Nice to have. Have the users propose funny budges for participants.

---

## 8. Offline & Sync Behavior

### When Server is Down
- Should the app work normally (local-only mode)?

Yes!

- Should it show a "social features unavailable" message?

Yes but in a discreet way (a gray icon or something like this)

- Queue sync operations for when server returns?

Of course

### Conflict Resolution
- What if user edits entries while offline, then syncs?

We still have the local storage and it is the source of truth.

- Server wins? Client wins? Merge? User chooses?

Client wins.

### Data Ownership
- Is the local copy the source of truth, with server as backup?

Local copy

- Or is the server the source of truth for shared data?

No

---

## 9. Technical Preferences

### Server Stack
- Any preference for the server language/framework?
  - [ ] Node.js (TypeScript) - same as app, shared types
  - [ ] Python (FastAPI/Flask)
  - [ ] Go
  - [ ] Rust
  - [x] No preference

### Database
- Any preference?
  - [x] SQLite (simple, single file, good for self-hosting)
  - [ ] PostgreSQL (more robust, better for future cloud)
  - [ ] MongoDB
  - [ ] No preference

### Real-time Communication
- For writing parties, what's acceptable latency?
  - [ ] Sub-second (WebSockets required)
  - [x] 5-10 seconds acceptable (polling OK)
  - [ ] 30+ seconds acceptable

---

## 10. Privacy & Data

### Data Retention
- How long to keep data for deleted accounts?

For ever.

- How long to keep party history?

For ever.

All of this is encrypted so there is no problem with data retention.

### Account Deletion
- Soft delete (deactivate) or hard delete (purge everything)?

Soft delete

- What happens to shared projects when owner deletes account?

### GDPR/Privacy
- Will this be available to EU users? (affects data handling requirements)

Yes. All of this is encrypted so there is no problem with data retention.

- Should there be a data export feature?

No. Data is already available locally.

The only case I want to handle is the following:
1. The user has lost its local copy.
2. It reinstall maplume with an empty local store and restores account with seed phrase.
3. maplume detects that some data are available on the server but nothing locally: it opens a dialog box to explain the situation and asks if the user wants to import data from the server.

---

## 11. Future Considerations

### Scaling
- Expected number of users initially? (10? 100? 1000?)

100

- Expected growth if successful?

10000

### Monetization
- Any plans for premium features?

Just ask regularly to buy me a coffee especially if they never did.

- Should the architecture support this possibility?

Yes.

### Mobile
- Any plans for mobile apps that would use this server?

Potentially. Yes.

---

## 12. UI/UX Preferences

### Social Integration
- Should social features be prominent or tucked away?

It must not be pushed but as important as other features.

- Separate "Social" tab or integrated throughout?

Social tab to avoid focus disturbance.

### Notifications
- In-app notifications for friend requests, party invites?

Yes and in the social tab (a little number shows that number of notifications).

- Desktop notifications?

Opt-in

- Email notifications?

No

### Onboarding
- Should social features be opt-in (user explicitly enables)?

It must be opt-out in the sense that the user can skip acconut creation (and do it later).

- Or available by default with account creation?

---

## 13. Summary of Must-Have vs Nice-to-Have

Please mark each feature as:
- **M** = Must have for v1
- **N** = Nice to have (can add later)
- **X** = Don't want

| Feature | Priority |
|---------|----------|
| User accounts with avatars | M |
| Friend system | M |
| Project sharing (read-only) | M |
| Collaborative projects (co-writing) | N |
| Per-collaborator word tracking | N |
| Writing parties | N |
| Real-time updates during parties | N |
| End-to-end encryption |M |
| Invite-only registration | X |
| Admin panel | M |
| Party history/leaderboards | N |
| Offline queue for sync | N |
| Desktop notifications | N |
| Email notifications | X |

---

Please answer these questions and I'll create a detailed technical specification for implementation.
