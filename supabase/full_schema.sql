-- ============================================================
-- Migration 001: Core Foundation — Phase 1A
-- Gyanix — AI-Powered Social & Collaborative Learning Platform
-- Created: 2026-11-06
-- ============================================================
-- Run order: 001 → 002 → ...
-- Apply with: supabase db push  OR  psql < supabase/migrations/001_core_foundation.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";       -- case-insensitive text
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- password hashing helpers

-- ─── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'moderator');
CREATE TYPE audit_action_type AS ENUM (
  -- Auth
  'user_created', 'user_deleted', 'user_deactivated', 'user_reactivated',
  'password_changed', 'email_changed', 'mfa_enabled', 'mfa_disabled',
  -- Roles
  'role_granted', 'role_revoked',
  -- AI config (Phase 10)
  'ai_provider_updated', 'ai_key_rotated',
  -- Moderation
  'post_hidden', 'post_restored', 'user_suspended', 'user_unsuspended',
  'user_banned', 'user_unbanned',
  -- Admin
  'admin_action'
);

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- References Supabase auth.users. Created automatically on signup via trigger.

CREATE TABLE profiles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username         CITEXT NOT NULL UNIQUE,
  display_name     TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60),
  bio              TEXT CHECK (char_length(bio) <= 500),
  avatar_url       TEXT,
  profession       TEXT,
  github_url       TEXT,
  website_url      TEXT,
  location         TEXT CHECK (char_length(location) <= 100),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  -- Learning preferences (stored here for fast access on dashboard)
  daily_goal_minutes INTEGER NOT NULL DEFAULT 30 CHECK (daily_goal_minutes BETWEEN 5 AND 480),
  preferred_session_length TEXT NOT NULL DEFAULT 'medium' CHECK (preferred_session_length IN ('short', 'medium', 'long')),
  learning_style   TEXT NOT NULL DEFAULT 'mixed' CHECK (learning_style IN ('visual', 'reading', 'hands_on', 'mixed')),
  -- Timestamps
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Soft constraints
  CONSTRAINT username_length CHECK (char_length(username::text) BETWEEN 3 AND 30),
  CONSTRAINT username_format CHECK (username::text ~ '^[a-zA-Z0-9_-]+$')
);

-- Index for case-insensitive username lookup
CREATE INDEX idx_profiles_username ON profiles USING btree (username);
-- Index for auth_user_id lookups (every authenticated request)
CREATE INDEX idx_profiles_auth_user_id ON profiles (auth_user_id);
-- Full-text search on profiles
CREATE INDEX idx_profiles_fts ON profiles USING gin (
  to_tsvector('english', coalesce(display_name, '') || ' ' || coalesce(username::text, '') || ' ' || coalesce(bio, ''))
);

-- ─── Roles ───────────────────────────────────────────────────────────────────
-- Server-controlled roles. NEVER base authorisation on user_metadata.

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  granted_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX idx_roles_user_id ON roles (user_id);

-- ─── Audit Logs ──────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  ip_hash     TEXT,            -- hashed, not raw IP
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs are append-only. No updates or deletes via RLS.
CREATE INDEX idx_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);

-- ─── Notifications (core service — Phase 1B, table created now) ──────────────

CREATE TYPE notification_type AS ENUM (
  'friend_request', 'friend_accepted', 'new_follower',
  'new_message', 'mention', 'reply', 'doubt_discussion',
  'friend_completed_course', 'friend_joined_room',
  'achievement_earned', 'ai_suggestion', 'learning_reminder',
  'incomplete_lecture', 'system'
);

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         notification_type NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT,
  action_url   TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  is_read      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id_unread ON notifications (user_id, is_read, created_at DESC);

-- ─── Updated-at trigger function ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Auto-create profile on signup ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  base_username  TEXT;
  final_username TEXT;
  counter        INTEGER := 0;
