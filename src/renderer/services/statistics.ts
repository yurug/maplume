import type { Project, WordEntry, Statistics } from '@shared/types';

export function calculateStatistics(project: Project, entries: WordEntry[]): Statistics {
  const projectEntries = entries
    .filter((e) => e.projectId === project.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate current word count (sum of all entries, handling increments)
  let currentWordCount = 0;
  const dailyTotals: Record<string, number> = {};

  for (const entry of projectEntries) {
    if (entry.isIncrement) {
      currentWordCount += entry.wordCount;
      dailyTotals[entry.date] = (dailyTotals[entry.date] || 0) + entry.wordCount;
    } else {
      // For total entries, take the latest one for that day
      currentWordCount = entry.wordCount;
      dailyTotals[entry.date] = entry.wordCount;
    }
  }

  const wordsRemaining = Math.max(0, project.targetWords - currentWordCount);
  const percentComplete = project.targetWords > 0
    ? Math.min(100, (currentWordCount / project.targetWords) * 100)
    : 0;

  // Daily averages
  const days = Object.keys(dailyTotals);
  const dailyAmounts = days.map((day, i) => {
    if (i === 0) return dailyTotals[day];
    const prevDay = days[i - 1];
    return dailyTotals[day] - (dailyTotals[prevDay] || 0);
  }).filter(d => d > 0);

  const dailyAverage = dailyAmounts.length > 0
    ? dailyAmounts.reduce((a, b) => a + b, 0) / dailyAmounts.length
    : 0;

  // Weekly average (last 7 days of writing)
  const last7Days = dailyAmounts.slice(-7);
  const weeklyAverage = last7Days.length > 0
    ? last7Days.reduce((a, b) => a + b, 0) / last7Days.length
    : 0;

  // Best day
  let bestDay: { date: string; words: number } | null = null;
  for (let i = 0; i < days.length; i++) {
    const wordsToday = i === 0
      ? dailyTotals[days[i]]
      : dailyTotals[days[i]] - (dailyTotals[days[i - 1]] || 0);
    if (!bestDay || wordsToday > bestDay.words) {
      bestDay = { date: days[i], words: wordsToday };
    }
  }

  // Current streak (consecutive days up to today)
  const today = new Date().toISOString().split('T')[0];
  let currentStreak = 0;
  const sortedDays = [...days].sort().reverse();

  for (let i = 0; i < sortedDays.length; i++) {
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - i);
    const expected = expectedDate.toISOString().split('T')[0];

    if (sortedDays.includes(expected)) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Projected completion date
  let projectedCompletionDate: string | null = null;
  if (dailyAverage > 0 && wordsRemaining > 0) {
    const daysNeeded = Math.ceil(wordsRemaining / dailyAverage);
    const projected = new Date();
    projected.setDate(projected.getDate() + daysNeeded);
    projectedCompletionDate = projected.toISOString().split('T')[0];
  } else if (wordsRemaining === 0) {
    projectedCompletionDate = today;
  }

  return {
    currentWordCount,
    targetWords: project.targetWords,
    wordsRemaining,
    percentComplete,
    dailyAverage: Math.round(dailyAverage),
    weeklyAverage: Math.round(weeklyAverage),
    bestDay,
    currentStreak,
    projectedCompletionDate,
  };
}

export function getChartData(project: Project, entries: WordEntry[]) {
  const projectEntries = entries
    .filter((e) => e.projectId === project.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Build cumulative word count by date
  const dateMap: Record<string, number> = {};
  let cumulative = 0;

  for (const entry of projectEntries) {
    if (entry.isIncrement) {
      cumulative += entry.wordCount;
    } else {
      cumulative = entry.wordCount;
    }
    dateMap[entry.date] = cumulative;
  }

  // Generate all dates from start to end (full range)
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const data: Array<{ date: string; actual: number | null; target: number }> = [];
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const dayNumber = Math.ceil((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const target = Math.round((dayNumber / totalDays) * project.targetWords);
    const isFuture = dateStr > todayStr;

    data.push({
      date: dateStr,
      actual: isFuture ? null : (dateMap[dateStr] ?? null),
      target,
    });

    current.setDate(current.getDate() + 1);
  }

  // Fill in actual values (carry forward last known value, stop at today)
  let lastActual = 0;
  for (const point of data) {
    if (point.date > todayStr) {
      // Don't fill future dates
      break;
    }
    if (point.actual !== null) {
      lastActual = point.actual;
    } else {
      point.actual = lastActual;
    }
  }

  return data;
}
