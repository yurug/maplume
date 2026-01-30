# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MaPlume is a cross-platform desktop word tracker for novel writers built with Electron and TypeScript.

## Technology Stack

- **Runtime**: Electron (desktop app)
- **Language**: TypeScript
- **Frontend**: React + Vite
- **Charting**: Recharts
- **Storage**: Local-first (user-chosen location) with optional Google Drive/OneDrive sync
- **Distribution**: Direct download with auto-updates via electron-builder

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development (Vite + TypeScript watch)
npm run build        # Build for production
npm run start        # Run built Electron app
npm run dist         # Build distributable packages
npm run dist:win     # Build for Windows
npm run dist:mac     # Build for macOS
npm run dist:linux   # Build for Linux
```

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── main.ts              # App entry, window management, IPC handlers
│   └── preload.ts           # Context bridge for renderer
├── renderer/                # React frontend
│   ├── main.tsx             # React entry
│   ├── App.tsx              # Root component with app layout
│   ├── context/
│   │   └── AppContext.tsx   # Global state management (projects, entries, settings)
│   ├── components/
│   │   ├── ProjectList.tsx      # Sidebar project selector
│   │   ├── ProjectForm.tsx      # Create/edit project modal
│   │   ├── WordEntryForm.tsx    # Log words (increment or total)
│   │   ├── ProgressChart.tsx    # Recharts line chart (actual vs target)
│   │   ├── StatisticsPanel.tsx  # Stats grid display
│   │   ├── EntriesTable.tsx     # Editable history table
│   │   ├── MotivationalMessage.tsx
│   │   ├── SetupScreen.tsx      # First-run data folder selection
│   │   └── SettingsPanel.tsx    # Settings + import/export
│   ├── services/
│   │   ├── storage.ts       # File I/O via Electron IPC
│   │   └── statistics.ts    # Stats calculation + chart data
│   ├── data/
│   │   └── messages.ts      # 200 motivational messages
│   ├── i18n/
│   │   ├── index.ts         # i18n context, hook, language detection
│   │   ├── I18nProvider.tsx # Provider component
│   │   └── locales/         # Translation files (en.ts, fr.ts)
│   ├── styles/
│   │   └── index.css        # All styles
│   └── types/
│       └── electron.d.ts    # Window.electronAPI types
└── shared/
    └── types.ts             # Project, WordEntry, Statistics, AppSettings
```

## Core Features

### Project Management
- Unlimited projects, each with: title, notes, start date, end date, word target
- Projects can be archived (never deleted)

### Word Tracking
- Input via total word count or daily increment
- Multiple entries per day allowed (all kept)
- Backdating and editing/deleting entries supported

### Visualization
- Interactive plot (tooltips, zoom, pan) showing progress vs target line
- Data rows hidden by default, viewable on request

### Statistics
- Current word count vs target
- Daily/weekly average
- Best writing day
- Current streak
- Projected completion date
- Words remaining
- Percentage complete

### Motivational Messages
- Displayed daily
- Mix of encouraging messages and gentle nudges when behind
- Hardcoded list of 200 entries

### Import/Export
- JSON format
- User chooses: single project or all projects

### Other
- Multi-language with automatic user language detection
- Full offline functionality (except auto-updates and cloud sync)
- Bug report button (no telemetry)

## Architecture Notes

- **State**: React Context (`AppContext`) holds all app state, auto-saves on changes
- **Storage**: Data stored as JSON in user-chosen folder, path remembered in localStorage
- **IPC**: Renderer communicates with main process via `window.electronAPI` (preload bridge)
- **Charts**: Recharts with responsive container, shows actual progress vs linear target line
- **i18n**: Custom implementation using React Context. Auto-detects system locale, falls back to English. Add new languages by creating a file in `src/renderer/i18n/locales/` and registering in `src/renderer/i18n/index.ts`

## Server (Social Features Backend)

The social features (accounts, friends, writing parties, project sharing) are powered by a Node.js/Express server in `packages/server/`.

### Server Stack
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL (Scaleway Serverless SQL Database)
- **Hosting**: Scaleway Serverless Containers
- **Authentication**: Ed25519 signatures + JWT