BEGIN
  -- Derive a base username from email or provider metadata
  base_username := lower(
    regexp_replace(
      coalesce(
        NEW.raw_user_meta_data->>'preferred_username',
        NEW.raw_user_meta_data->>'user_name',
        split_part(NEW.email, '@', 1)
      ),
      '[^a-zA-Z0-9_-]', '_', 'g'
    )
  );
  -- Ensure minimum length
  IF char_length(base_username) < 3 THEN
    base_username := base_username || '_user';
  END IF;
  -- Truncate to 25 chars (leaving room for suffix)
  base_username := left(base_username, 25);
  final_username := base_username;

  -- Make username unique
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username::citext) LOOP
    counter := counter + 1;
    final_username := base_username || '_' || counter;
  END LOOP;

  INSERT INTO profiles (auth_user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    final_username::citext,
    coalesce(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      final_username
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- profiles: anyone can read active profiles (public by default)
CREATE POLICY "profiles_select_active"
  ON profiles FOR SELECT
  USING (is_active = true);

-- profiles: users can update their own profile only
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- roles: only admins can read roles (checked server-side; RLS is a defence in depth)
CREATE POLICY "roles_select_admin"
  ON roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM roles r2
      WHERE r2.user_id = auth.uid() AND r2.role = 'admin'
    )
  );

-- roles: only the backend service role can insert/update/delete roles
-- (Service role bypasses RLS — this policy denies direct user access)
CREATE POLICY "roles_no_direct_user_write"
  ON roles FOR ALL
  USING (false)
  WITH CHECK (false);

-- audit_logs: only admins can read; nobody can write directly (service role only)
CREATE POLICY "audit_logs_select_admin"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.user_id = auth.uid() AND r.role = 'admin'
    )
  );

CREATE POLICY "audit_logs_no_direct_write"
  ON audit_logs FOR INSERT
  WITH CHECK (false);

-- notifications: users see only their own
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
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

-- ============================================================
-- Migration 003: Learning Management & YouTube Integration — Phase 2
-- Gyanix — AI-Powered Social & Collaborative Learning Platform
-- Created: 2026-11-06
-- ============================================================

-- ─── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE path_visibility_type AS ENUM ('private', 'public', 'friends');
CREATE TYPE lecture_status_type AS ENUM (
  'not_started',
  'watching',
  'completed',
  'on_hold',
  'skipped'
);

-- ─── Videos Table (Shared YouTube metadata cache) ───────────────────────────
-- Videos exist independently from learning paths. Multiple paths can reference
-- the same video. Allows video replacement & unavailable handling cleanly.

CREATE TABLE videos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_video_id    TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  channel_title       TEXT NOT NULL,
  thumbnail_url       TEXT,
  duration_seconds    INTEGER NOT NULL DEFAULT 0,
  is_available        BOOLEAN NOT NULL DEFAULT true,
  last_refreshed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_metadata        JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_videos_youtube_id ON videos (youtube_video_id);
CREATE INDEX idx_videos_available ON videos (is_available);

-- ─── Learning Paths Table ────────────────────────────────────────────────────

CREATE TABLE learning_paths (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 150),
  description     TEXT CHECK (char_length(description) <= 2000),
  cover_url       TEXT,
  visibility      path_visibility_type NOT NULL DEFAULT 'private',
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  fork_from_id    UUID REFERENCES learning_paths(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_paths_creator ON learning_paths (creator_id);
CREATE INDEX idx_learning_paths_visibility ON learning_paths (visibility);
CREATE INDEX idx_learning_paths_fts ON learning_paths USING gin (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

CREATE TRIGGER learning_paths_updated_at
  BEFORE UPDATE ON learning_paths
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Path Folders Table (Nested folders support) ─────────────────────────────

CREATE TABLE path_folders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path_id           UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  parent_folder_id  UUID REFERENCES path_folders(id) ON DELETE CASCADE,
  title             TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  position          INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_path_folders_path ON path_folders (path_id, position);
CREATE INDEX idx_path_folders_parent ON path_folders (parent_folder_id);

CREATE TRIGGER path_folders_updated_at
  BEFORE UPDATE ON path_folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Path Items Table (Lectures placed inside folders/paths) ─────────────────

CREATE TABLE path_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path_id       UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  folder_id     UUID REFERENCES path_folders(id) ON DELETE CASCADE,
  video_id      UUID NOT NULL REFERENCES videos(id) ON DELETE RESTRICT,
  custom_title  TEXT,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_path_items_path_folder ON path_items (path_id, folder_id, position);
CREATE INDEX idx_path_items_video ON path_items (video_id);

CREATE TRIGGER path_items_updated_at
  BEFORE UPDATE ON path_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── User Lecture Progress Table ─────────────────────────────────────────────
-- Per-user, per-path-item progress tracking

CREATE TABLE user_lecture_progress (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_item_id         UUID NOT NULL REFERENCES path_items(id) ON DELETE CASCADE,
  status               lecture_status_type NOT NULL DEFAULT 'not_started',
  playback_seconds     INTEGER NOT NULL DEFAULT 0,
  skip_reason          TEXT,
  post_lecture_remark  TEXT,
  completed_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, path_item_id)
);

CREATE INDEX idx_user_lecture_progress ON user_lecture_progress (user_id, path_item_id, status);

CREATE TRIGGER user_lecture_progress_updated_at
  BEFORE UPDATE ON user_lecture_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── User Path Progress Summary (Denormalised for instant dashboard load) ────

CREATE TABLE user_path_progress (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_id              UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  completed_lectures   INTEGER NOT NULL DEFAULT 0,
  total_lectures       INTEGER NOT NULL DEFAULT 0,
  progress_percent     INTEGER NOT NULL DEFAULT 0,
  last_watched_item_id UUID REFERENCES path_items(id) ON DELETE SET NULL,
  last_activity_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, path_id)
);

