/**
 * User Story: Project Management
 *
 * As a writer, I want to create and manage writing projects
 * so that I can track my progress on different novels.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, seedTestData, type TestApp } from '../electron';

let testApp: TestApp;

test.beforeEach(async () => {
  testApp = await launchApp();
});

test.afterEach(async () => {
  await closeApp(testApp);
});

test.describe('Project Creation', () => {
  test('user can create a new project with word count goal', async () => {
    const { window } = testApp;

    // Click "New" button
    await window.click('button:has-text("New")');

    // Fill in project details
    await window.fill('input[placeholder*="Novel"]', 'My First Novel');
    await window.fill('input[type="number"][name="targetWords"], input[type="number"]:near(:text("Target"))', '50000');

    // Set dates
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await window.fill('input[type="date"]:first-of-type', today);
    await window.fill('input[type="date"]:last-of-type', endDate);

    // Create the project
    await window.click('button:has-text("Create")');

    // Verify project appears in sidebar
    await expect(window.locator('text=My First Novel')).toBeVisible();

    // Verify project is selected and shows details
    await expect(window.locator('text=50,000')).toBeVisible();
  });

  test('user can create a project tracking pages instead of words', async () => {
    const { window } = testApp;

    await window.click('button:has-text("New")');

    await window.fill('input[placeholder*="Novel"]', 'Page-Tracked Novel');

    // Select pages unit type
    await window.click('text=Pages');

    await window.fill('input[type="number"]:near(:text("Target"))', '300');

    await window.click('button:has-text("Create")');

    // Verify project shows pages
    await expect(window.locator('text=Page-Tracked Novel')).toBeVisible();
    await expect(window.locator('text=300')).toBeVisible();
  });
});

test.describe('Project Editing', () => {
  test('user can edit an existing project', async () => {
    const { window, dataPath } = testApp;

    // Seed a project
    seedTestData(dataPath, {
      projects: [{
        id: 'test-project',
        title: 'Original Title',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        targetWords: 50000,
        unitType: 'words',
        notes: '',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }],
    });

    // Reload to pick up seeded data
    await window.reload();
    await window.waitForSelector('text=Original Title');

    // Click edit button
    await window.click('button[title*="Edit"], button:has-text("Edit")');

    // Change title
    await window.fill('input[value="Original Title"]', 'Updated Title');

    // Save
    await window.click('button:has-text("Save")');

    // Verify change
    await expect(window.locator('text=Updated Title')).toBeVisible();
    await expect(window.locator('text=Original Title')).not.toBeVisible();
  });
});

test.describe('Project Archiving', () => {
  test('user can archive a completed project', async () => {
    const { window, dataPath } = testApp;

    seedTestData(dataPath, {
      projects: [{
        id: 'test-project',
        title: 'Completed Novel',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        targetWords: 50000,
        unitType: 'words',
        notes: '',
        archived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }],
    });

    await window.reload();
    await window.waitForSelector('text=Completed Novel');

    // Edit project and archive
    await window.click('button[title*="Edit"], button:has-text("Edit")');
    await window.click('text=Archive');
    await window.click('button:has-text("Save")');

    // Project should be hidden by default
    await expect(window.locator('text=Completed Novel')).not.toBeVisible();

    // Show archived
    await window.click('text=Show archived');

    // Now it should be visible
    await expect(window.locator('text=Completed Novel')).toBeVisible();
  });
});
