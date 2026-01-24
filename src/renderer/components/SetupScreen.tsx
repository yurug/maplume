import { useState } from 'react';
import { motion } from 'framer-motion';
import { Feather, FolderOpen, Sparkles, BookOpen, Target, TrendingUp } from 'lucide-react';
import { selectDataFolder } from '../services/storage';
import { useI18n } from '../i18n';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface SetupScreenProps {
  onComplete: (dataPath: string) => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const { t } = useI18n();
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectFolder = async () => {
    setIsSelecting(true);
    const folder = await selectDataFolder();
    setIsSelecting(false);

    if (folder) {
      onComplete(folder);
    }
  };

  const features = [
    { icon: BookOpen, label: 'Track your writing projects' },
    { icon: Target, label: 'Set and achieve word count goals' },
    { icon: TrendingUp, label: 'Visualize your progress' },
  ];

  return (
    <div className="min-h-screen bg-paper dark:bg-warm-900">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-primary-200/30 blur-3xl dark:bg-primary-900/20"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-primary-100/40 blur-3xl dark:bg-primary-900/10"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg"
        >
          {/* Logo and title */}
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="mb-4 inline-flex"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-primary-400/20 blur-xl" />
                <div className="relative rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 p-4 shadow-warm-lg">
                  <Feather className="h-10 w-10 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-serif text-4xl font-bold text-warm-900 dark:text-warm-50"
            >
              {t.welcome}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-2 text-warm-500 dark:text-warm-400"
            >
              {t.welcomeSubtitle}
            </motion.p>
          </div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-8 flex justify-center gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div className="rounded-xl bg-warm-100 p-3 text-warm-500 dark:bg-warm-800 dark:text-warm-400">
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="max-w-[100px] text-xs text-warm-500 dark:text-warm-400">
                  {feature.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Setup card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="p-6 text-center">
              <div className="mb-4 inline-flex rounded-xl bg-primary-50 p-3 dark:bg-primary-900/30">
                <FolderOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>

              <h2 className="font-serif text-xl font-semibold text-warm-900 dark:text-warm-50">
                {t.chooseDataFolder}
              </h2>

              <p className="mt-2 text-sm text-warm-500 dark:text-warm-400">
                {t.chooseDataFolderDesc}
              </p>

              <Button
                size="xl"
                onClick={handleSelectFolder}
                disabled={isSelecting}
                className="mt-6 w-full gap-2 shadow-warm-md"
              >
                {isSelecting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="h-5 w-5" />
                    </motion.div>
                    {t.selecting}
                  </>
                ) : (
                  <>
                    <FolderOpen className="h-5 w-5" />
                    {t.selectFolder}
                  </>
                )}
              </Button>
            </Card>
          </motion.div>

          {/* Decorative footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 flex justify-center"
          >
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-warm-300 to-transparent dark:via-warm-600" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
