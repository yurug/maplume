import { motion } from 'framer-motion';
import { BookOpen, Feather, Sparkles, PenLine } from 'lucide-react';
import { Button } from './ui/button';
import { useI18n } from '../i18n';

interface EmptyStateProps {
  onCreateProject: () => void;
}

export function EmptyState({ onCreateProject }: EmptyStateProps) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center"
    >
      {/* Illustrated Icon */}
      <motion.div
        className="relative mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        {/* Background glow */}
        <div className="absolute inset-0 -z-10 blur-3xl">
          <div className="h-full w-full rounded-full bg-gradient-to-br from-primary-200 via-primary-100 to-transparent opacity-60" />
        </div>

        {/* Main icon container */}
        <div className="relative rounded-3xl bg-gradient-to-br from-primary-50 to-primary-100 p-8 shadow-warm-lg dark:from-primary-900/30 dark:to-primary-800/20">
          {/* Floating decorations */}
          <motion.div
            className="absolute -left-4 -top-4"
            animate={{ y: [-2, 2, -2], rotate: [-5, 5, -5] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="h-6 w-6 text-primary-400" />
          </motion.div>
          <motion.div
            className="absolute -bottom-2 -right-4"
            animate={{ y: [2, -2, 2], rotate: [5, -5, 5] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          >
            <PenLine className="h-5 w-5 text-primary-300" />
          </motion.div>

          {/* Main feather icon */}
          <motion.div
            animate={{ rotate: [0, -3, 0, 3, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Feather className="h-16 w-16 text-primary-600 dark:text-primary-400" strokeWidth={1.5} />
          </motion.div>
        </div>
      </motion.div>

      {/* Text Content */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="font-serif text-3xl font-semibold text-warm-900 dark:text-warm-50">
          {t.noProjectSelected}
        </h2>
        <p className="max-w-md text-warm-500 dark:text-warm-400">
          {t.noProjectSelectedDesc}
        </p>
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <Button
          size="xl"
          onClick={onCreateProject}
          className="group gap-3 shadow-warm-lg hover:shadow-glow"
        >
          <motion.span
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <BookOpen className="h-5 w-5" />
          </motion.span>
          {t.createFirstProject}
        </Button>
      </motion.div>

      {/* Decorative line */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="mt-12 h-px w-48 bg-gradient-to-r from-transparent via-warm-300 to-transparent dark:via-warm-600"
      />
    </motion.div>
  );
}