CREATE INDEX idx_user_path_progress ON user_path_progress (user_id, path_id, last_activity_at DESC);

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE videos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths        ENABLE ROW LEVEL SECURITY;
ALTER TABLE path_folders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE path_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lecture_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_path_progress    ENABLE ROW LEVEL SECURITY;

-- videos: public read for all authenticated users
CREATE POLICY "videos_select_all"
  ON videos FOR SELECT
  USING (true);

-- learning_paths:
-- Creator can always read/update/delete.
-- Public paths can be read by anyone.
-- Friends paths can be read by friends (via social_relationships).
CREATE POLICY "paths_select_accessible"
  ON learning_paths FOR SELECT
  USING (
    creator_id = auth.uid()
    OR visibility = 'public'
    OR (
      visibility = 'friends'
      AND EXISTS (
        SELECT 1 FROM social_relationships sr
        WHERE sr.user_id = creator_id
          AND sr.target_user_id = auth.uid()
          AND sr.status = 'friends'
      )
    )
  );

CREATE POLICY "paths_insert_own"
  ON learning_paths FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "paths_update_own"
  ON learning_paths FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "paths_delete_own"
  ON learning_paths FOR DELETE
  USING (creator_id = auth.uid());

-- path_folders: readable if parent path is accessible
CREATE POLICY "folders_select_path_accessible"
  ON path_folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM learning_paths p
      WHERE p.id = path_folders.path_id
        AND (
          p.creator_id = auth.uid()
          OR p.visibility = 'public'
          OR (
            p.visibility = 'friends'
            AND EXISTS (
              SELECT 1 FROM social_relationships sr
              WHERE sr.user_id = p.creator_id
                AND sr.target_user_id = auth.uid()
                AND sr.status = 'friends'
            )
          )
        )
    )
  );

CREATE POLICY "folders_modify_own"
  ON path_folders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM learning_paths p
      WHERE p.id = path_folders.path_id AND p.creator_id = auth.uid()
    )
  );

-- path_items: readable if parent path is accessible
CREATE POLICY "items_select_path_accessible"
  ON path_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM learning_paths p
      WHERE p.id = path_items.path_id
        AND (
          p.creator_id = auth.uid()
          OR p.visibility = 'public'
          OR (
            p.visibility = 'friends'
            AND EXISTS (
              SELECT 1 FROM social_relationships sr
              WHERE sr.user_id = p.creator_id
                AND sr.target_user_id = auth.uid()
                AND sr.status = 'friends'
            )
          )
        )
    )
  );

CREATE POLICY "items_modify_own"
  ON path_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM learning_paths p
      WHERE p.id = path_items.path_id AND p.creator_id = auth.uid()
    )
  );

-- user_lecture_progress: user can read/write their own
CREATE POLICY "lecture_progress_own"
  ON user_lecture_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_path_progress: user can read/write their own
CREATE POLICY "path_progress_own"
  ON user_path_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Migration 004: Notes, Sessions, Analytics & Achievements — Phase 3
-- Gyanix — AI-Powered Social & Collaborative Learning Platform
-- Created: 2026-11-06
-- ============================================================

-- ─── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE note_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE achievement_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- ─── Notes Collections Table ────────────────────────────────────────────────

CREATE TABLE notes_collections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  description   TEXT,
  color         TEXT DEFAULT '#2563EB',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_collections_user ON notes_collections (user_id);

