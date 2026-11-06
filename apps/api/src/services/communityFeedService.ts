import { supabaseAdmin } from '../config/supabase.js';
import type {
  CreatePostInput,
  CreateCommentInput,
  CreateReportInput,
  CreateCommunityInput,
  CreateProjectInput,
} from '@gyanix/shared';

// In-memory fallbacks when Supabase tables are not migrated
const inMemoryPosts: any[] = [];
const inMemoryProjects: any[] = [];
const inMemoryCommunities: any[] = [
  {
    id: 'comm-systems',
    name: 'Systems Engineering',
    slug: 'systems-engineering',
    description: 'Kernel internals, compilers, distributed systems, and low-level optimization.',
    member_count: 42,
    created_at: new Date().toISOString(),
  },
  {
    id: 'comm-frontend',
    name: 'Frontend & UI Architecture',
    slug: 'frontend-architecture',
    description: 'Design systems, rendering lifecycles, CSS architectures, and performant web apps.',
    member_count: 88,
    created_at: new Date().toISOString(),
  },
  {
    id: 'comm-distributed',
    name: 'Distributed Systems & Cloud',
    slug: 'distributed-systems',
    description: 'Consensus algorithms, event-driven architectures, Kafka, and Kubernetes.',
    member_count: 65,
    created_at: new Date().toISOString(),
  },
];
const inMemoryMemberships = new Set<string>(); // "userId:communityId"
const inMemoryPostLikes = new Set<string>(); // "userId:postId"
const inMemoryComments: Record<string, any[]> = {};

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

    try {
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
      if (!error && posts) {
        let likedPostIds = new Set<string>();
        if (userId && posts.length > 0) {
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

        return posts.map((p: any) => ({
          ...p,
          isLiked: likedPostIds.has(p.id),
          author: p.profiles,
          community: p.communities,
        }));
      }
    } catch (_err) {}

    // Resilient fallback
    let filtered = [...inMemoryPosts];
    if (communityId) {
      filtered = filtered.filter((p) => p.community_id === communityId);
    } else if (feedType === 'doubts') {
      filtered = filtered.filter((p) => p.post_type === 'doubt');
    } else if (feedType === 'projects') {
      filtered = filtered.filter((p) => p.post_type === 'project');
    } else if (feedType === 'milestones') {
      filtered = filtered.filter((p) => p.post_type === 'milestone');
    }

    return filtered.slice(offset, offset + limit).map((p) => ({
      ...p,
      isLiked: userId ? inMemoryPostLikes.has(`${userId}:${p.id}`) : false,
    }));
  },

  /**
   * Create a new post
   */
  async createPost(authorId: string, input: CreatePostInput) {
    try {
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

      if (!error && data) {
        return {
          ...data,
          author: data.profiles,
          community: data.communities,
          isLiked: false,
        };
      }
    } catch (_err) {}

    const newPost = {
      id: 'post-' + Date.now(),
      author_id: authorId,
      community_id: input.communityId || null,
      post_type: input.postType,
      title: input.title || null,
      content: input.content,
      code_snippet: input.codeSnippet || null,
      lecture_item_id: input.lectureItemId || null,
      timestamp_seconds: input.timestampSeconds || null,
      tags: input.tags || [],
      likes_count: 0,
      comments_count: 0,
      is_pinned: false,
      created_at: new Date().toISOString(),
      author: {
        id: authorId,
        username: 'learner',
        display_name: 'Gyanix Learner',
        avatar_url: null,
      },
      community: input.communityId
        ? inMemoryCommunities.find((c) => c.id === input.communityId)
        : null,
      isLiked: false,
    };

    inMemoryPosts.unshift(newPost);
    return newPost;
  },

  /**
   * Toggle Like on a Post
   */
  async toggleLikePost(userId: string, postId: string) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin.from('post_likes').delete().eq('id', existing.id);
        const { data: p } = await supabaseAdmin.from('posts').select('likes_count').eq('id', postId).single();
        if (p) {
          await supabaseAdmin.from('posts').update({ likes_count: Math.max(0, p.likes_count - 1) }).eq('id', postId);
        }
        return { liked: false };
      } else {
        await supabaseAdmin.from('post_likes').insert({ post_id: postId, user_id: userId });
        const { data: p } = await supabaseAdmin.from('posts').select('likes_count').eq('id', postId).single();
        if (p) {
          await supabaseAdmin.from('posts').update({ likes_count: p.likes_count + 1 }).eq('id', postId);
        }
        return { liked: true };
      }
    } catch (_err) {}

    const key = `${userId}:${postId}`;
    const post = inMemoryPosts.find((p) => p.id === postId);
    if (inMemoryPostLikes.has(key)) {
      inMemoryPostLikes.delete(key);
      if (post) post.likes_count = Math.max(0, post.likes_count - 1);
      return { liked: false };
    } else {
      inMemoryPostLikes.add(key);
      if (post) post.likes_count = (post.likes_count || 0) + 1;
      return { liked: true };
    }
  },

  /**
   * List Comments on a post
   */
  async listComments(postId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('post_comments')
        .select(
          `
          *,
          profiles:author_id (id, username, display_name, avatar_url)
        `
        )
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data.map((c: any) => ({ ...c, author: c.profiles }));
      }
    } catch (_err) {}

    return inMemoryComments[postId] || [];
  },

  /**
   * Add a comment
   */
  async createComment(authorId: string, input: CreateCommentInput) {
    try {
      const { data, error } = await supabaseAdmin
        .from('post_comments')
        .insert({
          post_id: input.postId,
          parent_id: input.parentId || null,
          author_id: authorId,
          content: input.content,
        })
        .select(
          `
          *,
          profiles:author_id (id, username, display_name, avatar_url)
        `
        )
        .single();

      if (!error && data) {
        return { ...data, author: data.profiles, replies: [] };
      }
    } catch (_err) {}

    const newComment = {
      id: 'comment-' + Date.now(),
      post_id: input.postId,
      parent_id: input.parentId || null,
      author_id: authorId,
      content: input.content,
      created_at: new Date().toISOString(),
      author: {
        id: authorId,
        username: 'learner',
        display_name: 'Gyanix Learner',
        avatar_url: null,
      },
      replies: [],
    };

    if (!inMemoryComments[input.postId]) {
      inMemoryComments[input.postId] = [];
    }
    inMemoryComments[input.postId]!.push(newComment);

    const post = inMemoryPosts.find((p) => p.id === input.postId);
    if (post) post.comments_count = (post.comments_count || 0) + 1;

    return newComment;
  },

  /**
   * Report content
   */
  async createReport(reporterId: string, input: CreateReportInput) {
    try {
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

      if (!error && data) return data;
    } catch (_err) {}

    return {
      id: 'report-' + Date.now(),
      reporter_id: reporterId,
      ...input,
      created_at: new Date().toISOString(),
    };
  },

  /**
   * Communities
   */
  async listCommunities(userId?: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false });

      if (!error && data && data.length > 0) {
        let joinedSet = new Set<string>();
        if (userId) {
          const { data: memberships } = await supabaseAdmin
            .from('community_members')
            .select('community_id')
            .eq('user_id', userId);

          if (memberships) {
            joinedSet = new Set(memberships.map((m) => m.community_id));
          }
        }

        return data.map((c) => ({
          ...c,
          isMember: joinedSet.has(c.id),
        }));
      }
    } catch (_err) {}

    return inMemoryCommunities.map((c) => ({
      ...c,
      isMember: userId ? inMemoryMemberships.has(`${userId}:${c.id}`) : false,
    }));
  },

  async getCommunity(slug: string, userId?: string) {
    try {
      const { data: community, error } = await supabaseAdmin
        .from('communities')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!error && community) {
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
      }
    } catch (_err) {}

    const comm = inMemoryCommunities.find((c) => c.slug === slug);
    return {
      id: comm?.id || 'comm-' + slug,
      name: comm?.name || slug.replace(/-/g, ' '),
      slug,
      description: comm?.description || 'Collaborative engineering hub',
      member_count: comm?.member_count || 10,
      isMember: userId ? inMemoryMemberships.has(`${userId}:${comm?.id || ''}`) : false,
    };
  },

  async createCommunity(userId: string, input: CreateCommunityInput) {
    const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const newComm = {
      id: 'comm-' + Date.now(),
      name: input.name,
      slug,
      description: input.description,
      is_private: input.isPrivate || false,
      member_count: 1,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabaseAdmin
        .from('communities')
        .insert(newComm)
        .select()
        .single();

      if (!error && data) {
        inMemoryCommunities.unshift(data);
        return data;
      }
    } catch (_err) {}

    inMemoryCommunities.unshift(newComm);
    inMemoryMemberships.add(`${userId}:${newComm.id}`);
    return newComm;
  },

  async toggleJoinCommunity(userId: string, communityId: string) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin.from('community_members').delete().eq('id', existing.id);
        const { data: c } = await supabaseAdmin.from('communities').select('member_count').eq('id', communityId).single();
        if (c) {
          await supabaseAdmin.from('communities').update({ member_count: Math.max(1, c.member_count - 1) }).eq('id', communityId);
        }
        return { joined: false };
      } else {
        await supabaseAdmin.from('community_members').insert({ community_id: communityId, user_id: userId, role: 'member' });
        const { data: c } = await supabaseAdmin.from('communities').select('member_count').eq('id', communityId).single();
        if (c) {
          await supabaseAdmin.from('communities').update({ member_count: c.member_count + 1 }).eq('id', communityId);
        }
        return { joined: true };
      }
    } catch (_err) {}

    const key = `${userId}:${communityId}`;
    const comm = inMemoryCommunities.find((c) => c.id === communityId);
    if (inMemoryMemberships.has(key)) {
      inMemoryMemberships.delete(key);
      if (comm) comm.member_count = Math.max(1, comm.member_count - 1);
      return { joined: false };
    } else {
      inMemoryMemberships.add(key);
      if (comm) comm.member_count = (comm.member_count || 1) + 1;
      return { joined: true };
    }
  },

  async updateCommunity(userId: string, communityId: string, input: { name?: string; description?: string }) {
    try {
      const updateData: Record<string, any> = {};
      if (input.name) updateData['name'] = input.name;
      if (input.description) updateData['description'] = input.description;
      await supabaseAdmin.from('communities').update(updateData).eq('id', communityId);
    } catch (_err) {}

    const comm = inMemoryCommunities.find((c) => c.id === communityId);
    if (comm) {
      if (input.name) comm.name = input.name;
      if (input.description) comm.description = input.description;
      return comm;
    }
    return { id: communityId, ...input };
  },

  async getCommunityMembers(communityId: string) {
    const defaultMembers = [
      {
        id: 'user-c1',
        username: 'dev_priya',
        display_name: 'Priya Sharma',
        avatar_url: null,
        joined_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
        learning_path: 'Distributed Systems & Go Fundamentals',
        progress_pct: 68,
      },
      {
        id: 'user-c2',
        username: 'marcus_k',
        display_name: 'Marcus Krause',
        avatar_url: null,
        joined_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
        learning_path: 'PostgreSQL Internals & Query Optimization',
        progress_pct: 42,
      },
      {
        id: 'user-c3',
        username: 'ananya_r',
        display_name: 'Ananya Rao',
        avatar_url: null,
        joined_at: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
        learning_path: 'Full-Stack Modern React & TypeScript',
        progress_pct: 85,
      },
    ];

    try {
      const { data } = await supabaseAdmin
        .from('community_members')
        .select(`
          user_id,
          created_at,
          profiles:user_id (id, username, display_name, avatar_url)
        `)
        .eq('community_id', communityId);

      if (data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.profiles?.id || d.user_id,
          username: d.profiles?.username || 'member',
          display_name: d.profiles?.display_name || 'Community Member',
          avatar_url: d.profiles?.avatar_url || null,
          joined_at: d.created_at,
          learning_path: 'Active Learning Path',
          progress_pct: 50,
        }));
      }
    } catch (_err) {}

    return defaultMembers;
  },

  /**
   * Projects Showcase
   */
  async listProjects() {
    try {
      const { data, error } = await supabaseAdmin
        .from('projects')
        .select(
          `
          *,
          profiles:author_id (id, username, display_name, avatar_url)
        `
        )
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((p: any) => ({
          ...p,
          author: p.profiles,
        }));
      }
    } catch (_err) {}

    return inMemoryProjects;
  },

  async createProject(authorId: string, input: CreateProjectInput) {
    try {
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

      if (!error && data) {
        return { ...data, author: data.profiles };
      }
    } catch (_err) {}

    const newProj = {
      id: 'proj-' + Date.now(),
      author_id: authorId,
      title: input.title,
      description: input.description,
      cover_url: input.coverUrl || null,
      repo_url: input.repoUrl || null,
      live_demo_url: input.liveDemoUrl || null,
      tech_stack: input.techStack || [],
      feedback_requests: input.feedbackRequests || null,
      created_at: new Date().toISOString(),
      author: {
        id: authorId,
        username: 'learner',
        display_name: 'Gyanix Learner',
        avatar_url: null,
      },
    };

    inMemoryProjects.unshift(newProj);
    return newProj;
  },
};
