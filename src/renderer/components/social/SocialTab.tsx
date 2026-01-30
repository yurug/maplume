/**
 * SocialTab - Main social features tab
 *
 * Shows different content based on authentication state:
 * - Not logged in: Account setup / login options
 * - Logged in: Social features (friends, sharing, etc.)
 */

import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useI18n } from '../../i18n';
import { AccountSetup } from './AccountSetup';
import { LoginScreen } from './LoginScreen';
import { SocialDashboard } from './SocialDashboard';

type View = 'initial' | 'create' | 'login' | 'dashboard';

interface SocialTabProps {
  selectedPartyId?: string | null;
}

export function SocialTab({ selectedPartyId }: SocialTabProps) {
  const { state } = useSocial();
  const { t } = useI18n();
  const [view, setView] = useState<View>('initial');

  // Show loading state
  if (!state.initialized) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-warm-500">{t.loading || 'Loading...'}</div>
      </div>
    );
  }

  // If logged in, show dashboard
  if (state.user) {
    return <SocialDashboard selectedPartyId={selectedPartyId} />;
  }

  // Not logged in - show appropriate view
  switch (view) {
    case 'create':
      return <AccountSetup onBack={() => setView('initial')} />;

    case 'login':
      return <LoginScreen onBack={() => setView('initial')} />;

    default:
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-8 text-center">
            <div>
              <h2 className="text-2xl font-serif font-semibold text-warm-900 dark:text-warm-100">
                {t.socialFeatures || 'Social Features'}
              </h2>
              <p className="mt-2 text-warm-600 dark:text-warm-400">
                {t.socialDescription || 'Connect with other writers, share your progress, and join writing parties.'}
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setView('create')}
                className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
              >
                {t.createAccount || 'Create Account'}
              </button>

              <button
                onClick={() => setView('login')}
                className="w-full py-3 px-4 bg-warm-100 hover:bg-warm-200 dark:bg-warm-800 dark:hover:bg-warm-700 text-warm-900 dark:text-warm-100 rounded-lg font-medium transition-colors"
              >
                {t.loginWithSeedPhrase || 'Log In with Recovery Phrase'}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-warm-500">
              <Shield className="w-4 h-4 text-success-500" />
              <p>{t.socialEncryption || 'Your data is end-to-end encrypted. Only you and the people you share with can read it.'}</p>
            </div>

            <p className="text-sm text-warm-500">
              {t.socialOptional || 'Social features are optional. You can always use MaPlume offline.'}
            </p>
          </div>
        </div>
      );
  }
}
