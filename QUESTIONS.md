# Project Clarification Questions

## Technology Stack

1. **Application Type**: Should this be a desktop app (Electron/Tauri), a web app, or a mobile app?

A desktop app.

2. **If desktop**: Prefer Electron (mature, larger bundle) or Tauri (Rust-based, smaller, faster)?

Electron.

3. **Frontend Framework**: React, Vue, Svelte, or something else?

No preference.

4. **Language**: TypeScript or JavaScript?

TypeScript.

## Data Storage

5. **Primary storage**: Local-first (SQLite/JSON file) with optional cloud sync, or cloud-first?

Local-first with optional cloud sync.

6. **If local**: Where should data be stored? (OS-specific app data folder, user-chosen location, or alongside the app?)

user-chosen location

7. **Cloud storage priority**: Google Drive, OneDrive, both equally, or neither for MVP?

Both equally.

## User Interface

Use the ui-ux-pro-max-skill skill I've installed to deal with the UI design.

8. **Design system**: Use an existing component library (Material UI, Shadcn, Radix) or custom design?
9. **Color scheme**: Light mode, dark mode, or system-preference with toggle?
10. **Plot library**: Which charting library? (Chart.js, Recharts, D3, Plotly, etc.)
11. **Plot interactivity**: Should users be able to hover for tooltips, zoom, pan?

Yes.

## Project Management

12. **Project limits**: Is there a maximum number of projects a user can have?

No

13. **Project archiving**: Can completed projects be archived? Deleted?

Archived, never deleted.

14. **Project fields**: Besides start date, end date, and word target, any other metadata? (genre, title, notes?)

Title and notes

## Word Tracking

15. **Input method**: User types total word count, or daily increment, or both options?

Both options

16. **Multiple entries per day**: Allowed? If so, how to handle? (sum, replace, keep all?)

Allowed, keep all

17. **Backdating**: Can users add entries for past dates?

Yes

18. **Editing/deleting entries**: Allowed?

Yes

## Statistics

19. **Which statistics to show?** Examples:
    - Current word count vs target
    - Daily/weekly average
    - Best writing day
    - Current streak
    - Projected completion date
    - Words remaining
    - Percentage complete

Yes, all of these.

## Motivational Messages

20. **Message triggers**: When are messages shown? (on each entry, daily, on milestones?)

Daily

21. **Message tone**: Purely encouraging, or also gentle nudges when behind schedule?

Both.

22. **Message source**: Hardcoded list, user-customizable, or AI-generated?

Hardcoded list with 200 entries.

## Import/Export

23. **Export formats**: CSV, JSON, both?

JSON.

24. **Import formats**: Same as export? Support other apps' formats?

Same as export.

25. **What to export**: Single project, all projects, or user choice?

User choice.

## Auto-Update & Distribution

26. **Update channel**: Single stable channel, or also beta/nightly?

Single stable channel.

27. **Update behavior**: Auto-install, or prompt user first?

Auto-install

28. **Distribution**: App stores (Microsoft Store, Mac App Store) or direct download only?

Direct download only.

## Authentication (for cloud features)

29. **MVP scope**: Include cloud sync in initial version, or add later?

Yes.

30. **Account requirement**: Can the app be used fully offline without any account?

Yes.

## Miscellaneous

31. **Offline support**: Full functionality offline, or degraded?

Full functionality (except the obvious one i.e. auto-updates and cloud sync)

32. **Keyboard shortcuts**: Important? Which actions need them?

Not important for now.

33. **Accessibility**: Specific accessibility requirements (screen reader support, high contrast)?

No.

34. **Internationalization**: English only, or multi-language support?

Multi language, automatic detection of user language.

35. **Analytics/telemetry**: Any usage tracking? Opt-in or opt-out?

No but add a button to report bugs.

---

# UI/UX Design Improvement Questions

Based on my analysis of the current codebase, I need clarification on the following to create a state-of-the-art design:

## Design Direction

36. **Overall Aesthetic**: Which direction appeals to you most?
    - a) **Modern Minimal** - Clean lines, lots of whitespace, subtle shadows (like Linear, Notion)
    - b) **Warm & Cozy** - Softer corners, warmer colors, feels like a writing nook (like Bear, iA Writer)
    - c) **Bold & Expressive** - Strong colors, playful elements, celebrates achievements (like Duolingo, Streaks)
    - d) **Professional Dashboard** - Data-focused, dense information, productivity-oriented (like GitHub, Jira)

