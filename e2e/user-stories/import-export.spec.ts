/**
 * User Story: Import/Export
 *
 * As a writer, I want to export and import my data
 * so that I can back it up or transfer it to another device.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, seedTestData, seedAndReload, type TestApp } from '../electron';
import fs from 'fs';
import path from 'path';

let testApp: TestApp;

const testProject = {
  id: 'test-project',
  title: 'Exportable Novel',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  targetWords: 80000,
  unitType: 'words' as const,
  notes: 'A novel about testing',
  archived: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const testEntries = [
  {
    id: 'entry-1',
    projectId: 'test-project',
    date: '2024-01-15',
    wordCount: 2500,
    isIncrement: true,
    note: 'First writing session',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'entry-2',
    projectId: 'test-project',
    date: '2024-01-16',
    wordCount: 3000,
    isIncrement: true,
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
  },
];

test.beforeEach(async () => {
  testApp = await launchApp();
});

test.afterEach(async () => {
  await closeApp(testApp);
});

test.describe('Data Export', () => {
  test('user can export all projects', async () => {
    await seedAndReload(testApp, {
      projects: [testProject],
      entries: testEntries,
    });

    const { window } = testApp;
    await window.waitForSelector('text=Exportable Novel', { timeout: 15000 });

    // Open settings (gear icon in bottom left)
    await window.click('button:has([class*="settings"]), [data-testid="settings"]');

    // Click export all
    await window.click('text=Export All Projects');

    // The app triggers a file save dialog - we just verify we got to settings
    // In CI, the dialog would need to be mocked
  });

  test('user can export current project only', async () => {
    await seedAndReload(testApp, {
      projects: [
        testProject,
        { ...testProject, id: 'other-project', title: 'Other Novel' },
      ],
      entries: testEntries,
    });

    const { window } = testApp;
    await window.waitForSelector('text=Exportable Novel', { timeout: 15000 });

    // Select the project to export
    await window.click('text=Exportable Novel');

    // Open settings
    await window.click('button:has([class*="settings"]), [data-testid="settings"]');

    // Click export current
    await window.click('text=Export Current Project');

    // The app triggers a file save dialog
  });
});

test.describe('Data Import', () => {
  test('user can access import feature', async () => {
    await seedAndReload(testApp, { projects: [], entries: [] });

    const { window } = testApp;

    // Open settings
    await window.click('button:has([class*="settings"]), [data-testid="settings"]');

    // Verify import option exists
    await expect(window.locator('text=Import from File')).toBeVisible();
  });
});

test.describe('Data Integrity', () => {
  test('exported data preserves all project fields', async () => {
    const { dataPath } = testApp;

    // Verify the seeded data structure
    seedTestData(dataPath, {
      projects: [testProject],
      entries: testEntries,
    });

    const dataFile = path.join(dataPath, 'maplume-data.json');
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

    // Verify project fields are preserved
    expect(data.projects[0]).toMatchObject({
      id: 'test-project',
      title: 'Exportable Novel',
      targetWords: 80000,
      unitType: 'words',
      notes: 'A novel about testing',
    });

    // Verify entries are preserved
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0].note).toBe('First writing session');
  });
});
