/**
 * EmojiPicker - Simple emoji picker component for reactions
 */

import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '../ui/button';

// Common reaction emojis organized by category
const EMOJI_CATEGORIES = [
  {
    name: 'reactions',
    emojis: ['👍', '❤️', '🔥', '👏', '🎉', '✨', '💪', '🙌'],
  },
  {
    name: 'emotions',
    emojis: ['😊', '😍', '🥳', '😮', '😢', '😂', '🤔', '😎'],
  },
  {
    name: 'writing',
    emojis: ['✍️', '📝', '📚', '💡', '🎯', '🚀', '⭐', '💯'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  triggerClassName?: string;
}

export function EmojiPicker({ onSelect, onClose, triggerClassName }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
    onClose?.();
  };

  return (
    <div className="relative inline-block">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon-sm"
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
        title="Add reaction"
      >
        <Smile className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div
          ref={pickerRef}
          className="absolute z-50 bottom-full mb-2 left-0 bg-white dark:bg-warm-800 rounded-lg shadow-lg border border-warm-200 dark:border-warm-700 p-2 w-[220px]"
        >
          <div className="space-y-2">
            {EMOJI_CATEGORIES.map((category) => (
              <div key={category.name}>
                <div className="grid grid-cols-8 gap-1">
                  {category.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleSelect(emoji)}
                      className="w-6 h-6 flex items-center justify-center text-lg hover:bg-warm-100 dark:hover:bg-warm-700 rounded transition-colors"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Quick reaction bar for common emojis
interface QuickReactionBarProps {
  onSelect: (emoji: string) => void;
  existingReactions?: { emoji: string; userReacted: boolean }[];
}

export function QuickReactionBar({ onSelect, existingReactions = [] }: QuickReactionBarProps) {
  const quickEmojis = ['👍', '❤️', '🔥', '👏', '🎉'];

  return (
    <div className="flex items-center gap-1">
      {quickEmojis.map((emoji) => {
        const existing = existingReactions.find((r) => r.emoji === emoji);
        return (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className={`w-7 h-7 flex items-center justify-center text-base rounded transition-colors ${
              existing?.userReacted
                ? 'bg-primary-100 dark:bg-primary-900/30'
                : 'hover:bg-warm-100 dark:hover:bg-warm-700'
            }`}
            title={emoji}
          >
            {emoji}
          </button>
        );
      })}
      <EmojiPicker onSelect={onSelect} />
    </div>
  );
}
