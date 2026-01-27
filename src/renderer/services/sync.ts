/**
 * SyncService - Handles synchronization of project data with the server
 *
 * Features:
 * - Offline queue for operations when server is unavailable
 * - Automatic sync on connection restore
 * - Polling for updates from server
 * - Conflict resolution (client wins)
 */

import type { SyncOperation, SyncStatus } from '@maplume/shared';
import type { AppData } from '@maplume/shared';
import { apiClient } from './api';
import { compressAndEncrypt, decryptAndDecompress, hashString } from './crypto';

// Storage keys
const SYNC_QUEUE_KEY = 'maplume-sync-queue';
const LAST_SYNC_KEY = 'maplume-last-sync';

// Polling interval (30 seconds)
const POLL_INTERVAL = 30000;

type SyncListener = (status: SyncStatus) => void;
type ConnectionListener = (online: boolean) => void;

class SyncService {
  private queue: SyncOperation[] = [];
  private pollingInterval: number | null = null;
  private localKey: Uint8Array | null = null;
  private status: SyncStatus = 'idle';
  private isOnline = false;
  private listeners: Set<SyncListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private processingQueue = false;

  /**
   * Initialize the sync service with the user's local encryption key
   */
  async initialize(localKey: Uint8Array): Promise<void> {
    this.localKey = localKey;
    await this.loadQueue();

    // Check initial connection status
    this.isOnline = await apiClient.isServerAvailable();
    this.notifyConnectionListeners();

    // Process any pending operations
    if (this.isOnline && this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Set online status and notify listeners
   */
  private setOnline(online: boolean): void {
    if (this.isOnline !== online) {
      this.isOnline = online;
      this.notifyConnectionListeners();

      if (online && this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * Set sync status and notify listeners
   */
  private setStatus(status: SyncStatus): void {
    this.status = status;
    this.notifyListeners();
  }

  /**
   * Add a listener for sync status changes
   */
  addStatusListener(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Add a listener for connection status changes
   */
  addConnectionListener(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  /**
   * Notify all status listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.status));
  }

  /**
   * Notify all connection listeners
   */
  private notifyConnectionListeners(): void {
    this.connectionListeners.forEach((listener) => listener(this.isOnline));
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Get current connection status
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Get number of pending operations
   */
  getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * Load queue from localStorage
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      console.error('Failed to save sync queue');
    }
  }

  /**
   * Queue an operation for sync
   */
  queueOperation(type: SyncOperation['type'], payload: unknown): void {
    const operation: SyncOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload: JSON.stringify(payload),
      createdAt: Date.now(),
      retryCount: 0,
    };

    this.queue.push(operation);
    this.saveQueue();

    // Try to process immediately if online
    if (this.isOnline && !this.processingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process the sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.queue.length === 0 || !this.isOnline) {
      return;
    }

    this.processingQueue = true;
    this.setStatus('syncing');

    try {
      // Process operations in order
      while (this.queue.length > 0) {
        const operation = this.queue[0];

        try {
          await this.processOperation(operation);
          // Remove successful operation
          this.queue.shift();
          this.saveQueue();
        } catch (error) {
          // Check if it's a connection error
          const isOnline = await apiClient.isServerAvailable();
          if (!isOnline) {
            this.setOnline(false);
            break;
          }

          // Increment retry count
          operation.retryCount++;

          // If too many retries, move to end of queue
          if (operation.retryCount >= 3) {
            this.queue.shift();
            this.queue.push(operation);
            this.saveQueue();
          }

          console.error('Sync operation failed:', error);
          break;
        }
      }

      this.setStatus(this.queue.length > 0 ? 'error' : 'idle');
    } catch (error) {
      console.error('Queue processing error:', error);
      this.setStatus('error');
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process a single sync operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'project_sync':
        const payload = JSON.parse(operation.payload);
        await apiClient.syncProjects(payload.encryptedBlob, payload.blobHash);
        break;

      case 'profile_update':
        const profilePayload = JSON.parse(operation.payload);
        await apiClient.updateProfile(profilePayload);
        break;

      default:
        console.warn('Unknown operation type:', operation.type);
    }
  }

  /**
   * Sync project data to server
   */
  async syncProjectData(data: AppData): Promise<void> {
    if (!this.localKey) {
      throw new Error('Sync service not initialized');
    }

    // Encrypt and compress the data
    const encryptedBlob = compressAndEncrypt(data, this.localKey);
    const blobHash = hashString(encryptedBlob);

    // Queue the sync operation
    this.queueOperation('project_sync', { encryptedBlob, blobHash });
  }

  /**
   * Get project data from server
   */
  async getProjectDataFromServer(): Promise<AppData | null> {
    if (!this.localKey) {
      throw new Error('Sync service not initialized');
    }

    if (!this.isOnline) {
      throw new Error('Server unavailable');
    }

    const response = await apiClient.getProjects();

    if (!response.encryptedBlob) {
      return null;
    }

    // Decrypt and decompress
    return decryptAndDecompress<AppData>(response.encryptedBlob, this.localKey);
  }

  /**
   * Start polling for updates
   */
  startPolling(): void {
    if (this.pollingInterval) {
      return;
    }

    this.pollingInterval = window.setInterval(async () => {
      // Check connection
      const online = await apiClient.isServerAvailable();
      this.setOnline(online);

      // Process queue if online
      if (online && this.queue.length > 0) {
        this.processQueue();
      }
    }, POLL_INTERVAL);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Force an immediate sync check
   */
  async forceSync(): Promise<void> {
    const online = await apiClient.isServerAvailable();
    this.setOnline(online);

    if (online) {
      await this.processQueue();
    }
  }

  /**
   * Clear all pending operations
   */
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    this.setStatus('idle');
  }

  /**
   * Cleanup when user logs out
   */
  cleanup(): void {
    this.stopPolling();
    this.clearQueue();
    this.localKey = null;
    this.setStatus('offline');
    this.setOnline(false);
  }
}

// Export singleton instance
export const syncService = new SyncService();

// Export class for testing
export { SyncService };