### Server Structure
```
packages/server/
├── src/
│   ├── index.ts           # Entry point
│   ├── app.ts             # Express app setup
│   ├── config.ts          # Environment config
│   ├── routes/            # API endpoints (auth, users, friends, parties, shares)
│   ├── services/          # Database queries, auth logic
│   └── middleware/        # Auth, error handling
└── Dockerfile             # Container image
```

## Scaleway Deployment

### Infrastructure
- **Container**: `maplume-server` (Serverless Container)
- **Database**: `maplume` (Serverless SQL Database, PostgreSQL 16)
- **Registry**: `rg.fr-par.scw.cloud/maplume/server:latest`
- **Public URL**: `https://maplumes3tyzv8f-maplume-server.functions.fnc.fr-par.scw.cloud`

### Prerequisites
- Scaleway CLI (`scw`) installed and configured
- Docker for building images

### Useful Scaleway CLI Commands

```bash
# List containers
scw container container list

# Get container details
scw container container get <container-id>

# List databases
scw sdb-sql database list

# Get database details
scw sdb-sql database get <database-id>

# Check server health
curl https://maplumes3tyzv8f-maplume-server.functions.fnc.fr-par.scw.cloud/health
```

### Deploying a New Server Version

```bash
# 1. Build and push the Docker image
cd packages/server
docker build -t rg.fr-par.scw.cloud/maplume/server:latest -f Dockerfile ../..
docker push rg.fr-par.scw.cloud/maplume/server:latest

# 2. Redeploy the container (pulls latest image)
scw container container redeploy <container-id>
```

### Updating Environment Variables

```bash
# Update a secret environment variable (e.g., DATABASE_URL)
scw container container update <container-id> \
  secret-environment-variables.0.key=DATABASE_URL \
  "secret-environment-variables.0.value=<new-connection-string>" \
  --wait
```

### Resetting the Database (Full Wipe)

```bash
# 1. Get current database ID
scw sdb-sql database list

# 2. Delete the database
scw sdb-sql database delete <database-id>

# 3. Create a fresh database
scw sdb-sql database create name=maplume cpu-min=0 cpu-max=4

# 4. Get new database endpoint (ID changes!)
scw sdb-sql database get <new-database-id>

# 5. Update container with new DATABASE_URL
# Format: postgresql://<ACCESS_KEY>:<SECRET_KEY>@<new-db-id>.pg.sdb.fr-par.scw.cloud:5432/maplume?sslmode=require
scw container container update <container-id> \
  secret-environment-variables.0.key=DATABASE_URL \
  "secret-environment-variables.0.value=<new-connection-string>" \
  --wait

# Migrations run automatically on server startup
```

### Current Resource IDs (as of Jan 2026)
- Container ID: `86cdd28e-7483-40a7-b48e-8543a7ca22a2`
- Database ID: `5eb67483-e3be-437e-98d9-52d0b512a19a`
- Namespace ID: `31b0702f-cc87-4f00-ae29-7d991fe42192`

## Website & Releases

- **Website**: https://yurug.github.io/maplume/ (served from `docs/` folder)
- **Landing pages**: `docs/index.html` (EN) and `docs/fr/index.html` (FR)

### Releasing a New Version

**Important:** Use GitHub Actions for building releases - do NOT build locally (requires Wine for Windows, macOS for Mac builds).

**Before releasing:** Check CI status at GitHub → Actions → "Tests" workflow. Tests are informational (non-blocking) but review failures before releasing to decide if fixes are needed.

1. **Update version number:**
   ```bash
   npm version <major|minor|patch> --no-git-tag-version
   # Or manually edit package.json
   ```

2. **Update download links** in `docs/index.html` and `docs/fr/index.html` to the new version

3. **Commit all changes:**
   ```bash
   git add -A
   git commit -m "Release v1.x.x"
   ```

4. **Create and push the git tag:**
   ```bash
   git tag v1.x.x
   git push origin master --tags
   ```

5. **GitHub Actions automatically:**
   - Builds for Linux, Windows, and macOS (see `.github/workflows/release.yml`)
   - Creates a GitHub Release with all artifacts
   - Generates release notes

6. **After release:** Verify downloads work on the website
