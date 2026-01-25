export interface ElectronAPI {
  selectDataFolder: () => Promise<string | null>;
  readData: (filePath: string) => Promise<unknown | null>;
  writeData: (filePath: string, data: unknown) => Promise<boolean>;
  getSystemLocale: () => Promise<string>;
  openExternalUrl: (url: string) => Promise<void>;
  // Config storage (more reliable than localStorage on Windows)
  getConfigValue: (key: string) => Promise<unknown | null>;
  setConfigValue: (key: string, value: unknown) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
