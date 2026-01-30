/**
 * FriendsPanel - Friends management interface
 *
 * Allows users to see their friends, manage friend requests, and add new friends.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, UserMinus, Check, X, Search, Clock, ArrowLeft, Send, RefreshCw } from 'lucide-react';
import { apiClient } from '../../services/api';
import { useI18n } from '../../i18n';
import { useSocial } from '../../context/SocialContext';
import { Button } from '../ui/button';
import { Avatar } from './Avatar';
import type { FriendUser, FriendRequest } from '@maplume/shared';

type Tab = 'friends' | 'requests' | 'add';

export function FriendsPanel({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const { state } = useSocial();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add friend state
  const [searchMessage, setSearchMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadFriends = useCallback(async () => {
    if (!state.isOnline) return;

    try {
      setLoading(true);
      setError(null);

      const [friendsData, requestsData] = await Promise.all([
        apiClient.getFriends(),
        apiClient.getFriendRequests(),
      ]);

      setFriends(friendsData.friends);
      setReceivedRequests(requestsData.received);
      setSentRequests(requestsData.sent);
    } catch (err) {
      console.error('Failed to load friends:', err);
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  }, [state.isOnline]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await apiClient.acceptFriendRequest(requestId);
      await loadFriends();
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await apiClient.rejectFriendRequest(requestId);
      await loadFriends();
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await apiClient.cancelFriendRequest(requestId);
      await loadFriends();
    } catch (err) {
      console.error('Failed to cancel request:', err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm(t.removeFriendConfirm || 'Remove this friend?')) return;

    try {
      await apiClient.removeFriend(friendId);
      await loadFriends();
    } catch (err) {
      console.error('Failed to remove friend:', err);
    }
  };

  const handleSendRequest = async (userId: string, username: string) => {
    setSending(true);
    setSendResult(null);

    try {
      const result = await apiClient.sendFriendRequest(username, searchMessage.trim() || undefined);

      if (result.autoAccepted) {
        setSendResult({ type: 'success', message: t.friendRequestAutoAccepted || 'You are now friends!' });
      } else {
        setSendResult({ type: 'success', message: t.friendRequestSent || 'Friend request sent!' });
      }

      setSearchMessage('');
      await loadFriends();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send request';
      setSendResult({ type: 'error', message });
    } finally {
      setSending(false);
    }
  };

  const totalPendingRequests = receivedRequests.length;

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="p-6 border-b border-warm-200 dark:border-warm-700">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">
              {t.friends || 'Friends'}
            </h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={loadFriends} disabled={loading || !state.isOnline}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-warm-200 dark:border-warm-700">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'friends'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-warm-500 hover:text-warm-700 dark:hover:text-warm-300'
          }`}
        >
          {t.friendsList || 'Friends'} ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'requests'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-warm-500 hover:text-warm-700 dark:hover:text-warm-300'
          }`}
        >
          {t.friendRequests || 'Requests'}
          {totalPendingRequests > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {totalPendingRequests}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'add'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-warm-500 hover:text-warm-700 dark:hover:text-warm-300'
          }`}
        >
          <UserPlus className="w-4 h-4 inline mr-1" />
          {t.addFriend || 'Add'}
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {!state.isOnline && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm">
            {t.offlineMessage || 'You are offline. Friend features require an internet connection.'}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {activeTab === 'friends' && (
          <FriendsList
            friends={friends}
            loading={loading}
            onRemove={handleRemoveFriend}
            t={t}
          />
        )}

        {activeTab === 'requests' && (
          <RequestsList
            received={receivedRequests}
            sent={sentRequests}
            loading={loading}
            onAccept={handleAcceptRequest}
            onReject={handleRejectRequest}
            onCancel={handleCancelRequest}
            t={t}
          />
        )}

        {activeTab === 'add' && (
          <AddFriend
            message={searchMessage}
            onMessageChange={setSearchMessage}
            onSendRequest={handleSendRequest}
            sending={sending}
            result={sendResult}
            disabled={!state.isOnline}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

// Friends list sub-component
function FriendsList({
  friends,
  loading,
  onRemove,
  t,
}: {
  friends: FriendUser[];
  loading: boolean;
  onRemove: (id: string) => void;
  t: Record<string, string>;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-warm-400" />
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 mx-auto text-warm-300 dark:text-warm-600 mb-4" />
        <p className="text-warm-500">{t.noFriendsYet || 'No friends yet. Add some friends to see their progress!'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((friend) => (
        <div
          key={friend.id}
          className="flex items-center justify-between p-4 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50"
        >
          <div className="flex items-center gap-3">
            <Avatar preset={friend.avatarPreset} username={friend.username} size="md" />
            <div>
              <p className="font-medium text-warm-900 dark:text-warm-100">{friend.username}</p>
              {friend.bio && (
                <p className="text-sm text-warm-500 truncate max-w-xs">{friend.bio}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(friend.id)}
            className="text-warm-400 hover:text-red-500"
          >
            <UserMinus className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// Requests list sub-component
function RequestsList({
  received,
  sent,
  loading,
  onAccept,
  onReject,
  onCancel,
  t,
}: {
  received: FriendRequest[];
  sent: FriendRequest[];
  loading: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  t: Record<string, string>;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-warm-400" />
      </div>
    );
  }

  if (received.length === 0 && sent.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 mx-auto text-warm-300 dark:text-warm-600 mb-4" />
        <p className="text-warm-500">{t.noFriendRequests || 'No pending friend requests.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Received requests */}
      {received.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-3">
            {t.receivedRequests || 'Received'}
          </h3>
          <div className="space-y-3">
            {received.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    preset={request.fromUser?.avatarPreset || null}
                    username={request.fromUser?.username || '?'}
                    size="md"
                  />
                  <div>
                    <p className="font-medium text-warm-900 dark:text-warm-100">
                      {request.fromUser?.username || 'Unknown'}
                    </p>
                    {request.message && (
                      <p className="text-sm text-warm-500 italic">"{request.message}"</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onAccept(request.id)}
                    className="text-green-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onReject(request.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent requests */}
      {sent.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-warm-500 uppercase tracking-wider mb-3">
            {t.sentRequests || 'Sent'}
          </h3>
          <div className="space-y-3">
            {sent.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 rounded-lg border border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-800/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    preset={request.toUser?.avatarPreset || null}
                    username={request.toUser?.username || '?'}
                    size="md"
                  />
                  <div>
                    <p className="font-medium text-warm-900 dark:text-warm-100">
                      {request.toUser?.username || 'Unknown'}
                    </p>
                    <p className="text-sm text-warm-500">
                      {t.pendingRequest || 'Pending...'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onCancel(request.id)}
                  className="text-warm-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Search result type
interface SearchUser {
  id: string;
  username: string;
  avatarPreset: string | null;
}

// Add friend sub-component with fuzzy search
function AddFriend({
  message,
  onMessageChange,
  onSendRequest,
  sending,
  result,
  disabled,
  t,
}: {
  message: string;
  onMessageChange: (value: string) => void;
  onSendRequest: (userId: string, username: string) => void;
  sending: boolean;
  result: { type: 'success' | 'error'; message: string } | null;
  disabled: boolean;
  t: Record<string, string>;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await apiClient.searchUsers(searchQuery);
        setSearchResults(response.users);
        setShowDropdown(response.users.length > 0);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectUser = (user: SearchUser) => {
    setSelectedUser(user);
    setSearchQuery(user.username);
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      onSendRequest(selectedUser.id, selectedUser.username);
      // Clear selection after sending
      setSelectedUser(null);
      setSearchQuery('');
    }
  };

  return (
    <div>
      <p className="text-warm-600 dark:text-warm-400 mb-4">
        {t.addFriendDescription || 'Enter a username to send a friend request.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-1">
            {t.username || 'Username'}
          </label>
          <div className="relative" ref={dropdownRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
            {selectedUser ? (
              <div className="flex items-center gap-2 w-full pl-10 pr-4 py-2 rounded-lg border border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/30">
                <Avatar preset={selectedUser.avatarPreset} username={selectedUser.username} size="xs" />
                <span className="font-medium text-warm-900 dark:text-warm-100">{selectedUser.username}</span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="ml-auto text-warm-400 hover:text-warm-600 dark:hover:text-warm-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  placeholder={t.usernamePlaceholder || 'Search by username...'}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-warm-900 dark:text-warm-100 placeholder-warm-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={disabled}
                />
                {searching && (
                  <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400 animate-spin" />
                )}
              </>
            )}

            {/* Search results dropdown */}
            {showDropdown && !selectedUser && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-warm-100 dark:hover:bg-warm-700 transition-colors text-left"
                  >
                    <Avatar preset={user.avatarPreset} username={user.username} size="sm" />
                    <span className="font-medium text-warm-900 dark:text-warm-100">{user.username}</span>
                  </button>
                ))}
              </div>
            )}

            {/* No results message */}
            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && !selectedUser && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 rounded-lg shadow-lg p-4 text-center text-warm-500">
                {t.noUsersFound || 'No users found'}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-warm-500">
            {t.searchHint || 'Type at least 2 characters to search'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-700 dark:text-warm-300 mb-1">
            {t.messageOptional || 'Message (optional)'}
          </label>
          <input
            type="text"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder={t.friendRequestMessagePlaceholder || 'Hi! I want to connect with you on MaPlume.'}
            className="w-full px-4 py-2 rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-warm-900 dark:text-warm-100 placeholder-warm-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={disabled}
            maxLength={200}
          />
        </div>

        <Button
          type="submit"
          disabled={disabled || sending || !selectedUser}
          className="w-full"
        >
          {sending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {t.sendFriendRequest || 'Send Friend Request'}
        </Button>
      </form>

      {result && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            result.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