CREATE TRIGGER notes_collections_updated_at
  BEFORE UPDATE ON notes_collections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Notes Table ────────────────────────────────────────────────────────────

CREATE TABLE notes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id     UUID REFERENCES notes_collections(id) ON DELETE SET NULL,
  path_id           UUID REFERENCES learning_paths(id) ON DELETE SET NULL,
  path_item_id      UUID REFERENCES path_items(id) ON DELETE SET NULL,
  timestamp_seconds INTEGER,
  title             TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  content_markdown  TEXT NOT NULL DEFAULT '',
  priority          note_priority NOT NULL DEFAULT 'medium',
  deadline_at       TIMESTAMPTZ,
  is_pinned         BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_user_item ON notes (user_id, path_item_id);
CREATE INDEX idx_notes_collection ON notes (collection_id);
CREATE INDEX idx_notes_fts ON notes USING gin (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_markdown, ''))
);

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Learning Sessions Table (Server-validated active tracking) ─────────────

CREATE TABLE learning_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_item_id      UUID REFERENCES path_items(id) ON DELETE SET NULL,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  duration_seconds  INTEGER NOT NULL DEFAULT 0,
  heartbeat_count   INTEGER NOT NULL DEFAULT 1,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active         BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_sessions_user_active ON learning_sessions (user_id, is_active);

-- ─── Daily Learning Rollup Table ────────────────────────────────────────────

CREATE TABLE daily_learning_rollups (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  total_seconds         INTEGER NOT NULL DEFAULT 0,
  lectures_completed    INTEGER NOT NULL DEFAULT 0,
  notes_created         INTEGER NOT NULL DEFAULT 0,
  pomodoros_completed   INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX idx_rollups_user_date ON daily_learning_rollups (user_id, date DESC);

-- ─── Achievements & Badges ──────────────────────────────────────────────────

CREATE TABLE achievements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  icon_name     TEXT NOT NULL DEFAULT 'Trophy',
  badge_tier    achievement_tier NOT NULL DEFAULT 'bronze',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_achievements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements ON user_achievements (user_id, unlocked_at DESC);

-- Seed core achievements
INSERT INTO achievements (code, title, description, icon_name, badge_tier) VALUES
  ('first_lecture', 'First Steps', 'Completed your very first video lecture on Gyanix.', 'Play', 'bronze'),
  ('streak_3', 'Consistency Spark', 'Maintained a 3-day learning streak.', 'Flame', 'bronze'),
  ('streak_7', 'Unstoppable Habit', 'Maintained a 7-day learning streak.', 'Flame', 'silver'),
  ('note_taker', 'Diligent Scribe', 'Created 10 timestamp-linked lecture notes.', 'FileText', 'bronze'),
  ('path_finisher', 'Course Finisher', 'Completed 100% of a structured Learning Path.', 'Award', 'gold'),
  ('deep_focus', 'Deep Work Master', 'Completed 5 Pomodoro focus sessions in a single day.', 'Clock', 'silver')
ON CONFLICT (code) DO NOTHING;

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE notes_collections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_learning_rollups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_own" ON notes_collections FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notes_own" ON notes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions_own" ON learning_sessions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "rollups_own" ON daily_learning_rollups FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "achievements_read_all" ON achievements FOR SELECT USING (true);
CREATE POLICY "user_achievements_read" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "user_achievements_insert_own" ON user_achievements FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Migration 005: AI Provider Usage & Assessments — Phase 4
-- Gyanix — AI-Powered Social & Collaborative Learning Platform
-- Created: 2026-11-06
-- ============================================================

-- ─── AI Usage Logs (Rate limiting & quota accounting) ───────────────────────

CREATE TABLE ai_usage_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id   TEXT NOT NULL,
  model_id      TEXT NOT NULL,
  feature_name  TEXT NOT NULL,
  tokens_used   INTEGER NOT NULL DEFAULT 0,
  latency_ms    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'success',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_user_date ON ai_usage_logs (user_id, created_at DESC);
CREATE INDEX idx_ai_usage_provider ON ai_usage_logs (provider_id, status);

-- ─── AI-Generated Roadmaps (Approval required before adding to path) ────────

CREATE TABLE ai_roadmaps (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic               TEXT NOT NULL CHECK (char_length(topic) BETWEEN 1 AND 150),
  target_role         TEXT,
  difficulty_level    INTEGER NOT NULL DEFAULT 2 CHECK (difficulty_level BETWEEN 1 AND 5),
  prerequisites       JSONB NOT NULL DEFAULT '[]',
  stages              JSONB NOT NULL DEFAULT '[]',
  suggested_projects  JSONB NOT NULL DEFAULT '[]',
  is_approved         BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_roadmaps_user ON ai_roadmaps (user_id);

-- ─── Assessments (5 difficulty levels, 3 progress metrics) ──────────────────

CREATE TABLE assessments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path_id           UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
  title             TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 150),
  description       TEXT,
  difficulty_level  INTEGER NOT NULL DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5),
  questions         JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessments_path ON assessments (path_id);

