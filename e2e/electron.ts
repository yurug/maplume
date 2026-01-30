/**
 * Electron test utilities
 *
 * Provides helpers for launching and interacting with the Electron app in tests.
 */

import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface TestApp {
  app: ElectronApplication;
  window: Page;
  dataPath: string;
}

/**
 * Get the Electron userData path where config is stored
 */
function getElectronConfigPath(): string {
  // On Linux: ~/.config/{appName}/config.json
  // On macOS: ~/Library/Application Support/{appName}/config.json
  // On Windows: %APPDATA%/{appName}/config.json
  const platform = process.platform;
  const appName = 'maplume'; // lowercase

  if (platform === 'linux') {
    return path.join(os.homedir(), '.config', appName, 'config.json');
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', appName, 'config.json');
  } else {
    // Windows
    return path.join(process.env.APPDATA || '', appName, 'config.json');
  }
}

/**
 * Launch the MaPlume Electron app for testing
 */
export async function launchApp(): Promise<TestApp> {
  // Create a temporary data directory for this test
  const dataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'maplume-test-'));

  // Write config BEFORE launching the app so it reads the correct path
  const configPath = getElectronConfigPath();
  const configDir = path.dirname(configPath);

  // Ensure config directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Write config with our test data path and skip What's New modal
  const config = {
    dataPath: dataPath,
    lastSeenWhatsNewVersion: '0.4.0', // Skip What's New modal in tests
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  const window = await app.firstWindow();

  // Wait for the app to be ready
  await window.waitForLoadState('domcontentloaded');

  // Set localStorage flags for tests
  await window.evaluate((testDataPath) => {
    localStorage.setItem('maplume-data-path', testDataPath);
    localStorage.setItem('maplume-test-mode', 'true');
  }, dataPath);

  // Reload so the app picks up the test mode flag
  await window.reload();
  await window.waitForLoadState('domcontentloaded');

  return { app, window, dataPath };
}

/**
 * Close the app and clean up test data
 */
export async function closeApp(testApp: TestApp): Promise<void> {
  await testApp.app.close();

  // Clean up test data directory
  try {
    fs.rmSync(testApp.dataPath, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Seed test data and reload the app to pick it up
 */
export async function seedAndReload(testApp: TestApp, data: {
  projects?: any[];
  entries?: any[];
  settings?: any;
}): Promise<void> {
  // Write the data file
  seedTestData(testApp.dataPath, data);

  // Reload the page to pick up the new data
  await testApp.window.reload();
  await testApp.window.waitForLoadState('domcontentloaded');

  // Wait for the app to initialize and load data
  await testApp.window.waitForTimeout(2000);
}

/**
 * Create test data file directly (for faster test setup)
 */
export function seedTestData(dataPath: string, data: {
  projects?: any[];
  entries?: any[];
  settings?: any;
}): void {
  // Ensure the directory exists
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  const filePath = path.join(dataPath, 'maplume-data.json');
  const fullData = {
    version: 3, // Current STORAGE_VERSION
    projects: data.projects || [],
    entries: data.entries || [],
    settings: data.settings || {
      dataPath: dataPath,
      language: 'en',
      lastMotivationalDate: null,
      cloudSync: null,
    },
  };
  fs.writeFileSync(filePath, JSON.stringify(fullData, null, 2));
}
