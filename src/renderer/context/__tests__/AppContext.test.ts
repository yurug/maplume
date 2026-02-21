import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AppData, Project, WordEntry, AppSettings } from '@maplume/shared';

// ============================================================================
// We need to extract and test the reducer directly, but since it's not exported,
// we'll re-implement the reducer logic here for testing. In a real codebase,
// you might want to export the reducer for testing purposes.
// ============================================================================

interface AppState {
  initialized: boolean;
  dataPath: string | null;
  projects: Project[];
  entries: WordEntry[];
  settings: AppSettings;
  activeProjectId: string | null;
  showArchived: boolean;
}

type AppAction =
  | { type: 'INIT'; data: AppData; dataPath: string }
  | { type: 'SET_DATA_PATH'; dataPath: string }
  | { type: 'ADD_PROJECT'; project: Project }
  | { type: 'UPDATE_PROJECT'; project: Project }
  | { type: 'ARCHIVE_PROJECT'; projectId: string }
  | { type: 'SET_ACTIVE_PROJECT'; projectId: string | null }
  | { type: 'ADD_ENTRY'; entry: WordEntry }
  | { type: 'UPDATE_ENTRY'; entry: WordEntry }
  | { type: 'DELETE_ENTRY'; entryId: string }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'TOGGLE_SHOW_ARCHIVED' }
  | { type: 'IMPORT_DATA'; data: AppData }
  | { type: 'RESET_FOR_USER_SWITCH' };

const initialState: AppState = {
  initialized: false,
  dataPath: null,
  projects: [],
  entries: [],
  settings: {
    dataPath: '',
    language: 'en',
    lastMotivationalDate: null,
    cloudSync: null,
  },
  activeProjectId: null,
  showArchived: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        initialized: true,
        dataPath: action.dataPath,
        projects: action.data.projects,
        entries: action.data.entries,
        settings: action.data.settings,
        activeProjectId: action.data.projects.find((p) => !p.archived)?.id || null,
      };

    case 'SET_DATA_PATH':
      return { ...state, dataPath: action.dataPath };

    case 'ADD_PROJECT':
      return {
        ...state,
        projects: [...state.projects, action.project],
        activeProjectId: action.project.id,
      };

    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.project.id ? { ...action.project, updatedAt: new Date().toISOString() } : p
        ),
      };

    case 'ARCHIVE_PROJECT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.projectId ? { ...p, archived: true, updatedAt: new Date().toISOString() } : p
        ),
        activeProjectId:
          state.activeProjectId === action.projectId
            ? state.projects.find((p) => p.id !== action.projectId && !p.archived)?.id || null
            : state.activeProjectId,
      };

    case 'SET_ACTIVE_PROJECT':
      return { ...state, activeProjectId: action.projectId };

    case 'ADD_ENTRY':
      return { ...state, entries: [...state.entries, action.entry] };

    case 'UPDATE_ENTRY':
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.entry.id ? { ...action.entry, updatedAt: new Date().toISOString() } : e
        ),
      };

    case 'DELETE_ENTRY':
      return {
        ...state,
        entries: state.entries.filter((e) => e.id !== action.entryId),
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.settings },
      };

    case 'TOGGLE_SHOW_ARCHIVED':
      return { ...state, showArchived: !state.showArchived };

    case 'IMPORT_DATA':
      return {
        ...state,
        projects: action.data.projects,
        entries: action.data.entries,
        activeProjectId: action.data.projects.find((p) => !p.archived)?.id || null,
      };

    case 'RESET_FOR_USER_SWITCH':
      return {
        ...initialState,
      };

    default:
      return state;
  }
}

// ============================================================================
// Helper functions to create test data
// ============================================================================

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: `project-${Math.random().toString(36).slice(2)}`,
    title: 'Test Project',
    notes: '',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    targetWords: 50000,
    unitType: 'words',
    archived: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createEntry(overrides: Partial<WordEntry> = {}): WordEntry {
  return {
    id: `entry-${Math.random().toString(36).slice(2)}`,
    projectId: 'test-project',
    date: '2024-01-01',
    wordCount: 1000,
    isIncrement: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    dataPath: '/path/to/data',
    language: 'en',
    lastMotivationalDate: null,
    cloudSync: null,
    ...overrides,
  };
}

