/**
 * AvatarEditor - DiceBear-powered avatar customization
 *
 * Features:
 * - 20 beautiful professionally-designed avatar styles
 * - Random seed generation for unique avatars
 * - Background color customization
 * - Live preview
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Shuffle, Check } from 'lucide-react';
import {
  DICEBEAR_STYLES,
  DICEBEAR_STYLE_INFO,
  AVATAR_BG_PRESETS,
  type DiceBearConfig,
  type DiceBearStyle,
  type AvatarData,
} from '@maplume/shared';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import { Avatar, generateDiceBearAvatar } from './Avatar';

interface AvatarEditorProps {
  initialData?: AvatarData | null;
  username: string;
  onSave: (data: AvatarData) => Promise<void>;
  onCancel: () => void;
}

// Generate a random seed
function generateSeed(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// Featured styles to show prominently (most beautiful ones)
const FEATURED_STYLES: DiceBearStyle[] = [
  'adventurer',
  'lorelei',
  'big-ears',
  'avataaars',
  'micah',
  'open-peeps',
  'personas',
  'pixel-art',
];

// All styles grouped
const ALL_STYLES: DiceBearStyle[] = DICEBEAR_STYLES as unknown as DiceBearStyle[];

export function AvatarEditor({ initialData, username, onSave, onCancel }: AvatarEditorProps) {
  const { t } = useI18n();

  // Initialize config from existing data or defaults
  const initialConfig: DiceBearConfig = useMemo(() => {
    if (initialData?.type === 'dicebear' && initialData.dicebear) {
      return initialData.dicebear;
    }
    return {
      style: 'adventurer',
      seed: username || generateSeed(),
      backgroundColor: 'b6e3f4',
    };
  }, [initialData, username]);

  const [config, setConfig] = useState<DiceBearConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [showAllStyles, setShowAllStyles] = useState(false);

  // Update a single config field
  const updateConfig = useCallback((updates: Partial<DiceBearConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  // Randomize the seed
  const randomizeSeed = useCallback(() => {
    updateConfig({ seed: generateSeed() });
  }, [updateConfig]);

  // Save the avatar
  const handleSave = async () => {
    setSaving(true);
    try {
      const avatarData: AvatarData = {
        type: 'dicebear',
        dicebear: config,
      };
      await onSave(avatarData);
    } finally {
      setSaving(false);
    }
  };

  // Generate preview SVG
  const previewSvg = useMemo(() => {
    return generateDiceBearAvatar(config);
  }, [config]);

  // Styles to display
  const displayStyles = showAllStyles ? ALL_STYLES : FEATURED_STYLES;

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Large Preview */}
      <div className="flex justify-center py-6 bg-gradient-to-b from-warm-50 to-transparent dark:from-warm-900/30">
        <div className="relative group">
          <div
            className="w-32 h-32 shadow-xl ring-4 ring-white dark:ring-warm-800 rounded-full overflow-hidden"
          >
            <div
              className="w-[120%] h-[120%] -ml-[10%] -mt-[5%] [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
          </div>
          <button
            onClick={randomizeSeed}
            className="absolute -bottom-2 -right-2 p-3 bg-primary-500 hover:bg-primary-600 rounded-full shadow-lg text-white transition-all hover:scale-110 active:scale-95"
            title={t.randomize || 'Generate new look'}
          >
            <Shuffle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Style Selection */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Style Picker */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-warm-700 dark:text-warm-300">
              {t.avatarStyle || 'Choose a Style'}
            </label>
            <button
              onClick={() => setShowAllStyles(!showAllStyles)}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              {showAllStyles ? (t.showLess || 'Show less') : (t.showAll || 'Show all styles')}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {displayStyles.map((style) => {
              const isSelected = config.style === style;
              const info = DICEBEAR_STYLE_INFO[style];
              const previewConfig: DiceBearConfig = {
                ...config,
                style,
              };

              return (
                <button
                  key={style}
                  onClick={() => updateConfig({ style })}
                  className={`relative p-2 rounded-xl border-2 transition-all hover:scale-105 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-md'
                      : 'border-warm-200 dark:border-warm-700 hover:border-warm-300 dark:hover:border-warm-600'
                  }`}
                  title={info.description}
                >
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center shadow">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="w-full aspect-square mb-1.5 rounded-full overflow-hidden">
                    <div
                      className="w-[120%] h-[120%] -ml-[10%] -mt-[5%] [&>svg]:w-full [&>svg]:h-full"
                      dangerouslySetInnerHTML={{
                        __html: generateDiceBearAvatar(previewConfig),
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-warm-600 dark:text-warm-400 block truncate">
                    {info.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Background Color */}
        <div>
          <label className="block text-sm font-semibold text-warm-700 dark:text-warm-300 mb-3">
            {t.backgroundColor || 'Background Color'}
          </label>
          <div className="flex gap-2 flex-wrap">
            {AVATAR_BG_PRESETS.map((color) => {
              const hexColor = color.replace('#', '');
              const isSelected = config.backgroundColor === hexColor;

              return (
                <button
                  key={color}
                  onClick={() => updateConfig({ backgroundColor: hexColor })}
                  className={`relative w-10 h-10 rounded-xl transition-all hover:scale-110 ${
                    isSelected
                      ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-warm-900'
                      : 'hover:ring-2 hover:ring-warm-300 hover:ring-offset-1'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {isSelected && (
                    <Check className="absolute inset-0 m-auto w-5 h-5 text-white drop-shadow-md" />
                  )}
                </button>
              );
            })}
            {/* Transparent option */}
            <button
              onClick={() => updateConfig({ backgroundColor: 'transparent' })}
              className={`relative w-10 h-10 rounded-xl transition-all hover:scale-110 bg-gradient-to-br from-warm-200 to-warm-300 dark:from-warm-700 dark:to-warm-800 ${
                config.backgroundColor === 'transparent'
                  ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-warm-900'
                  : 'hover:ring-2 hover:ring-warm-300 hover:ring-offset-1'
              }`}
              title={t.transparent || 'Transparent'}
            >
              <div className="absolute inset-1 bg-white dark:bg-warm-900 rounded-lg opacity-50" />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-warm-500">
                NONE
              </span>
              {config.backgroundColor === 'transparent' && (
                <Check className="absolute inset-0 m-auto w-5 h-5 text-primary-500 drop-shadow-md" />
              )}
            </button>
          </div>
        </div>

        {/* Tip */}
        <div className="mt-6 p-3 bg-warm-100 dark:bg-warm-800/50 rounded-lg">
          <p className="text-xs text-warm-600 dark:text-warm-400">
            <span className="font-semibold">{t.tip || 'Tip'}:</span>{' '}
            {t.avatarTip || 'Click the shuffle button to generate a new unique look with the same style!'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 p-4 border-t border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-900/50">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          {t.cancel || 'Cancel'}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (t.saving || 'Saving...') : (t.saveAvatar || 'Save Avatar')}
        </Button>
      </div>
    </div>
  );
}

export default AvatarEditor;
