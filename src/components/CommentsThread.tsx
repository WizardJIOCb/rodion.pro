import { useState, useEffect, useCallback, useRef } from 'react';
import ReactionsBar from './ReactionsBar';

interface User {
  id: number;
  name: string | null;
  avatar: string | null;
}

interface Comment {
  id: number;
  body: string | null;
  createdAt: string;
  updatedAt: string | null;
  isHidden: boolean;
  isDeleted: boolean;
  user: User | null;
  reactions: Record<string, number>;
  userReactions: string[];
  replies: Comment[];
}

interface Props {
  pageType: string;
  pageKey: string;
  lang: string;
  translations: {
    placeholder: string;
    submit: string;
    reply: string;
    replies: string;
    deleted: string;
    report: string;
    loginPrompt: string;
  };
}

function CommentItem({
  comment,
  lang,
  onReply,
  translations,
  depth = 0,
}: {
  comment: Comment;
  lang: string;
  onReply: (parentId: number) => void;
  translations: Props['translations'];
  depth?: number;
}) {
  const [showReplies, setShowReplies] = useState(depth < 2);
  const replyCount = comment.replies.length;

  if (comment.isDeleted) {
    return (
      <div className="py-3 text-sm text-muted italic">
        {translations.deleted}
      </div>
    );
  }

  if (comment.isHidden) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`${depth > 0 ? 'ml-4 pl-4 border-l border-border' : ''}`}>
      <div className="py-4">
        <div className="flex items-start gap-3">
          {comment.user?.avatar ? (
            <img
              src={comment.user.avatar}
              alt=""
              className="w-8 h-8 rounded-full shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-surface2 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-text text-sm">
                {comment.user?.name || 'Anonymous'}
              </span>
              <span className="text-xs text-muted">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <div className="text-sm text-text whitespace-pre-wrap break-words">
              {comment.body}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <ReactionsBar
                targetType="comment"
                targetKey={String(comment.id)}
                initialReactions={comment.reactions}
                initialUserReactions={comment.userReactions}
              />
              <button
                onClick={() => onReply(comment.id)}
                className="text-xs text-muted hover:text-accent transition-colors"
              >
                {translations.reply}
              </button>
            </div>
          </div>
        </div>
      </div>

      {replyCount > 0 && (
        <>
          {!showReplies ? (
            <button
              onClick={() => setShowReplies(true)}
              className="text-sm text-accent hover:underline mb-2"
            >
              {translations.replies} {replyCount}
            </button>
          ) : (
            <div>
              {comment.replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  lang={lang}
                  onReply={onReply}
                  translations={translations}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CommentsThread({ pageType, pageKey, lang, translations }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [body, setBody] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load draft from localStorage
  useEffect(() => {
    const draftKey = `comment-draft-${pageType}-${pageKey}`;
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      setBody(draft);
    }
  }, [pageType, pageKey]);

  // Save draft to localStorage
  useEffect(() => {
    const draftKey = `comment-draft-${pageType}-${pageKey}`;
    if (body) {
      localStorage.setItem(draftKey, body);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [body, pageType, pageKey]);

  // Fetch comments
  useEffect(() => {
    async function fetchComments() {
      try {
        const response = await fetch(
          `/api/comments?type=${pageType}&key=${pageKey}&lang=${lang}`
        );
        if (response.ok) {
          const data = await response.json();
          setComments(data.comments);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchComments();
  }, [pageType, pageKey, lang]);

  const handleSubmit = useCallback(async () => {
    if (!body.trim() || submitting) return;

    setSubmitting(true);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType,
          pageKey,
          lang,
          parentId: replyTo,
          body: body.trim(),
        }),
      });

      if (response.status === 401) {
        // Save draft and redirect to auth
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/api/auth/google/start?returnTo=${returnTo}`;
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to post comment');
      }

      const { comment } = await response.json();

      // Clear draft
      localStorage.removeItem(`comment-draft-${pageType}-${pageKey}`);
      setBody('');
      setReplyTo(null);

      // Add comment to list
      if (replyTo) {
        // Add as reply
        setComments(prev => {
          const addReply = (comments: Comment[]): Comment[] => {
            return comments.map(c => {
              if (c.id === replyTo) {
                return { ...c, replies: [...c.replies, comment] };
              }
              return { ...c, replies: addReply(c.replies) };
            });
          };
          return addReply(prev);
        });
      } else {
        // Add as root comment
        setComments(prev => [...prev, comment]);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  }, [body, pageType, pageKey, lang, replyTo, submitting]);

  const handleReply = useCallback((parentId: number) => {
    setReplyTo(parentId);
    textareaRef.current?.focus();
  }, []);

  const cancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-surface rounded-lg" />
        <div className="h-16 bg-surface rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Comment form */}
      <div className="mb-6">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 text-sm text-muted">
            <span>Replying to comment</span>
            <button
              onClick={cancelReply}
              className="text-accent hover:underline"
            >
              Cancel
            </button>
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={translations.placeholder}
          className="w-full px-4 py-3 bg-surface border border-border rounded-lg
                     text-text placeholder-muted resize-none
                     focus:outline-none focus:border-accent/50
                     min-h-[100px]"
          rows={3}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || submitting}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '...' : translations.submit}
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="divide-y divide-border">
        {comments.length === 0 ? (
          <p className="text-muted text-sm py-4">
            {lang === 'ru' ? 'Комментариев пока нет' : 'No comments yet'}
          </p>
        ) : (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              lang={lang}
              onReply={handleReply}
              translations={translations}
            />
          ))
        )}
      </div>
    </div>
  );
}
