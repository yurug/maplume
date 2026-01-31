/**
 * CommentSection - Display and add comments to shared project entries/notes
 */

import React, { useState } from 'react';
import { Send, Edit2, Trash2, MoreVertical, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { ReactionBar } from './ReactionBar';
import { useI18n } from '../../i18n';
import { useSocial, type DecryptedComment } from '../../context/SocialContext';
import type { ReactionCount } from '@maplume/shared';

interface CommentProps {
  comment: DecryptedComment;
  reactions: ReactionCount[];
  isOwn: boolean;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onAddReaction: (commentId: string, emoji: string) => void;
  onRemoveReaction: (reactionId: string) => void;
}

function Comment({
  comment,
  reactions,
  isOwn,
  onEdit,
  onDelete,
  onAddReaction,
  onRemoveReaction,
}: CommentProps) {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showMenu, setShowMenu] = useState(false);

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit(comment.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t.justNow || 'just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className="group">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warm-200 dark:bg-warm-700 flex items-center justify-center text-sm">
          {comment.author.avatarPreset ? (
            <span>{comment.author.avatarPreset}</span>
          ) : (
            <span className="text-warm-500 dark:text-warm-400">
              {comment.author.username[0].toUpperCase()}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-warm-900 dark:text-warm-100 text-sm">
              {comment.author.username}
            </span>
            <span className="text-xs text-warm-400">
              {formatTime(comment.createdAt)}
              {comment.updatedAt > comment.createdAt && (
                <span className="ml-1">({t.edited || 'edited'})</span>
              )}
            </span>

            {/* Actions menu */}
            {isOwn && !isEditing && (
              <div className="relative ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowMenu(!showMenu)}
                  className="h-6 w-6"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-warm-800 rounded-lg shadow-lg border border-warm-200 dark:border-warm-700 py-1 min-w-[100px] z-10">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-warm-100 dark:hover:bg-warm-700 flex items-center gap-2"
                    >
                      <Edit2 className="w-3 h-3" />
                      {t.editComment || 'Edit'}
                    </button>
                    <button
                      onClick={() => {
                        onDelete(comment.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      {t.deleteComment || 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="mt-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-warm-300 dark:border-warm-600 rounded-lg bg-white dark:bg-warm-900 text-warm-900 dark:text-warm-100 resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2 mt-1">
                <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                  {t.save || 'Save'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  {t.cancel || 'Cancel'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-warm-700 dark:text-warm-300 mt-0.5 whitespace-pre-wrap">
              {comment.content}
            </p>
          )}

          {/* Reactions */}
          {!isEditing && (
            <div className="mt-2">
              <ReactionBar
                reactions={reactions}
                onAddReaction={(emoji) => onAddReaction(comment.id, emoji)}
                onRemoveReaction={onRemoveReaction}
                compact
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CommentSectionProps {
  shareId: string;
  targetType: 'entry' | 'note';
  targetId: string;
  ownerPublicKey: string;
  comments: DecryptedComment[];
  getReactionCounts: (targetType: 'entry' | 'note' | 'comment', targetId: string) => ReactionCount[];
  expanded?: boolean;
}

export function CommentSection({
  shareId,
  targetType,
  targetId,
  ownerPublicKey,
  comments,
  getReactionCounts,
  expanded = false,
}: CommentSectionProps) {
  const { t } = useI18n();
  const { state, actions } = useSocial();
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter comments for this target
  const targetComments = comments.filter(
    (c) => c.targetType === targetType && c.targetId === targetId
  );

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await actions.createComment(shareId, targetType, targetId, newComment.trim(), ownerPublicKey);
      setNewComment('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    try {
      await actions.updateComment(shareId, commentId, content, ownerPublicKey);
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await actions.deleteComment(shareId, commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleAddReaction = async (commentId: string, emoji: string) => {
    try {
      await actions.addReaction(shareId, 'comment', commentId, emoji);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleRemoveReaction = async (reactionId: string) => {
    try {
      await actions.removeReaction(shareId, reactionId);
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  };

  // Toggle button for collapsed view
  if (!isExpanded && targetComments.length === 0) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-1 text-xs text-warm-400 hover:text-warm-600 dark:hover:text-warm-300 transition-colors"
      >
        <MessageCircle className="w-3 h-3" />
        {t.addComment || 'Add a comment'}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with count */}
      {targetComments.length > 0 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-medium text-warm-500 hover:text-warm-700 dark:hover:text-warm-300"
        >
          <MessageCircle className="w-3 h-3" />
          {targetComments.length} {targetComments.length === 1 ? (t.comment || 'comment') : (t.comments || 'comments')}
        </button>
      )}

      {/* Comments list */}
      {(isExpanded || targetComments.length > 0) && (
        <div className="space-y-3 pl-2 border-l-2 border-warm-200 dark:border-warm-700">
          {targetComments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              reactions={getReactionCounts('comment', comment.id)}
              isOwn={state.user?.id === comment.author.id}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
            />
          ))}

          {/* New comment input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={t.commentPlaceholder || 'Write a comment...'}
              className="flex-1 px-3 py-1.5 text-sm border border-warm-300 dark:border-warm-600 rounded-lg bg-white dark:bg-warm-900 text-warm-900 dark:text-warm-100 placeholder-warm-400"
              disabled={isSubmitting}
            />
            <Button
              variant="primary"
              size="icon-sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for table rows
interface CompactCommentIndicatorProps {
  commentCount: number;
  onClick: () => void;
}

export function CompactCommentIndicator({ commentCount, onClick }: CompactCommentIndicatorProps) {
  if (commentCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-warm-400 hover:text-warm-600"
    >
      <MessageCircle className="w-3 h-3" />
      {commentCount}
    </button>
  );
}
