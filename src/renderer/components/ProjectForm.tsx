import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen, Calendar, Target, FileText, Archive } from 'lucide-react';
import type { Project } from '@shared/types';
import { useI18n } from '../i18n';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

interface ProjectFormProps {
  project?: Project;
  onSave: (data: Omit<Project, 'id' | 'archived' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  onArchive?: () => void;
}

export function ProjectForm({ project, onSave, onCancel, onArchive }: ProjectFormProps) {
  const { t } = useI18n();
  const today = new Date().toISOString().split('T')[0];
  const defaultEnd = new Date();
  defaultEnd.setMonth(defaultEnd.getMonth() + 1);

  const [title, setTitle] = useState(project?.title || '');
  const [notes, setNotes] = useState(project?.notes || '');
  const [startDate, setStartDate] = useState(project?.startDate || today);
  const [endDate, setEndDate] = useState(project?.endDate || defaultEnd.toISOString().split('T')[0]);
  const [targetWords, setTargetWords] = useState(project?.targetWords?.toString() || '50000');

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setNotes(project.notes);
      setStartDate(project.startDate);
      setEndDate(project.endDate);
      setTargetWords(project.targetWords.toString());
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      notes: notes.trim(),
      startDate,
      endDate,
      targetWords: parseInt(targetWords, 10) || 50000,
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
        className="w-full max-w-lg rounded-2xl border border-warm-200/80 bg-white p-6 shadow-warm-xl dark:border-warm-700 dark:bg-warm-850"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-100 p-2.5 dark:bg-primary-900/30">
              <BookOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
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

          {/* Target Words */}
          <div className="space-y-2">
            <label htmlFor="targetWords" className="form-label flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-warm-400" />
              {t.targetWords}
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
                t.wordsPerDayNeeded.replace('{count}', Math.round(
                  parseInt(targetWords, 10) /
                    Math.max(
                      1,
                      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                ).toLocaleString())}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-warm-200 pt-5 dark:border-warm-700">
            {project && onArchive && !project.archived ? (
              <Button type="button" variant="danger" onClick={onArchive} className="gap-2">
                <Archive className="h-4 w-4" />
                {t.archive}
              </Button>
            ) : (
              <div />
            )}

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
      </motion.div>
    </motion.div>
  );
}
