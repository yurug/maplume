import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectDataFolder: () => ipcRenderer.invoke('select-data-folder'),
  readData: (filePath: string) => ipcRenderer.invoke('read-data', filePath),
  writeData: (filePath: string, data: unknown) => ipcRenderer.invoke('write-data', filePath, data),
  getSystemLocale: () => ipcRenderer.invoke('get-system-locale'),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  // Config storage (more reliable than localStorage on Windows)
  getConfigValue: (key: string) => ipcRenderer.invoke('get-config-value', key),
  setConfigValue: (key: string, value: unknown) => ipcRenderer.invoke('set-config-value', key, value),
  // Background image handling
  selectBackgroundImage: () => ipcRenderer.invoke('select-background-image'),
  copyBackgroundImage: (sourcePath: string, dataPath: string, projectId: string) =>
    ipcRenderer.invoke('copy-background-image', sourcePath, dataPath, projectId),
  deleteBackgroundImage: (dataPath: string, relativePath: string) =>
    ipcRenderer.invoke('delete-background-image', dataPath, relativePath),
  getBackgroundImageUrl: (dataPath: string, relativePath: string) =>
    ipcRenderer.invoke('get-background-image-url', dataPath, relativePath),
  // Custom updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: (updateInfo: unknown) => ipcRenderer.invoke('download-update', updateInfo),
  getUpdateInfo: () => ipcRenderer.invoke('get-update-info'),
  restartApp: () => ipcRenderer.invoke('restart-app'),
  // Secure storage for social features (encrypted keys, tokens)
  secureStorage: {
    set: (key: string, value: string) => ipcRenderer.invoke('secure-storage:set', key, value),
    get: (key: string) => ipcRenderer.invoke('secure-storage:get', key),
    delete: (key: string) => ipcRenderer.invoke('secure-storage:delete', key),
    clear: () => ipcRenderer.invoke('secure-storage:clear'),
  },
});
