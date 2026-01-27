/**
 * SyncBridge - Connects AppContext with SocialContext for cloud sync
 *
 * This component sits inside both providers and syncs app data changes
 * to the cloud when the user is logged in.
 */

import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useSocial } from '../context/SocialContext';
import type { AppData } from '@maplume/shared';

export function SyncBridge() {
  const { state: appState } = useApp();
  const { actions: socialActions } = useSocial();

  // Track if this is the first render to avoid syncing on initial load
  const isFirstRender = useRef(true);
  const lastSyncHash = useRef<string>('');

  // Sync when app data changes
  useEffect(() => {
    // Skip first render - we don't want to sync on initial load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Skip if not initialized
    if (!appState.initialized || !appState.dataPath) {
      return;
    }

    // Skip if not logged in
    if (!socialActions.isLoggedIn()) {
      return;
    }

    // Create the data object
    const data: AppData = {
      version: 1,
      projects: appState.projects,
      entries: appState.entries,
      settings: appState.settings,
    };

    // Create a simple hash to detect changes (avoid unnecessary syncs)
    const dataHash = JSON.stringify({
      projects: appState.projects.length,
      entries: Object.keys(appState.entries).length,
      lastUpdate: appState.projects.map(p => p.updatedAt).join(','),
    });

    // Skip if data hasn't actually changed
    if (dataHash === lastSyncHash.current) {
      return;
    }
    lastSyncHash.current = dataHash;

    // Debounce the sync to avoid too many requests
    const timeoutId = setTimeout(() => {
      socialActions.syncAppData(data).catch((error) => {
        console.error('[SyncBridge] Failed to sync:', error);
      });
    }, 2000); // Wait 2 seconds after last change before syncing

    return () => clearTimeout(timeoutId);
  }, [
    appState.projects,
    appState.entries,
    appState.settings,
    appState.initialized,
    appState.dataPath,
    socialActions,
  ]);

  // This component doesn't render anything
  return null;
}
