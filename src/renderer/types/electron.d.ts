export interface ElectronAPI {
  selectDataFolder: () => Promise<string | null>;
  readData: (filePath: string) => Promise<unknown | null>;
  writeData: (filePath: string, data: unknown) => Promise<boolean>;
  getSystemLocale: () => Promise<string>;
  openExternalUrl: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
