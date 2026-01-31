/**
 * ReactionBar - Display and add reactions to entries, notes, or comments
 */

import React from 'react';
import { EmojiPicker } from './EmojiPicker';
import type { ReactionCount } from '@maplume/shared';

interface ReactionBarProps {
  reactions: ReactionCount[];
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (reactionId: string) => void;
  compact?: boolean;
}

export function ReactionBar({ reactions, onAddReaction, onRemoveReaction, compact = false }: ReactionBarProps) {
  const handleClick = (reaction: ReactionCount) => {
    if (reaction.userReacted && reaction.reactionId) {
      onRemoveReaction(reaction.reactionId);
    } else {
      onAddReaction(reaction.emoji);
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleClick(reaction)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-colors ${
            reaction.userReacted
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
              : 'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-warm-600'
          }`}
          title={reaction.userReacted ? 'Click to remove' : 'Click to add'}
        >
          <span>{reaction.emoji}</span>
          <span className={compact ? 'text-xs' : 'text-sm'}>{reaction.count}</span>
        </button>
      ))}
      <EmojiPicker
        onSelect={onAddReaction}
        triggerClassName="opacity-50 hover:opacity-100"
      />
    </div>
  );
}

// Inline reaction display for table rows
interface InlineReactionsProps {
  reactions: ReactionCount[];
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (reactionId: string) => void;
}

export function InlineReactions({ reactions, onAddReaction, onRemoveReaction }: InlineReactionsProps) {
  if (reactions.length === 0) {
    return (
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <EmojiPicker
          onSelect={onAddReaction}
          triggerClassName="text-warm-400 hover:text-warm-600"
        />
      </div>
    );
  }

  return (
    <ReactionBar
      reactions={reactions}
      onAddReaction={onAddReaction}
      onRemoveReaction={onRemoveReaction}
      compact
    />
  );
}
