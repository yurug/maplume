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
});
