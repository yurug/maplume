import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {
  checkForUpdates,
  downloadAndInstallUpdate,
  getRendererLoadPath,
  getUserRendererVersion,
  hasUserRenderer,
} from './updater';

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
    // Load renderer from user folder if available (for JS-only updates)
    const rendererPath = getRendererLoadPath();
    mainWindow.loadFile(rendererPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Custom JS-only auto-updater (bypasses macOS code signing)
async function setupAutoUpdater() {
  const currentVersion = app.getVersion();
  const rendererVersion = getUserRendererVersion() || currentVersion;

  console.log('[Updater] App version:', currentVersion);
  console.log('[Updater] Renderer version:', rendererVersion);
  console.log('[Updater] Using user renderer:', hasUserRenderer());

  try {
    const updateInfo = await checkForUpdates();

    if (updateInfo.available) {
      console.log('[Updater] Update available:', updateInfo.latestVersion);

      const result = await dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${updateInfo.latestVersion}) is available.\n\nCurrent: ${updateInfo.currentVersion}\n\nWould you like to download and install it now?`,
        buttons: ['Download', 'Later'],
        defaultId: 0,
      });

      if (result.response === 0) {
        // Show progress dialog
        const progressDialog = await dialog.showMessageBox(mainWindow!, {
          type: 'info',
          title: 'Downloading Update',
          message: 'Downloading update... Please wait.',
          buttons: [],
          noLink: true,
        });

        try {
          await downloadAndInstallUpdate(updateInfo, mainWindow, (percent) => {
            console.log('[Updater] Download progress:', percent, '%');
            // Note: Can't update dialog in Electron, progress is logged to console
          });

          const restartResult = await dialog.showMessageBox(mainWindow!, {
            type: 'info',
            title: 'Update Installed',
            message: `Version ${updateInfo.latestVersion} has been installed.\n\nRestart now to use the new version.`,
            buttons: ['Restart Now', 'Later'],
            defaultId: 0,
          });

          if (restartResult.response === 0) {
            app.relaunch();
            app.exit(0);
          }
        } catch (downloadError) {
          console.error('[Updater] Download failed:', downloadError);
          dialog.showMessageBox(mainWindow!, {
            type: 'error',
            title: 'Update Failed',
            message: `Failed to download update:\n\n${(downloadError as Error).message}`,
            buttons: ['OK'],
          });
        }
      }
    } else {
      console.log('[Updater] No update available. Latest:', updateInfo.latestVersion);
    }
  } catch (error) {
    console.error('[Updater] Error checking for updates:', error);
    // Silent failure on startup - don't bother the user
  }
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

ipcMain.handle('ensure-directory', async (_event, dirPath: string) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
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

// Custom updater IPC handlers
ipcMain.handle('check-for-updates', async () => {
  try {
    const updateInfo = await checkForUpdates();
    return {
      success: true,
      ...updateInfo,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
});

ipcMain.handle('download-update', async (_event, updateInfo) => {
  try {
    await downloadAndInstallUpdate(updateInfo, mainWindow);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
});

ipcMain.handle('get-update-info', () => {
  return {
    appVersion: app.getVersion(),
    rendererVersion: getUserRendererVersion() || app.getVersion(),
    hasUserRenderer: hasUserRenderer(),
  };
});

ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit(0);
});

// Secure storage handlers for social features
// These store sensitive data (encrypted keys, tokens) in the app's config
function getSecureStoragePath(): string {
  return path.join(app.getPath('userData'), 'secure-storage.json');
}

function readSecureStorage(): Record<string, string> {
  try {
    const storagePath = getSecureStoragePath();
    if (fs.existsSync(storagePath)) {
      const data = fs.readFileSync(storagePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // Storage doesn't exist or is invalid
  }
  return {};
}

function writeSecureStorage(storage: Record<string, string>): void {
  try {
    const storagePath = getSecureStoragePath();
    fs.writeFileSync(storagePath, JSON.stringify(storage, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write secure storage:', error);
  }
}

ipcMain.handle('secure-storage:set', (_event, key: string, value: string) => {
  try {
    const storage = readSecureStorage();
    storage[key] = value;
    writeSecureStorage(storage);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('secure-storage:get', (_event, key: string) => {
  try {
    const storage = readSecureStorage();
    return storage[key] ?? null;
  } catch {
    return null;
  }
});

ipcMain.handle('secure-storage:delete', (_event, key: string) => {
  try {
    const storage = readSecureStorage();
    delete storage[key];
    writeSecureStorage(storage);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('secure-storage:clear', () => {
  try {
    writeSecureStorage({});
    return true;
  } catch {
    return false;
  }
});
