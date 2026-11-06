-- ==============================================================================
-- Gyanix Schema Migration 006: Coding Environment & Practice Tracker
-- ==============================================================================

-- 1. Coding Problems table
CREATE TABLE IF NOT EXISTS public.coding_problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    category TEXT NOT NULL DEFAULT 'algorithms',
    starter_templates JSONB NOT NULL DEFAULT '{}'::jsonb,
    test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
    hints JSONB NOT NULL DEFAULT '[]'::jsonb,
    solution_guide TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. User Practice Tracker (Tracking both built-in and external problems like LeetCode)
CREATE TABLE IF NOT EXISTS public.practice_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    problem_id UUID REFERENCES public.coding_problems(id) ON DELETE SET NULL,
    external_url TEXT,
    title TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'Gyanix',
    category TEXT NOT NULL DEFAULT 'General',
    difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    status TEXT NOT NULL CHECK (status IN ('solved', 'attempted', 'revisit', 'unsolved')),
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    solution_notes TEXT,
    language TEXT NOT NULL DEFAULT 'javascript',
    last_practiced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Code Submissions & Run History
CREATE TABLE IF NOT EXISTS public.coding_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    problem_id UUID REFERENCES public.coding_problems(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'error', 'timeout')),
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    passed_tests INTEGER NOT NULL DEFAULT 0,
    total_tests INTEGER NOT NULL DEFAULT 0,
    stdout TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Reusable Code Snippets / Playgrounds
CREATE TABLE IF NOT EXISTS public.code_snippets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Snippet',
    language TEXT NOT NULL DEFAULT 'javascript',
    code TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_practice_user_status ON public.practice_entries(user_id, status);
CREATE INDEX IF NOT EXISTS idx_coding_problems_cat ON public.coding_problems(category, difficulty);
CREATE INDEX IF NOT EXISTS idx_submissions_user_prob ON public.coding_submissions(user_id, problem_id);
CREATE INDEX IF NOT EXISTS idx_snippets_user ON public.code_snippets(user_id);

-- Enable RLS
ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_snippets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Coding problems: readable by all authenticated users
CREATE POLICY "Public read published coding problems"
    ON public.coding_problems FOR SELECT
    USING (is_published = true);

-- Practice entries: isolated to owner
CREATE POLICY "Users manage own practice entries"
    ON public.practice_entries FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Submissions: users view and create own submissions
CREATE POLICY "Users manage own submissions"
    ON public.coding_submissions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Code snippets: owners have full access, public snippets are readable
CREATE POLICY "Users manage own code snippets"
    ON public.code_snippets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public snippets viewable"
    ON public.code_snippets FOR SELECT
    USING (is_public = true);

-- Seed Initial High-Quality Coding Problems
INSERT INTO public.coding_problems (title, slug, description, difficulty, category, starter_templates, test_cases, hints, solution_guide)
VALUES
(
    'Two Sum Problem',
    'two-sum',
    'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
    1,
    'algorithms',
    '{"javascript": "function twoSum(nums, target) {\n  // Your implementation here\n  return [];\n}"}'::jsonb,
    '[{"input": "[[2,7,11,15], 9]", "expected": "[0,1]"}, {"input": "[[3,2,4], 6]", "expected": "[1,2]"}]'::jsonb,
    '["Can you use a hash map to store complements in O(N) time?", "Check if target - current exists in map before storing."]'::jsonb,
    'Store each element and its index in a hash map as you iterate through nums. For each element x, compute complement = target - x. If complement is in the map, return [map[complement], currentIndex].'
),
(
    'Valid Parentheses & Brace Balancer',
    'valid-parentheses',
    'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if open brackets are closed by the same type of brackets in the correct order.',
    2,
    'data-structures',
    '{"javascript": "function isValid(s) {\n  // Use a stack to track open brackets\n  return false;\n}"}'::jsonb,
    '[{"input": "()[]{}", "expected": "true"}, {"input": "(]", "expected": "false"}, {"input": "([{}])", "expected": "true"}]'::jsonb,
    '["Push open brackets onto a stack.", "When encountering a closing bracket, check if it matches the stack top."]'::jsonb,
    'Maintain a LIFO stack. Iterate over the string: push open brackets; for closing brackets, pop top and verify match. If stack is empty at the end, the string is balanced.'
),
(
    'Concurrency Rate Limiter Token Bucket',
    'rate-limiter-token-bucket',
    'Implement a token bucket rate limiter in JavaScript. The class `TokenBucket` should support `constructor(capacity, refillRatePerSec)` and `take(tokens)` which returns `true` if allowed or `false` if rejected.',
    3,
    'system-design',
    '{"javascript": "class TokenBucket {\n  constructor(capacity, refillRatePerSec) {\n    this.capacity = capacity;\n    this.refillRate = refillRatePerSec;\n    this.tokens = capacity;\n    this.lastRefill = Date.now();\n  }\n\n  take(tokens = 1) {\n    // Implement lazy refill and check\n    return true;\n  }\n}"}'::jsonb,
    '[{"input": "take 1 token within capacity", "expected": "true"}]'::jsonb,
    '["Compute elapsed time since last refill and add elapsed * refillRate tokens.", "Cap current tokens at bucket capacity before deducting."]'::jsonb,
    'Lazy refill calculates tokens added = (now - lastRefill) * refillRate / 1000. Clamp tokens to min(capacity, current + added). Deduct requested tokens if available and update lastRefill timestamp.'
)
ON CONFLICT (slug) DO NOTHING;

