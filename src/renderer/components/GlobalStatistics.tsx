import { motion } from 'framer-motion';
import {
  X,
  Target,
  BookOpen,
  Flame,
  Trophy,
  Calendar,
  TrendingUp,
  FileText,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import type { Project, WordEntry, UnitType } from '@shared/types';
import { useI18n } from '../i18n';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { cn } from '../lib/utils';

interface GlobalStatisticsProps {
  projects: Project[];
  entries: WordEntry[];
  onClose: () => void;
}

interface UnitStats {
  unitType: UnitType;
  totalCurrent: number;
  totalTarget: number;
  projectCount: number;
}

// Stat card component
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  highlight,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  highlight?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        'rounded-xl border border-warm-200 bg-warm-50 p-4 transition-colors dark:border-warm-700 dark:bg-warm-800',
        highlight && 'border-primary-300 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/20'
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            'rounded-lg p-2',
            'bg-warm-200 text-warm-600 dark:bg-warm-700 dark:text-warm-300',
            highlight && 'bg-primary-200 text-primary-700 dark:bg-primary-800 dark:text-primary-300'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
          {label}
        </p>
      </div>

      <p className="font-mono text-2xl font-semibold text-warm-900 dark:text-warm-50">
        {value}
      </p>

      {sub && (
        <p className="mt-1 text-sm text-warm-500 dark:text-warm-400">{sub}</p>
      )}
    </motion.div>
  );
}

// Unit type section
function UnitSection({
  stats,
  t,
  delay,
}: {
  stats: UnitStats;
  t: ReturnType<typeof useI18n>['t'];
  delay: number;
}) {
  const unitLabel = stats.unitType === 'words' ? t.unitWords : stats.unitType === 'pages' ? t.unitPages : t.unitChapters;
  const percentComplete = stats.totalTarget > 0 ? (stats.totalCurrent / stats.totalTarget) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl border border-warm-200 bg-white p-4 dark:border-warm-700 dark:bg-warm-850"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary-500" />
          <h4 className="font-medium text-warm-900 dark:text-warm-50">{unitLabel}</h4>
        </div>
        <span className="text-sm text-warm-500 dark:text-warm-400">
          {stats.projectCount} {stats.projectCount === 1 ? 'project' : 'projects'}
        </span>
      </div>

      <div className="mb-2 flex items-end justify-between">
        <span className="font-mono text-xl font-semibold text-warm-900 dark:text-warm-50">
          {stats.totalCurrent.toLocaleString()}
        </span>
        <span className="text-sm text-warm-500 dark:text-warm-400">
          / {stats.totalTarget.toLocaleString()} {unitLabel.toLowerCase()}
        </span>
      </div>

      <Progress value={Math.min(percentComplete, 100)} className="h-2" />
      <p className="mt-1 text-right text-xs text-warm-500 dark:text-warm-400">
        {percentComplete.toFixed(1)}%
      </p>
    </motion.div>
  );
}

export function GlobalStatistics({ projects, entries, onClose }: GlobalStatisticsProps) {
  const { t } = useI18n();

  // Filter out archived projects for active stats
  const activeProjects = projects.filter((p) => !p.archived);

  // Calculate stats by unit type
  const statsByUnit: Record<UnitType, UnitStats> = {
    words: { unitType: 'words', totalCurrent: 0, totalTarget: 0, projectCount: 0 },
    pages: { unitType: 'pages', totalCurrent: 0, totalTarget: 0, projectCount: 0 },
    chapters: { unitType: 'chapters', totalCurrent: 0, totalTarget: 0, projectCount: 0 },
  };

  // Calculate current word count for each project
  for (const project of projects) {
    const projectEntries = entries
      .filter((e) => e.projectId === project.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let currentCount = 0;
    for (const entry of projectEntries) {
      if (entry.isIncrement) {
        currentCount += entry.wordCount;
      } else {
        currentCount = entry.wordCount;
      }
    }

    const unitType = project.unitType || 'words';
    statsByUnit[unitType].totalCurrent += currentCount;
    statsByUnit[unitType].totalTarget += project.targetWords;
    statsByUnit[unitType].projectCount += 1;
  }

  // Find best day across all projects (only for words, as mixing units doesn't make sense)
  // Build cumulative totals per project, then calculate daily amounts
  const wordProjectDailyAmounts: Record<string, number> = {};

  for (const project of projects) {
    if ((project.unitType || 'words') !== 'words') continue; // Only count word-based projects

    const projectEntries = entries
      .filter((e) => e.projectId === project.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Build cumulative totals by date for this project
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

    // Calculate daily amounts and add to global totals
    const sortedDates = Object.keys(cumulativeByDate).sort();
    let prevCumulative = 0;

    for (const date of sortedDates) {
      const todayCumulative = cumulativeByDate[date];
      const dailyAmount = todayCumulative - prevCumulative;
      if (dailyAmount > 0) {
        wordProjectDailyAmounts[date] = (wordProjectDailyAmounts[date] || 0) + dailyAmount;
      }
      prevCumulative = todayCumulative;
    }
  }

  let bestDay: { date: string; count: number } | null = null;
  for (const [date, count] of Object.entries(wordProjectDailyAmounts)) {
    if (!bestDay || count > bestDay.count) {
      bestDay = { date, count };
    }
  }

  // Calculate global streak
  const today = new Date();
  let currentStreak = 0;
  const allDates = new Set(entries.map((e) => e.date));

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    if (allDates.has(dateStr)) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Total entries
  const totalEntries = entries.length;

  // Days with writing
  const daysWithWriting = allDates.size;

  // Active unit sections (only show units that have projects)
  const activeUnitStats = Object.values(statsByUnit).filter((s) => s.projectCount > 0);

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-warm-200/80 bg-white p-6 shadow-warm-xl dark:border-warm-700 dark:bg-warm-850"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-100 p-2.5 dark:bg-primary-900/30">
              <BarChart3 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold text-warm-900 dark:text-warm-50">
                {t.globalStatistics}
              </h2>
              <p className="text-sm text-warm-500 dark:text-warm-400">
                {t.allProjectsOverview}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-warm-400 hover:text-warm-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label={t.totalProjects}
            value={projects.length.toString()}
            sub={`${activeProjects.length} ${t.active}`}
            icon={BookOpen}
            delay={0}
          />
          <StatCard
            label={t.totalEntries}
            value={totalEntries.toLocaleString()}
            sub={`${daysWithWriting} ${t.daysWriting}`}
            icon={Calendar}
            delay={0.05}
          />
          <StatCard
            label={t.currentStreak}
            value={currentStreak.toString()}
            sub={currentStreak === 1 ? t.day : t.days}
            icon={Flame}
            highlight={currentStreak >= 7}
            delay={0.1}
          />
          <StatCard
            label={t.bestDay}
            value={bestDay ? bestDay.count.toLocaleString() : '-'}
            sub={bestDay ? formatDate(bestDay.date) : undefined}
            icon={Trophy}
            delay={0.15}
          />
        </div>

        {/* Progress by unit type */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
            <Target className="h-4 w-4" />
            {t.progressByType}
          </h3>

          {activeUnitStats.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeUnitStats.map((stats, index) => (
                <UnitSection key={stats.unitType} stats={stats} t={t} delay={0.2 + index * 0.05} />
              ))}
            </div>
          ) : (
            <p className="text-center text-warm-500 dark:text-warm-400 py-8">
              {t.noProjectsYet}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-warm-200 pt-4 dark:border-warm-700">
          <Button onClick={onClose}>{t.close}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
