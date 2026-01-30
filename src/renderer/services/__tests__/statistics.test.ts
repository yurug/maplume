import { describe, it, expect } from 'vitest';
import { calculateStatistics, getChartData } from '../statistics';
import type { Project, WordEntry } from '@maplume/shared';

// Helper to create a project
function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'test-project',
    title: 'Test Novel',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    targetWords: 50000,
    unitType: 'words',
    notes: '',
    archived: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// Helper to create an entry
function createEntry(overrides: Partial<WordEntry> = {}): WordEntry {
  return {
    id: `entry-${Math.random().toString(36).slice(2)}`,
    projectId: 'test-project',
    date: '2024-01-01',
    wordCount: 1000,
    isIncrement: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('calculateStatistics', () => {
  describe('word count calculations', () => {
    it('calculates total from increment entries', () => {
      const project = createProject();
      const entries = [
        createEntry({ date: '2024-01-01', wordCount: 1000, isIncrement: true }),
        createEntry({ date: '2024-01-02', wordCount: 1500, isIncrement: true }),
        createEntry({ date: '2024-01-03', wordCount: 2000, isIncrement: true }),
      ];

      const stats = calculateStatistics(project, entries);

      expect(stats.currentWordCount).toBe(4500);
    });

    it('handles total entry mode (non-increment)', () => {
      const project = createProject();
      const entries = [
        createEntry({ date: '2024-01-01', wordCount: 1000, isIncrement: false }),
        createEntry({ date: '2024-01-02', wordCount: 2500, isIncrement: false }),
        createEntry({ date: '2024-01-03', wordCount: 4500, isIncrement: false }),
      ];

      const stats = calculateStatistics(project, entries);

      expect(stats.currentWordCount).toBe(4500);
    });

    it('handles mixed increment and total entries', () => {
      const project = createProject();
      const entries = [
        createEntry({ date: '2024-01-01', wordCount: 1000, isIncrement: true }),
        createEntry({ date: '2024-01-02', wordCount: 3000, isIncrement: false }), // Total reset
        createEntry({ date: '2024-01-03', wordCount: 500, isIncrement: true }),
      ];

      const stats = calculateStatistics(project, entries);

      expect(stats.currentWordCount).toBe(3500);
    });

    it('calculates words remaining correctly', () => {
      const project = createProject({ targetWords: 50000 });
      const entries = [
        createEntry({ wordCount: 10000, isIncrement: true }),
      ];

      const stats = calculateStatistics(project, entries);

      expect(stats.wordsRemaining).toBe(40000);
    });

    it('words remaining is never negative', () => {
      const project = createProject({ targetWords: 1000 });
      const entries = [
        createEntry({ wordCount: 2000, isIncrement: true }),
      ];

      const stats = calculateStatistics(project, entries);

      expect(stats.wordsRemaining).toBe(0);
    });
  });

  describe('percentage calculations', () => {
    it('calculates percent complete', () => {
      const project = createProject({ targetWords: 10000 });
      const entries = [
        createEntry({ wordCount: 2500, isIncrement: true }),
      ];

      const stats = calculateStatistics(project, entries);

      expect(stats.percentComplete).toBe(25);
    });

    it('caps percent complete at 100', () => {
      const project = createProject({ targetWords: 1000 });
      const entries = [
        createEntry({ wordCount: 2000, isIncrement: true }),
      ];

      const stats = calculateStatistics(project, entries);

      expect(stats.percentComplete).toBe(100);
    });

    it('handles zero target words', () => {
      const project = createProject({ targetWords: 0 });
      const entries = [
        createEntry({ wordCount: 1000, isIncrement: true }),
      ];

      const stats = calculateStatistics(project, entries);

      expect(stats.percentComplete).toBe(0);
    });
  });

  describe('average calculations', () => {
    it('calculates daily average', () => {
      const project = createProject();
      const entries = [
        createEntry({ date: '2024-01-01', wordCount: 1000, isIncrement: true }),
        createEntry({ date: '2024-01-02', wordCount: 2000, isIncrement: true }),
        createEntry({ date: '2024-01-03', wordCount: 1500, isIncrement: true }),
      ];

      const stats = calculateStatistics(project, entries);

      expect(stats.dailyAverage).toBe(1500); // (1000 + 2000 + 1500) / 3
    });

    it('returns zero average for no entries', () => {
      const project = createProject();
      const entries: WordEntry[] = [];

      const stats = calculateStatistics(project, entries);

      expect(stats.dailyAverage).toBe(0);
    });
  });

  describe('best day calculation', () => {
    it('finds the best writing day', () => {
      const project = createProject();
      const entries = [
        createEntry({ date: '2024-01-01', wordCount: 1000, isIncrement: true }),
        createEntry({ date: '2024-01-02', wordCount: 3000, isIncrement: true }),
        createEntry({ date: '2024-01-03', wordCount: 1500, isIncrement: true }),
      ];

      const stats = calculateStatistics(project, entries);

      expect(stats.bestDay).toEqual({ date: '2024-01-02', words: 3000 });
    });

    it('returns null for no entries', () => {
      const project = createProject();
      const entries: WordEntry[] = [];

      const stats = calculateStatistics(project, entries);

      expect(stats.bestDay).toBeNull();
    });
  });

  describe('filters entries by project', () => {
    it('only includes entries for the specified project', () => {
      const project = createProject({ id: 'project-a' });
      const entries = [
        createEntry({ projectId: 'project-a', wordCount: 1000, isIncrement: true }),
        createEntry({ projectId: 'project-b', wordCount: 5000, isIncrement: true }),
        createEntry({ projectId: 'project-a', wordCount: 2000, isIncrement: true }),
      ];

      const stats = calculateStatistics(project, entries);

      expect(stats.currentWordCount).toBe(3000);
    });
  });
});

describe('getChartData', () => {
  it('generates data points for each day in project range', () => {
    const project = createProject({
      startDate: '2024-01-01',
      endDate: '2024-01-05',
    });
    const entries: WordEntry[] = [];

    const data = getChartData(project, entries);

    expect(data).toHaveLength(5);
    expect(data[0].date).toBe('2024-01-01');
    expect(data[4].date).toBe('2024-01-05');
  });

  it('calculates linear target progression', () => {
    const project = createProject({
      startDate: '2024-01-01',
      endDate: '2024-01-10',
      targetWords: 10000,
    });
    const entries: WordEntry[] = [];

    const data = getChartData(project, entries);

    // Target progresses linearly based on day number / total days
    // Day 0 = 0/9 = 0%, Day 9 = 9/9 = 100%
    expect(data[0].target).toBe(0); // Day 0
    expect(data[9].target).toBe(10000); // Final day (100%)
    // Intermediate days scale linearly
    expect(data[4].target).toBeGreaterThan(0);
    expect(data[4].target).toBeLessThan(10000);
  });

  it('carries forward actual values for days without entries', () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

    const project = createProject({
      startDate: twoDaysAgo,
      endDate: today,
    });
    const entries = [
      createEntry({ date: twoDaysAgo, wordCount: 1000, isIncrement: true }),
    ];

    const data = getChartData(project, entries);

    // Value should carry forward
    expect(data[0].actual).toBe(1000);
    expect(data[1].actual).toBe(1000); // Carried forward
    expect(data[2].actual).toBe(1000); // Carried forward
  });

  it('collects notes for each date', () => {
    const today = new Date().toISOString().split('T')[0];
    const project = createProject({
      startDate: today,
      endDate: today,
    });
    const entries = [
      createEntry({ date: today, wordCount: 500, isIncrement: true, note: 'First session' }),
      createEntry({ date: today, wordCount: 300, isIncrement: true, note: 'Second session' }),
    ];

    const data = getChartData(project, entries);

    expect(data[0].notes).toEqual(['First session', 'Second session']);
  });

  it('handles entries without notes', () => {
    const today = new Date().toISOString().split('T')[0];
    const project = createProject({
      startDate: today,
      endDate: today,
    });
    const entries = [
      createEntry({ date: today, wordCount: 500, isIncrement: true }),
    ];

    const data = getChartData(project, entries);

    expect(data[0].notes).toBeUndefined();
  });
});
