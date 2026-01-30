// Unit types for tracking progress
export type UnitType = 'words' | 'pages' | 'chapters';

// Background customization for projects
export interface ProjectBackground {
  type: 'color' | 'image';
  value: string; // hex color or relative image path (e.g., "backgrounds/project-123.jpg")
  opacity: number; // 0-1 (controls overlay opacity for readability)
}

// Available project icons
export const PROJECT_ICONS = [
  'BookOpen', 'Feather', 'PenTool', 'FileText', 'Scroll',
  'BookMarked', 'Library', 'Notebook', 'GraduationCap', 'Sparkles',
  'Heart', 'Star', 'Flame', 'Zap', 'Moon',
  'Sun', 'Cloud', 'Flower2', 'TreePine', 'Mountain',
] as const;

export type ProjectIcon = typeof PROJECT_ICONS[number];

export interface Project {
  id: string;
  title: string;
  notes: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  targetWords: number; // Target count in chosen unit (field name kept for compatibility)
  unitType: UnitType; // Cannot be changed after creation
  icon?: ProjectIcon; // Optional custom icon (defaults to BookOpen)
  background?: ProjectBackground; // Optional custom background
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
  note?: string; // Optional comment/note for this entry
  createdAt: string;
  updatedAt: string;
}

// Current storage schema version
export const STORAGE_VERSION = 3;

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
