-- ==============================================================================
-- Gyanix Schema Migration 009: Watch Together, Study Rooms & Whiteboards
-- ==============================================================================

-- 1. Study Rooms Table (Synchronized YouTube + WebRTC Mesh + Whiteboard)
CREATE TABLE IF NOT EXISTS public.study_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    topic TEXT NOT NULL,
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    max_participants INTEGER NOT NULL DEFAULT 6,
    current_video_url TEXT,
    current_timestamp_seconds INTEGER NOT NULL DEFAULT 0,
    is_video_playing BOOLEAN NOT NULL DEFAULT false,
    is_private BOOLEAN NOT NULL DEFAULT false,
    access_code TEXT,
    whiteboard_data JSONB NOT NULL DEFAULT '{"elements": []}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Room Participants
CREATE TABLE IF NOT EXISTS public.room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_muted BOOLEAN NOT NULL DEFAULT false,
    is_video_on BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (room_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_study_rooms_active ON public.study_rooms(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON public.room_participants(room_id);

-- Enable RLS
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read active study rooms"
    ON public.study_rooms FOR SELECT
    USING (is_active = true);

CREATE POLICY "Auth users create study rooms"
    ON public.study_rooms FOR INSERT
    WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host updates study room"
    ON public.study_rooms FOR UPDATE
    USING (auth.uid() = host_id);

CREATE POLICY "Public read room participants"
    ON public.room_participants FOR SELECT
    USING (true);

CREATE POLICY "Users manage own room presence"
    ON public.room_participants FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Seed Initial Active Study Rooms
INSERT INTO public.study_rooms (name, topic, host_id, current_video_url, is_video_playing, max_participants)
SELECT
    'Late Night LeetCode & Systems Discussion',
    'Distributed Consensus (Raft & Paxos)',
    id,
    'https://www.youtube.com/watch?v=vYp4LYbnnW8',
    false,
    6
FROM auth.users LIMIT 1
ON CONFLICT DO NOTHING;

