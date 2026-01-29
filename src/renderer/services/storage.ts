import type { AppData, Project, WordEntry, AppSettings } from '@shared/types';
import { STORAGE_VERSION } from '@shared/types';

const DATA_FILE = 'maplume-data.json';

function getDefaultSettings(): AppSettings {
  return {
    dataPath: '',
    language: 'en',
    lastMotivationalDate: null,
    cloudSync: null,
  };
}

function getDefaultData(): AppData {
  return {
    version: STORAGE_VERSION,
    projects: [],
    entries: [],
    settings: getDefaultSettings(),
  };
}

/**
 * Migrate data from older versions to the current version.
 * Each migration function transforms data from version N to N+1.
 */
function migrateData(data: Record<string, unknown>): AppData {
  let version = (data.version as number) || 0;

  // Migration from v0 (no version field) to v1
  if (version === 0) {
    // v0 -> v1: Just add the version field, schema is otherwise compatible
    version = 1;
  }

  // Migration from v1 to v2: Add unitType to projects
  if (version === 1) {
    const projects = (data.projects as Record<string, unknown>[]) || [];
    data.projects = projects.map((project) => ({
      ...project,
      unitType: 'words', // Default existing projects to words
    }));
    version = 2;
  }

  // Migration from v2 to v3: Add background support (optional field, no changes needed)
  if (version === 2) {
    // background field is optional, existing projects simply won't have it
    version = 3;
  }

  return {
    ...data,
    version: STORAGE_VERSION,
    projects: (data.projects as Project[]) || [],
    entries: (data.entries as WordEntry[]) || [],
    settings: (data.settings as AppSettings) || getDefaultSettings(),
  };
}

export async function selectDataFolder(): Promise<string | null> {
  return window.electronAPI.selectDataFolder();
}

export async function loadData(dataPath: string): Promise<AppData> {
  const filePath = `${dataPath}/${DATA_FILE}`;
  const data = await window.electronAPI.readData(filePath);
  if (data) {
    // Check if migration is needed
    const loadedData = data as Record<string, unknown>;
    if (!loadedData.version || loadedData.version !== STORAGE_VERSION) {
      const migratedData = migrateData(loadedData);
      // Save migrated data back to file
      await saveData(dataPath, migratedData);
      return migratedData;
    }
    return data as AppData;
  }
  return getDefaultData();
}

export async function saveData(dataPath: string, data: AppData): Promise<boolean> {
  const filePath = `${dataPath}/${DATA_FILE}`;
  return window.electronAPI.writeData(filePath, data);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get the user-specific data path for storing user data.
 * Each logged-in user gets their own subfolder.
 */
export function getUserDataPath(basePath: string, username: string): string {
  // Sanitize username to be safe for filesystem
  const safeUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `${basePath}/users/${safeUsername}`;
}

/**
 * Ensure a directory exists, creating it if necessary.
 */
export async function ensureDirectory(path: string): Promise<boolean> {
  return window.electronAPI.ensureDirectory(path);
}

export function createProject(partial: Omit<Project, 'id' | 'archived' | 'createdAt' | 'updatedAt'>): Project {
  const now = new Date().toISOString();
  return {
    ...partial,
    id: generateId(),
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createWordEntry(
  projectId: string,
  date: string,
  wordCount: number,
  isIncrement: boolean
): WordEntry {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    projectId,
    date,
    wordCount,
    isIncrement,
    createdAt: now,
    updatedAt: now,
  };
}
