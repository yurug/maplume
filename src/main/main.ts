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
  const currentVersion = app.getVersion();

  // Enable logging
  autoUpdater.logger = {
    info: (message: string) => console.log('[AutoUpdater]', message),
    warn: (message: string) => console.warn('[AutoUpdater]', message),
    error: (message: string) => console.error('[AutoUpdater]', message),
    debug: (message: string) => console.log('[AutoUpdater DEBUG]', message),
  } as typeof autoUpdater.logger;

  // Disable auto-download - we'll handle it manually
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates... Current version:', currentVersion);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] No update available. Latest:', info.version);
    // Silent when no update - only log to console
  });

  autoUpdater.on('update-available', async (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available.\n\nCurrent: ${currentVersion}\n\nWould you like to download it now?`,
      buttons: ['Download', 'Later'],
      defaultId: 0,
    });
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log('[AutoUpdater] Download progress:', Math.round(progress.percent), '%');
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
    console.error('[AutoUpdater] Error:', error);
    dialog.showMessageBox(mainWindow!, {
      type: 'error',
      title: 'Update Error',
      message: `Error checking for updates:\n\n${error.message}\n\nCurrent version: ${currentVersion}`,
      buttons: ['OK'],
    });
  });

  // Check for updates
  console.log('[AutoUpdater] Starting update check for version', currentVersion);
  autoUpdater.checkForUpdates()
    .then((result) => {
      console.log('[AutoUpdater] Check result:', result?.updateInfo?.version || 'no result');
    })
    .catch((err) => {
      console.error('[AutoUpdater] checkForUpdates failed:', err);
      dialog.showMessageBox(mainWindow!, {
        type: 'error',
        title: 'Update Check Failed',
        message: `Failed to check for updates:\n\n${err.message}\n\nCurrent version: ${currentVersion}`,
        buttons: ['OK'],
      });
    });
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

// Background image handlers
ipcMain.handle('select-background-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    title: 'Select Background Image',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle(
  'copy-background-image',
  async (_event, sourcePath: string, dataPath: string, projectId: string) => {
    try {
      // Create backgrounds folder if it doesn't exist
      const backgroundsDir = path.join(dataPath, 'backgrounds');
      if (!fs.existsSync(backgroundsDir)) {
        fs.mkdirSync(backgroundsDir, { recursive: true });
      }

      // Generate unique filename
      const ext = path.extname(sourcePath);
      const filename = `${projectId}-${Date.now()}${ext}`;
      const destPath = path.join(backgroundsDir, filename);

      // Copy the file
      await fs.promises.copyFile(sourcePath, destPath);

      // Return relative path for storage
      return `backgrounds/${filename}`;
    } catch (error) {
      console.error('Failed to copy background image:', error);
      return null;
    }
  }
);

ipcMain.handle(
  'delete-background-image',
  async (_event, dataPath: string, relativePath: string) => {
    try {
      const fullPath = path.join(dataPath, relativePath);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
      return true;
    } catch (error) {
      console.error('Failed to delete background image:', error);
      return false;
    }
  }
);

ipcMain.handle(
  'get-background-image-url',
  (_event, dataPath: string, relativePath: string) => {
    const fullPath = path.join(dataPath, relativePath);
    // Return file:// URL for use in CSS
    return `file://${fullPath}`;
  }
);
