/**
 * AvatarPicker - Modal for selecting avatars
 *
 * Modes:
 * - DiceBear: Professional avatar styles with customization (default)
 * - Upload: Upload your own image
 */

import React, { useState } from 'react';
import { X, Sparkles, Upload } from 'lucide-react';
import type { AvatarData } from '@maplume/shared';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import { AvatarEditor } from './AvatarEditor';
import { AvatarUpload } from './AvatarUpload';

type AvatarMode = 'create' | 'upload';

interface AvatarPickerProps {
  currentPreset: string | null; // Legacy support
  currentAvatarData?: AvatarData | null;
  username: string;
  onSelect: (preset: string) => Promise<void>; // Legacy support
  onSelectAvatarData: (avatarData: AvatarData) => Promise<void>;
  onUploadAvatar: (imageData: string) => Promise<void>;
  onClose: () => void;
  isOnline: boolean;
}

export function AvatarPicker({
  currentPreset,
  currentAvatarData,
  username,
  onSelect,
  onSelectAvatarData,
  onUploadAvatar,
  onClose,
  isOnline,
}: AvatarPickerProps) {
  const { t } = useI18n();

  // Determine initial mode
  const getInitialMode = (): AvatarMode => {
    if (currentAvatarData?.type === 'uploaded') return 'upload';
    return 'create';
  };

  const [mode, setMode] = useState<AvatarMode>(getInitialMode());

  const handleSaveAvatar = async (avatarData: AvatarData) => {
    await onSelectAvatarData(avatarData);
    onClose();
  };

  const handleUpload = async (imageData: string) => {
    await onUploadAvatar(imageData);
    onClose();
  };

  const tabs = [
    { id: 'create' as const, label: t.avatarModeCreate || 'Create Avatar', icon: Sparkles },
    { id: 'upload' as const, label: t.avatarModeUpload || 'Upload Photo', icon: Upload },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-warm-900 rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-warm-200 dark:border-warm-700">
          <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
            {t.chooseAvatar || 'Choose Your Avatar'}
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-warm-200 dark:border-warm-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                mode === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/20'
                  : 'border-transparent text-warm-500 hover:text-warm-700 dark:hover:text-warm-300 hover:bg-warm-50 dark:hover:bg-warm-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {mode === 'create' && (
            <AvatarEditor
              initialData={currentAvatarData}
              username={username}
              onSave={handleSaveAvatar}
              onCancel={onClose}
            />
          )}

          {mode === 'upload' && (
            <AvatarUpload
              currentImage={currentAvatarData?.type === 'uploaded' ? currentAvatarData.uploadedUrl : null}
              onUpload={handleUpload}
              onCancel={onClose}
              isOnline={isOnline}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default AvatarPicker;
