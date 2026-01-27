/**
 * AccountSetup - Create a new account with seed phrase
 */

import React, { useState, useMemo } from 'react';
import { ArrowLeft, Copy, Check, AlertTriangle } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';

interface AccountSetupProps {
  onBack: () => void;
}

type Step = 'generate' | 'confirm' | 'username';

export function AccountSetup({ onBack }: AccountSetupProps) {
  const { state, actions } = useSocial();
  const { t } = useI18n();

  const [step, setStep] = useState<Step>('generate');
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate seed phrase on mount
  useMemo(() => {
    setSeedPhrase(actions.generateNewSeedPhrase());
  }, [actions]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(seedPhrase.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmAndContinue = () => {
    if (confirmed) {
      setStep('username');
    }
  };

  const handleCreateAccount = async () => {
    if (!username.trim()) return;

    setLoading(true);
    try {
      await actions.createAccount(username.trim(), seedPhrase);
      // Success - context will update and show dashboard
    } catch (error) {
      // Error is already set in context
      console.error('Failed to create account:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUsernameValid = /^[a-zA-Z0-9_]{3,30}$/.test(username);

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

        {step === 'generate' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-serif font-semibold text-warm-900 dark:text-warm-100">
                {t.yourRecoveryPhrase || 'Your Recovery Phrase'}
              </h2>
              <p className="mt-2 text-warm-600 dark:text-warm-400">
                {t.seedPhraseWarning || 'Write down these 24 words and store them safely. This is the only way to recover your account.'}
              </p>
            </div>

            {/* Warning */}
            <div className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">{t.important || 'Important'}</p>
                <p className="mt-1">
                  {t.seedPhraseNeverShare || 'Never share your recovery phrase with anyone. MaPlume will never ask for it.'}
                </p>
              </div>
            </div>

            {/* Seed phrase grid */}
            <div className="grid grid-cols-4 gap-2 p-4 bg-warm-50 dark:bg-warm-900 rounded-lg">
              {seedPhrase.map((word, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-white dark:bg-warm-800 rounded border border-warm-200 dark:border-warm-700"
                >
                  <span className="text-xs text-warm-400 w-5">{index + 1}.</span>
                  <span className="font-mono text-sm text-warm-900 dark:text-warm-100">{word}</span>
                </div>
              ))}
            </div>

            {/* Copy button */}
            <Button
              variant="outline"
              onClick={handleCopy}
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {t.copied || 'Copied!'}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  {t.copyToClipboard || 'Copy to Clipboard'}
                </>
              )}
            </Button>

            {/* Confirmation checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-warm-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-warm-700 dark:text-warm-300">
                {t.seedPhraseConfirm || 'I have written down my recovery phrase and stored it safely.'}
              </span>
            </label>

            {/* Continue button */}
            <Button
              onClick={handleConfirmAndContinue}
              disabled={!confirmed}
              className="w-full"
            >
              {t.continue || 'Continue'}
            </Button>
          </div>
        )}

        {step === 'username' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-serif font-semibold text-warm-900 dark:text-warm-100">
                {t.chooseUsername || 'Choose a Username'}
              </h2>
              <p className="mt-2 text-warm-600 dark:text-warm-400">
                {t.usernameDescription || 'Your username is how other writers will find you.'}
              </p>
            </div>

            {/* Username input */}
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder || 'your_username'}
                className="w-full px-4 py-3 rounded-lg border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 text-warm-900 dark:text-warm-100 placeholder-warm-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
              <p className="mt-2 text-sm text-warm-500">
                {t.usernameHint || '3-30 characters, letters, numbers, and underscores only.'}
              </p>
            </div>

            {/* Error message */}
            {state.error && (
              <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-sm text-danger-700 dark:text-danger-300">
                {state.error}
              </div>
            )}

            {/* Create account button */}
            <Button
              onClick={handleCreateAccount}
              disabled={!isUsernameValid || loading}
              className="w-full"
            >
              {loading ? (t.creating || 'Creating...') : (t.createAccount || 'Create Account')}
            </Button>

            {/* Back to seed phrase */}
            <button
              onClick={() => setStep('generate')}
              className="w-full text-center text-sm text-warm-500 hover:text-warm-700 dark:hover:text-warm-300"
            >
              {t.backToRecoveryPhrase || 'Back to recovery phrase'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
