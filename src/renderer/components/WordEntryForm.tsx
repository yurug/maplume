import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar, PenLine, Plus, Equal, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { cn } from '../lib/utils';
import type { Project, UnitType } from '@shared/types';

interface WordEntryFormProps {
  project: Project;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function WordEntryForm({ project, selectedDate, onDateChange }: WordEntryFormProps) {
  const { actions } = useApp();
  const { t } = useI18n();
  const today = new Date().toISOString().split('T')[0];
  const wordInputRef = useRef<HTMLInputElement>(null);

  // Constrain date to project range and not future
  const minDate = project.startDate;
  const maxDate = project.endDate < today ? project.endDate : today;

  const [wordCount, setWordCount] = useState('');
  const [isIncrement, setIsIncrement] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const unitType: UnitType = project.unitType || 'words';

  // Get the label for the unit field
  const getUnitLabel = (): string => {
    switch (unitType) {
      case 'words': return t.words;
      case 'pages': return t.unitPages;
      case 'chapters': return t.unitChapters;
    }
  };

  // Get placeholder text based on unit and mode
  const getPlaceholder = (): string => {
    if (isIncrement) {
      switch (unitType) {
        case 'words': return t.wordsWrittenToday;
        case 'pages': return t.pagesWrittenToday;
        case 'chapters': return t.chaptersWrittenToday;
      }
    } else {
      switch (unitType) {
        case 'words': return t.totalWordCount;
        case 'pages': return t.totalPageCount;
        case 'chapters': return t.totalChapterCount;
      }
    }
  };

  // Get success message
  const getSuccessMessage = (): string => {
    const unitName = getUnitLabel();
    return t.unitsLogged.replace('{unit}', unitName);
  };

  // Focus word input when date changes (from chart click)
  const prevDateRef = useRef(selectedDate);
  useEffect(() => {
    if (prevDateRef.current !== selectedDate) {
      prevDateRef.current = selectedDate;
      wordInputRef.current?.focus();
    }
  }, [selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(wordCount, 10);
    if (isNaN(count) || count < 0) return;

    actions.addEntry(project.id, selectedDate, count, isIncrement);
    setWordCount('');

    // Show success animation
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);
  };

  return (
    <Card className="overflow-hidden">
      <form onSubmit={handleSubmit} className="relative">
        {/* Success overlay */}
        <motion.div
          initial={false}
          animate={{
            opacity: showSuccess ? 1 : 0,
            scale: showSuccess ? 1 : 0.8,
          }}
          className={cn(
            'pointer-events-none absolute inset-0 z-10',
            'flex items-center justify-center',
            'bg-gradient-to-r from-success-500/20 via-success-500/30 to-success-500/20',
            'backdrop-blur-sm'
          )}
        >
          <motion.div
            animate={showSuccess ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
            className="flex items-center gap-2 rounded-full bg-success-500 px-4 py-2 text-white shadow-lg"
          >
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">{getSuccessMessage()}</span>
          </motion.div>
        </motion.div>

        <div className="flex flex-wrap items-end gap-4 p-5">
          {/* Date Input */}
          <div className="min-w-[160px] flex-1">
            <label className="form-label flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-warm-400" />
              {t.date}
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              min={minDate}
              max={maxDate}
              className="font-mono"
            />
          </div>

          {/* Word Count Input */}
          <div className="min-w-[180px] flex-[2]">
            <label className="form-label flex items-center gap-2">
              <PenLine className="h-3.5 w-3.5 text-warm-400" />
              {getUnitLabel()}
            </label>
            <Input
              ref={wordInputRef}
              type="number"
              value={wordCount}
              onChange={(e) => setWordCount(e.target.value)}
              placeholder={getPlaceholder()}
              min="0"
              step={unitType === 'words' ? '1' : '0.1'}
              className="font-mono text-lg"
            />
          </div>

          {/* Toggle Group */}
          <div className="min-w-[140px]">
            <label className="form-label">{t.type}</label>
            <ToggleGroup
              type="single"
              value={isIncrement ? 'add' : 'total'}
              onValueChange={(value) => {
                if (value) setIsIncrement(value === 'add');
              }}
              className="w-full"
            >
              <ToggleGroupItem value="add" className="flex-1 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t.add.replace('+ ', '')}
              </ToggleGroupItem>
              <ToggleGroupItem value="total" className="flex-1 gap-1.5">
                <Equal className="h-3.5 w-3.5" />
                {t.total.replace('= ', '')}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="min-w-[100px] gap-2 shadow-warm-md"
          >
            <PenLine className="h-4 w-4" />
            {t.log}
          </Button>
        </div>
      </form>
    </Card>
  );
}
