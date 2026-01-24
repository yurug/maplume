import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

ipcMain.handle('select-data-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Data Folder',
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('read-data', async (_event, filePath: string) => {
  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
});

ipcMain.handle('write-data', async (_event, filePath: string, data: unknown) => {
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('get-system-locale', () => {
  return app.getLocale();
});

ipcMain.handle('open-external-url', async (_event, url: string) => {
  const { shell } = await import('electron');
  shell.openExternal(url);
});
