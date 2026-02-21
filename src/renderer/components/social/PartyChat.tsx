/**
 * PartyChat - Ephemeral chat for writing parties
 *
 * Messages are not encrypted and are deleted when the party ends.
 * Uses polling for real-time updates.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useSocial } from '../../context/SocialContext';
import { useI18n } from '../../i18n';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { Avatar } from './Avatar';
import type { PartyMessage } from '@maplume/shared';

interface PartyChatProps {
  partyId: string;
  isActive: boolean;
}

const POLL_INTERVAL = 5000; // 5 seconds

export function PartyChat({ partyId, isActive }: PartyChatProps) {
  const { state, actions } = useSocial();
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = actions.getPartyMessages(partyId);
  const lastMessageTimestamp = messages.length > 0 ? messages[messages.length - 1].createdAt : 0;

  // Initial fetch of messages
  useEffect(() => {
    if (!isActive) return;

    const fetchInitial = async () => {
      setLoading(true);
      try {
        await actions.fetchPartyMessages(partyId);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [partyId, isActive, actions]);

  // Poll for new messages
  useEffect(() => {
    if (!isActive || !isExpanded) return;

    const poll = async () => {
      try {
        await actions.fetchPartyMessages(partyId, lastMessageTimestamp);
      } catch (error) {
        // Silent fail for polling - don't spam console
        if (!(error instanceof Error && error.message.includes('not active'))) {
          console.error('Failed to poll messages:', error);
        }
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [partyId, isActive, isExpanded, lastMessageTimestamp, actions]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isExpanded]);

  const handleSend = useCallback(async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      await actions.sendPartyMessage(partyId, message.trim());
      setMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  }, [message, sending, partyId, actions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t.justNow || 'just now';
    if (diffMins < 60) return `${diffMins}m`;

    // If same day, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }

    // Otherwise show date
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="border-t border-warm-200 dark:border-warm-700">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-warm-50 dark:hover:bg-warm-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-purple-500" />
          <span className="text-sm font-medium text-warm-700 dark:text-warm-300">
            {t.chat || 'Chat'}
          </span>
          {messages.length > 0 && (
            <span className="text-xs bg-warm-200 dark:bg-warm-700 text-warm-600 dark:text-warm-400 px-2 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-warm-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-warm-500" />
        )}
      </button>

      {/* Chat Content */}
      {isExpanded && (
        <div className="border-t border-warm-100 dark:border-warm-800">
          {/* Messages List */}
          <div className="h-64 overflow-y-auto p-4 space-y-3 bg-warm-50/50 dark:bg-warm-900/50">
            {loading ? (
              <div className="flex items-center justify-center h-full text-warm-500">
                <div className="animate-pulse">{t.loading || 'Loading...'}</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-warm-500 text-sm">
                {t.noMessages || 'No messages yet. Say hello!'}
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.author.id === state.user?.id}
                  formatTime={formatTime}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-warm-100 dark:border-warm-800 bg-white dark:bg-warm-800">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.typeMessage || 'Type a message...'}
                disabled={sending || !isActive}
                maxLength={500}
                className={cn(
                  'flex-1 px-3 py-2 text-sm rounded-lg border transition-colors',
                  'bg-warm-50 dark:bg-warm-900 border-warm-200 dark:border-warm-700',
                  'text-warm-900 dark:text-warm-100 placeholder-warm-400',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sending || !isActive}
                size="sm"
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: PartyMessage;
  isOwn: boolean;
  formatTime: (timestamp: number) => string;
}

function MessageBubble({ message, isOwn, formatTime }: MessageBubbleProps) {
  return (
    <div className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
      <Avatar
        preset={message.author.avatarPreset}
        avatarData={message.author.avatarData}
        username={message.author.username}
        size="sm"
      />
      <div className={cn('flex-1 max-w-[75%]', isOwn && 'flex flex-col items-end')}>
        <div className="flex items-baseline gap-2 mb-0.5">
          <span
            className={cn(
              'text-xs font-medium',
              isOwn ? 'text-purple-600 dark:text-purple-400' : 'text-warm-600 dark:text-warm-400'
            )}
          >
            {isOwn ? 'You' : message.author.username}
          </span>
          <span className="text-xs text-warm-400">{formatTime(message.createdAt)}</span>
        </div>
        <div
          className={cn(
            'px-3 py-2 rounded-lg text-sm break-words',
            isOwn
              ? 'bg-purple-500 text-white rounded-tr-sm'
              : 'bg-white dark:bg-warm-700 text-warm-900 dark:text-warm-100 rounded-tl-sm shadow-sm'
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
