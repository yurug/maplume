import type { AppData, Project, WordEntry, AppSettings } from '@shared/types';

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
    projects: [],
    entries: [],
    settings: getDefaultSettings(),
  };
}

export async function selectDataFolder(): Promise<string | null> {
  return window.electronAPI.selectDataFolder();
}

export async function loadData(dataPath: string): Promise<AppData> {
  const filePath = `${dataPath}/${DATA_FILE}`;
  const data = await window.electronAPI.readData(filePath);
  if (data) {
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
