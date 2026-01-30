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
 * Launch the MaPlume Electron app for testing
 */
export async function launchApp(): Promise<TestApp> {
  // Create a temporary data directory for this test
  const dataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'maplume-test-'));

  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      MAPLUME_TEST_DATA_PATH: dataPath,
    },
  });

  const window = await app.firstWindow();

  // Wait for the app to be ready
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
 * Set up the app with a data folder (skip setup screen)
 */
export async function setupDataFolder(window: Page, dataPath: string): Promise<void> {
  // If we're on the setup screen, select the folder
  const setupScreen = window.locator('text=Welcome to MaPlume');
  if (await setupScreen.isVisible({ timeout: 2000 }).catch(() => false)) {
    // The app should auto-select the test data path via env var
    // If not, we need to interact with the folder selection
    await window.click('text=Select Folder');

    // Wait for the main app to load
    await window.waitForSelector('text=Projects', { timeout: 10000 });
  }
}

/**
 * Create test data file directly (for faster test setup)
 */
export function seedTestData(dataPath: string, data: {
  projects?: any[];
  entries?: any[];
  settings?: any;
}): void {
  const filePath = path.join(dataPath, 'maplume-data.json');
  const fullData = {
    projects: data.projects || [],
    entries: data.entries || [],
    settings: data.settings || {
      theme: 'light',
      language: 'en',
    },
  };
  fs.writeFileSync(filePath, JSON.stringify(fullData, null, 2));
}
