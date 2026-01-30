import type { Project, WordEntry, Statistics } from '@shared/types';

export function calculateStatistics(project: Project, entries: WordEntry[]): Statistics {
  const projectEntries = entries
    .filter((e) => e.projectId === project.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Build cumulative totals by date (handles both increment and total entry modes)
  const cumulativeByDate: Record<string, number> = {};
  let cumulative = 0;

  for (const entry of projectEntries) {
    if (entry.isIncrement) {
      cumulative += entry.wordCount;
    } else {
      // For total entries, the value IS the cumulative total
      cumulative = entry.wordCount;
    }
    cumulativeByDate[entry.date] = cumulative;
  }

  const currentWordCount = cumulative;
  const wordsRemaining = Math.max(0, project.targetWords - currentWordCount);
  const percentComplete = project.targetWords > 0
    ? Math.min(100, (currentWordCount / project.targetWords) * 100)
    : 0;

  // Calculate daily amounts as difference between consecutive cumulative values
  const sortedDates = Object.keys(cumulativeByDate).sort();
  const dailyAmounts: Array<{ date: string; amount: number }> = [];
  let prevCumulative = 0;

  for (const date of sortedDates) {
    const todayCumulative = cumulativeByDate[date];
    const dailyAmount = todayCumulative - prevCumulative;
    if (dailyAmount > 0) {
      dailyAmounts.push({ date, amount: dailyAmount });
    }
    prevCumulative = todayCumulative;
  }

  // Daily average (across all days with positive writing)
  const dailyAverage = dailyAmounts.length > 0
    ? dailyAmounts.reduce((sum, d) => sum + d.amount, 0) / dailyAmounts.length
    : 0;

  // Weekly average (last 7 days of writing)
  const last7Days = dailyAmounts.slice(-7);
  const weeklyAverage = last7Days.length > 0
    ? last7Days.reduce((sum, d) => sum + d.amount, 0) / last7Days.length
    : 0;

  // Best day
  let bestDay: { date: string; words: number } | null = null;
  for (const { date, amount } of dailyAmounts) {
    if (!bestDay || amount > bestDay.words) {
      bestDay = { date, words: amount };
    }
  }

  // Current streak (consecutive days up to today)
  const today = new Date().toISOString().split('T')[0];
  let currentStreak = 0;
  const datesWithWriting = new Set(sortedDates);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    if (datesWithWriting.has(dateStr)) {
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

export interface ChartDataPoint {
  date: string;
  actual: number | null;
  target: number;
  notes?: string[]; // Notes for entries on this date
}

// Types for stat trend data
export type TrendableStatType = 'progress' | 'dailyAverage' | 'currentStreak' | 'weeklyAverage';
export type TrendTimeRange = '7d' | '30d' | 'all';

export interface StatTrendDataPoint {
  date: string;
  value: number;
}

/**
 * Calculate historical trend data for a specific stat type
 */
export function getStatTrendData(
  project: Project,
  entries: WordEntry[],
  statType: TrendableStatType,
  timeRange: TrendTimeRange
): StatTrendDataPoint[] {
  const projectEntries = entries
    .filter((e) => e.projectId === project.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (projectEntries.length === 0) {
    return [];
  }

  // Build cumulative totals by date
  const cumulativeByDate: Record<string, number> = {};
  let cumulative = 0;

  for (const entry of projectEntries) {
    if (entry.isIncrement) {
      cumulative += entry.wordCount;
    } else {
      cumulative = entry.wordCount;
    }
    cumulativeByDate[entry.date] = cumulative;
  }

  // Calculate daily amounts
  const sortedDates = Object.keys(cumulativeByDate).sort();
  const dailyAmountByDate: Record<string, number> = {};
  let prevCumulative = 0;

  for (const date of sortedDates) {
    const todayCumulative = cumulativeByDate[date];
    const dailyAmount = todayCumulative - prevCumulative;
    if (dailyAmount > 0) {
      dailyAmountByDate[date] = dailyAmount;
    }
    prevCumulative = todayCumulative;
  }

  // Filter dates based on time range
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  let startDate: Date;

  if (timeRange === '7d') {
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);
  } else if (timeRange === '30d') {
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
  } else {
    // 'all' - use project start date or first entry
    startDate = new Date(project.startDate);
  }

  const startDateStr = startDate.toISOString().split('T')[0];

  // Generate data points for each date with entries in the range
  const result: StatTrendDataPoint[] = [];
  const datesWithData = sortedDates.filter((d) => d >= startDateStr && d <= todayStr);

  for (const date of datesWithData) {
    let value: number;

    switch (statType) {
      case 'progress':
        // Cumulative word count up to this date
        value = cumulativeByDate[date] || 0;
        break;

      case 'dailyAverage': {
        // Average of all daily amounts up to this date
        const datesUpToNow = sortedDates.filter((d) => d <= date);
        const amounts = datesUpToNow
          .map((d) => dailyAmountByDate[d])
          .filter((a) => a !== undefined && a > 0);
        value = amounts.length > 0 ? amounts.reduce((sum, a) => sum + a, 0) / amounts.length : 0;
        break;
      }

      case 'currentStreak': {
        // Calculate streak as of this date
        const checkDate = new Date(date);
        let streak = 0;
        const datesWithWriting = new Set(sortedDates.filter((d) => d <= date));

        for (let i = 0; i < 365; i++) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (datesWithWriting.has(dateStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
        value = streak;
        break;
      }

      case 'weeklyAverage': {
        // Rolling 7-day average as of this date
        const sevenDaysAgo = new Date(date);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        const last7DaysDates = sortedDates.filter((d) => d > sevenDaysAgoStr && d <= date);
        const amounts = last7DaysDates
          .map((d) => dailyAmountByDate[d])
          .filter((a) => a !== undefined && a > 0);
        value = amounts.length > 0 ? amounts.reduce((sum, a) => sum + a, 0) / amounts.length : 0;
        break;
      }
    }

    result.push({ date, value });
  }

  return result;
}

export function getChartData(project: Project, entries: WordEntry[]): ChartDataPoint[] {
  const projectEntries = entries
    .filter((e) => e.projectId === project.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Build cumulative word count by date and collect notes
  const dateMap: Record<string, number> = {};
  const notesMap: Record<string, string[]> = {};
  let cumulative = 0;

  for (const entry of projectEntries) {
    if (entry.isIncrement) {
      cumulative += entry.wordCount;
    } else {
      cumulative = entry.wordCount;
    }
    dateMap[entry.date] = cumulative;

    // Collect notes for this date
    if (entry.note) {
      if (!notesMap[entry.date]) {
        notesMap[entry.date] = [];
      }
      notesMap[entry.date].push(entry.note);
    }
  }

  // Generate all dates from start to end (full range)
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const data: ChartDataPoint[] = [];
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
      notes: notesMap[dateStr],
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
