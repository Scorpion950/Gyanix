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

