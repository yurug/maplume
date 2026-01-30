/**
 * Dashboard - Activity overview with heatmap and streak statistics
 */

import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { Flame, Trophy, Calendar, TrendingUp, BookOpen, Clock, CalendarDays } from 'lucide-react';

// Generate activity data from entries
interface ActivityData {
  date: string;
  count: number; // Number of entries or words written
  words: number; // Total words for the day
}

interface DashboardStats {
  currentStreak: number;
  longestStreak: number;
  totalWritingDays: number;
  totalWords: number;
  averageWordsPerDay: number;
  activityByDate: Map<string, ActivityData>;
  wordsByDayOfWeek: number[]; // Index 0 = Monday, 6 = Sunday
  wordsByHour: number[]; // Index 0 = 00:00-01:00, 23 = 23:00-24:00
}

function calculateDashboardStats(entries: Array<{ date: string; time?: string; wordCount: number; isIncrement: boolean; projectId: string }>): DashboardStats {
  // Group entries by date and calculate daily totals
  const dailyData = new Map<string, { entries: number; words: number }>();

  // Track cumulative totals per project for non-increment entries
  const projectCumulatives = new Map<string, number>();
  const projectLastDate = new Map<string, string>();

  // Sort entries by date
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  for (const entry of sortedEntries) {
    const existing = dailyData.get(entry.date) || { entries: 0, words: 0 };
    existing.entries++;

    let wordsToday = 0;
    if (entry.isIncrement) {
      wordsToday = entry.wordCount;
    } else {
      // For total mode, calculate the difference from last entry
      const lastCumulative = projectCumulatives.get(entry.projectId) || 0;
      wordsToday = Math.max(0, entry.wordCount - lastCumulative);
      projectCumulatives.set(entry.projectId, entry.wordCount);
    }

    existing.words += wordsToday;
    dailyData.set(entry.date, existing);
    projectLastDate.set(entry.projectId, entry.date);
  }

  // Convert to activity data
  const activityByDate = new Map<string, ActivityData>();
  let totalWords = 0;

  for (const [date, data] of dailyData) {
    activityByDate.set(date, {
      date,
      count: data.entries,
      words: data.words,
    });
    totalWords += data.words;
  }

  // Calculate streaks
  const writingDates = new Set(dailyData.keys());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Check current streak (going backwards from today)
  const checkDate = new Date(today);
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (writingDates.has(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (currentStreak === 0) {
      // Allow for today not having entries yet - check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = checkDate.toISOString().split('T')[0];
      if (writingDates.has(yesterdayStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      break;
    } else {
      break;
    }
  }

  // Calculate longest streak by checking all dates
  const sortedDates = Array.from(writingDates).sort();
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  const totalWritingDays = writingDates.size;
  const averageWordsPerDay = totalWritingDays > 0 ? Math.round(totalWords / totalWritingDays) : 0;

  // Calculate productivity by day of week and time of day
  const wordsByDayOfWeek = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
  const wordsByHour = new Array(24).fill(0);

  // Reset project cumulatives for second pass
  projectCumulatives.clear();

  for (const entry of sortedEntries) {
    let wordsForEntry = 0;
    if (entry.isIncrement) {
      wordsForEntry = entry.wordCount;
    } else {
      const lastCumulative = projectCumulatives.get(entry.projectId) || 0;
      wordsForEntry = Math.max(0, entry.wordCount - lastCumulative);
      projectCumulatives.set(entry.projectId, entry.wordCount);
    }

    // Day of week (0 = Sunday in JS, we want 0 = Monday)
    const dateObj = new Date(entry.date);
    const dayOfWeek = dateObj.getDay();
    const mondayBasedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    wordsByDayOfWeek[mondayBasedDay] += wordsForEntry;

    // Time of day
    if (entry.time) {
      const hour = parseInt(entry.time.split(':')[0], 10);
      if (hour >= 0 && hour < 24) {
        wordsByHour[hour] += wordsForEntry;
      }
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalWritingDays,
    totalWords,
    averageWordsPerDay,
    activityByDate,
    wordsByDayOfWeek,
    wordsByHour,
  };
}

// Activity Heatmap Component
interface ActivityHeatmapProps {
  activityByDate: Map<string, ActivityData>;
  weeks?: number;
}

function ActivityHeatmap({ activityByDate, weeks = 52 }: ActivityHeatmapProps) {
  const { t } = useI18n();

  const { grid, months } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the start date (beginning of week, X weeks ago)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (weeks * 7) + 1);
    // Adjust to start of week (Monday)
    const dayOfWeek = startDate.getDay();
    const adjustDays = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - adjustDays);

    // Build grid data
    const gridData: Array<Array<{ date: string; level: number; words: number }>> = [];
    const monthLabels: Array<{ month: string; weekIndex: number }> = [];

    let currentDate = new Date(startDate);
    let weekIndex = 0;
    let lastMonth = -1;

    while (currentDate <= today) {
      const week: Array<{ date: string; level: number; words: number }> = [];

      for (let day = 0; day < 7; day++) {
        if (currentDate > today) {
          week.push({ date: '', level: -1, words: 0 }); // Future date
        } else {
          const dateStr = currentDate.toISOString().split('T')[0];
          const activity = activityByDate.get(dateStr);
          const words = activity?.words || 0;

          // Calculate intensity level (0-4)
          let level = 0;
          if (words > 0) {
            if (words < 100) level = 1;
            else if (words < 500) level = 2;
            else if (words < 1000) level = 3;
            else level = 4;
          }

          week.push({ date: dateStr, level, words });

          // Track month labels
          const month = currentDate.getMonth();
          if (month !== lastMonth && day === 0) {
            const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
            monthLabels.push({ month: monthName, weekIndex });
            lastMonth = month;
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      gridData.push(week);
      weekIndex++;
    }

    return { grid: gridData, months: monthLabels };
  }, [activityByDate, weeks]);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const getLevelColor = (level: number) => {
    switch (level) {
      case -1: return 'bg-transparent';
      case 0: return 'bg-warm-200 dark:bg-warm-700';
      case 1: return 'bg-primary-200 dark:bg-primary-800';
      case 2: return 'bg-primary-400 dark:bg-primary-600';
      case 3: return 'bg-primary-500 dark:bg-primary-500';
      case 4: return 'bg-primary-600 dark:bg-primary-400';
      default: return 'bg-warm-200 dark:bg-warm-700';
    }
  };

  // Cell dimensions: 12px width + 3px gap = 15px per column
  const cellSize = 12;
  const cellGap = 3;
  const columnWidth = cellSize + cellGap;
  const dayLabelWidth = 20; // Width for day labels column

  return (
    <div className="flex flex-col gap-1 overflow-hidden">
      {/* Month labels */}
      <div className="relative h-4" style={{ marginLeft: `${dayLabelWidth}px` }}>
        {months.map((m, i) => {
          // Only show label if there's enough space (at least 3 weeks until next label)
          const nextMonth = months[i + 1];
          const hasSpace = !nextMonth || (nextMonth.weekIndex - m.weekIndex) >= 3;
          if (!hasSpace && i > 0) return null;

          return (
            <div
              key={`${m.month}-${m.weekIndex}`}
              className="absolute text-xs text-warm-500 dark:text-warm-400"
              style={{
                left: `${m.weekIndex * columnWidth}px`,
              }}
            >
              {m.month}
            </div>
          );
        })}
      </div>

      {/* Grid with day labels */}
      <div className="flex">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] text-xs text-warm-500 dark:text-warm-400" style={{ width: `${dayLabelWidth}px` }}>
          {dayLabels.map((day, i) => (
            <div key={i} className="h-[12px] flex items-center justify-end pr-1">
              {i % 2 === 0 ? day : ''}
            </div>
          ))}
        </div>

        {/* Activity grid */}
        <div className="flex gap-[3px]">
          {grid.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-[3px]">
              {week.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className={`w-[12px] h-[12px] rounded-sm ${getLevelColor(day.level)} transition-colors hover:ring-1 hover:ring-warm-400 dark:hover:ring-warm-500`}
                  title={day.date ? `${day.date}: ${day.words} words` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 text-xs text-warm-500 dark:text-warm-400">
        <span>{t.less || 'Less'}</span>
        <div className="flex gap-[2px]">
          {[0, 1, 2, 3, 4].map((level) => (
            <div key={level} className={`w-[10px] h-[10px] rounded-sm ${getLevelColor(level)}`} />
          ))}
        </div>
        <span>{t.more || 'More'}</span>
      </div>
    </div>
  );
}

// Streak Card Component
interface StreakCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StreakCard({ label, value, icon, color }: StreakCardProps) {
  return (
    <div className="bg-warm-100 dark:bg-warm-800 rounded-xl p-4 flex flex-col items-center justify-center min-w-[140px]">
      <div className="flex items-center gap-2 text-warm-600 dark:text-warm-400 text-sm mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-3xl font-bold ${color}`}>
        {value}
      </div>
      <div className="text-sm text-warm-500 dark:text-warm-400">
        {value === 1 ? 'day' : 'days'}
      </div>
    </div>
  );
}

// Bar Chart Component for productivity distribution
interface BarChartProps {
  data: number[];
  labels: string[];
  maxBars?: number;
}

function BarChart({ data, labels }: BarChartProps) {
  const maxValue = Math.max(...data, 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((value, index) => {
        const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col items-center justify-end h-24">
              <div
                className="w-full bg-primary-500 dark:bg-primary-400 rounded-t-sm transition-all hover:bg-primary-600 dark:hover:bg-primary-300"
                style={{ height: `${height}%`, minHeight: value > 0 ? '4px' : '0' }}
                title={`${value.toLocaleString()} words`}
              />
            </div>
            <span className="text-xs text-warm-500 dark:text-warm-400">{labels[index]}</span>
          </div>
        );
      })}
    </div>
  );
}

// Time of Day Chart - groups hours into periods
interface TimeOfDayChartProps {
  wordsByHour: number[];
}

function TimeOfDayChart({ wordsByHour }: TimeOfDayChartProps) {
  // Group into 4-hour periods
  const periods = [
    { label: '00-04', hours: [0, 1, 2, 3] },
    { label: '04-08', hours: [4, 5, 6, 7] },
    { label: '08-12', hours: [8, 9, 10, 11] },
    { label: '12-16', hours: [12, 13, 14, 15] },
    { label: '16-20', hours: [16, 17, 18, 19] },
    { label: '20-24', hours: [20, 21, 22, 23] },
  ];

  const periodData = periods.map(p => p.hours.reduce((sum, h) => sum + wordsByHour[h], 0));
  const periodLabels = periods.map(p => p.label);

  return <BarChart data={periodData} labels={periodLabels} />;
}

// Main Dashboard Component
export function Dashboard() {
  const { state } = useApp();
  const { t } = useI18n();

  const stats = useMemo(() => {
    return calculateDashboardStats(state.entries);
  }, [state.entries]);

  const activeProjects = state.projects.filter(p => !p.archived);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-100 mb-6">
        {t.dashboard || 'Dashboard'}
      </h1>

      {/* Activity Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-warm-800 dark:text-warm-200 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {t.activity || 'Activity'}
        </h2>
        <div className="bg-white dark:bg-warm-900 rounded-xl p-4 shadow-sm border border-warm-200 dark:border-warm-700">
          <ActivityHeatmap activityByDate={stats.activityByDate} weeks={52} />
        </div>
      </div>

      {/* Streaks Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-warm-800 dark:text-warm-200 mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5" />
          {t.streaks || 'Streaks'}
        </h2>
        <div className="flex gap-4 flex-wrap">
          <StreakCard
            label={t.currentStreak || 'Current streak'}
            value={stats.currentStreak}
            icon={<Flame className="w-4 h-4" />}
            color="text-primary-600 dark:text-primary-400"
          />
          <StreakCard
            label={t.longestStreak || 'Longest streak'}
            value={stats.longestStreak}
            icon={<Trophy className="w-4 h-4" />}
            color="text-amber-600 dark:text-amber-400"
          />
        </div>
      </div>

      {/* Productivity Distribution */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-warm-800 dark:text-warm-200 mb-4 flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          {t.productivityByDay || 'Productivity by Day'}
        </h2>
        <div className="bg-white dark:bg-warm-900 rounded-xl p-4 shadow-sm border border-warm-200 dark:border-warm-700">
          <BarChart
            data={stats.wordsByDayOfWeek}
            labels={[
              t.monday || 'Mon',
              t.tuesday || 'Tue',
              t.wednesday || 'Wed',
              t.thursday || 'Thu',
              t.friday || 'Fri',
              t.saturday || 'Sat',
              t.sunday || 'Sun'
            ]}
          />
        </div>
      </div>

      {/* Time of Day Distribution */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-warm-800 dark:text-warm-200 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {t.productivityByTime || 'Productivity by Time'}
        </h2>
        <div className="bg-white dark:bg-warm-900 rounded-xl p-4 shadow-sm border border-warm-200 dark:border-warm-700">
          <TimeOfDayChart wordsByHour={stats.wordsByHour} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-warm-800 dark:text-warm-200 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {t.overview || 'Overview'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-warm-900 rounded-xl p-4 shadow-sm border border-warm-200 dark:border-warm-700">
            <div className="text-sm text-warm-600 dark:text-warm-400">{t.totalWords || 'Total Words'}</div>
            <div className="text-2xl font-bold text-warm-900 dark:text-warm-100">
              {stats.totalWords.toLocaleString()}
            </div>
          </div>
          <div className="bg-white dark:bg-warm-900 rounded-xl p-4 shadow-sm border border-warm-200 dark:border-warm-700">
            <div className="text-sm text-warm-600 dark:text-warm-400">{t.writingDays || 'Writing Days'}</div>
            <div className="text-2xl font-bold text-warm-900 dark:text-warm-100">
              {stats.totalWritingDays}
            </div>
          </div>
          <div className="bg-white dark:bg-warm-900 rounded-xl p-4 shadow-sm border border-warm-200 dark:border-warm-700">
            <div className="text-sm text-warm-600 dark:text-warm-400">{t.avgPerDay || 'Avg/Day'}</div>
            <div className="text-2xl font-bold text-warm-900 dark:text-warm-100">
              {stats.averageWordsPerDay.toLocaleString()}
            </div>
          </div>
          <div className="bg-white dark:bg-warm-900 rounded-xl p-4 shadow-sm border border-warm-200 dark:border-warm-700">
            <div className="text-sm text-warm-600 dark:text-warm-400">{t.activeProjects || 'Active Projects'}</div>
            <div className="text-2xl font-bold text-warm-900 dark:text-warm-100">
              {activeProjects.length}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      {activeProjects.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-warm-800 dark:text-warm-200 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t.activeProjects || 'Active Projects'}
          </h2>
          <div className="space-y-2">
            {activeProjects.slice(0, 5).map((project) => {
              const projectEntries = state.entries.filter(e => e.projectId === project.id);
              const totalWords = projectEntries.reduce((sum, e) => {
                if (e.isIncrement) return sum + e.wordCount;
                return e.wordCount; // For total mode, use last value
              }, 0);
              const progress = project.targetWords > 0 ? Math.min(100, Math.round((totalWords / project.targetWords) * 100)) : 0;

              return (
                <div
                  key={project.id}
                  className="bg-white dark:bg-warm-900 rounded-lg p-3 shadow-sm border border-warm-200 dark:border-warm-700 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-warm-900 dark:text-warm-100">{project.title}</div>
                    <div className="text-sm text-warm-500 dark:text-warm-400">
                      {totalWords.toLocaleString()} / {project.targetWords.toLocaleString()} {t.words || 'words'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-warm-600 dark:text-warm-400 w-10 text-right">
                      {progress}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
