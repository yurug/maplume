/**
 * User Story: Word Tracking
 *
 * As a writer, I want to log my daily word counts
 * so that I can track my progress toward my goal.
 */

import { test, expect } from '@playwright/test';
import { launchApp, closeApp, seedTestData, type TestApp } from '../electron';

let testApp: TestApp;

// Create a project that spans today
const today = new Date().toISOString().split('T')[0];
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const testProject = {
  id: 'test-project',
  title: 'Test Novel',
  startDate: thirtyDaysAgo,
  endDate: thirtyDaysFromNow,
  targetWords: 50000,
  unitType: 'words' as const,
  notes: '',
  archived: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

test.beforeEach(async () => {
  testApp = await launchApp();
  seedTestData(testApp.dataPath, { projects: [testProject] });
  await testApp.window.reload();
  await testApp.window.waitForSelector('text=Test Novel');
});

test.afterEach(async () => {
  await closeApp(testApp);
});

test.describe('Logging Words', () => {
  test('user can log words written today', async () => {
    const { window } = testApp;

    // Find word count input and enter value
    await window.fill('input[type="number"]:near(:text("today"))', '1500');

    // Click log button
    await window.click('button:has-text("Log")');

    // Verify entry was recorded
    await expect(window.locator('text=1,500')).toBeVisible();

    // Verify statistics updated
    await expect(window.locator('text=3%')).toBeVisible(); // 1500/50000 = 3%
  });

  test('user can log words as increment (add to existing)', async () => {
    const { window, dataPath } = testApp;

    // Seed an existing entry
    seedTestData(dataPath, {
      projects: [testProject],
      entries: [{
        id: 'entry-1',
        projectId: 'test-project',
        date: today,
        wordCount: 1000,
        isIncrement: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }],
    });

    await window.reload();
    await window.waitForSelector('text=Test Novel');

    // Log additional words as increment
    await window.fill('input[type="number"]:near(:text("today"))', '500');

    // Make sure we're in increment mode (+ Add)
    await window.click('button:has-text("+ Add")');

    // Total should now be 1500
    await expect(window.locator('text=1,500')).toBeVisible();
  });

  test('user can log total word count (override)', async () => {
    const { window, dataPath } = testApp;

    seedTestData(dataPath, {
      projects: [testProject],
      entries: [{
        id: 'entry-1',
        projectId: 'test-project',
        date: today,
        wordCount: 1000,
        isIncrement: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }],
    });

    await window.reload();
    await window.waitForSelector('text=Test Novel');

    // Switch to total mode and enter new total
    await window.click('text== Total');
    await window.fill('input[type="number"]:near(:text("today"))', '2000');
    await window.click('button:has-text("Log")');

    // Total should be exactly 2000
    await expect(window.locator('text=2,000')).toBeVisible();
  });
});

test.describe('Entry Notes', () => {
  test('user can add a note when logging words', async () => {
    const { window } = testApp;

    // Enter word count
    await window.fill('input[type="number"]:near(:text("today"))', '1000');

    // Expand note section
    await window.click('text=Add a note');

    // Enter note
    await window.fill('textarea, input[placeholder*="write"]', 'Finished chapter 3');

    // Log entry
    await window.click('button:has-text("Log")');

    // Verify note appears (expand entry history if needed)
    const historyToggle = window.locator('text=Show Entry History');
    if (await historyToggle.isVisible()) {
      await historyToggle.click();
    }

    await expect(window.locator('text=Finished chapter 3')).toBeVisible();
  });

  test('user can see notes in chart tooltip', async () => {
    const { window, dataPath } = testApp;

    // Seed entry with note
    seedTestData(dataPath, {
      projects: [testProject],
      entries: [{
        id: 'entry-1',
        projectId: 'test-project',
        date: today,
        wordCount: 1000,
        isIncrement: true,
        note: 'Great writing session!',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }],
    });

    await window.reload();
    await window.waitForSelector('text=Test Novel');

    // Hover over today's point on the chart
    // This is tricky - we need to hover over the chart area
    const chart = window.locator('.recharts-wrapper');
    await chart.hover();

    // The tooltip should show the note
    await expect(window.locator('text=Great writing session!')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Entry History', () => {
  test('user can view entry history', async () => {
    const { window, dataPath } = testApp;

    seedTestData(dataPath, {
      projects: [testProject],
      entries: [
        {
          id: 'entry-1',
          projectId: 'test-project',
          date: today,
          wordCount: 1000,
          isIncrement: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'entry-2',
          projectId: 'test-project',
          date: today,
          wordCount: 500,
          isIncrement: true,
          createdAt: '2024-01-01T01:00:00Z',
          updatedAt: '2024-01-01T01:00:00Z',
        },
      ],
    });

    await window.reload();
    await window.waitForSelector('text=Test Novel');

    // Show entry history
    await window.click('text=Show Entry History');

    // Both entries should be visible
    await expect(window.locator('text=1,000')).toBeVisible();
    await expect(window.locator('text=500')).toBeVisible();
  });

  test('user can edit an entry', async () => {
    const { window, dataPath } = testApp;

    seedTestData(dataPath, {
      projects: [testProject],
      entries: [{
        id: 'entry-1',
        projectId: 'test-project',
        date: today,
        wordCount: 1000,
        isIncrement: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }],
    });

    await window.reload();
    await window.waitForSelector('text=Test Novel');

    // Show history and edit
    await window.click('text=Show Entry History');

    // Click edit button on the entry row
    await window.click('button[title*="Edit"]:near(:text("1,000"))');

    // Change the value
    await window.fill('input[value="1000"]', '1500');

    // Save
    await window.click('button[title*="Save"], button:has-text("Save"):near(:text("1,500"))');

    // Verify updated
    await expect(window.locator('text=1,500')).toBeVisible();
  });

  test('user can delete an entry', async () => {
    const { window, dataPath } = testApp;

    seedTestData(dataPath, {
      projects: [testProject],
      entries: [{
        id: 'entry-1',
        projectId: 'test-project',
        date: today,
        wordCount: 1000,
        isIncrement: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }],
    });

    await window.reload();
    await window.waitForSelector('text=Test Novel');

    await window.click('text=Show Entry History');

    // Click delete button
    await window.click('button[title*="Delete"]:near(:text("1,000"))');

    // Confirm deletion if dialog appears
    const confirmButton = window.locator('button:has-text("Delete"), button:has-text("Confirm")');
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Entry should be gone
    await expect(window.locator('td:has-text("1,000")')).not.toBeVisible();
  });
});
