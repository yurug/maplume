/**
 * AvatarPicker - Modal for selecting an avatar preset
 */

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { AVATAR_PRESETS, type AvatarPreset } from '@maplume/shared';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import { Avatar } from './Avatar';

interface AvatarPickerProps {
  currentPreset: string | null;
  username: string;
  onSelect: (preset: string) => Promise<void>;
  onClose: () => void;
}

// Group presets by category
const avatarCategories = {
  writer: ['writer-1', 'writer-2', 'writer-3', 'writer-4'] as AvatarPreset[],
  quill: ['quill-1', 'quill-2', 'quill-3', 'quill-4'] as AvatarPreset[],
  book: ['book-1', 'book-2', 'book-3', 'book-4'] as AvatarPreset[],
  animals: ['cat-1', 'cat-2', 'owl-1', 'owl-2'] as AvatarPreset[],
};

export function AvatarPicker({ currentPreset, username, onSelect, onClose }: AvatarPickerProps) {
  const { t } = useI18n();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(currentPreset);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedPreset) return;

    setSaving(true);
    try {
      await onSelect(selectedPreset);
      onClose();
    } catch (error) {
      console.error('Failed to update avatar:', error);
    } finally {
      setSaving(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    writer: t.avatarCategoryWriter || 'Writers',
    quill: t.avatarCategoryQuill || 'Quills',
    book: t.avatarCategoryBook || 'Books',
    animals: t.avatarCategoryAnimals || 'Animals',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-warm-900 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-warm-200 dark:border-warm-700">
          <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
            {t.chooseAvatar || 'Choose Avatar'}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Preview */}
          <div className="flex items-center justify-center mb-6">
            <div className="text-center">
              <Avatar preset={selectedPreset} username={username} size="xl" />
              <p className="mt-2 text-sm text-warm-500">
                {t.preview || 'Preview'}
              </p>
            </div>
          </div>

          {/* Categories */}
          {Object.entries(avatarCategories).map(([category, presets]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-3">
                {categoryLabels[category]}
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setSelectedPreset(preset)}
                    className={`relative p-2 rounded-lg transition-all ${
                      selectedPreset === preset
                        ? 'bg-primary-100 dark:bg-primary-900 ring-2 ring-primary-500'
                        : 'hover:bg-warm-100 dark:hover:bg-warm-800'
                    }`}
                  >
                    <Avatar preset={preset} username={username} size="lg" className="mx-auto" />
                    {selectedPreset === preset && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-warm-200 dark:border-warm-700">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t.cancel || 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={saving || !selectedPreset}>
            {saving ? (t.saving || 'Saving...') : (t.save || 'Save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
