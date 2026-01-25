import { motion } from 'framer-motion';
import { X, Coffee, Heart } from 'lucide-react';
import { useI18n } from '../i18n';
import { Button } from './ui/button';

interface SponsorDialogProps {
  onClose: () => void;
}

export function SponsorDialog({ onClose }: SponsorDialogProps) {
  const { t } = useI18n();

  const handleSponsor = () => {
    window.electronAPI.openExternalUrl('https://github.com/sponsors/yurug');
  };

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
        className="w-full max-w-sm rounded-2xl border border-warm-200/80 bg-white p-6 shadow-warm-xl dark:border-warm-700 dark:bg-warm-850"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-100 p-2.5 dark:bg-primary-900/30">
              <Coffee className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="font-serif text-xl font-semibold text-warm-900 dark:text-warm-50">
              {t.supportMaPlume}
            </h2>
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

        {/* Content */}
        <div className="space-y-4">
          <p className="text-warm-600 dark:text-warm-300">
            {t.supportDescription}
          </p>

          <Button
            onClick={handleSponsor}
            className="w-full gap-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
          >
            <Coffee className="h-4 w-4" />
            {t.buyMeCoffee}
            <Heart className="h-3 w-3 text-danger-300" />
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-warm-200 pt-4 dark:border-warm-700">
          <Button variant="secondary" onClick={onClose}>{t.close}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
