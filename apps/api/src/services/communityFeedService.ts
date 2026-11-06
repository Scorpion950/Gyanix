import { supabaseAdmin } from '../config/supabase.js';
import type {
  CreatePostInput,
  CreateCommentInput,
  CreateReportInput,
  CreateCommunityInput,
  CreateProjectInput,
} from '@gyanix/shared';

export const communityFeedService = {
  /**
   * List posts across the 6 specified Feeds
   */
  async listPosts(
    userId: string | undefined,
    options: {
      feedType?: 'all' | 'following' | 'communities' | 'doubts' | 'projects' | 'milestones' | undefined;
      communityId?: string | undefined;
      limit?: number | undefined;
      offset?: number | undefined;
    } = {}
  ) {
    const { feedType = 'all', communityId, limit = 20, offset = 0 } = options;

    let query = supabaseAdmin
      .from('posts')
      .select(
        `
        id, author_id, community_id, post_type, title, content, code_snippet,
        lecture_item_id, timestamp_seconds, tags, likes_count, comments_count,
        is_pinned, created_at,
        profiles:author_id (id, username, display_name, avatar_url),
        communities:community_id (id, name, slug)
      `
      )
      .eq('moderation_status', 'approved')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (communityId) {
      query = query.eq('community_id', communityId);
    } else if (feedType === 'doubts') {
      query = query.eq('post_type', 'doubt');
    } else if (feedType === 'projects') {
      query = query.eq('post_type', 'project');
    } else if (feedType === 'milestones') {
      query = query.eq('post_type', 'milestone');
    }

    const { data: posts, error } = await query;
    if (error) throw new Error(error.message);

    // If userId provided, check which posts are liked by caller
    let likedPostIds = new Set<string>();
    if (userId && posts && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: likes } = await supabaseAdmin
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds);

      if (likes) {
        likedPostIds = new Set(likes.map((l) => l.post_id));
      }
    }

    return (posts || []).map((p: any) => ({
      ...p,
      isLiked: likedPostIds.has(p.id),
      author: p.profiles,
      community: p.communities,
    }));
  },

  /**
   * Create a new post
   */
  async createPost(authorId: string, input: CreatePostInput) {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        author_id: authorId,
        community_id: input.communityId || null,
        post_type: input.postType,
        title: input.title || null,
        content: input.content,
        code_snippet: input.codeSnippet || null,
        lecture_item_id: input.lectureItemId || null,
        timestamp_seconds: input.timestampSeconds || null,
        tags: input.tags || [],
      })
      .select(
        `
        *,
        profiles:author_id (id, username, display_name, avatar_url),
        communities:community_id (id, name, slug)
      `
      )
      .single();

    if (error) throw new Error(error.message);
    return {
      ...data,
      isLiked: false,
      author: data.profiles,
      community: data.communities,
    };
  },

  /**
   * Toggle Like on a Post
   */
  async toggleLikePost(userId: string, postId: string) {
    const { data: existing } = await supabaseAdmin
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (existing) {
      // Unlike
      await supabaseAdmin
        .from('post_likes')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);

      const { data: p } = await supabaseAdmin.from('posts').select('likes_count').eq('id', postId).single();
      if (p) {
        await supabaseAdmin.from('posts').update({ likes_count: Math.max(0, p.likes_count - 1) }).eq('id', postId);
      }

      return { liked: false };
    } else {
      // Like
      await supabaseAdmin.from('post_likes').insert({ user_id: userId, post_id: postId });

      const { data: p } = await supabaseAdmin.from('posts').select('likes_count').eq('id', postId).single();
      if (p) {
        await supabaseAdmin.from('posts').update({ likes_count: p.likes_count + 1 }).eq('id', postId);
      }

      return { liked: true };
    }
  },

  /**
   * List Comments with 2-level nesting support
   */
  async listComments(postId: string) {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .select(
        `
        id, post_id, author_id, parent_id, content, timestamp_seconds, is_doubt_answer, created_at,
        profiles:author_id (id, username, display_name, avatar_url)
      `
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    // Organize into top-level and children
    const comments = data || [];
    const topLevel: any[] = [];
    const childrenMap: Record<string, any[]> = {};

    for (const c of comments) {
      const formatted = { ...c, author: c.profiles };
      if (!c.parent_id) {
        topLevel.push(formatted);
      } else {
        if (!childrenMap[c.parent_id]) childrenMap[c.parent_id] = [];
        childrenMap[c.parent_id]!.push(formatted);
      }
    }

    return topLevel.map((tl) => ({
      ...tl,
      replies: childrenMap[tl.id] || [],
    }));
  },

  /**
   * Create comment or reply
   */
  async createComment(authorId: string, input: CreateCommentInput) {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert({
        post_id: input.postId,
        author_id: authorId,
        parent_id: input.parentId || null,
        content: input.content,
        timestamp_seconds: input.timestampSeconds || null,
        is_doubt_answer: input.isDoubtAnswer || false,
      })
      .select(
        `
        *,
        profiles:author_id (id, username, display_name, avatar_url)
      `
      )
      .single();

    if (error) throw new Error(error.message);

    // Increment post comments count
    const { data: p } = await supabaseAdmin.from('posts').select('comments_count').eq('id', input.postId).single();
    if (p) {
      await supabaseAdmin.from('posts').update({ comments_count: p.comments_count + 1 }).eq('id', input.postId);
    }

    return { ...data, author: data.profiles, replies: [] };
  },

  /**
   * Report content with 1-report-per-user check
   */
  async createReport(reporterId: string, input: CreateReportInput) {
    const { data, error } = await supabaseAdmin
      .from('content_reports')
      .insert({
        reporter_id: reporterId,
        target_type: input.targetType,
        target_id: input.targetId,
        reason: input.reason,
        details: input.details || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('You have already submitted a report for this item.');
      }
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Communities
   */
  async listCommunities(userId?: string) {
    const { data, error } = await supabaseAdmin
      .from('communities')
      .select('*')
      .order('member_count', { ascending: false });

    if (error) throw new Error(error.message);

    let joinedSet = new Set<string>();
    if (userId && data && data.length > 0) {
      const { data: memberships } = await supabaseAdmin
        .from('community_members')
        .select('community_id')
        .eq('user_id', userId);

      if (memberships) {
        joinedSet = new Set(memberships.map((m) => m.community_id));
      }
    }

    return (data || []).map((c) => ({
      ...c,
      isMember: joinedSet.has(c.id),
    }));
  },

  async getCommunity(slug: string, userId?: string) {
    const { data: community, error } = await supabaseAdmin
      .from('communities')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !community) throw new Error('Community not found');

    let isMember = false;
    if (userId) {
      const { data: mem } = await supabaseAdmin
        .from('community_members')
        .select('id')
        .eq('community_id', community.id)
        .eq('user_id', userId)
        .maybeSingle();

      isMember = !!mem;
    }

    return { ...community, isMember };
  },

  async toggleJoinCommunity(userId: string, communityId: string) {
    const { data: existing } = await supabaseAdmin
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Leave
      await supabaseAdmin.from('community_members').delete().eq('id', existing.id);
      const { data: c } = await supabaseAdmin.from('communities').select('member_count').eq('id', communityId).single();
      if (c) {
        await supabaseAdmin.from('communities').update({ member_count: Math.max(1, c.member_count - 1) }).eq('id', communityId);
      }
      return { joined: false };
    } else {
      // Join
      await supabaseAdmin.from('community_members').insert({ community_id: communityId, user_id: userId, role: 'member' });
      const { data: c } = await supabaseAdmin.from('communities').select('member_count').eq('id', communityId).single();
      if (c) {
        await supabaseAdmin.from('communities').update({ member_count: c.member_count + 1 }).eq('id', communityId);
      }
      return { joined: true };
    }
  },

  /**
   * Projects Showcase
   */
  async listProjects() {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select(
        `
        *,
        profiles:author_id (id, username, display_name, avatar_url)
      `
      )
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((p: any) => ({
      ...p,
      author: p.profiles,
    }));
  },

  async createProject(authorId: string, input: CreateProjectInput) {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert({
        author_id: authorId,
        title: input.title,
        description: input.description,
        cover_url: input.coverUrl || null,
        repo_url: input.repoUrl || null,
        live_demo_url: input.liveDemoUrl || null,
        tech_stack: input.techStack || [],
        feedback_requests: input.feedbackRequests || null,
      })
      .select(
        `
        *,
        profiles:author_id (id, username, display_name, avatar_url)
      `
      )
      .single();

    if (error) throw new Error(error.message);
    return { ...data, author: data.profiles };
  },
};
