import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectDataFolder: () => ipcRenderer.invoke('select-data-folder'),
  readData: (filePath: string) => ipcRenderer.invoke('read-data', filePath),
  writeData: (filePath: string, data: unknown) => ipcRenderer.invoke('write-data', filePath, data),
  getSystemLocale: () => ipcRenderer.invoke('get-system-locale'),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
});
