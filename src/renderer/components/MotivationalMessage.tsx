import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Quote, Sparkles, AlertCircle } from 'lucide-react';
import { getDailyMessage, getMotivationalMessage } from '../data/messages';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface MotivationalMessageProps {
  behindSchedule: boolean;
}

export function MotivationalMessage({ behindSchedule }: MotivationalMessageProps) {
  const { state, actions } = useApp();
  const { t, language } = useI18n();
  const [message, setMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const { message: newMessage, isNew } = getDailyMessage(
      behindSchedule,
      state.settings.lastMotivationalDate,
      language
    );
    setMessage(newMessage);

    if (isNew) {
      actions.updateSettings({
        lastMotivationalDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [behindSchedule, state.settings.lastMotivationalDate, actions, language]);

  const refreshMessage = () => {
    setIsRefreshing(true);

    // Keep trying until we get a different message
    let newMessage = getMotivationalMessage(behindSchedule, language);
    let attempts = 0;
    while (newMessage === message && attempts < 10) {
      newMessage = getMotivationalMessage(behindSchedule, language);
      attempts++;
    }

    // Brief delay for animation
    setTimeout(() => {
      setMessage(newMessage);
      setIsRefreshing(false);
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-xl p-4',
        'flex items-start gap-4',
        behindSchedule ? 'motivational-nudge' : 'motivational-encourage'
      )}
    >
      {/* Decorative background element */}
      <div className="absolute -right-4 -top-4 h-24 w-24 opacity-10">
        {behindSchedule ? (
          <AlertCircle className="h-full w-full" />
        ) : (
          <Sparkles className="h-full w-full" />
        )}
      </div>

      {/* Quote icon */}
      <div
        className={cn(
          'flex-shrink-0 rounded-lg p-2',
          behindSchedule
            ? 'bg-primary-200/50 text-primary-700 dark:bg-primary-800/30 dark:text-primary-400'
            : 'bg-success-200/50 text-success-700 dark:bg-success-800/30 dark:text-success-400'
        )}
      >
        <Quote className="h-4 w-4" />
      </div>

      {/* Message content */}
      <motion.p
        key={message}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          'flex-1 font-serif text-base italic leading-relaxed',
          behindSchedule
            ? 'text-primary-800 dark:text-primary-200'
            : 'text-success-800 dark:text-success-200'
        )}
      >
        "{message}"
      </motion.p>

      {/* Refresh button */}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={refreshMessage}
        disabled={isRefreshing}
        className={cn(
          'flex-shrink-0',
          behindSchedule
            ? 'text-primary-600 hover:text-primary-800 hover:bg-primary-200/50'
            : 'text-success-600 hover:text-success-800 hover:bg-success-200/50'
        )}
        title={t.newMessage}
      >
        <motion.div
          animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 0.5 }}
        >
          <RefreshCw className="h-4 w-4" />
        </motion.div>
      </Button>
    </motion.div>
  );
}
