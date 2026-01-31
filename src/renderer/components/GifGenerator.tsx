import { useState, useRef, useCallback, useEffect } from 'react';
import { Film, Download, X, Loader2 } from 'lucide-react';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import type { Project, WordEntry, UnitType } from '@shared/types';
import { getChartData } from '../services/statistics';
import { useI18n } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/button';

interface GifGeneratorProps {
  project: Project;
  entries: WordEntry[];
}

interface ChartDataPoint {
  date: string;
  actual: number | null;
  target: number;
  notes?: string[];
}

// Canvas dimensions
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const PADDING = { top: 60, right: 80, bottom: 60, left: 70 };

export function GifGenerator({ project, entries }: GifGeneratorProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = theme === 'dark';

  // Colors based on theme
  const colors = {
    background: isDark ? '#1c1917' : '#fafaf9',
    actual: isDark ? '#fbbf24' : '#d97706',
    target: isDark ? '#86efac' : '#22c55e',
    grid: isDark ? '#44403c' : '#e7e5e4',
    text: isDark ? '#a8a29e' : '#78716c',
    title: isDark ? '#fafaf9' : '#1c1917',
    noteBackground: isDark ? 'rgba(251, 191, 36, 0.9)' : 'rgba(217, 119, 6, 0.9)',
    noteText: isDark ? '#1c1917' : '#ffffff',
  };

  const unitType: UnitType = project.unitType || 'words';

  // Format value for display
  const formatValue = useCallback((value: number) => {
    if (unitType === 'words') {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
      }
      return value.toString();
    }
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }, [unitType]);

  // Format date for display
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }, []);

  // Draw a single frame
  const drawFrame = useCallback((
    ctx: CanvasRenderingContext2D,
    data: ChartDataPoint[],
    progressIndex: number,
    maxValue: number,
    activeNote: { text: string; opacity: number } | null
  ) => {
    const chartWidth = CANVAS_WIDTH - PADDING.left - PADDING.right;
    const chartHeight = CANVAS_HEIGHT - PADDING.top - PADDING.bottom;

    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw title
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillStyle = colors.title;
    ctx.textAlign = 'left';
    ctx.fillText(project.title, PADDING.left, 35);

    // Draw grid lines
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = PADDING.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(CANVAS_WIDTH - PADDING.right, y);
      ctx.stroke();

      // Y-axis labels
      const value = maxValue - (maxValue / gridLines) * i;
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = colors.text;
      ctx.textAlign = 'right';
      ctx.fillText(formatValue(value), PADDING.left - 10, y + 4);
    }

    // X-axis labels (show every nth label to avoid crowding)
    const xStep = Math.max(1, Math.floor(data.length / 8));
    data.forEach((point, i) => {
      if (i % xStep === 0 || i === data.length - 1) {
        const x = PADDING.left + (chartWidth / (data.length - 1)) * i;
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = colors.text;
        ctx.textAlign = 'center';
        ctx.fillText(formatDate(point.date), x, CANVAS_HEIGHT - PADDING.bottom + 20);
      }
    });

    // Helper to get coordinates
    const getX = (index: number) => PADDING.left + (chartWidth / (data.length - 1)) * index;
    const getY = (value: number) => PADDING.top + chartHeight - (value / maxValue) * chartHeight;

    // Draw target line (full, dashed)
    ctx.strokeStyle = colors.target;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = getX(i);
      const y = getY(point.target);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw target label
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = colors.target;
    ctx.textAlign = 'left';
    ctx.fillText(`${t.target || 'Target'}: ${formatValue(project.targetWords)}`, CANVAS_WIDTH - PADDING.right + 10, getY(project.targetWords) + 4);

    // Draw actual line (progressive)
    if (progressIndex > 0) {
      // Draw area fill
      ctx.fillStyle = isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.15)';
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(0));
      for (let i = 0; i <= progressIndex && i < data.length; i++) {
        const value = data[i].actual ?? 0;
        ctx.lineTo(getX(i), getY(value));
      }
      ctx.lineTo(getX(Math.min(progressIndex, data.length - 1)), getY(0));
      ctx.closePath();
      ctx.fill();

      // Draw line
      ctx.strokeStyle = colors.actual;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let hasStarted = false;
      for (let i = 0; i <= progressIndex && i < data.length; i++) {
        const value = data[i].actual;
        if (value !== null) {
          const x = getX(i);
          const y = getY(value);
          if (!hasStarted) {
            ctx.moveTo(x, y);
            hasStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();

      // Draw current point
      if (progressIndex < data.length && data[progressIndex].actual !== null) {
        const x = getX(progressIndex);
        const y = getY(data[progressIndex].actual!);
        ctx.fillStyle = colors.actual;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.background;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw legend
    const legendY = CANVAS_HEIGHT - 20;
    ctx.font = '12px Inter, sans-serif';

    // Actual legend
    ctx.fillStyle = colors.actual;
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2 - 80, legendY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'left';
    ctx.fillText(t.actual || 'Actual', CANVAS_WIDTH / 2 - 70, legendY + 4);

    // Target legend
    ctx.strokeStyle = colors.target;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 + 20, legendY);
    ctx.lineTo(CANVAS_WIDTH / 2 + 40, legendY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = colors.text;
    ctx.fillText(t.target || 'Target', CANVAS_WIDTH / 2 + 50, legendY + 4);

    // Draw note overlay if active
    if (activeNote && activeNote.opacity > 0) {
      const noteX = CANVAS_WIDTH / 2;
      const noteY = PADDING.top + 30;
      const maxWidth = CANVAS_WIDTH - 100;

      ctx.globalAlpha = activeNote.opacity;

      // Measure text
      ctx.font = 'italic 16px Inter, sans-serif';
      const textWidth = Math.min(ctx.measureText(activeNote.text).width + 30, maxWidth);

      // Draw note background
      ctx.fillStyle = colors.noteBackground;
      const noteHeight = 40;
      const noteLeft = noteX - textWidth / 2;
      ctx.beginPath();
      ctx.roundRect(noteLeft, noteY - noteHeight / 2, textWidth, noteHeight, 8);
      ctx.fill();

      // Draw note text
      ctx.fillStyle = colors.noteText;
      ctx.textAlign = 'center';
      ctx.fillText(`"${activeNote.text}"`, noteX, noteY + 5, maxWidth - 20);

      ctx.globalAlpha = 1;
    }
  }, [colors, project, formatValue, formatDate, t, isDark]);

  // Generate GIF
  const generateGif = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setGifUrl(null);

    try {
      const data = getChartData(project, entries) as ChartDataPoint[];
      const maxValue = Math.max(
        project.targetWords,
        ...data.map((d) => d.actual || 0)
      ) * 1.1;

      // Calculate activity for pacing
      const activities = data.map((point, i) => {
        if (i === 0) return 0;
        const prev = data[i - 1].actual ?? 0;
        const curr = point.actual ?? 0;
        return Math.max(0, curr - prev);
      });
      const maxActivity = Math.max(...activities, 1);

      // Create GIF encoder using gifenc (pure JS, no workers needed)
      const gif = GIFEncoder();

      // Find indices with notes
      const notesMap = new Map<number, string[]>();
      data.forEach((point, i) => {
        if (point.notes && point.notes.length > 0) {
          notesMap.set(i, point.notes);
        }
      });

      // Generate frames
      const totalFrames = data.length;
      let currentNote: { text: string; opacity: number; framesLeft: number } | null = null;

      // Use setTimeout to allow UI updates between frames
      const processFrame = (i: number): Promise<void> => {
        return new Promise((resolve) => {
          setTimeout(() => {
            // Check for new notes at this index
            const notes = notesMap.get(i);
            if (notes && notes.length > 0) {
              currentNote = {
                text: notes[0],
                opacity: 1,
                framesLeft: 15,
              };
            }

            // Update note fade
            let activeNote: { text: string; opacity: number } | null = null;
            if (currentNote) {
              activeNote = { text: currentNote.text, opacity: currentNote.opacity };
              currentNote.framesLeft--;
              if (currentNote.framesLeft <= 5) {
                currentNote.opacity = currentNote.framesLeft / 5;
              }
              if (currentNote.framesLeft <= 0) {
                currentNote = null;
              }
            }

            // Draw frame
            drawFrame(ctx, data, i, maxValue, activeNote);

            // Get image data and add to GIF
            const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            const { data: rgba } = imageData;

            // Quantize RGBA data to 256 colors palette
            const palette = quantize(rgba, 256, { format: 'rgba4444' });
            const indexedPixels = applyPalette(rgba, palette, 'rgba4444');

            // Calculate delay based on activity
            const activity = activities[i] || 0;
            const activityRatio = activity / maxActivity;
            const baseDelay = 5; // Base delay in centiseconds (50ms)
            const maxExtraDelay = 15; // Extra delay for high activity
            const delay = Math.round(baseDelay + activityRatio * maxExtraDelay);

            // Add frame
            gif.writeFrame(indexedPixels, CANVAS_WIDTH, CANVAS_HEIGHT, { palette, delay });

            // Update progress
            setProgress(Math.round(((i + 1) / totalFrames) * 90));

            resolve();
          }, 0);
        });
      };

      // Process all frames
      for (let i = 0; i < totalFrames; i++) {
        await processFrame(i);
      }

      // Add final frame with longer delay
      drawFrame(ctx, data, data.length - 1, maxValue, null);
      const finalImageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const finalPalette = quantize(finalImageData.data, 256, { format: 'rgba4444' });
      const finalIndexedPixels = applyPalette(finalImageData.data, finalPalette, 'rgba4444');
      gif.writeFrame(finalIndexedPixels, CANVAS_WIDTH, CANVAS_HEIGHT, { palette: finalPalette, delay: 200 });

      setProgress(95);

      // Finish and create blob
      gif.finish();
      const bytes = gif.bytes();
      const blob = new Blob([bytes], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);

      setGifUrl(url);
      setIsGenerating(false);
      setProgress(100);
    } catch (err) {
      console.error('Failed to generate GIF:', err);
      setError(t.gifGenerationError || 'Failed to generate GIF');
      setIsGenerating(false);
    }
  }, [project, entries, drawFrame, t]);

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (gifUrl) {
        URL.revokeObjectURL(gifUrl);
      }
    };
  }, [gifUrl]);

  // Download GIF
  const downloadGif = useCallback(() => {
    if (!gifUrl) return;

    const link = document.createElement('a');
    link.href = gifUrl;
    link.download = `${project.title.replace(/[^a-z0-9]/gi, '_')}_progress.gif`;
    link.click();
  }, [gifUrl, project.title]);

  // Close preview
  const closePreview = useCallback(() => {
    if (gifUrl) {
      URL.revokeObjectURL(gifUrl);
    }
    setGifUrl(null);
  }, [gifUrl]);

  return (
    <div className="relative">
      {/* Hidden canvas for rendering */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="hidden"
      />

      {/* Generate button */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={generateGif}
        disabled={isGenerating}
        className="text-warm-500 hover:text-warm-700"
        title={t.generateGif || 'Generate GIF'}
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Film className="h-4 w-4" />
        )}
      </Button>

      {/* Progress indicator */}
      {isGenerating && (
        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-warm-800 rounded-lg shadow-lg p-3 z-50 min-w-[150px]">
          <div className="text-xs text-warm-600 dark:text-warm-400 mb-1">
            {t.generatingGif || 'Generating GIF...'} {progress}%
          </div>
          <div className="h-2 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* GIF Preview Modal */}
      {gifUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-warm-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-warm-200 dark:border-warm-700 flex items-center justify-between">
              <h3 className="font-semibold text-warm-900 dark:text-warm-100">
                {t.gifPreview || 'GIF Preview'}
              </h3>
              <Button variant="ghost" size="icon-sm" onClick={closePreview}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <img
                src={gifUrl}
                alt="Progress animation"
                className="w-full rounded-lg border border-warm-200 dark:border-warm-700"
              />
            </div>
            <div className="p-4 border-t border-warm-200 dark:border-warm-700 flex justify-end gap-2">
              <Button variant="outline" onClick={closePreview}>
                {t.close || 'Close'}
              </Button>
              <Button onClick={downloadGif} className="gap-2">
                <Download className="h-4 w-4" />
                {t.downloadGif || 'Download GIF'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-full right-0 mt-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg p-2 text-xs z-50">
          {error}
        </div>
      )}
    </div>
  );
}