-- ─── Assessment Attempts ────────────────────────────────────────────────────

CREATE TABLE assessment_attempts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id     UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  score_percent     INTEGER NOT NULL CHECK (score_percent BETWEEN 0 AND 100),
  learning_score    INTEGER NOT NULL CHECK (learning_score BETWEEN 0 AND 100),
  knowledge_score   INTEGER NOT NULL CHECK (knowledge_score BETWEEN 0 AND 100),
  practical_score   INTEGER NOT NULL CHECK (practical_score BETWEEN 0 AND 100),
  answers           JSONB NOT NULL DEFAULT '{}',
  completed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessment_attempts_user ON assessment_attempts (user_id, completed_at DESC);

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE ai_usage_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_roadmaps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_own" ON ai_usage_logs FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "ai_roadmaps_own" ON ai_roadmaps FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "assessments_read_all" ON assessments FOR SELECT USING (true);
CREATE POLICY "attempts_own" ON assessment_attempts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

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

-- ==============================================================================
-- Gyanix Schema Migration 008: Messaging & Collaborative Learning
-- ==============================================================================

-- 1. Conversations Table (Direct Messages & Study Groups)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')) DEFAULT 'direct',
    title TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Conversation Participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (conversation_id, user_id)
);

-- 3. Messages (With Lecture Timestamp Linking & Code Snippets)
-- Note: No read receipts or typing indicators per student anti-anxiety design rule.
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    code_snippet TEXT,
    lecture_item_id UUID REFERENCES public.path_items(id) ON DELETE SET NULL,
    timestamp_seconds INTEGER,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time ON public.messages(conversation_id, created_at ASC);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view conversations they participate in
CREATE POLICY "Users view own conversations"
    ON public.conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = public.conversations.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users view participants of their conversations"
    ON public.conversation_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = public.conversation_participants.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users create conversation participant records"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid()
    ));

CREATE POLICY "Users read messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users send messages to their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Authors update own messages"
    ON public.messages FOR UPDATE
    USING (auth.uid() = sender_id);

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

-- ==============================================================================
-- Gyanix Schema Migration 011: Admin KPI Analytics & Moderation Workflow
-- ==============================================================================

-- Admin KPI Summary Aggregator Function
CREATE OR REPLACE FUNCTION public.get_admin_kpi_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    v_total_users INTEGER;
    v_active_learners INTEGER;
    v_total_paths INTEGER;
    v_total_submissions INTEGER;
    v_pending_reports INTEGER;
    v_ai_requests INTEGER;
    v_ai_tokens BIGINT;
BEGIN
    -- Check caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Administrator privileges required.';
    END IF;

    SELECT COUNT(*) INTO v_total_users FROM public.profiles;
    SELECT COUNT(DISTINCT user_id) INTO v_active_learners FROM public.learning_sessions WHERE started_at >= NOW() - INTERVAL '7 days';
    SELECT COUNT(*) INTO v_total_paths FROM public.learning_paths;
    SELECT COUNT(*) INTO v_total_submissions FROM public.coding_submissions;
    SELECT COUNT(*) INTO v_pending_reports FROM public.content_reports WHERE status = 'pending';
    SELECT COUNT(*), COALESCE(SUM(tokens_used), 0) INTO v_ai_requests, v_ai_tokens FROM public.ai_usage_logs;

    result := jsonb_build_object(
        'totalUsers', v_total_users,
        'activeLearnersPastWeek', v_active_learners,
        'totalLearningPaths', v_total_paths,
        'totalCodingSubmissions', v_total_submissions,
        'pendingModerationReports', v_pending_reports,
        'totalAIRequests', v_ai_requests,
        'totalAITokens', v_ai_tokens
    );

    RETURN result;
END;
$$;

