import { motion } from 'framer-motion';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  Flame,
  Trophy,
  Clock,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import type { Statistics, UnitType } from '@shared/types';
import { useI18n } from '../i18n';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { cn } from '../lib/utils';

interface StatisticsPanelProps {
  stats: Statistics;
  unitType: UnitType;
  endDate: string;
}

// Circular progress ring component
function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  className,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <div className={cn('progress-ring', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          className="text-warm-200 dark:text-warm-700"
          stroke="currentColor"
          fill="none"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <motion.circle
          className="text-primary-500"
          stroke="currentColor"
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-xs font-semibold text-warm-700 dark:text-warm-200">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

// Stat card component
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  highlight,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        'stat-card group',
        highlight && 'milestone-glow active'
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <div
          className={cn(
            'rounded-lg p-2 transition-colors',
            'bg-warm-100 text-warm-500',
            'group-hover:bg-primary-100 group-hover:text-primary-600',
            'dark:bg-warm-700 dark:text-warm-400'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        {trend && trend !== 'neutral' && (
          <div
            className={cn(
              'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
              trend === 'up'
                ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                : 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
            )}
          >
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
          </div>
        )}
      </div>

      <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
        {label}
      </p>

      <motion.p
        className="font-mono text-xl font-semibold text-warm-900 dark:text-warm-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.2 }}
      >
        {value}
      </motion.p>

      {sub && (
        <p className="mt-0.5 text-xs text-warm-500 dark:text-warm-400">{sub}</p>
      )}
    </motion.div>
  );
}

export function StatisticsPanel({ stats, unitType, endDate }: StatisticsPanelProps) {
  const { t } = useI18n();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format number with decimals for averages
  const formatAverage = (value: number): string => {
    if (unitType === 'words') {
      return Math.round(value).toLocaleString();
    }
    // Show one decimal for pages/chapters
    return value.toFixed(1);
  };

  // Format count (no decimals for totals)
  const formatCount = (value: number): string => {
    if (unitType === 'words') {
      return Math.round(value).toLocaleString();
    }
    // Show one decimal for pages/chapters totals too
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
  };

  // Get "remaining" label based on unit
  const getRemainingLabel = (): string => {
    switch (unitType) {
      case 'words': return t.wordsRemaining;
      case 'pages': return t.pagesRemaining;
      case 'chapters': return t.chaptersRemaining;
    }
  };

  // Get "of target" label based on unit
  const getOfTargetLabel = (): string => {
    switch (unitType) {
      case 'words': return t.ofTargetWords.replace('{target}', stats.targetWords.toLocaleString());
      case 'pages': return t.ofTargetPages.replace('{target}', stats.targetWords.toLocaleString());
      case 'chapters': return t.ofTargetChapters.replace('{target}', stats.targetWords.toLocaleString());
    }
  };

  // Get "per day" label based on unit
  const getPerDayLabel = (): string => {
    switch (unitType) {
      case 'words': return t.wordsPerDay;
      case 'pages': return t.pagesPerDay;
      case 'chapters': return t.chaptersPerDay;
    }
  };

  const isOnTrack =
    stats.projectedCompletionDate === null ||
    new Date(stats.projectedCompletionDate) <= new Date(endDate);

  // All stats displayed together
  const allStats = [
    {
      label: t.progress,
      value: formatCount(stats.currentWordCount),
      sub: getOfTargetLabel(),
      icon: Target,
      trend: stats.percentComplete >= 50 ? 'up' : ('neutral' as const),
      highlight: stats.percentComplete >= 100,
    },
    {
      label: getRemainingLabel(),
      value: formatCount(stats.wordsRemaining),
      sub: undefined,
      icon: BarChart3,
      trend: 'neutral' as const,
    },
    {
      label: t.dailyAverage,
      value: formatAverage(stats.dailyAverage),
      sub: getPerDayLabel(),
      icon: TrendingUp,
      trend: stats.dailyAverage > 0 ? 'up' : ('neutral' as const),
    },
    {
      label: t.currentStreak,
      value: stats.currentStreak.toString(),
      sub: stats.currentStreak === 1 ? t.day : t.days,
      icon: Flame,
      trend: stats.currentStreak >= 3 ? 'up' : ('neutral' as const),
      highlight: stats.currentStreak >= 7,
    },
    {
      label: t.weeklyAverage,
      value: formatAverage(stats.weeklyAverage),
      sub: getPerDayLabel(),
      icon: Calendar,
      trend: 'neutral' as const,
    },
    {
      label: t.bestDay,
      value: stats.bestDay ? formatCount(stats.bestDay.words) : '-',
      sub: stats.bestDay ? formatDate(stats.bestDay.date) : undefined,
      icon: Trophy,
      trend: 'neutral' as const,
    },
    {
      label: t.projectedFinish,
      value: formatDate(stats.projectedCompletionDate),
      sub: undefined,
      icon: Clock,
      trend: isOnTrack ? 'up' : ('down' as const),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-500" />
          {t.statistics}
        </CardTitle>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="hidden w-32 sm:block">
            <Progress value={stats.percentComplete} className="h-2" />
          </div>
          <ProgressRing progress={stats.percentComplete} size={40} strokeWidth={3} />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* All stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {allStats.map((stat, index) => (
            <StatCard
              key={stat.label}
              {...stat}
              delay={index * 0.05}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
