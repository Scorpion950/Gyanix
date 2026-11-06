# Gyanix — Master Engineering Specification & Documentation Deliverable

> **AI-Powered Social and Collaborative Learning Platform**  
> **Repository:** [https://github.com/Scorpion950/Gyanix.git](https://github.com/Scorpion950/Gyanix.git)  
> **Status:** Production-Ready • All 10 Progressive Phases Complete  
> **Version:** 1.0.0  
> **Design Specification Compliance:** Strict adherence to Part 0 (UI/UX Design System Specification)  
> **Infrastructure Model:** 100% Free-Tier Architecture (Zero-cost hosting, database, compute & AI)

---

## Executive Summary & System Abstract
Gyanix is a unified collaborative learning ecosystem combining the productivity of Notion, the community energy of Discord, and a structured learning management platform. It directly solves the fundamental limitations of modern self-directed developer education: fragmented tools, passive video consumption, loneliness during study sessions, and lack of active feedback.

---

## Complete 10-Phase Feature Matrix

| Phase | Module | Key Features Implemented | Status |
|---|---|---|---|
| **Phase 1A** | Foundation & Design System | pnpm monorepo, CSS variables, Tailwind theme, Inter/Plus Jakarta Sans/JetBrains Mono fonts, no-FOUC theme switcher, restyled shadcn components, Express API with Helmet/CORS, Supabase schema migration 001. | **Complete** |
| **Phase 1B** | Onboarding & Explore Dashboard | 7-step onboarding stepper (autosaves, skip-anytime), user profiles with social graph (Friend/Follow/Block with privacy restrictions), in-app notification bell, Explore dashboard with Continue Learning hero card, 4-stat strip, and 3 distinct progress bars. | **Complete** |
| **Phase 2** | Learning Management & YouTube | YouTube API v3 integration with zero-quota oEmbed fallback, learning paths CRUD, nested folders & drag reordering, Focus Mode 16:9 player, active timestamp notes, 15-min inactivity check, keyboard shortcuts dialog. | **Complete** |
| **Phase 3** | Notes, Pomodoro & Analytics | 3-pane Notes library, silent autosave, Pomodoro focus timer with circular SVG dial, server-validated capped heartbeats (max 60s), daily learning rollups, habit consistency cards, verified achievements showcase. | **Complete** |
| **Phase 4** | AI Learning System & Assessments | Provider-independent AI adapter (Gemini Flash free tier + mock fallback), privacy filter (PII/token sanitization), lecture-context doubt solver, AI syllabus architect & roadmap generator (with 1-click path approval), 3-metric skill assessments (Learning, Knowledge, Practical). | **Complete** |
| **Phase 5** | Coding Environment & Practice Tracker (MVP) | In-browser sandboxed JavaScript Web Worker execution engine, distraction-free CodeEditor with JetBrains Mono font, Practice Tracker problem ledger (LeetCode/HackerRank sync), progressive 4-step AI coding assistant stepper (error analysis -> edge hint -> approaches -> solution behind confirmation gate). | **Complete** |
| **Phase 6** | Social Feeds, Communities & Projects | 6-stream social feed (All, Following, Communities, Doubts, Projects, Milestones), post composer with timestamp chips & code blocks, 2-level nested comments, 1-report-per-user moderation queue, discoverable topic communities, project showcase with peer feedback. | **Complete** |
| **Phase 7** | Collaborative Messaging | Direct messages & study group chats, lecture-linked doubt cards with clickable timestamp pills (`12:34`), pinned message strip, anti-anxiety guarantee (no read receipts or typing indicators). | **Complete** |
| **Phase 8** | Watch Together, Rooms & Whiteboards | Synchronized YouTube Watch Together player, HTML5 freehand collaborative whiteboard canvas with palette & eraser, WebRTC mesh video/audio strip (up to 6 peers), live in-room chat. | **Complete** |
| **Phase 9** | Universal Search & Challenges | Universal Command Palette (`Ctrl/Cmd+K`) searching across Paths, Problems, Notes, Communities, and Users; 7-day & 30-day cohort learning sprints with daily progress logs and proof URLs. | **Complete** |
| **Phase 10** | Admin Dashboard & Security Audit | Persistent admin strip shell, dense operational KPI cards, content moderation queue with 1-click actions (Dismiss / Remove & Sanction), AI observability & telemetry logs, comprehensive unit & integration tests. | **Complete** |

---

## Database Architecture & Complete Migrations

All migrations reside in `supabase/migrations/`:
1. `001_core_foundation.sql`: `profiles`, `roles`, `audit_logs`, `notifications`, `handle_new_user()` trigger, RLS.
2. `002_social_graph_settings.sql`: `social_relationships`, `user_settings`, `is_blocked()` helper, RLS.
3. `003_learning_paths_youtube.sql`: `videos`, `learning_paths`, `path_folders`, `path_items`, `user_lecture_progress`, `user_path_progress`, RLS.
4. `004_notes_sessions_analytics.sql`: `notes_collections`, `notes`, `learning_sessions`, `daily_learning_rollups`, `achievements`, `user_achievements`, RLS.
5. `005_ai_system_assessments.sql`: `ai_usage_logs`, `ai_roadmaps`, `assessments`, `assessment_attempts`, RLS.
6. `006_coding_environment.sql`: `coding_problems`, `practice_entries`, `coding_submissions`, `code_snippets`, RLS.
7. `007_feeds_communities_moderation.sql`: `communities`, `community_members`, `posts`, `post_likes`, `comments`, `content_reports`, `projects`, RLS.
8. `008_messaging_collaboration.sql`: `conversations`, `conversation_participants`, `messages`, RLS.
9. `009_study_rooms_whiteboard.sql`: `study_rooms`, `room_participants`, RLS.
10. `010_universal_search_challenges.sql`: `challenges`, `challenge_participants`, `challenge_daily_logs`, RLS.
11. `011_admin_kpis_audit.sql`: `get_admin_kpi_summary()` security definer function, audit logging procedures.

---

## API Specification Overview

The Express backend (`apps/api`) exposes the following endpoints (all with Zod validation and JWT auth):

- **Health & Auth:**
  - `GET /api/health`: service status check
  - `GET /api/auth/me`: current authenticated user profile and roles
  - `POST /api/auth/logout`: session revocation
- **Users & Social Graph:**
  - `GET /api/users/check-username/:username`: debounced username availability
  - `GET /api/users/profile`: caller profile
  - `PUT /api/users/profile`: profile updates
  - `POST /api/users/onboarding`: 7-step onboarding save
  - `GET /api/users/:username`: public profile with privacy filtering
  - `POST /api/users/:username/social`: friend/follow/block actions
- **Learning Paths & YouTube:**
  - `GET /api/learning-paths`: list courses (public or personal)
  - `POST /api/learning-paths`: create path
  - `GET /api/learning-paths/:id`: full folder tree and progress
  - `POST /api/learning-paths/:id/folders`: add folder
  - `POST /api/learning-paths/:id/items`: add lecture
  - `POST /api/learning-paths/import-playlist`: zero-quota YouTube playlist importer
  - `POST /api/learning-paths/items/:id/progress`: save video timestamp & completion
- **Notes & Analytics:**
  - `GET /api/notes`: list notes with collection and query filtering
  - `POST /api/notes`: create note with timestamp chip
  - `PATCH /api/notes/:id`: silent autosave
  - `POST /api/analytics/heartbeat`: time tracking with anti-inflation capping (max 60s)
  - `GET /api/analytics/stats`: streaks, daily rollups, achievements
- **AI Services & Assessments:**
  - `POST /api/ai/doubt`: lecture-context doubt solver
  - `POST /api/ai/roadmap`: AI curriculum architect
  - `POST /api/ai/roadmaps/:id/approve`: convert roadmap into learning path
  - `GET /api/ai/assessments`: list assessments
  - `POST /api/ai/assessments/generate`: on-the-fly assessment generation
  - `POST /api/ai/assessments/:id/submit`: calculate Learning, Knowledge, Practical scores
- **Coding Environment:**
  - `GET /api/coding/problems`: problem library
  - `GET /api/coding/problems/:slug`: problem workspace details
  - `POST /api/coding/submit`: record submission & test verification
  - `GET /api/coding/practice`: practice tracker entries
  - `POST /api/coding/practice`: log external LeetCode problem
  - `POST /api/coding/assist`: 4-step progressive AI assistant stepper
- **Social Feeds, Communities & Projects:**
  - `GET /api/feed/posts`: 6-stream feed filter
  - `POST /api/feed/posts`: create post
  - `POST /api/feed/posts/:id/like`: toggle like
  - `GET /api/feed/posts/:id/comments`: list comments
  - `POST /api/feed/posts/:id/comments`: add comment / reply
  - `POST /api/feed/reports`: 1-report-per-user abuse reporting
  - `GET /api/feed/communities`: list learning guilds
  - `POST /api/feed/communities/:id/join`: join/leave community
  - `GET /api/feed/projects`: capstone showcase
  - `POST /api/feed/projects`: publish showcase
- **Messaging & Collaborative Rooms:**
  - `GET /api/messages/conversations`: active DMs & group chats
  - `POST /api/messages/send`: send message with timestamp chip
  - `GET /api/rooms`: active study rooms
  - `POST /api/rooms`: launch study room
  - `POST /api/rooms/:id/sync`: sync YouTube playback across peers
  - `POST /api/rooms/:id/whiteboard`: persist collaborative canvas
- **Search & Challenges:**
  - `GET /api/search`: universal command palette search
  - `GET /api/challenges`: cohort sprints
  - `POST /api/challenges/join`: enroll in sprint
  - `POST /api/challenges/log`: submit daily proof & notes
- **Admin Console:**
  - `GET /api/admin/kpis`: platform operational metrics
  - `GET /api/admin/moderation`: pending abuse queue
  - `POST /api/admin/moderation/:id`: moderation action
  - `GET /api/admin/ai-logs`: AI latency and token observability

---

## Free-Tier Operational Guarantees

1. **Zero Compute Costs:** In-browser Web Worker sandboxing handles code execution on the user's CPU, eliminating expensive backend execution infrastructure.
2. **YouTube Quota Protection:** Videos utilize YouTube's `noembed` oEmbed API first (0 quota cost). YouTube Data API v3 is called only as a fallback.
3. **Database Efficiency:** Strict indexing across foreign keys, trigram text search, and pagination prevent Supabase connection pool exhaustion.
4. **AI Token Conservation:** All inputs pass through client/server prompt sanitization, deduplication, and temperature-controlled deterministic completions.

---

## Verification & Build Validation

```bash
# Typecheck & Build all workspaces:
pnpm -r build

# Run unit & integration test suites:
pnpm --filter @gyanix/api test
```
All packages compile with 0 errors and all unit test suites pass.
