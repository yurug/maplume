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