function createAppData(overrides: Partial<AppData> = {}): AppData {
  return {
    version: 4,
    projects: [],
    entries: [],
    settings: createSettings(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('appReducer', () => {
  let mockDate: Date;

  beforeEach(() => {
    mockDate = new Date('2024-06-15T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('has correct initial values', () => {
      expect(initialState).toEqual({
        initialized: false,
        dataPath: null,
        projects: [],
        entries: [],
        settings: {
          dataPath: '',
          language: 'en',
          lastMotivationalDate: null,
          cloudSync: null,
        },
        activeProjectId: null,
        showArchived: false,
      });
    });
  });

  describe('INIT action', () => {
    it('initializes state with provided data', () => {
      const project = createProject({ id: 'p1', archived: false });
      const entry = createEntry({ projectId: 'p1' });
      const settings = createSettings({ language: 'fr' });
      const data = createAppData({ projects: [project], entries: [entry], settings });

      const result = appReducer(initialState, {
        type: 'INIT',
        data,
        dataPath: '/test/path',
      });

      expect(result.initialized).toBe(true);
      expect(result.dataPath).toBe('/test/path');
      expect(result.projects).toEqual([project]);
      expect(result.entries).toEqual([entry]);
      expect(result.settings).toEqual(settings);
    });

    it('sets activeProjectId to first non-archived project', () => {
      const archivedProject = createProject({ id: 'p1', archived: true });
      const activeProject = createProject({ id: 'p2', archived: false });
      const data = createAppData({ projects: [archivedProject, activeProject] });

      const result = appReducer(initialState, {
        type: 'INIT',
        data,
        dataPath: '/test/path',
      });

      expect(result.activeProjectId).toBe('p2');
    });

    it('sets activeProjectId to null when all projects are archived', () => {
      const archivedProject = createProject({ id: 'p1', archived: true });
      const data = createAppData({ projects: [archivedProject] });

      const result = appReducer(initialState, {
        type: 'INIT',
        data,
        dataPath: '/test/path',
      });

      expect(result.activeProjectId).toBeNull();
    });

    it('sets activeProjectId to null when there are no projects', () => {
      const data = createAppData({ projects: [] });

      const result = appReducer(initialState, {
        type: 'INIT',
        data,
        dataPath: '/test/path',
      });

      expect(result.activeProjectId).toBeNull();
    });
  });

  describe('SET_DATA_PATH action', () => {
    it('updates only the dataPath', () => {
      const state: AppState = {
        ...initialState,
        dataPath: '/old/path',
        initialized: true,
      };

      const result = appReducer(state, {
        type: 'SET_DATA_PATH',
        dataPath: '/new/path',
      });

      expect(result.dataPath).toBe('/new/path');
      expect(result.initialized).toBe(true);
    });
  });

  describe('ADD_PROJECT action', () => {
    it('adds project to the list', () => {
      const project = createProject({ id: 'new-project' });

      const result = appReducer(initialState, {
        type: 'ADD_PROJECT',
        project,
      });

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0]).toEqual(project);
    });

    it('sets the new project as active', () => {
      const existingProject = createProject({ id: 'existing' });
      const newProject = createProject({ id: 'new-project' });
      const state: AppState = {
        ...initialState,
        projects: [existingProject],
        activeProjectId: 'existing',
      };

      const result = appReducer(state, {
        type: 'ADD_PROJECT',
        project: newProject,
      });

      expect(result.activeProjectId).toBe('new-project');
    });

    it('preserves existing projects', () => {
      const existingProject = createProject({ id: 'existing' });
      const newProject = createProject({ id: 'new-project' });
      const state: AppState = {
        ...initialState,
        projects: [existingProject],
      };

      const result = appReducer(state, {
        type: 'ADD_PROJECT',
        project: newProject,
      });

      expect(result.projects).toHaveLength(2);
      expect(result.projects[0]).toEqual(existingProject);
      expect(result.projects[1]).toEqual(newProject);
    });
  });

  describe('UPDATE_PROJECT action', () => {
    it('updates the specified project', () => {
      const project = createProject({ id: 'p1', title: 'Original Title' });
      const state: AppState = {
        ...initialState,
        projects: [project],
      };

      const updatedProject = { ...project, title: 'New Title' };
      const result = appReducer(state, {
        type: 'UPDATE_PROJECT',
        project: updatedProject,
      });

      expect(result.projects[0].title).toBe('New Title');
    });

    it('updates the updatedAt timestamp', () => {
      const project = createProject({ id: 'p1', updatedAt: '2024-01-01T00:00:00Z' });
      const state: AppState = {
        ...initialState,
        projects: [project],
      };

      const result = appReducer(state, {
        type: 'UPDATE_PROJECT',
        project,
      });

      expect(result.projects[0].updatedAt).toBe('2024-06-15T12:00:00.000Z');
    });

    it('does not modify other projects', () => {
      const project1 = createProject({ id: 'p1', title: 'Project 1' });
      const project2 = createProject({ id: 'p2', title: 'Project 2' });
      const state: AppState = {
        ...initialState,
        projects: [project1, project2],
      };

      const updatedProject1 = { ...project1, title: 'Updated Project 1' };
      const result = appReducer(state, {
        type: 'UPDATE_PROJECT',
        project: updatedProject1,
      });

      expect(result.projects[1].title).toBe('Project 2');
    });

    it('handles non-existent project ID gracefully', () => {
      const project = createProject({ id: 'p1' });
      const state: AppState = {
        ...initialState,
        projects: [project],
      };

      const nonExistentProject = createProject({ id: 'non-existent' });
      const result = appReducer(state, {
        type: 'UPDATE_PROJECT',
        project: nonExistentProject,
      });

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].id).toBe('p1');
    });
  });

  describe('ARCHIVE_PROJECT action', () => {
    it('sets archived to true', () => {
      const project = createProject({ id: 'p1', archived: false });
      const state: AppState = {
        ...initialState,
        projects: [project],
        activeProjectId: 'p1',
      };

      const result = appReducer(state, {
        type: 'ARCHIVE_PROJECT',
        projectId: 'p1',
      });

      expect(result.projects[0].archived).toBe(true);
    });

    it('updates the updatedAt timestamp', () => {
      const project = createProject({ id: 'p1', updatedAt: '2024-01-01T00:00:00Z' });
      const state: AppState = {
        ...initialState,
        projects: [project],
      };

      const result = appReducer(state, {
        type: 'ARCHIVE_PROJECT',
        projectId: 'p1',
      });

      expect(result.projects[0].updatedAt).toBe('2024-06-15T12:00:00.000Z');
    });

    it('switches activeProjectId to another non-archived project when archiving active project', () => {
      const project1 = createProject({ id: 'p1', archived: false });
      const project2 = createProject({ id: 'p2', archived: false });
      const state: AppState = {
        ...initialState,
        projects: [project1, project2],
        activeProjectId: 'p1',
      };

      const result = appReducer(state, {
        type: 'ARCHIVE_PROJECT',
        projectId: 'p1',
      });

      expect(result.activeProjectId).toBe('p2');
    });

    it('sets activeProjectId to null when archiving the only non-archived project', () => {
      const project = createProject({ id: 'p1', archived: false });
      const state: AppState = {
        ...initialState,
        projects: [project],
        activeProjectId: 'p1',
      };

      const result = appReducer(state, {
        type: 'ARCHIVE_PROJECT',
        projectId: 'p1',
      });

      expect(result.activeProjectId).toBeNull();
    });

    it('does not change activeProjectId when archiving a non-active project', () => {
      const project1 = createProject({ id: 'p1', archived: false });
      const project2 = createProject({ id: 'p2', archived: false });
      const state: AppState = {
        ...initialState,
        projects: [project1, project2],
        activeProjectId: 'p1',
      };

      const result = appReducer(state, {
        type: 'ARCHIVE_PROJECT',
        projectId: 'p2',
      });

      expect(result.activeProjectId).toBe('p1');
    });
  });

  describe('SET_ACTIVE_PROJECT action', () => {
    it('sets the activeProjectId', () => {
      const project = createProject({ id: 'p1' });
      const state: AppState = {
        ...initialState,
        projects: [project],
        activeProjectId: null,
      };

      const result = appReducer(state, {
        type: 'SET_ACTIVE_PROJECT',
        projectId: 'p1',
      });

      expect(result.activeProjectId).toBe('p1');
    });

    it('can set activeProjectId to null', () => {
      const project = createProject({ id: 'p1' });
      const state: AppState = {
        ...initialState,
        projects: [project],
        activeProjectId: 'p1',
      };

      const result = appReducer(state, {
        type: 'SET_ACTIVE_PROJECT',
        projectId: null,
      });

      expect(result.activeProjectId).toBeNull();
    });
  });

  describe('ADD_ENTRY action', () => {
    it('adds entry to the list', () => {
      const entry = createEntry({ id: 'e1' });

      const result = appReducer(initialState, {
        type: 'ADD_ENTRY',
        entry,
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toEqual(entry);
    });

    it('preserves existing entries', () => {
      const existingEntry = createEntry({ id: 'e1' });
      const newEntry = createEntry({ id: 'e2' });
      const state: AppState = {
        ...initialState,
        entries: [existingEntry],
      };

      const result = appReducer(state, {
        type: 'ADD_ENTRY',
        entry: newEntry,
      });

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]).toEqual(existingEntry);
      expect(result.entries[1]).toEqual(newEntry);
    });
  });

  describe('UPDATE_ENTRY action', () => {
    it('updates the specified entry', () => {
      const entry = createEntry({ id: 'e1', wordCount: 1000 });
      const state: AppState = {
        ...initialState,
        entries: [entry],
      };

      const updatedEntry = { ...entry, wordCount: 2000 };
      const result = appReducer(state, {
        type: 'UPDATE_ENTRY',
        entry: updatedEntry,
      });

      expect(result.entries[0].wordCount).toBe(2000);
    });

    it('updates the updatedAt timestamp', () => {
      const entry = createEntry({ id: 'e1', updatedAt: '2024-01-01T00:00:00Z' });
      const state: AppState = {
        ...initialState,
        entries: [entry],
      };

      const result = appReducer(state, {
        type: 'UPDATE_ENTRY',
        entry,
      });

      expect(result.entries[0].updatedAt).toBe('2024-06-15T12:00:00.000Z');
    });

    it('does not modify other entries', () => {
      const entry1 = createEntry({ id: 'e1', wordCount: 1000 });
      const entry2 = createEntry({ id: 'e2', wordCount: 2000 });
      const state: AppState = {
        ...initialState,
        entries: [entry1, entry2],
      };

      const updatedEntry1 = { ...entry1, wordCount: 1500 };
      const result = appReducer(state, {
        type: 'UPDATE_ENTRY',
        entry: updatedEntry1,
      });

      expect(result.entries[1].wordCount).toBe(2000);
    });
  });

  describe('DELETE_ENTRY action', () => {
    it('removes the specified entry', () => {
      const entry = createEntry({ id: 'e1' });
      const state: AppState = {
        ...initialState,
        entries: [entry],
      };

      const result = appReducer(state, {
        type: 'DELETE_ENTRY',
        entryId: 'e1',
      });

      expect(result.entries).toHaveLength(0);
    });

    it('preserves other entries', () => {
      const entry1 = createEntry({ id: 'e1' });
      const entry2 = createEntry({ id: 'e2' });
      const state: AppState = {
        ...initialState,
        entries: [entry1, entry2],
      };

      const result = appReducer(state, {
        type: 'DELETE_ENTRY',
        entryId: 'e1',
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].id).toBe('e2');
    });

    it('handles non-existent entry ID gracefully', () => {
      const entry = createEntry({ id: 'e1' });
      const state: AppState = {
        ...initialState,
        entries: [entry],
      };

      const result = appReducer(state, {
        type: 'DELETE_ENTRY',
        entryId: 'non-existent',
      });

      expect(result.entries).toHaveLength(1);
    });
  });

  describe('UPDATE_SETTINGS action', () => {
    it('merges partial settings', () => {
      const state: AppState = {
        ...initialState,
        settings: {
          dataPath: '/test',
          language: 'en',
          lastMotivationalDate: null,
          cloudSync: null,
        },
      };

      const result = appReducer(state, {
        type: 'UPDATE_SETTINGS',
        settings: { language: 'fr' },
      });

      expect(result.settings.language).toBe('fr');
      expect(result.settings.dataPath).toBe('/test');
    });

    it('can update multiple settings at once', () => {
      const state: AppState = {
        ...initialState,
        settings: {
          dataPath: '/test',
          language: 'en',
          lastMotivationalDate: null,
          cloudSync: null,
        },
      };

      const result = appReducer(state, {
        type: 'UPDATE_SETTINGS',
        settings: { language: 'fr', lastMotivationalDate: '2024-06-15' },
      });

      expect(result.settings.language).toBe('fr');
      expect(result.settings.lastMotivationalDate).toBe('2024-06-15');
    });
  });

  describe('TOGGLE_SHOW_ARCHIVED action', () => {
    it('toggles showArchived from false to true', () => {
      const state: AppState = {
        ...initialState,
        showArchived: false,
      };

      const result = appReducer(state, {
        type: 'TOGGLE_SHOW_ARCHIVED',
      });

      expect(result.showArchived).toBe(true);
    });

    it('toggles showArchived from true to false', () => {
      const state: AppState = {
        ...initialState,
        showArchived: true,
      };

      const result = appReducer(state, {
        type: 'TOGGLE_SHOW_ARCHIVED',
      });

      expect(result.showArchived).toBe(false);
    });
  });

  describe('IMPORT_DATA action', () => {
    it('replaces projects and entries with imported data', () => {
      const existingProject = createProject({ id: 'existing' });
      const existingEntry = createEntry({ id: 'existing-entry' });
      const state: AppState = {
        ...initialState,
        projects: [existingProject],
        entries: [existingEntry],
      };

      const importedProject = createProject({ id: 'imported' });
      const importedEntry = createEntry({ id: 'imported-entry', projectId: 'imported' });
      const data = createAppData({
        projects: [importedProject],
        entries: [importedEntry],
      });

      const result = appReducer(state, {
        type: 'IMPORT_DATA',
        data,
      });

      expect(result.projects).toEqual([importedProject]);
      expect(result.entries).toEqual([importedEntry]);
    });

    it('sets activeProjectId to first non-archived imported project', () => {
      const archivedProject = createProject({ id: 'archived', archived: true });
      const activeProject = createProject({ id: 'active', archived: false });
      const data = createAppData({
        projects: [archivedProject, activeProject],
      });

      const result = appReducer(initialState, {
        type: 'IMPORT_DATA',
        data,
      });

      expect(result.activeProjectId).toBe('active');
    });

    it('preserves other state properties', () => {
      const state: AppState = {
        ...initialState,
        initialized: true,
        dataPath: '/test/path',
        showArchived: true,
        settings: createSettings({ language: 'fr' }),
      };

      const data = createAppData({ projects: [] });

      const result = appReducer(state, {
        type: 'IMPORT_DATA',
        data,
      });

      expect(result.initialized).toBe(true);
      expect(result.dataPath).toBe('/test/path');
      expect(result.showArchived).toBe(true);
      expect(result.settings.language).toBe('fr');
    });
  });

  describe('RESET_FOR_USER_SWITCH action', () => {
    it('resets state to initial values', () => {
      const project = createProject({ id: 'p1' });
      const entry = createEntry({ id: 'e1' });
      const state: AppState = {
        initialized: true,
        dataPath: '/test/path',
        projects: [project],
        entries: [entry],
        settings: createSettings({ language: 'fr' }),
        activeProjectId: 'p1',
        showArchived: true,
      };

      const result = appReducer(state, {
        type: 'RESET_FOR_USER_SWITCH',
      });

      expect(result).toEqual(initialState);
    });
  });

  describe('unknown action', () => {
    it('returns current state for unknown action type', () => {
      const state: AppState = {
        ...initialState,
        initialized: true,
      };

      // @ts-expect-error - testing unknown action type
      const result = appReducer(state, { type: 'UNKNOWN_ACTION' });

      expect(result).toBe(state);
    });
  });

  describe('edge cases', () => {
    it('handles empty projects array', () => {
      const data = createAppData({ projects: [] });

      const result = appReducer(initialState, {
        type: 'INIT',
        data,
        dataPath: '/test',
      });

      expect(result.projects).toEqual([]);
      expect(result.activeProjectId).toBeNull();
    });

    it('handles empty entries array', () => {
      const data = createAppData({ entries: [] });

      const result = appReducer(initialState, {
        type: 'INIT',
        data,
        dataPath: '/test',
      });

      expect(result.entries).toEqual([]);
    });

    it('handles projects with same ID (last one wins in map)', () => {
      const project1 = createProject({ id: 'p1', title: 'First' });
      const project2 = createProject({ id: 'p1', title: 'Second' });
      const state: AppState = {
        ...initialState,
        projects: [project1, project2],
      };

      const result = appReducer(state, {
        type: 'UPDATE_PROJECT',
        project: { ...project1, title: 'Updated' },
      });

      // Both get updated since they have the same ID
      expect(result.projects[0].title).toBe('Updated');
      expect(result.projects[1].title).toBe('Updated');
    });
  });
});
