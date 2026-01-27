/**
 * API Client for MaPlume server communication
 *
 * Handles authentication, token refresh, and all API calls.
 */

import type {
  RegisterRequest,
  RegisterResponse,
  ChallengeResponse,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RefreshResponse,
  UpdateProfileRequest,
  UserProfileResponse,
  SyncProjectsRequest,
  SyncProjectsResponse,
  GetProjectsResponse,
  ApiError,
} from '@maplume/shared';
import { sign, bytesToBase64 } from './crypto';

// Default server URL (can be configured)
const DEFAULT_SERVER_URL = 'https://maplumes3tyzv8f-maplume-server.functions.fnc.fr-par.scw.cloud';

// Storage keys
const ACCESS_TOKEN_KEY = 'maplume-access-token';
const REFRESH_TOKEN_KEY = 'maplume-refresh-token';
const SERVER_URL_KEY = 'maplume-server-url';

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.baseUrl = DEFAULT_SERVER_URL;
    this.loadTokens();
  }

  /**
   * Initialize the client with stored configuration
   */
  async initialize(): Promise<void> {
    // Load server URL from config
    const storedUrl = await window.electronAPI.getConfigValue(SERVER_URL_KEY);
    if (storedUrl && typeof storedUrl === 'string') {
      // Migrate from old localhost URL to new Scaleway URL
      if (storedUrl.includes('localhost') || storedUrl.includes('127.0.0.1')) {
        // Clear old localhost URL, use default
        await window.electronAPI.setConfigValue(SERVER_URL_KEY, DEFAULT_SERVER_URL);
        this.baseUrl = DEFAULT_SERVER_URL;
      } else {
        this.baseUrl = storedUrl;
      }
    }

    // Load tokens from secure storage
    await this.loadTokens();
  }

  /**
   * Set the server URL
   */
  async setServerUrl(url: string): Promise<void> {
    this.baseUrl = url;
    await window.electronAPI.setConfigValue(SERVER_URL_KEY, url);
  }

  /**
   * Get the current server URL
   */
  getServerUrl(): string {
    return this.baseUrl;
  }

  /**
   * Load tokens from secure storage
   */
  private async loadTokens(): Promise<void> {
    this.accessToken = await window.electronAPI.secureStorage.get(ACCESS_TOKEN_KEY);
    this.refreshToken = await window.electronAPI.secureStorage.get(REFRESH_TOKEN_KEY);
  }

  /**
   * Save tokens to secure storage
   */
  private async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    await window.electronAPI.secureStorage.set(ACCESS_TOKEN_KEY, accessToken);
    await window.electronAPI.secureStorage.set(REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Clear tokens (logout)
   */
  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    await window.electronAPI.secureStorage.delete(ACCESS_TOKEN_KEY);
    await window.electronAPI.secureStorage.delete(REFRESH_TOKEN_KEY);
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    requireAuth = true
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requireAuth) {
      if (!this.accessToken) {
        throw new Error('Not authenticated');
      }
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle token expiration
    if (response.status === 401 && requireAuth) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        // Retry with new token
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!retryResponse.ok) {
          const error = await retryResponse.json() as ApiError;
          throw new Error(error.error || 'Request failed');
        }

        return retryResponse.json();
      } else {
        // Refresh failed, clear tokens
        await this.clearTokens();
        throw new Error('Session expired, please log in again');
      }
    }

    if (!response.ok) {
      const error = await response.json() as ApiError;
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  /**
   * Refresh the access token
   */
  private async refreshAccessToken(): Promise<string | null> {
    // Prevent multiple concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshToken) {
      return null;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken } as RefreshRequest),
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json() as RefreshResponse;
        this.accessToken = data.accessToken;
        await window.electronAPI.secureStorage.set(ACCESS_TOKEN_KEY, data.accessToken);
        return data.accessToken;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // ============ Authentication ============

  /**
   * Register a new user
   */
  async register(username: string, publicKey: Uint8Array): Promise<RegisterResponse> {
    const request: RegisterRequest = {
      username,
      publicKey: bytesToBase64(publicKey),
    };

    return this.request<RegisterResponse>('POST', '/api/auth/register', request, false);
  }

  /**
   * Get a challenge for login
   */
  async getChallenge(username: string): Promise<ChallengeResponse> {
    return this.request<ChallengeResponse>('POST', '/api/auth/challenge', { username }, false);
  }

  /**
   * Login with a signed challenge
   */
  async login(
    username: string,
    challenge: string,
    privateKey: Uint8Array
  ): Promise<LoginResponse> {
    // Sign the challenge
    const signature = sign(new TextEncoder().encode(challenge), privateKey);

    const request: LoginRequest = {
      username,
      challenge,
      signature: bytesToBase64(signature),
    };

    const response = await this.request<LoginResponse>('POST', '/api/auth/login', request, false);

    // Save tokens
    await this.saveTokens(response.accessToken, response.refreshToken);

    return response;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      if (this.refreshToken) {
        await this.request('POST', '/api/auth/logout', { refreshToken: this.refreshToken }, false);
      }
    } catch {
      // Ignore logout errors
    } finally {
      await this.clearTokens();
    }
  }

  // ============ User Profile ============

  /**
   * Get current user's profile
   */
  async getProfile(): Promise<UserProfileResponse> {
    return this.request<UserProfileResponse>('GET', '/api/users/me');
  }

  /**
   * Update current user's profile
   */
  async updateProfile(updates: UpdateProfileRequest): Promise<{ success: boolean }> {
    return this.request('PUT', '/api/users/me', updates);
  }

  /**
   * Search for users
   */
  async searchUsers(query: string): Promise<{ users: Array<{ id: string; username: string; avatarPreset: string | null }> }> {
    return this.request('GET', `/api/users/search?q=${encodeURIComponent(query)}`);
  }

  // ============ Project Sync ============

  /**
   * Sync encrypted project data to server
   */
  async syncProjects(encryptedBlob: string, blobHash: string): Promise<SyncProjectsResponse> {
    const request: SyncProjectsRequest = {
      encryptedBlob,
      blobHash,
    };

    return this.request('POST', '/api/projects/sync', request);
  }

  /**
   * Get encrypted project data from server
   */
  async getProjects(): Promise<GetProjectsResponse> {
    return this.request<GetProjectsResponse>('GET', '/api/projects/sync');
  }

  // ============ Health Check ============

  /**
   * Check if server is available
   */
  async isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing
export { ApiClient };
