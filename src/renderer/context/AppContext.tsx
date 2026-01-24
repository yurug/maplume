import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { AppData, Project, WordEntry, AppSettings } from '@shared/types';
import { loadData, saveData, generateId } from '../services/storage';

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
  | { type: 'IMPORT_DATA'; data: AppData };

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

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    initialize: (dataPath: string) => Promise<void>;
    addProject: (project: Omit<Project, 'id' | 'archived' | 'createdAt' | 'updatedAt'>) => void;
    updateProject: (project: Project) => void;
    archiveProject: (projectId: string) => void;
    setActiveProject: (projectId: string | null) => void;
    addEntry: (projectId: string, date: string, wordCount: number, isIncrement: boolean) => void;
    updateEntry: (entry: WordEntry) => void;
    deleteEntry: (entryId: string) => void;
    updateSettings: (settings: Partial<AppSettings>) => void;
    exportData: (projectId?: string) => AppData;
    importData: (data: AppData) => void;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Auto-save when state changes
  useEffect(() => {
    if (state.initialized && state.dataPath) {
      const data: AppData = {
        projects: state.projects,
        entries: state.entries,
        settings: state.settings,
      };
      saveData(state.dataPath, data);
    }
  }, [state.projects, state.entries, state.settings, state.initialized, state.dataPath]);

  const actions: AppContextValue['actions'] = {
    initialize: async (dataPath: string) => {
      const data = await loadData(dataPath);
      dispatch({ type: 'INIT', data, dataPath });
    },

    addProject: (partial) => {
      const now = new Date().toISOString();
      const project: Project = {
        ...partial,
        id: generateId(),
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: 'ADD_PROJECT', project });
    },

    updateProject: (project) => {
      dispatch({ type: 'UPDATE_PROJECT', project });
    },

    archiveProject: (projectId) => {
      dispatch({ type: 'ARCHIVE_PROJECT', projectId });
    },

    setActiveProject: (projectId) => {
      dispatch({ type: 'SET_ACTIVE_PROJECT', projectId });
    },

    addEntry: (projectId, date, wordCount, isIncrement) => {
      const now = new Date().toISOString();
      const entry: WordEntry = {
        id: generateId(),
        projectId,
        date,
        wordCount,
        isIncrement,
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: 'ADD_ENTRY', entry });
    },

    updateEntry: (entry) => {
      dispatch({ type: 'UPDATE_ENTRY', entry });
    },

    deleteEntry: (entryId) => {
      dispatch({ type: 'DELETE_ENTRY', entryId });
    },

    updateSettings: (settings) => {
      dispatch({ type: 'UPDATE_SETTINGS', settings });
    },

    exportData: (projectId?: string) => {
      if (projectId) {
        return {
          projects: state.projects.filter((p) => p.id === projectId),
          entries: state.entries.filter((e) => e.projectId === projectId),
          settings: state.settings,
        };
      }
      return {
        projects: state.projects,
        entries: state.entries,
        settings: state.settings,
      };
    },

    importData: (data) => {
      dispatch({ type: 'IMPORT_DATA', data });
    },
  };

  return <AppContext.Provider value={{ state, dispatch, actions }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
