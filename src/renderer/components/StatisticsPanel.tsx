import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  Flame,
  Trophy,
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import type { Statistics } from '@shared/types';
import { useI18n } from '../i18n';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface StatisticsPanelProps {
  stats: Statistics;
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

export function StatisticsPanel({ stats }: StatisticsPanelProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOnTrack =
    stats.projectedCompletionDate === null ||
    new Date(stats.projectedCompletionDate) <= new Date(stats.projectedCompletionDate);

  // Primary stats (always visible)
  const primaryStats = [
    {
      label: t.progress,
      value: `${stats.currentWordCount.toLocaleString()}`,
      sub: `of ${stats.targetWords.toLocaleString()} words`,
      icon: Target,
      trend: stats.percentComplete >= 50 ? 'up' : ('neutral' as const),
      highlight: stats.percentComplete >= 100,
    },
    {
      label: t.wordsRemaining,
      value: stats.wordsRemaining.toLocaleString(),
      sub: undefined,
      icon: BarChart3,
      trend: 'neutral' as const,
    },
    {
      label: t.dailyAverage,
      value: stats.dailyAverage.toLocaleString(),
      sub: t.wordsPerDay,
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
  ];

  // Secondary stats (visible when expanded)
  const secondaryStats = [
    {
      label: t.weeklyAverage,
      value: stats.weeklyAverage.toLocaleString(),
      sub: t.wordsPerDay,
      icon: Calendar,
    },
    {
      label: t.bestDay,
      value: stats.bestDay ? stats.bestDay.words.toLocaleString() : '-',
      sub: stats.bestDay ? formatDate(stats.bestDay.date) : undefined,
      icon: Trophy,
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
        {/* Primary stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {primaryStats.map((stat, index) => (
            <StatCard
              key={stat.label}
              {...stat}
              delay={index * 0.05}
            />
          ))}
        </div>

        {/* Expand/Collapse for secondary stats */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-warm-200/60 pt-3 dark:border-warm-700/60 sm:grid-cols-3">
                {secondaryStats.map((stat, index) => (
                  <StatCard
                    key={stat.label}
                    {...stat}
                    delay={index * 0.05}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="gap-1.5 text-warm-500 hover:text-warm-700"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show more
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
