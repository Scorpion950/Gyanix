-- ==============================================================================
-- Gyanix Schema Migration 007: Social Feeds, Communities & Project Showcases
-- ==============================================================================

-- 1. Communities Table
CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    banner_url TEXT,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_private BOOLEAN NOT NULL DEFAULT false,
    member_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Community Members
CREATE TABLE IF NOT EXISTS public.community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'member')) DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (community_id, user_id)
);

-- 3. Social Posts (Supports 6 Feeds & Lecture-Linked Doubts)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
    post_type TEXT NOT NULL CHECK (post_type IN ('thought', 'doubt', 'project', 'resource', 'milestone')) DEFAULT 'thought',
    title TEXT,
    content TEXT NOT NULL,
    code_snippet TEXT,
    lecture_item_id UUID REFERENCES public.path_items(id) ON DELETE SET NULL,
    timestamp_seconds INTEGER,
    tags TEXT[] NOT NULL DEFAULT '{}',
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    moderation_status TEXT NOT NULL CHECK (moderation_status IN ('approved', 'flagged', 'removed')) DEFAULT 'approved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Post Likes
CREATE TABLE IF NOT EXISTS public.post_likes (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- 5. Comments & Nested Replies
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp_seconds INTEGER,
    is_doubt_answer BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Content Moderation Reports (One-Report-Per-User Constraint)
CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'misinformation', 'other')),
    details TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'resolved', 'dismissed')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (reporter_id, target_type, target_id)
);

-- 7. Project Showcases
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    cover_url TEXT,
    repo_url TEXT,
    live_demo_url TEXT,
    tech_stack TEXT[] NOT NULL DEFAULT '{}',
    feedback_requests TEXT,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_type_time ON public.posts(post_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_community ON public.posts(community_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments(post_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_projects_author ON public.projects(author_id);

-- Enable RLS
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read communities" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Auth users insert communities" ON public.communities FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Community creator updates" ON public.communities FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Public read community members" ON public.community_members FOR SELECT USING (true);
CREATE POLICY "Users manage own community membership" ON public.community_members FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read approved posts" ON public.posts FOR SELECT USING (moderation_status = 'approved');
CREATE POLICY "Users create own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update own posts" ON public.posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors delete own posts" ON public.posts FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Public read post likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users toggle own likes" ON public.post_likes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update own comments" ON public.comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors delete own comments" ON public.comments FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Users create reports" ON public.content_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users view own reports" ON public.content_reports FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Public read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Authors manage own projects" ON public.projects FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- Seed Initial High-Quality Communities
INSERT INTO public.communities (id, slug, name, description, is_private, member_count, creator_id)
SELECT
    'c0000000-0000-0000-0000-000000000001'::uuid,
    'systems-and-rust',
    'Systems Engineering & Rust',
    'Low-level systems programming, memory safety, compilers, OS design, and high-performance Rust.',
    false,
    42,
    id
FROM auth.users LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (id, slug, name, description, is_private, member_count, creator_id)
SELECT
    'c0000000-0000-0000-0000-000000000002'::uuid,
    'frontend-craft',
    'Frontend & UI Engineering',
    'Modern web application architecture, React 19, CSS systems, animations, accessibility, and design engineering.',
    false,
    88,
    id
FROM auth.users LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (id, slug, name, description, is_private, member_count, creator_id)
SELECT
    'c0000000-0000-0000-0000-000000000003'::uuid,
    'distributed-cloud',
    'Distributed Systems & Cloud',
    'Consensus algorithms, microservices, Kubernetes, message queues, and high-scale backend design.',
    false,
    65,
    id
FROM auth.users LIMIT 1
ON CONFLICT (slug) DO NOTHING;