b

37. **Color Scheme**: Keep the current indigo/slate palette or explore alternatives?
    - a) Keep current (indigo primary, slate neutrals)
    - b) Warmer tones (amber/orange primary, warm grays)
    - c) Forest/nature theme (green primary, earthy neutrals) - evokes paper/ink
    - d) Monochrome with single accent color
    - e) Let me suggest based on the aesthetic chosen above

b

38. **Dark Mode**: The CSS variables for dark mode exist but aren't implemented. Priority?
    - a) High priority - implement now with system preference detection
    - b) Medium priority - add a manual toggle in settings
    - c) Low priority - not needed for now

b

## Visual Elements

39. **Icon System**: Currently using emoji (⚙, ↻, ✎, 🗑). Preference?
    - a) **Lucide Icons** - Clean, minimal line icons (open source, consistent)
    - b) **Heroicons** - Slightly bolder, works well at small sizes
    - c) **Phosphor Icons** - Flexible weights, playful options available
    - d) Keep emoji - simpler, no additional dependencies

a

40. **Typography**: Currently using system fonts. Change?
    - a) Keep system fonts (fast, familiar)
    - b) Add a personality font for headings (Inter, Plus Jakarta Sans, Nunito)
    - c) Use a writing-focused font stack (serif for content areas)

c

41. **Animations & Micro-interactions**: How much motion?
    - a) **Minimal** - Just essential transitions (current state)
    - b) **Subtle** - Smooth page transitions, hover effects, button feedback
    - c) **Expressive** - Celebratory animations on milestones, progress indicators, delightful details

c

## Component Library

42. **UI Framework**: Currently 100% custom CSS. Change approach?
    - a) Keep custom CSS (full control, minimal dependencies)
    - b) Add **Tailwind CSS** (utility-first, faster iteration)
    - c) Add **shadcn/ui** (Tailwind + Radix, beautiful defaults, copy-paste components)
    - d) Add **Radix Primitives** only (accessible, unstyled, keep custom design)

c

## Specific UI Improvements

43. **Chart Design**: The Recharts visualization is functional. Enhance?
    - a) Keep current design
    - b) Add more interactivity (zoom, pan controls, date range selection)
    - c) Redesign with custom styling to match overall aesthetic
    - d) Both b and c

b

44. **Statistics Panel**: Currently a simple grid. Enhance?
    - a) Keep current simple grid
    - b) Add visual indicators (progress rings, trend arrows, sparklines)
    - c) Make it more compact/dense
    - d) Add expandable detailed view

b, c and d

45. **Empty States & Onboarding**: Currently minimal. Priority?
    - a) High - Add illustrated empty states, guided first-run experience
    - b) Medium - Simple but welcoming empty states
    - c) Low - Keep current minimal approach

a

46. **Loading & Feedback States**: Currently none. Add?
    - a) Yes - Add skeleton screens, toast notifications, loading spinners
    - b) Minimal - Just toast notifications for success/error
    - c) Not needed

c

## Responsive Design

47. **Mobile/Tablet Priority**: Currently has basic responsive support. Improve?
    - a) Desktop-first, mobile is secondary (current)
    - b) Improve tablet experience (better breakpoints)
    - c) Full mobile-first redesign

a

## Specific Problem Areas

48. **What bothers you most about the current UI?** (select all that apply)
    - a) Overall layout feels dated
    - b) Colors/visual identity is bland
    - c) Too much visual clutter
    - d) Not enough visual feedback when taking actions
    - e) Chart is hard to read/interact with
    - f) Statistics are hard to parse at a glance
    - g) Sidebar feels cramped
    - h) Forms are boring
    - i) Nothing specific - just want a general refresh

a, b, c, d, e, f, g, h,

49. **Reference Apps**: Which apps' designs do you admire? (helps me understand your taste)
    - Examples: Notion, Linear, Bear, iA Writer, Ulysses, Scrivener, Obsidian, Things 3, Fantastical, Arc Browser, Raycast, etc.

Nothing comes to mind.

50. **Any specific features or components you want to add/change that I haven't mentioned?**
