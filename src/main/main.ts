import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

// Config file path for storing app settings (more reliable than localStorage on Windows)
function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json');
}

function readConfig(): Record<string, unknown> {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // Config doesn't exist or is invalid
  }
  return {};
}

function writeConfig(config: Record<string, unknown>): void {
  try {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write config:', error);
  }
}

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

// Auto-updater configuration
function setupAutoUpdater() {
  // Disable auto-download - we'll handle it manually
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    dialog
      .showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available. Would you like to download it now?`,
        buttons: ['Download', 'Later'],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  autoUpdater.on('update-downloaded', (info) => {
    dialog
      .showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded. The application will restart to install the update.`,
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          // Force quit and install - this ensures the app is fully closed
          setImmediate(() => {
            app.removeAllListeners('window-all-closed');
            if (mainWindow) {
              mainWindow.close();
            }
            autoUpdater.quitAndInstall(false, true);
          });
        }
      });
  });

  autoUpdater.on('error', (error) => {
    dialog.showMessageBox(mainWindow!, {
      type: 'error',
      title: 'Update Error',
      message: `An error occurred while updating: ${error.message}`,
      buttons: ['OK'],
    });
  });

  // Check for updates
  autoUpdater.checkForUpdates();
}

app.whenReady().then(() => {
  // Remove the default menu bar
  Menu.setApplicationMenu(null);

  createWindow();

  if (!isDev) {
    // Delay update check to ensure window is ready
    setTimeout(() => {
      setupAutoUpdater();
    }, 3000);
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

// Config handlers for persistent storage (fixes Windows localStorage issues)
ipcMain.handle('get-config-value', (_event, key: string) => {
  const config = readConfig();
  return config[key] ?? null;
});

ipcMain.handle('set-config-value', (_event, key: string, value: unknown) => {
  const config = readConfig();
  config[key] = value;
  writeConfig(config);
  return true;
});
