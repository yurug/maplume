import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { X, BookOpen, Calendar, Target, FileText, Archive, Ruler, Lock, Smile, Share2 } from 'lucide-react';
import type { Project, UnitType, ProjectBackground, ProjectIcon, WordEntry } from '@shared/types';
import { PROJECT_ICONS } from '@shared/types';
import { useI18n } from '../i18n';
import { useSocial } from '../context/SocialContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BackgroundPicker } from './BackgroundPicker';
import { ShareProjectModal } from './social/ShareProjectModal';
import { cn } from '../lib/utils';

// Helper to get icon component by name
function getIconComponent(name: string): React.ComponentType<{ className?: string }> {
  return (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[name] || LucideIcons.BookOpen;
}

interface ProjectFormProps {
  project?: Project;
  entries?: WordEntry[];
  onSave: (data: Omit<Project, 'id' | 'archived' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  onArchive?: () => void;
  dataPath: string;
}

export function ProjectForm({ project, entries = [], onSave, onCancel, onArchive, dataPath }: ProjectFormProps) {
  const { t } = useI18n();
  const { state: socialState } = useSocial();
  const today = new Date().toISOString().split('T')[0];
  const defaultEnd = new Date();
  defaultEnd.setMonth(defaultEnd.getMonth() + 1);

  const [title, setTitle] = useState(project?.title || '');
  const [notes, setNotes] = useState(project?.notes || '');
  const [startDate, setStartDate] = useState(project?.startDate || today);
  const [endDate, setEndDate] = useState(project?.endDate || defaultEnd.toISOString().split('T')[0]);
  const [targetWords, setTargetWords] = useState(project?.targetWords?.toString() || '50000');
  const [unitType, setUnitType] = useState<UnitType>(project?.unitType || 'words');
  const [icon, setIcon] = useState<ProjectIcon>(project?.icon || 'BookOpen');
  const [background, setBackground] = useState<ProjectBackground | undefined>(project?.background);
  const [showShareModal, setShowShareModal] = useState(false);

  const isEditing = !!project;
  const isLoggedIn = socialState.user !== null;
  // Use existing project ID or generate a temporary one for new projects
  const projectId = project?.id || `temp-${Date.now()}`;

  // Get the appropriate default target based on unit type
  const getDefaultTarget = (unit: UnitType): string => {
    switch (unit) {
      case 'words': return '50000';
      case 'pages': return '200';
      case 'chapters': return '20';
    }
  };

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setNotes(project.notes);
      setStartDate(project.startDate);
      setEndDate(project.endDate);
      setTargetWords(project.targetWords.toString());
      setUnitType(project.unitType);
      setIcon(project.icon || 'BookOpen');
      setBackground(project.background);
    }
  }, [project]);

  // Update default target when unit type changes (only for new projects)
  const handleUnitTypeChange = (newUnitType: UnitType) => {
    setUnitType(newUnitType);
    if (!isEditing) {
      setTargetWords(getDefaultTarget(newUnitType));
    }
  };

  // Get target label based on unit type
  const getTargetLabel = (): string => {
    switch (unitType) {
      case 'words': return t.targetWords;
      case 'pages': return t.targetPages;
      case 'chapters': return t.targetChapters;
    }
  };

  // Get unit name for display
  const getUnitName = (): string => {
    switch (unitType) {
      case 'words': return t.unitWords.toLowerCase();
      case 'pages': return t.unitPages.toLowerCase();
      case 'chapters': return t.unitChapters.toLowerCase();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const defaultTarget = unitType === 'words' ? 50000 : unitType === 'pages' ? 200 : 20;
    onSave({
      title: title.trim(),
      notes: notes.trim(),
      startDate,
      endDate,
      targetWords: parseInt(targetWords, 10) || defaultTarget,
      unitType,
      icon,
      background,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/40 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-warm-200/80 bg-white p-6 shadow-warm-xl dark:border-warm-700 dark:bg-warm-850"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-100 p-2.5 dark:bg-primary-900/30">
              {(() => {
                const HeaderIcon = getIconComponent(icon);
                return <HeaderIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />;
              })()}
            </div>
            <h2 className="font-serif text-xl font-semibold text-warm-900 dark:text-warm-50">
              {project ? t.editProjectTitle : t.newProjectTitle}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onCancel}
            className="text-warm-400 hover:text-warm-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="form-label flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 text-warm-400" />
              {t.projectTitle} <span className="text-danger-500">*</span>
            </label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.projectTitlePlaceholder}
              required
              className="text-lg font-medium"
            />
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <label className="form-label flex items-center gap-2">
              <Smile className="h-3.5 w-3.5 text-warm-400" />
              {t.projectIcon}
            </label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_ICONS.map((iconName) => {
                const IconComponent = getIconComponent(iconName);
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
                      icon === iconName
                        ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'border-warm-300 bg-white text-warm-600 hover:border-warm-400 hover:bg-warm-50 dark:border-warm-600 dark:bg-warm-800 dark:text-warm-300 dark:hover:bg-warm-700'
                    )}
                  >
                    <IconComponent className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="form-label flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-warm-400" />
              {t.projectNotes}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.projectNotesPlaceholder}
              rows={3}
              className={cn(
                'w-full rounded-lg border border-warm-300 bg-white px-3 py-2 text-sm',
                'placeholder:text-warm-400 transition-colors resize-none',
                'focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20',
                'dark:border-warm-600 dark:bg-warm-800 dark:text-warm-50'
              )}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startDate" className="form-label flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-warm-400" />
                {t.startDate}
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="endDate" className="form-label flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-warm-400" />
                {t.endDate}
              </label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          {/* Unit Type */}
          <div className="space-y-2">
            <label htmlFor="unitType" className="form-label flex items-center gap-2">
              <Ruler className="h-3.5 w-3.5 text-warm-400" />
              {t.unitType}
              {isEditing && <Lock className="h-3 w-3 text-warm-400" />}
            </label>
            <div className="flex gap-2">
              {(['words', 'pages', 'chapters'] as UnitType[]).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  disabled={isEditing}
                  onClick={() => handleUnitTypeChange(unit)}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    unitType === unit
                      ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'border-warm-300 bg-white text-warm-600 hover:border-warm-400 dark:border-warm-600 dark:bg-warm-800 dark:text-warm-300',
                    isEditing && 'cursor-not-allowed opacity-60'
                  )}
                >
                  {unit === 'words' ? t.unitWords : unit === 'pages' ? t.unitPages : t.unitChapters}
                </button>
              ))}
            </div>
            {isEditing && (
              <p className="text-xs text-warm-500 dark:text-warm-400">
                {t.unitTypeHelp}
              </p>
            )}
          </div>

          {/* Target */}
          <div className="space-y-2">
            <label htmlFor="targetWords" className="form-label flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-warm-400" />
              {getTargetLabel()}
            </label>
            <Input
              id="targetWords"
              type="number"
              value={targetWords}
              onChange={(e) => setTargetWords(e.target.value)}
              min="1"
              className="font-mono text-lg"
            />
            <p className="text-xs text-warm-500 dark:text-warm-400">
              {parseInt(targetWords, 10) > 0 &&
                t.wordsPerDayNeeded
                  .replace('{count}', Math.round(
                    parseInt(targetWords, 10) /
                      Math.max(
                        1,
                        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                  ).toLocaleString())
                  .replace(t.unitWords.toLowerCase(), getUnitName())}
            </p>
          </div>

          {/* Background */}
          <BackgroundPicker
            value={background}
            onChange={setBackground}
            dataPath={dataPath}
            projectId={projectId}
          />

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-warm-200 pt-5 dark:border-warm-700">
            <div className="flex gap-2">
              {project && onArchive && !project.archived && (
                <Button type="button" variant="danger" onClick={onArchive} className="gap-2">
                  <Archive className="h-4 w-4" />
                  {t.archive}
                </Button>
              )}
              {project && isLoggedIn && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowShareModal(true)}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  {t.shareProject || 'Share'}
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onCancel}>
                {t.cancel}
              </Button>
              <Button type="submit" disabled={!title.trim()}>
                {project ? t.save : t.create}
              </Button>
            </div>
          </div>
        </form>

        {/* Share Modal */}
        <AnimatePresence>
          {showShareModal && project && (
            <ShareProjectModal
              project={project}
              entries={entries}
              onClose={() => setShowShareModal(false)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
