import type { APIRoute } from 'astro';
import { db, comments, reactions, users } from '@/db';
import { eq, and, asc, isNull, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/session';

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const pageType = url.searchParams.get('type');
    const pageKey = url.searchParams.get('key');
    const lang = url.searchParams.get('lang') || 'ru';
    
    if (!pageType || !pageKey) {
      return new Response(JSON.stringify({ error: 'Missing type or key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const currentUser = await getCurrentUser(cookies);
    
    // Get all comments for this page
    const allComments = await db
      .select({
        id: comments.id,
        pageType: comments.pageType,
        pageKey: comments.pageKey,
        lang: comments.lang,
        userId: comments.userId,
        parentId: comments.parentId,
        body: comments.body,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        isHidden: comments.isHidden,
        isDeleted: comments.isDeleted,
        userName: users.name,
        userAvatar: users.avatarUrl,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(
        and(
          eq(comments.pageType, pageType),
          eq(comments.pageKey, pageKey),
          eq(comments.lang, lang),
        )
      )
      .orderBy(asc(comments.createdAt));
    
    // Get reaction counts for each comment
    const commentIds = allComments.map(c => c.id);
    
    let reactionCounts: Record<number, Record<string, number>> = {};
    let userReactions: Record<number, string[]> = {};
    
    if (commentIds.length > 0) {
      const reactionData = await db
        .select({
          targetKey: reactions.targetKey,
          emoji: reactions.emoji,
          count: sql<number>`count(*)::int`,
        })
        .from(reactions)
        .where(
          and(
            eq(reactions.targetType, 'comment'),
            sql`${reactions.targetKey} = ANY(${commentIds.map(String)})`
          )
        )
        .groupBy(reactions.targetKey, reactions.emoji);
      
      for (const row of reactionData) {
        const commentId = parseInt(row.targetKey);
        if (!reactionCounts[commentId]) {
          reactionCounts[commentId] = {};
        }
        reactionCounts[commentId][row.emoji] = row.count;
      }
      
      // Get current user's reactions
      if (currentUser) {
        const userReactionData = await db
          .select({
            targetKey: reactions.targetKey,
            emoji: reactions.emoji,
          })
          .from(reactions)
          .where(
            and(
              eq(reactions.targetType, 'comment'),
              eq(reactions.userId, currentUser.id),
              sql`${reactions.targetKey} = ANY(${commentIds.map(String)})`
            )
          );
        
        for (const row of userReactionData) {
          const commentId = parseInt(row.targetKey);
          if (!userReactions[commentId]) {
            userReactions[commentId] = [];
          }
          userReactions[commentId].push(row.emoji);
        }
      }
    }
    
    // Build tree structure
    const commentsMap = new Map();
    const rootComments: any[] = [];
    
    for (const comment of allComments) {
      const formatted = {
        id: comment.id,
        body: comment.isDeleted ? null : comment.body,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        isHidden: comment.isHidden,
        isDeleted: comment.isDeleted,
        user: comment.userId ? {
          id: comment.userId,
          name: comment.userName,
          avatar: comment.userAvatar,
        } : null,
        reactions: reactionCounts[comment.id] || {},
        userReactions: userReactions[comment.id] || [],
        replies: [],
      };
      
      commentsMap.set(comment.id, formatted);
      
      if (!comment.parentId) {
        rootComments.push(formatted);
      }
    }
    
    // Build tree
    for (const comment of allComments) {
      if (comment.parentId) {
        const parent = commentsMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentsMap.get(comment.id));
        }
      }
    }
    
    return new Response(JSON.stringify({ comments: rootComments }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch comments' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const currentUser = await getCurrentUser(cookies);
    
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const body = await request.json();
    const { pageType, pageKey, lang, parentId, body: commentBody } = body;
    
    if (!pageType || !pageKey || !lang || !commentBody) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (commentBody.length > 5000) {
      return new Response(JSON.stringify({ error: 'Comment too long' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const [newComment] = await db.insert(comments).values({
      pageType,
      pageKey,
      lang,
      userId: currentUser.id,
      parentId: parentId || null,
      body: commentBody.trim(),
    }).returning();
    
    return new Response(JSON.stringify({
      comment: {
        id: newComment.id,
        body: newComment.body,
        createdAt: newComment.createdAt,
        user: {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatarUrl,
        },
        reactions: {},
        userReactions: [],
        replies: [],
      },
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return new Response(JSON.stringify({ error: 'Failed to create comment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
