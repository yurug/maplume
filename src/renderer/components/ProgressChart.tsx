import { useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { ZoomIn, ZoomOut, RotateCcw, TrendingUp, Target, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import type { Project, WordEntry, UnitType } from '@shared/types';
import { getChartData } from '../services/statistics';
import { useI18n } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { cn } from '../lib/utils';

interface ProgressChartProps {
  project: Project;
  entries: WordEntry[];
  selectedDate?: string;
  onDateSelect?: (date: string) => void;
}

// Get unit display name
function getUnitDisplay(unitType: UnitType, t: Record<string, string>): string {
  switch (unitType) {
    case 'words': return t.wordsUnit;
    case 'pages': return t.unitPages?.toLowerCase() || 'pages';
    case 'chapters': return t.unitChapters?.toLowerCase() || 'chapters';
  }
}

// Custom tooltip component
function CustomTooltip({ active, payload, label, t, unitType }: any) {
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
    if (unitType === 'words') {
      return value?.toLocaleString();
    }
    return Number.isInteger(value) ? value?.toLocaleString() : value?.toFixed(1);
  };

  const unit = getUnitDisplay(unitType, t);

  // Get notes from the payload data
  const notes = payload[0]?.payload?.notes as string[] | undefined;

  return (
    <div className="chart-tooltip">
      <p className="mb-2 font-medium text-warm-900 dark:text-warm-100">{formatDate(label)}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any, index: number) => (
          <div key={`${entry.dataKey}-${index}`} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-warm-600 dark:text-warm-400">
              {entry.dataKey === 'actual' ? t.actual : t.target}:
            </span>
            <span className="font-mono font-medium text-warm-900 dark:text-warm-100">
              {formatValue(entry.value)} {unit}
            </span>
          </div>
        ))}
      </div>
      {notes && notes.length > 0 && (
        <div className="mt-2 pt-2 border-t border-warm-200 dark:border-warm-600">
          <div className="flex items-center gap-1 text-xs text-warm-500 dark:text-warm-400 mb-1">
            <MessageSquare className="h-3 w-3" />
            {t.notes || 'Notes'}:
          </div>
          <div className="space-y-1">
            {notes.map((note, i) => (
              <p key={i} className="text-sm text-warm-700 dark:text-warm-300 italic">
                "{note}"
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProgressChart({
  project,
  entries,
  selectedDate,
  onDateSelect,
}: ProgressChartProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const data = getChartData(project, entries);
  const today = new Date().toISOString().split('T')[0];

  // Zoom and pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0); // Offset from center (in data points)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; offset: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';
  const unitType: UnitType = project.unitType || 'words';

  // Colors based on theme
  const colors = {
    actual: isDark ? '#fbbf24' : '#d97706', // primary amber
    target: isDark ? '#86efac' : '#22c55e', // success green
    grid: isDark ? '#44403c' : '#e7e5e4', // warm gray
    today: isDark ? '#fb923c' : '#ea580c', // orange
    selected: isDark ? '#fcd34d' : '#f59e0b', // amber
    areaFill: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(217, 119, 6, 0.1)',
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Format Y-axis values based on unit type
  const formatAxisValue = (value: number) => {
    if (unitType === 'words') {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
      }
      return value.toString();
    }
    // For pages and chapters, just show the number
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  };

  const handleClick = (state: { activePayload?: Array<{ payload: { date: string } }> } | null) => {
    if (state?.activePayload?.[0]?.payload?.date && onDateSelect) {
      const clickedDate = state.activePayload[0].payload.date;
      if (clickedDate <= today && clickedDate >= project.startDate && clickedDate <= project.endDate) {
        onDateSelect(clickedDate);
      }
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev * 1.5, 4));
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel / 1.5, 1);
    setZoomLevel(newZoom);
    if (newZoom === 1) {
      setPanOffset(0);
    }
  };

  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset(0);
  };

  // Calculate visible data based on zoom and pan
  const { visibleData, canPanLeft, canPanRight, visibleCount } = useMemo(() => {
    if (zoomLevel === 1) {
      return { visibleData: data, canPanLeft: false, canPanRight: false, visibleCount: data.length };
    }

    const count = Math.ceil(data.length / zoomLevel);
    const todayIndex = data.findIndex((d) => d.date === today);
    const centerIndex = todayIndex >= 0 ? todayIndex : Math.floor(data.length / 2);

    // Calculate start index with pan offset
    const baseStartIndex = centerIndex - Math.floor(count / 2);
    const startIndex = Math.max(0, Math.min(data.length - count, baseStartIndex + panOffset));
    const endIndex = Math.min(data.length, startIndex + count);

    return {
      visibleData: data.slice(startIndex, endIndex),
      canPanLeft: startIndex > 0,
      canPanRight: endIndex < data.length,
      visibleCount: count,
    };
  }, [data, zoomLevel, today, panOffset]);

  // Pan handlers
  const handlePanLeft = useCallback(() => {
    const step = Math.max(1, Math.floor(visibleCount / 4));
    setPanOffset((prev) => prev - step);
  }, [visibleCount]);

  const handlePanRight = useCallback(() => {
    const step = Math.max(1, Math.floor(visibleCount / 4));
    setPanOffset((prev) => prev + step);
  }, [visibleCount]);

  // Drag to pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, offset: panOffset });
  }, [zoomLevel, panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart || !chartRef.current) return;

    const chartWidth = chartRef.current.offsetWidth;
    const pixelsPerDataPoint = chartWidth / visibleCount;
    const deltaX = dragStart.x - e.clientX;
    const deltaPoints = Math.round(deltaX / pixelsPerDataPoint);

    setPanOffset(dragStart.offset + deltaPoints);
  }, [isDragging, dragStart, visibleCount]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
    }
  }, [isDragging]);

  const maxValue = Math.max(
    project.targetWords,
    ...data.map((d) => d.actual || 0)
  ) * 1.1;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-500" />
          {t.progress || 'Progress'}
        </CardTitle>

        {/* Zoom & Pan Controls */}
        <div className="flex items-center gap-1">
          {/* Pan left */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handlePanLeft}
            disabled={!canPanLeft}
            className="text-warm-500 hover:text-warm-700 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Zoom controls */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            className="text-warm-500 hover:text-warm-700"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 4}
            className="text-warm-500 hover:text-warm-700"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleReset}
            disabled={zoomLevel === 1}
            className="text-warm-500 hover:text-warm-700"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Pan right */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handlePanRight}
            disabled={!canPanRight}
            className="text-warm-500 hover:text-warm-700 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <motion.div
          ref={chartRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className={cn(
            'select-none',
            zoomLevel > 1 && 'cursor-grab',
            isDragging && 'cursor-grabbing'
          )}
        >
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart
              data={visibleData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              onClick={handleClick}
              style={{ cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'pointer' }}
            >
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.actual} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.actual} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke={colors.grid}
                vertical={false}
              />

              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11, fill: isDark ? '#a8a29e' : '#78716c' }}
                tickLine={false}
                axisLine={{ stroke: colors.grid }}
                interval="preserveStartEnd"
              />

              <YAxis
                tickFormatter={formatAxisValue}
                tick={{ fontSize: 11, fill: isDark ? '#a8a29e' : '#78716c' }}
                tickLine={false}
                axisLine={false}
                domain={[0, maxValue]}
                width={50}
              />

              <Tooltip content={<CustomTooltip t={t} unitType={unitType} />} />

              {/* Target reference line */}
              <ReferenceLine
                y={project.targetWords}
                stroke={colors.target}
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{
                  value: `${t.target}: ${formatAxisValue(project.targetWords)}`,
                  position: 'right',
                  fill: colors.target,
                  fontSize: 11,
                }}
              />

              {/* Area fill under actual line */}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="none"
                fill="url(#actualGradient)"
              />

              {/* Target line */}
              <Line
                type="monotone"
                dataKey="target"
                stroke={colors.target}
                strokeWidth={2}
                dot={false}
                name="target"
                strokeDasharray="5 3"
              />

              {/* Actual progress line */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke={colors.actual}
                strokeWidth={3}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: colors.actual,
                  stroke: isDark ? '#1c1917' : '#ffffff',
                  strokeWidth: 2,
                }}
                name="actual"
              />

              {/* Today reference line */}
              {visibleData.some((d) => d.date === today) && (
                <ReferenceLine
                  x={today}
                  stroke={colors.today}
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: t.today,
                    position: 'top',
                    fill: colors.today,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}

              {/* Selected date reference line */}
              {selectedDate && selectedDate !== today && visibleData.some((d) => d.date === selectedDate) && (
                <ReferenceLine
                  x={selectedDate}
                  stroke={colors.selected}
                  strokeWidth={2}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Legend with current stats */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: colors.actual }}
            />
            <span className="text-warm-600 dark:text-warm-400">{t.actual}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-0.5 w-4"
              style={{ backgroundColor: colors.target, opacity: 0.8 }}
            />
            <span className="text-warm-600 dark:text-warm-400">{t.target}</span>
          </div>
          {zoomLevel > 1 && (
            <div className="flex items-center gap-1 text-warm-500">
              <ZoomIn className="h-3 w-3" />
              <span>{Math.round(zoomLevel * 100)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
