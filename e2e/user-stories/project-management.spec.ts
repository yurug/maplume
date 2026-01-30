/**
 * User Story: Project Management
 *
 * As a writer, I want to create and manage writing projects
 * so that I can track my progress on different novels.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, seedTestData, seedAndReload, type TestApp } from '../electron';

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

    // Wait for modal to be visible
    await window.waitForSelector('[role="dialog"], .fixed.inset-0');

    // Fill in project details
    await window.fill('input[placeholder*="Novel"]', 'My First Novel');

    // Target words input - use the label association
    const targetInput = window.locator('input[type="number"]').first();
    await targetInput.fill('50000');

    // Create the project - click the Create button in the modal footer
    const createButton = window.locator('[role="dialog"] button:has-text("Create"), .fixed.inset-0 button:has-text("Create")').last();
    await createButton.click();

    // Wait for modal to close
    await window.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});

    // Verify project appears in sidebar
    await expect(window.locator('text=My First Novel').first()).toBeVisible();

    // Verify project is selected and shows details
    await expect(window.locator('text=50,000').first()).toBeVisible({ timeout: 10000 });
  });

  test('user can create a project tracking pages instead of words', async () => {
    const { window } = testApp;

    await window.click('button:has-text("New")');

    // Wait for modal
    await window.waitForSelector('[role="dialog"], .fixed.inset-0');

    await window.fill('input[placeholder*="Novel"]', 'Page-Tracked Novel');

    // Select pages unit type - click the Pages button in unit type selector
    await window.click('button:has-text("Pages")');

    // Fill target
    const targetInput = window.locator('input[type="number"]').first();
    await targetInput.fill('300');

    // Create the project
    const createButton = window.locator('[role="dialog"] button:has-text("Create"), .fixed.inset-0 button:has-text("Create")').last();
    await createButton.click();

    // Wait for modal to close
    await window.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});

    // Verify project shows pages
    await expect(window.locator('text=Page-Tracked Novel').first()).toBeVisible();
    await expect(window.locator('text=300').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Project Editing', () => {
  test('user can edit an existing project', async () => {
    // Seed a project
    await seedAndReload(testApp, {
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

    const { window } = testApp;
    await window.waitForSelector('text=Original Title', { timeout: 15000 });

    // Select the project first
    await window.click('text=Original Title');

    // Wait for project to be selected
    await window.waitForTimeout(500);

    // Click edit button (pencil icon in the header)
    await window.click('[data-testid="edit-project"], button[title*="Edit"], button:has-text("Edit")');

    // Wait for edit modal to appear
    await window.waitForSelector('[role="dialog"], .fixed.inset-0');

    // Change title
    await window.fill('input[value="Original Title"]', 'Updated Title');

    // Save - click the Save button in the modal
    const saveButton = window.locator('[role="dialog"] button:has-text("Save"), .fixed.inset-0 button:has-text("Save")').last();
    await saveButton.click();

    // Wait for modal to close
    await window.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});

    // Verify change - use first() to avoid multiple matches
    await expect(window.locator('text=Updated Title').first()).toBeVisible();
  });
});

test.describe('Project Archiving', () => {
  test('user can archive a completed project', async () => {
    await seedAndReload(testApp, {
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

    const { window } = testApp;
    await window.waitForSelector('text=Completed Novel', { timeout: 15000 });

    // Select and edit project
    await window.click('text=Completed Novel');
    await window.waitForTimeout(500);
    await window.click('[data-testid="edit-project"], button[title*="Edit"], button:has-text("Edit")');

    // Wait for edit modal to fully load
    await window.waitForSelector('[role="dialog"], .fixed.inset-0');
    await window.waitForTimeout(500); // Let modal fully render

    // Click Archive button (it's a red/danger button in the modal footer)
    const archiveButton = window.locator('button:has-text("Archive")').first();
    await archiveButton.waitFor({ state: 'visible' });
    await archiveButton.click();

    // Wait for modal to close and page to update
    await window.waitForTimeout(1000);

    // Project should be hidden from sidebar (check just the sidebar, not the whole page)
    const sidebar = window.locator('aside, [role="complementary"], .w-64');
    await expect(sidebar.locator('text=Completed Novel')).not.toBeVisible({ timeout: 5000 });

    // Show archived projects
    await window.click('text=Show archived');

    // Now it should be visible in sidebar
    await expect(sidebar.locator('text=Completed Novel')).toBeVisible();
  });
});
