import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Pencil, Trash2, Check, X, Plus, Equal, FileText } from 'lucide-react';
import type { WordEntry } from '@shared/types';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

interface EntriesTableProps {
  entries: WordEntry[];
}

export function EntriesTable({ entries }: EntriesTableProps) {
  const { actions } = useApp();
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWordCount, setEditWordCount] = useState('');

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleEdit = (entry: WordEntry) => {
    setEditingId(entry.id);
    setEditWordCount(entry.wordCount.toString());
  };

  const handleSave = (entry: WordEntry) => {
    const newCount = parseInt(editWordCount, 10);
    if (!isNaN(newCount) && newCount >= 0) {
      actions.updateEntry({ ...entry, wordCount: newCount });
    }
    setEditingId(null);
  };

  const handleDelete = (entryId: string) => {
    if (confirm(t.deleteEntryConfirm)) {
      actions.deleteEntry(entryId);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (entries.length === 0) {
    return (
      <Card className="mt-4 p-8 text-center">
        <div className="mx-auto mb-4 w-fit rounded-xl bg-warm-100 p-3 dark:bg-warm-700">
          <FileText className="h-6 w-6 text-warm-400" />
        </div>
        <p className="text-warm-500 dark:text-warm-400">{t.noEntries}</p>
      </Card>
    );
  }

  return (
    <Card className="mt-4 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-warm-200/60 bg-warm-50/50 dark:border-warm-700/60 dark:bg-warm-800/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-warm-500 dark:text-warm-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  {t.date}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-warm-500 dark:text-warm-400">
                {t.words}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-warm-500 dark:text-warm-400">
                {t.type}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-warm-500 dark:text-warm-400">
                {t.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {sortedEntries.map((entry, index) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    'border-b border-warm-100 transition-colors last:border-0',
                    'hover:bg-warm-50/50 dark:border-warm-800 dark:hover:bg-warm-800/30',
                    editingId === entry.id && 'bg-primary-50/30 dark:bg-primary-900/10'
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-warm-700 dark:text-warm-200">
                      {formatDate(entry.date)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === entry.id ? (
                      <Input
                        type="number"
                        value={editWordCount}
                        onChange={(e) => setEditWordCount(e.target.value)}
                        className="h-8 w-24 font-mono"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(entry);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className="font-mono font-medium text-warm-900 dark:text-warm-50">
                        {entry.wordCount.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={entry.isIncrement ? 'default' : 'secondary'}
                      className="gap-1"
                    >
                      {entry.isIncrement ? (
                        <>
                          <Plus className="h-3 w-3" />
                          Add
                        </>
                      ) : (
                        <>
                          <Equal className="h-3 w-3" />
                          Total
                        </>
                      )}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === entry.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleSave(entry)}
                            className="text-success-600 hover:bg-success-100 hover:text-success-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditingId(null)}
                            className="text-warm-500 hover:bg-warm-100 hover:text-warm-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleEdit(entry)}
                            className="text-warm-500 hover:bg-warm-100 hover:text-warm-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(entry.id)}
                            className="text-warm-500 hover:bg-danger-100 hover:text-danger-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
