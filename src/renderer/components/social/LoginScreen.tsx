/**
 * LoginScreen - Log in with existing seed phrase
 */

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import { validateSeedPhrase } from '../../services/crypto';

interface LoginScreenProps {
  onBack: () => void;
}

export function LoginScreen({ onBack }: LoginScreenProps) {
  const { state, actions } = useSocial();
  const { t } = useI18n();

  const [seedInput, setSeedInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const words = seedInput.trim().toLowerCase().split(/\s+/);

    if (words.length !== 24) {
      return;
    }

    if (!validateSeedPhrase(words)) {
      return;
    }

    setLoading(true);
    try {
      // Pass username if provided (for recovery on new device)
      await actions.login(words, usernameInput.trim() || undefined);
      // Success - context will update and show dashboard
    } catch (error) {
      console.error('Failed to login:', error);
    } finally {
      setLoading(false);
    }
  };

  const words = seedInput.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const isValidLength = words.length === 24;
  const isValid = isValidLength && validateSeedPhrase(words);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-warm-600 hover:text-warm-900 dark:text-warm-400 dark:hover:text-warm-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.back || 'Back'}
        </button>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-serif font-semibold text-warm-900 dark:text-warm-100">
              {t.loginWithRecoveryPhrase || 'Log In with Recovery Phrase'}
            </h2>
            <p className="mt-2 text-warm-600 dark:text-warm-400">
              {t.enterRecoveryPhrase || 'Enter your 24-word recovery phrase to access your account.'}
            </p>
          </div>

          {/* Seed phrase input */}
          <div>
            <textarea
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder={t.seedPhrasePlaceholder || 'Enter your 24 words separated by spaces...'}
              className="w-full h-40 px-4 py-3 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-warm-900 dark:text-warm-100 placeholder-warm-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-mono text-sm resize-none"
              spellCheck={false}
              autoComplete="off"
              autoFocus
            />
            <div className="mt-2 flex justify-between text-sm">
              <span className={words.length === 24 ? 'text-success-500' : 'text-warm-500'}>
                {words.length}/24 {t.words || 'words'}
              </span>
              {isValidLength && !isValid && (
                <span className="text-danger-500">
                  {t.invalidSeedPhrase || 'Invalid recovery phrase'}
                </span>
              )}
            </div>
          </div>

          {/* Username input (for recovery on new device) */}
          <div>
            <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-1">
              {t.username || 'Username'}
            </label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder={t.usernamePlaceholder || 'your_username'}
              className="w-full px-4 py-2 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-warm-900 dark:text-warm-100 placeholder-warm-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              autoComplete="off"
            />
            <p className="mt-1 text-sm text-warm-500">
              {t.usernameRequiredForRecovery || 'Enter your username to recover your account on this device.'}
            </p>
          </div>

          {/* Error message */}
          {state.error && (
            <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-700 dark:text-danger-300">
              {state.error}
            </div>
          )}

          {/* Login button */}
          <Button
            onClick={handleLogin}
            disabled={!isValid || loading}
            className="w-full"
          >
            {loading ? (t.loggingIn || 'Logging in...') : (t.login || 'Log In')}
          </Button>
        </div>
      </div>
    </div>
  );
}
