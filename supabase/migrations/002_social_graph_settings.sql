-- ============================================================
-- Migration 002: Social Graph, User Settings & Relationships — Phase 1B
-- Gyanix — AI-Powered Social & Collaborative Learning Platform
-- Created: 2026-11-06
-- ============================================================

-- ─── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE relationship_status AS ENUM (
  'friend_pending_sent',     -- user sent a friend request
  'friend_pending_received', -- target user received the request
  'friends',                 -- mutual friendship
  'following',               -- one-way follow
  'blocked'                  -- user blocked the target
);

CREATE TYPE profile_visibility AS ENUM ('public', 'friends_only', 'private');

-- ─── Social Relationships Table ─────────────────────────────────────────────
-- Models friend requests, mutual friendships, one-way follows, and blocks.

CREATE TABLE social_relationships (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status         relationship_status NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Cannot create a relationship with yourself
  CONSTRAINT no_self_relationship CHECK (user_id != target_user_id),
  -- Only one relationship record per directed pair
  UNIQUE (user_id, target_user_id)
);

CREATE INDEX idx_social_user_status ON social_relationships (user_id, status);
CREATE INDEX idx_social_target_user ON social_relationships (target_user_id, status);

CREATE TRIGGER social_relationships_updated_at
  BEFORE UPDATE ON social_relationships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── User Settings Table ─────────────────────────────────────────────────────
-- Privacy controls, AI preferences, notification settings.

CREATE TABLE user_settings (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility       profile_visibility NOT NULL DEFAULT 'public',
  activity_visible         BOOLEAN NOT NULL DEFAULT true,
  learning_paths_visible   BOOLEAN NOT NULL DEFAULT true,
  streaks_visible          BOOLEAN NOT NULL DEFAULT true,
  ai_personalisation       BOOLEAN NOT NULL DEFAULT true,   -- opt-out of AI personalised data use
  email_notifications      BOOLEAN NOT NULL DEFAULT false,  -- opt-in
  unfinished_lecture_reminders BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create default settings on user creation
CREATE OR REPLACE FUNCTION handle_new_user_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_settings();

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE social_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings        ENABLE ROW LEVEL SECURITY;

-- social_relationships: users can read their own relationships
CREATE POLICY "social_select_own"
  ON social_relationships FOR SELECT
  USING (user_id = auth.uid() OR target_user_id = auth.uid());

-- social_relationships: users can insert/update/delete their own side
CREATE POLICY "social_insert_own"
  ON social_relationships FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "social_update_own"
  ON social_relationships FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "social_delete_own"
  ON social_relationships FOR DELETE
  USING (user_id = auth.uid());

-- user_settings: users can read and update their own settings only
CREATE POLICY "settings_select_own"
  ON user_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "settings_update_own"
  ON user_settings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Helper function: is_blocked(user_a, user_b) ─────────────────────────────
-- Returns true if user_a has blocked user_b OR user_b has blocked user_a.
-- Used across RLS policies and backend checks.

CREATE OR REPLACE FUNCTION is_blocked(user_a UUID, user_b UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM social_relationships
    WHERE (
      (user_id = user_a AND target_user_id = user_b AND status = 'blocked')
      OR
      (user_id = user_b AND target_user_id = user_a AND status = 'blocked')
    )
  );
END;
$$;

