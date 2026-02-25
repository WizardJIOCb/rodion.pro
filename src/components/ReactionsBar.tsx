import { useState, useEffect, useCallback } from 'react';

interface Props {
  targetType: 'post' | 'comment';
  targetKey: string;
  lang?: string;
  initialReactions?: Record<string, number>;
  initialUserReactions?: string[];
}

const EMOJIS = ['👍', '🔥', '🤖', '💡', '😂', '🎯'];

export default function ReactionsBar({
  targetType,
  targetKey,
  lang,
  initialReactions = {},
  initialUserReactions = [],
}: Props) {
  const [reactions, setReactions] = useState<Record<string, number>>(initialReactions);
  const [userReactions, setUserReactions] = useState<string[]>(initialUserReactions);
  const [loading, setLoading] = useState(false);

  const toggleReaction = useCallback(async (emoji: string) => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/reactions/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetKey, lang, emoji }),
      });
      
      if (response.status === 401) {
        // Not logged in - redirect to auth
        const returnTo = encodeURIComponent(window.location.pathname);
        window.location.href = `/api/auth/google/start?returnTo=${returnTo}`;
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to toggle reaction');
      }
      
      const { added } = await response.json();
      
      setReactions(prev => ({
        ...prev,
        [emoji]: (prev[emoji] || 0) + (added ? 1 : -1),
      }));
      
      setUserReactions(prev =>
        added ? [...prev, emoji] : prev.filter(e => e !== emoji)
      );
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetKey, lang, loading]);

  return (
    <div className="flex flex-wrap gap-2">
      {EMOJIS.map(emoji => {
        const count = reactions[emoji] || 0;
        const isActive = userReactions.includes(emoji);
        
        return (
          <button
            key={emoji}
            onClick={() => toggleReaction(emoji)}
            disabled={loading}
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm
              border transition-all duration-200
              ${isActive
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-surface text-muted hover:border-accent/50 hover:text-text'
              }
              ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            `}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="font-mono text-xs">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
