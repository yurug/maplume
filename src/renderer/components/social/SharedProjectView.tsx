/**
 * SharedProjectView - Read-only view of a shared project
 *
 * Shows the project's progress chart and statistics.
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Eye, Lock, User, Target, Calendar, TrendingUp, Award } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useSocial } from '../../context/SocialContext';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import type { Project, WordEntry } from '@maplume/shared';
import { calculateStatistics, getChartData } from '../../services/statistics';

interface SharedProjectViewProps {
  shareId: string;
  onBack: () => void;
}

interface DecryptedProject {
  project: Project;
  entries: WordEntry[];
}

export function SharedProjectView({ shareId, onBack }: SharedProjectViewProps) {
  const { t } = useI18n();
  const { state, actions } = useSocial();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DecryptedProject | null>(null);

  // Find share info
  const share = state.receivedShares.find(s => s.id === shareId);

  useEffect(() => {
    const loadProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const decrypted = await actions.decryptSharedProject(shareId);
        setData(decrypted);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, [shareId, actions]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-warm-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6 border-b border-warm-200 dark:border-warm-700">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon-sm" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
              {t.viewSharedProject || 'Shared Project'}
            </h2>
          </div>
        </div>
        <div className="p-6">
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.project) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6 border-b border-warm-200 dark:border-warm-700">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon-sm" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
              {t.viewSharedProject || 'Shared Project'}
            </h2>
          </div>
        </div>
        <div className="p-6 text-center text-warm-500">
          {t.noProjectData || 'No project data available.'}
        </div>
      </div>
    );
  }

  const { project, entries } = data;
  const stats = calculateStatistics(project, entries);
  const chartData = getChartData(project, entries);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const getUnitLabel = () => {
    switch (project.unitType) {
      case 'pages': return t.unitPages || 'Pages';
      case 'chapters': return t.unitChapters || 'Chapters';
      default: return t.unitWords || 'Words';
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="p-6 border-b border-warm-200 dark:border-warm-700">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
              {project.title}
            </h2>
            <div className="flex items-center gap-3 text-sm text-warm-500 mt-1">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{share?.owner?.username || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-1">
                {share?.shareType === 'full' ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                <span>
                  {share?.shareType === 'full'
                    ? (t.shareTypeFull || 'Full access')
                    : (t.shareTypeStats || 'Stats only')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Progress chart */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-4">
            {t.progress || 'Progress'}
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2dcd4" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#8b7e6a"
                  fontSize={12}
                />
                <YAxis stroke="#8b7e6a" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2dcd4',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => formatDate(label as string)}
                  formatter={(value: number, name: string) => [
                    value.toLocaleString(),
                    name === 'actual' ? (t.actual || 'Actual') : (t.target || 'Target'),
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#d4a574"
                  strokeDasharray="5 5"
                  dot={false}
                  name="target"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#7c9a6c"
                  strokeWidth={2}
                  dot={false}
                  name="actual"
                />
                <ReferenceLine
                  x={new Date().toISOString().split('T')[0]}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  label={{
                    value: t.today || 'Today',
                    position: 'top',
                    fill: '#94a3b8',
                    fontSize: 12,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-4">
            {t.statistics || 'Statistics'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Target}
              label={t.progress || 'Progress'}
              value={`${stats.percentage.toFixed(1)}%`}
              detail={`${stats.currentWords.toLocaleString()} / ${project.targetWords.toLocaleString()} ${getUnitLabel().toLowerCase()}`}
              color="blue"
            />
            <StatCard
              icon={TrendingUp}
              label={t.dailyAverage || 'Daily Average'}
              value={stats.dailyAverage.toLocaleString()}
              detail={getUnitLabel().toLowerCase() + '/' + (t.day || 'day')}
              color="green"
            />
            <StatCard
              icon={Award}
              label={t.bestDay || 'Best Day'}
              value={stats.bestDay.count.toLocaleString()}
              detail={stats.bestDay.date ? formatDate(stats.bestDay.date) : '-'}
              color="purple"
            />
            <StatCard
              icon={Calendar}
              label={t.currentStreak || 'Current Streak'}
              value={stats.currentStreak.toString()}
              detail={stats.currentStreak === 1 ? (t.day || 'day') : (t.days || 'days')}
              color="orange"
            />
          </div>
        </div>

        {/* Entries (only if full access) */}
        {share?.shareType === 'full' && entries.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-4">
              {t.entries || 'Entries'} ({entries.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-200 dark:border-warm-700">
                    <th className="text-left py-2 px-3 font-medium text-warm-600 dark:text-warm-400">
                      {t.date || 'Date'}
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-warm-600 dark:text-warm-400">
                      {getUnitLabel()}
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-warm-600 dark:text-warm-400">
                      {t.type || 'Type'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice().reverse().slice(0, 10).map((entry, index) => (
                    <tr
                      key={index}
                      className="border-b border-warm-100 dark:border-warm-800"
                    >
                      <td className="py-2 px-3 text-warm-900 dark:text-warm-100">
                        {formatDate(entry.date)}
                      </td>
                      <td className="py-2 px-3 text-right text-warm-900 dark:text-warm-100 font-mono">
                        {entry.count.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-warm-500">
                        {entry.type === 'increment' ? '+' : '='}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {entries.length > 10 && (
                <p className="text-center text-sm text-warm-500 mt-2">
                  ...{entries.length - 10} {t.entries || 'more entries'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {project.notes && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-2">
              {t.projectNotes || 'Notes'}
            </h3>
            <p className="text-warm-700 dark:text-warm-300 whitespace-pre-wrap">
              {project.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat card component
function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="p-4 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50">
      <div className={`inline-flex p-2 rounded-lg ${colorClasses[color]} mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-warm-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-warm-900 dark:text-warm-100">{value}</p>
      <p className="text-xs text-warm-500">{detail}</p>
    </div>
  );
}
