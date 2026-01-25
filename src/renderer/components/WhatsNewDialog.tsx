import { motion } from 'framer-motion';
import {
  X,
  Sparkles,
  Ruler,
  Star,
  Zap,
  Palette,
  Globe,
  BarChart3,
  Settings,
  FileText,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { Button } from './ui/button';
import type { VersionChanges } from '../data/whatsNew';

interface WhatsNewDialogProps {
  changes: VersionChanges[];
  onClose: () => void;
}

// Map icon names to components
const iconMap: Record<string, React.ElementType> = {
  Ruler,
  Star,
  Zap,
  Palette,
  Globe,
  BarChart3,
  Settings,
  FileText,
  Sparkles,
};

export function WhatsNewDialog({ changes, onClose }: WhatsNewDialogProps) {
  const { t } = useI18n();

  // Get the latest version being shown
  const latestVersion = changes.length > 0 ? changes[changes.length - 1].version : '';

  // Flatten all features from all versions
  const allFeatures = changes.flatMap((c) => c.features);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md rounded-2xl border border-warm-200/80 bg-white p-6 shadow-warm-xl dark:border-warm-700 dark:bg-warm-850"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 p-2.5 dark:from-primary-900/30 dark:to-primary-800/30"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </motion.div>
            <div>
              <h2 className="font-serif text-xl font-semibold text-warm-900 dark:text-warm-50">
                {t.whatsNew}
              </h2>
              <p className="text-sm text-warm-500 dark:text-warm-400">
                {t.version} {latestVersion}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-warm-400 hover:text-warm-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Features list */}
        <div className="space-y-4 mb-6">
          {allFeatures.map((feature, index) => {
            const Icon = feature.icon ? iconMap[feature.icon] || Star : Star;
            const title = (t as Record<string, string>)[feature.titleKey] || feature.titleKey;
            const description = (t as Record<string, string>)[feature.descriptionKey] || feature.descriptionKey;

            return (
              <motion.div
                key={feature.titleKey}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className="flex gap-4 rounded-lg bg-warm-50 p-4 dark:bg-warm-800"
              >
                <div className="flex-shrink-0 rounded-lg bg-primary-100 p-2 dark:bg-primary-900/30">
                  <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="font-medium text-warm-900 dark:text-warm-50">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-warm-600 dark:text-warm-400">
                    {description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-warm-200 pt-4 dark:border-warm-700">
          <Button onClick={onClose} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {t.getStarted}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
