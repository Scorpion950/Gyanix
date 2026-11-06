-- ==============================================================================
-- Gyanix Schema Migration 010: Universal Search & Learning Challenges
-- ==============================================================================

-- 1. Learning Challenges Table (7-Day & 30-Day Cohort Sprints)
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 14, 30, 100)),
    badge_icon TEXT NOT NULL DEFAULT 'trophy',
    category TEXT NOT NULL DEFAULT 'programming',
    participant_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Challenge Participants & Progress
CREATE TABLE IF NOT EXISTS public.challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_day INTEGER NOT NULL DEFAULT 1,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE (challenge_id, user_id)
);

-- 3. Challenge Daily Logs
CREATE TABLE IF NOT EXISTS public.challenge_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES public.challenge_participants(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    notes TEXT NOT NULL,
    proof_url TEXT,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (participant_id, day_number)
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_daily_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read challenges" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Users view own challenge participation" ON public.challenge_participants FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own daily logs" ON public.challenge_daily_logs FOR ALL
    USING (EXISTS (SELECT 1 FROM public.challenge_participants cp WHERE cp.id = participant_id AND cp.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.challenge_participants cp WHERE cp.id = participant_id AND cp.user_id = auth.uid()));

-- Seed Initial High-Value Challenges
INSERT INTO public.challenges (slug, title, description, duration_days, badge_icon, category)
VALUES
(
    '7-days-concurrency',
    '7 Days of Concurrency & Multithreading',
    'Master goroutines, channels, mutexes, atomic operations, and memory barriers across 7 focused daily deep-dives.',
    7,
    'zap',
    'systems'
),
(
    '30-days-algorithms',
    '30 Days of LeetCode & Algorithmic Patterns',
    'A disciplined 30-day practice sprint covering Sliding Window, Two Pointers, Dynamic Programming, Graphs, and Heaps.',
    30,
    'trophy',
    'algorithms'
),
(
    '7-days-frontend-architecture',
    '7 Days of Frontend Architecture & Internals',
    'Deconstruct the React reconciliation engine, custom hooks state machines, Web Workers, and rendering performance.',
    7,
    'flame',
    'frontend'
)
ON CONFLICT (slug) DO NOTHING;

