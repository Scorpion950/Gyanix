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
