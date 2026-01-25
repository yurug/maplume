export interface ElectronAPI {
  selectDataFolder: () => Promise<string | null>;
  readData: (filePath: string) => Promise<unknown | null>;
  writeData: (filePath: string, data: unknown) => Promise<boolean>;
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
