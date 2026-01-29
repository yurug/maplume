/**
 * SyncBridge - Connects AppContext with SocialContext for cloud sync
 *
 * This component sits inside both providers and:
 * 1. Syncs app data changes to the cloud when the user is logged in
 * 2. Switches to user-specific data folders when users log in/out
 */

import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useSocial } from '../context/SocialContext';
import { getUserDataPath, ensureDirectory } from '../services/storage';
import type { AppData } from '@maplume/shared';

export function SyncBridge() {
  const { state: appState, actions: appActions } = useApp();
  const { state: socialState, actions: socialActions } = useSocial();

  // Track if this is the first render to avoid syncing on initial load
  const isFirstRender = useRef(true);
  const lastSyncHash = useRef<string>('');
  // Track the current user to detect login/logout
  const previousUserRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  // Handle user login/logout - switch to user-specific data path
  useEffect(() => {
    const handleUserSwitch = async () => {
      // Wait for social context to initialize
      if (!socialState.initialized) {
        return;
      }

      // Get the base data path
      const baseDataPath = await window.electronAPI.getConfigValue('dataPath');
      if (!baseDataPath || typeof baseDataPath !== 'string') {
        return;
      }

      const currentUserId = socialState.user?.id ?? null;
      const currentUsername = socialState.user?.username ?? null;

      // Skip if user hasn't changed
      if (isInitializedRef.current && previousUserRef.current === currentUserId) {
        return;
      }

      // Mark as initialized after first check
      isInitializedRef.current = true;
      previousUserRef.current = currentUserId;

      if (currentUsername) {
        // User logged in - switch to user-specific folder
        const userDataPath = getUserDataPath(baseDataPath, currentUsername);
        await ensureDirectory(userDataPath);

        // Only reinitialize if we're already initialized (not first load)
        if (appState.initialized && appState.dataPath !== userDataPath) {
          console.log('[SyncBridge] Switching to user data path:', userDataPath);
          await appActions.reinitialize(userDataPath);
        }
      } else if (appState.initialized) {
        // User logged out - switch back to base folder
        const currentDataPath = appState.dataPath;
        if (currentDataPath && currentDataPath !== baseDataPath && currentDataPath.includes('/users/')) {
          console.log('[SyncBridge] Switching back to base data path:', baseDataPath);
          await appActions.reinitialize(baseDataPath);
        }
      }
    };

    handleUserSwitch();
  }, [socialState.initialized, socialState.user?.id, socialState.user?.username, appState.initialized, appState.dataPath, appActions]);

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
