export interface Project {
  id: string;
  title: string;
  notes: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  targetWords: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WordEntry {
  id: string;
  projectId: string;
  date: string; // ISO date string
  wordCount: number;
  isIncrement: boolean; // true if this was entered as an increment, false if total
  createdAt: string;
  updatedAt: string;
}

// Current storage schema version
export const STORAGE_VERSION = 1;

export interface AppData {
  version: number;
  projects: Project[];
  entries: WordEntry[];
  settings: AppSettings;
}

export interface AppSettings {
  dataPath: string;
  language: string;
  lastMotivationalDate: string | null;
  cloudSync: CloudSyncSettings | null;
}

export interface CloudSyncSettings {
  // Reserved for future use - data syncs automatically if stored in cloud-synced folder
}

export interface Statistics {
  currentWordCount: number;
  targetWords: number;
  wordsRemaining: number;
  percentComplete: number;
  dailyAverage: number;
  weeklyAverage: number;
  bestDay: { date: string; words: number } | null;
  currentStreak: number;
  projectedCompletionDate: string | null;
}
