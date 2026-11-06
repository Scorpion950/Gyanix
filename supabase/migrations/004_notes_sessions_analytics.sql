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

