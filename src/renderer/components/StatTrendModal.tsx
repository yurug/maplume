import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  LineChart,
  BarChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { X, TrendingUp, Target, Flame, Calendar } from 'lucide-react';
import type { Project, WordEntry, UnitType } from '@shared/types';
import {
  getStatTrendData,
  type TrendableStatType,
  type TrendTimeRange,
} from '../services/statistics';
import { useI18n } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface StatTrendModalProps {
  project: Project;
  entries: WordEntry[];
  statType: TrendableStatType;
  currentValue: number;
  onClose: () => void;
}

// Custom tooltip component
function CustomTooltip({ active, payload, label, unitType, statType, t }: any) {
  if (!active || !payload?.length) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatValue = (value: number) => {
    if (statType === 'currentStreak') {
      return `${Math.round(value)} ${value === 1 ? t.day : t.days}`;
    }
    if (unitType === 'words') {
      return Math.round(value).toLocaleString();
    }
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
  };

  return (
    <div className="chart-tooltip">
      <p className="mb-1 font-medium text-warm-900 dark:text-warm-100">{formatDate(label)}</p>
      <p className="font-mono text-lg font-semibold text-primary-600 dark:text-primary-400">
        {formatValue(payload[0]?.value || 0)}
      </p>
    </div>
  );
}

export function StatTrendModal({
  project,
  entries,
  statType,
  currentValue,
  onClose,
}: StatTrendModalProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [timeRange, setTimeRange] = useState<TrendTimeRange>('30d');

  const isDark = theme === 'dark';
  const unitType: UnitType = project.unitType || 'words';

  // Colors based on theme
  const colors = {
    primary: isDark ? '#fbbf24' : '#d97706',
    grid: isDark ? '#44403c' : '#e7e5e4',
    areaFill: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(217, 119, 6, 0.15)',
  };

  // Get trend data
  const data = useMemo(
    () => getStatTrendData(project, entries, statType, timeRange),
    [project, entries, statType, timeRange]
  );

  // Get stat label and icon
  const getStatInfo = () => {
    switch (statType) {
      case 'progress':
        return { label: t.progress, icon: Target };
      case 'dailyAverage':
        return { label: t.dailyAverage, icon: TrendingUp };
      case 'currentStreak':
        return { label: t.currentStreak, icon: Flame };
      case 'weeklyAverage':
        return { label: t.weeklyAverage, icon: Calendar };
    }
  };

  const { label: statLabel, icon: StatIcon } = getStatInfo();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatValue = (value: number) => {
    if (statType === 'currentStreak') {
      return Math.round(value).toString();
    }
    if (unitType === 'words') {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
      }
      return Math.round(value).toString();
    }
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  };

  const formatCurrentValue = () => {
    if (statType === 'currentStreak') {
      return `${currentValue} ${currentValue === 1 ? t.day : t.days}`;
    }
    if (unitType === 'words') {
      return currentValue.toLocaleString();
    }
    return Number.isInteger(currentValue)
      ? currentValue.toLocaleString()
      : currentValue.toFixed(1);
  };

  // Render the appropriate chart type
  const renderChart = () => {
    if (data.length === 0) {
      return (
        <div className="flex h-64 items-center justify-center text-warm-500 dark:text-warm-400">
          {t.noTrendData}
        </div>
      );
    }

    const chartProps = {
      data,
      margin: { top: 10, right: 10, left: 0, bottom: 0 },
    };

    const commonAxisProps = {
      xAxis: (
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: isDark ? '#a8a29e' : '#78716c' }}
          tickLine={false}
          axisLine={{ stroke: colors.grid }}
          interval="preserveStartEnd"
        />
      ),
      yAxis: (
        <YAxis
          tickFormatter={formatValue}
          tick={{ fontSize: 11, fill: isDark ? '#a8a29e' : '#78716c' }}
          tickLine={false}
          axisLine={false}
          width={45}
        />
      ),
      grid: <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />,
      tooltip: <Tooltip content={<CustomTooltip unitType={unitType} statType={statType} t={t} />} />,
    };

    if (statType === 'progress') {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart {...chartProps}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            {commonAxisProps.grid}
            {commonAxisProps.xAxis}
            {commonAxisProps.yAxis}
            {commonAxisProps.tooltip}
            <Area
              type="monotone"
              dataKey="value"
              stroke={colors.primary}
              strokeWidth={2}
              fill="url(#trendGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (statType === 'currentStreak') {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart {...chartProps}>
            {commonAxisProps.grid}
            {commonAxisProps.xAxis}
            {commonAxisProps.yAxis}
            {commonAxisProps.tooltip}
            <Bar dataKey="value" fill={colors.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // Line chart for dailyAverage and weeklyAverage
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart {...chartProps}>
          {commonAxisProps.grid}
          {commonAxisProps.xAxis}
          {commonAxisProps.yAxis}
          {commonAxisProps.tooltip}
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors.primary}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 5,
              fill: colors.primary,
              stroke: isDark ? '#1c1917' : '#ffffff',
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const timeRanges: { value: TrendTimeRange; label: string }[] = [
    { value: '7d', label: t.timeRange7Days },
    { value: '30d', label: t.timeRange30Days },
    { value: 'all', label: t.timeRangeAll },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-warm-200/80 bg-white shadow-warm-xl dark:border-warm-700 dark:bg-warm-850"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-warm-200 px-6 py-4 dark:border-warm-700">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900/30">
              <StatIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-warm-900 dark:text-warm-50">
                {t.statTrendTitle.replace('{stat}', statLabel)}
              </h2>
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

        {/* Time range selector */}
        <div className="flex gap-2 border-b border-warm-200 px-6 py-3 dark:border-warm-700">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                timeRange === range.value
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-warm-500 hover:bg-warm-100 hover:text-warm-700 dark:text-warm-400 dark:hover:bg-warm-800 dark:hover:text-warm-200'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="px-6 py-4">{renderChart()}</div>

        {/* Footer with current value */}
        <div className="flex items-center justify-between border-t border-warm-200 px-6 py-4 dark:border-warm-700">
          <span className="text-sm text-warm-500 dark:text-warm-400">
            {t.today}:
          </span>
          <span className="font-mono text-lg font-semibold text-warm-900 dark:text-warm-50">
            {formatCurrentValue()}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
