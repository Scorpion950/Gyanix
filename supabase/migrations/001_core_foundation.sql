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
