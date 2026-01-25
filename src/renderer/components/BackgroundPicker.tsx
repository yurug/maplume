import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Image, Palette, X, Upload } from 'lucide-react';
import type { ProjectBackground } from '@shared/types';
import { useI18n } from '../i18n';
import { Button } from './ui/button';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { cn } from '../lib/utils';

interface BackgroundPickerProps {
  value?: ProjectBackground;
  onChange: (background: ProjectBackground | undefined) => void;
  dataPath: string;
  projectId: string;
}

// Preset color palette matching MaPlume's warm theme
const PRESET_COLORS = [
  { value: '#fef3c7', key: 'colorCream' },
  { value: '#fde68a', key: 'colorAmber' },
  { value: '#f59e0b', key: 'colorOrange' },
  { value: '#78350f', key: 'colorBrown' },
  { value: '#ecfdf5', key: 'colorMint' },
  { value: '#e0e7ff', key: 'colorLavender' },
  { value: '#fce7f3', key: 'colorPink' },
  { value: '#f3f4f6', key: 'colorGray' },
  { value: '#1f2937', key: 'colorDark' },
];

export function BackgroundPicker({
  value,
  onChange,
  dataPath,
  projectId,
}: BackgroundPickerProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'none' | 'color' | 'image'>(
    value?.type || 'none'
  );
  const [customColor, setCustomColor] = useState(
    value?.type === 'color' ? value.value : '#f59e0b'
  );
  const [opacity, setOpacity] = useState(value?.opacity ?? 0.3);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Load image preview if we have an image background
  useEffect(() => {
    if (value?.type === 'image' && value.value) {
      window.electronAPI
        .getBackgroundImageUrl(dataPath, value.value)
        .then(setImagePreview);
    }
  }, [value, dataPath]);

  const handleModeChange = (newMode: string) => {
    if (!newMode) return;
    const m = newMode as 'none' | 'color' | 'image';
    setMode(m);

    if (m === 'none') {
      onChange(undefined);
    } else if (m === 'color') {
      onChange({ type: 'color', value: customColor, opacity: 1 });
    }
    // For image mode, wait until user selects an image
  };

  const handleColorSelect = (color: string) => {
    setCustomColor(color);
    onChange({ type: 'color', value: color, opacity: 1 });
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    if (mode === 'color') {
      onChange({ type: 'color', value: color, opacity: 1 });
    }
  };

  const handleSelectImage = async () => {
    setIsLoadingImage(true);
    try {
      const sourcePath = await window.electronAPI.selectBackgroundImage();
      if (!sourcePath) {
        setIsLoadingImage(false);
        return;
      }

      // Delete old background image if exists
      if (value?.type === 'image' && value.value) {
        await window.electronAPI.deleteBackgroundImage(dataPath, value.value);
      }

      // Copy new image to data folder
      const relativePath = await window.electronAPI.copyBackgroundImage(
        sourcePath,
        dataPath,
        projectId
      );

      if (relativePath) {
        const previewUrl = await window.electronAPI.getBackgroundImageUrl(
          dataPath,
          relativePath
        );
        setImagePreview(previewUrl);
        onChange({ type: 'image', value: relativePath, opacity });
        setMode('image');
      }
    } finally {
      setIsLoadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (value?.type === 'image' && value.value) {
      await window.electronAPI.deleteBackgroundImage(dataPath, value.value);
    }
    setImagePreview(null);
    setMode('none');
    onChange(undefined);
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value);
    setOpacity(newOpacity);
    if (value) {
      onChange({ ...value, opacity: newOpacity });
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="space-y-2">
        <label className="form-label flex items-center gap-2">
          <Palette className="h-3.5 w-3.5 text-warm-400" />
          {t.background}
        </label>

        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={handleModeChange}
          className="w-full"
        >
          <ToggleGroupItem value="none" className="flex-1 gap-1.5">
            <X className="h-3.5 w-3.5" />
            {t.noBackground}
          </ToggleGroupItem>
          <ToggleGroupItem value="color" className="flex-1 gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            {t.backgroundColor}
          </ToggleGroupItem>
          <ToggleGroupItem value="image" className="flex-1 gap-1.5">
            <Image className="h-3.5 w-3.5" />
            {t.backgroundImage}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Color Picker */}
      {mode === 'color' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          {/* Preset Colors */}
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleColorSelect(preset.value)}
                className={cn(
                  'h-8 w-8 rounded-lg border-2 transition-all',
                  'hover:scale-110 hover:shadow-md',
                  customColor === preset.value
                    ? 'border-primary-500 ring-2 ring-primary-500/30'
                    : 'border-warm-300 dark:border-warm-600'
                )}
                style={{ backgroundColor: preset.value }}
                title={(t as Record<string, string>)[preset.key]}
              />
            ))}

            {/* Custom Color Input */}
            <div className="relative">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="h-8 w-8 cursor-pointer rounded-lg border-2 border-dashed border-warm-300 bg-transparent dark:border-warm-600"
                title={t.customColor}
              />
            </div>
          </div>

          {/* Current Color Display */}
          <div className="flex items-center gap-2 text-sm text-warm-500 dark:text-warm-400">
            <div
              className="h-4 w-4 rounded border border-warm-300 dark:border-warm-600"
              style={{ backgroundColor: customColor }}
            />
            <span className="font-mono">{customColor.toUpperCase()}</span>
          </div>
        </motion.div>
      )}

      {/* Image Picker */}
      {mode === 'image' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          {imagePreview ? (
            <div className="relative">
              <div
                className="h-24 w-full rounded-lg border border-warm-300 bg-cover bg-center dark:border-warm-600"
                style={{ backgroundImage: `url("${imagePreview}")` }}
              />
              <Button
                type="button"
                variant="danger"
                size="icon-sm"
                onClick={handleRemoveImage}
                className="absolute -right-2 -top-2"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleSelectImage}
              disabled={isLoadingImage}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              {isLoadingImage ? '...' : t.selectImage}
            </Button>
          )}

          {/* Opacity Slider */}
          {imagePreview && (
            <div className="space-y-2">
              <label className="form-label flex items-center justify-between">
                <span>{t.opacity}</span>
                <span className="font-mono text-xs">
                  {Math.round(opacity * 100)}%
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity}
                onChange={handleOpacityChange}
                className="w-full accent-primary-500"
              />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
