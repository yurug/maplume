export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl?: string;
  checksumUrl?: string;
}

export interface CheckUpdateResult extends UpdateInfo {
  success: boolean;
  error?: string;
}

export interface DownloadUpdateResult {
  success: boolean;
  error?: string;
}

export interface AppUpdateInfo {
  appVersion: string;
  rendererVersion: string;
  hasUserRenderer: boolean;
}

export interface SecureStorage {
  set: (key: string, value: string) => Promise<boolean>;
  get: (key: string) => Promise<string | null>;
  delete: (key: string) => Promise<boolean>;
  clear: () => Promise<boolean>;
}

export interface ElectronAPI {
  selectDataFolder: () => Promise<string | null>;
  readData: (filePath: string) => Promise<unknown | null>;
  writeData: (filePath: string, data: unknown) => Promise<boolean>;
  ensureDirectory: (dirPath: string) => Promise<boolean>;
  getSystemLocale: () => Promise<string>;
  openExternalUrl: (url: string) => Promise<void>;
  // Config storage (more reliable than localStorage on Windows)
  getConfigValue: (key: string) => Promise<unknown | null>;
  setConfigValue: (key: string, value: unknown) => Promise<boolean>;
  // Background image handling
  selectBackgroundImage: () => Promise<string | null>;
  copyBackgroundImage: (sourcePath: string, dataPath: string, projectId: string) => Promise<string | null>;
  deleteBackgroundImage: (dataPath: string, relativePath: string) => Promise<boolean>;
  getBackgroundImageUrl: (dataPath: string, relativePath: string) => Promise<string>;
  // Custom updater
  checkForUpdates: () => Promise<CheckUpdateResult>;
  downloadUpdate: (updateInfo: UpdateInfo) => Promise<DownloadUpdateResult>;
  getUpdateInfo: () => Promise<AppUpdateInfo>;
  restartApp: () => Promise<void>;
  // Secure storage for social features
  secureStorage: SecureStorage;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
