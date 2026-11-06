# Implementation Checklist — Gyanix

> Legend: ✅ Done · 🔄 In Progress · ⏳ Pending · ❌ Deferred

---

## Phase 1A — Foundation ✅

### Monorepo & Toolchain
- ✅ pnpm workspace monorepo (`apps/web`, `apps/api`, `packages/shared`)
- ✅ TypeScript strict mode (all packages)
- ✅ ESLint + Prettier config
- ✅ `.gitignore` and `.env.example`
- ✅ GitHub Actions CI (lint + typecheck + test)
- ✅ Supabase keep-alive workflow

### Design System & Theme
- ✅ CSS custom properties (design tokens) in `globals.css`
- ✅ Tailwind theme extension mirroring tokens
- ✅ Self-hosted fonts (Inter, Plus Jakarta Sans, JetBrains Mono)
- ✅ No-FOUC theme switching (inline synchronous script)
- ✅ Brand assets: SVG logomark + wordmark (`apps/web/src/assets/Logo.tsx`)
- ✅ `/design-system` route showcasing tokens, typography, badges, progress bars

### UI Primitives & Components
- ✅ Button (CVA variants, sizes, loading spinner, icons, touch target)
- ✅ Input (label, error, icons, accessible hints)
- ✅ Card (CardHeader, CardTitle, CardContent, interactive border hover)
- ✅ Badge (default, secondary, success, warning, danger, ai spark)
- ✅ Avatar (Radix, sizes, initials fallback)
- ✅ Skeleton & SkeletonText & SkeletonCard (accessible shimmer)
- ✅ LoadingScreen (centered animated logo)
- ✅ EmptyState (inline SVG illustration, single action)
- ✅ ErrorState (actionable description, retry button)
- ✅ ThemeToggle (cycle Light / Dark / System)

### App Shell & Navigation
- ✅ AppShell (responsive layout: desktop, tablet, mobile)
- ✅ Sidebar (collapsible 264px -> 72px rail, grouped navigation, deferred labels)
- ✅ TopBar (search trigger, notification bell, theme toggle, profile avatar)
- ✅ AuthLayout (split brand panel desktop, focused form mobile)

### Authentication
- ✅ Login page (email/password, Google & GitHub OAuth)
- ✅ Register page (email/password, OAuth, debounced username check, password strength)

### Backend Foundation
- ✅ Express app (Helmet, CORS, body size limits)
- ✅ JWT middleware (`requireAuth`, `requireAdmin`, `requireModerator`)
- ✅ Central error handler (no stack traces in production)
- ✅ Zod environment variable validation
- ✅ Supabase admin & user-scoped clients
- ✅ `/api/health` endpoint
- ✅ `/api/auth/me` and `/api/auth/logout`

### Role Model & Audit Logging
- ✅ Server-controlled `roles` table (never `user_metadata`)
- ✅ `audit_logs` table with salted one-way IP hashing

---

## Phase 1B — Onboarding, User Profiles & Social Graph ✅

### Onboarding
- ✅ 7-Step Interactive Onboarding Stepper (`/onboarding`):
  1. Display name
  2. Profession (chips with icons)
  3. Interests (searchable multi-select chips)
  4. Career goals (text area + templates)
  5. Current skill levels (5 difficulty levels segmented control with descriptions)
  6. Technologies to learn (searchable chips)
  7. Learning preferences (daily goal minutes, session length, learning style)
- ✅ "Skip for now" always visible at every step
- ✅ Autosaves to backend (`POST /api/users/onboarding`)

### User Profiles & Privacy
- ✅ User Profile page (`/profile` and `/u/:username`):
  - Avatar, name, username, bio, profession, location, GitHub, website
  - Edit Profile modal with immediate save
  - Privacy checks: hidden sections display "This section is private"
  - Tabs: Overview, Learning Paths (Phase 2), Projects (Phase 6), Achievements (Phase 3)
- ✅ Privacy settings (`user_settings` table):
  - `profile_visibility` (public, friends_only, private)
  - `activity_visible`, `learning_paths_visible`, `streaks_visible`
  - `ai_personalisation` (opt-out of AI training data use)

### Social Graph
- ✅ `social_relationships` table & `socialService.ts`:
  - Send / Cancel / Reject friend requests
  - Mutual friendship acceptance
  - One-way follows / unfollows
  - Blocking (cleans up any existing relationships both ways)
  - Helper function `is_blocked()`
- ✅ State-aware Friend/Follow/Block buttons on user profiles
- ✅ Backend endpoints:
  - `GET /api/users/:username/relationship`
  - `POST /api/users/:username/social`
  - `GET /api/users/friends`

### Notification Service
- ✅ `notifications` table & `notificationService.ts`
- ✅ In-app notification popover bell (`NotificationBell.tsx`)
  - Real-time unread count indicator
  - Grouped into "Today" and "Earlier"
  - Click to mark read & navigate
  - "Mark all as read" button
- ✅ Backend endpoints:
  - `GET /api/notifications`
  - `GET /api/notifications/unread-count`
  - `PATCH /api/notifications/:id/read`
  - `POST /api/notifications/mark-all-read`

### Dashboard (Explore Mode)
- ✅ Explore Mode Dashboard (`/dashboard`) matching Section 0.7:
  1. Greeting & date + dismissible profile completion card (progress ring + suggestions)
  2. Continue Learning Hero card: thumbnail, breadcrumb, progress bar, time remaining, primary "Resume at 12:34" button
  3. Stat strip: today's time vs daily goal (ring), streak (amber gentle wording), weekly progress (7-day mini bars), lectures completed
  4. Progress breakdown card: 3 separate bars (Learning, Knowledge, Practical) with note that time != progress
  5. Horizontal scroll rails with snap: My Learning Paths, Pending Lectures
  6. AI Recommendations: violet-labelled cards with Add, Customise, Dismiss (requires user approval)

### Database Migrations
- ✅ Migration 001: Core foundation (`profiles`, `roles`, `audit_logs`, `notifications`, triggers, RLS)
- ✅ Migration 002: Social graph & settings (`social_relationships`, `user_settings`, `is_blocked()`, RLS)
- ✅ Seed script: First admin user creation

### Documentation
- ✅ README.md
- ✅ docs/ARCHITECTURE.md
- ✅ docs/DATABASE.md
- ✅ docs/DECISIONS.md
- ✅ docs/PRIVACY.md
- ✅ docs/AI_PROVIDERS.md
- ✅ docs/PROJECT_DOCUMENTATION.md (Master engineering specification skeleton)
- ✅ docs/CHECKLIST.md (This file)

---

## Phase 2 — Learning Management & YouTube Integration ⏳
- ⏳ YouTube URL and playlist import
- ⏳ Video metadata caching (`videos` table) & oEmbed fallback
- ⏳ Learning path builder with nested folders and drag-and-drop
- ⏳ Lecture status tracking (Not Started, Watching, Completed, On Hold, Skipped)
- ⏳ Video player view (Focus Mode) with resizable tabs

## Phase 3 — Progress Tracking, Notes & Analytics ⏳
- ⏳ Timestamp-linked notes library
- ⏳ Pomodoro timer & active session tracking (heartbeat)
- ⏳ Inactivity prompt (15 min pause modal)
- ⏳ Daily rollup analytics tables & basic achievements

## Phase 4 — AI Learning System ⏳
- ⏳ AI provider registry with Gemini Flash adapter
- ⏳ AI recommendation engine
- ⏳ AI doubt solver (lecture-context-based, diagrams, code)
- ⏳ AI-generated roadmaps (verified against real YouTube videos)
- ⏳ Assessments (MCQ, conceptual, progressive coding)

## Phase 5 — Coding Environment & Practice Tracker ⏳ [MVP Checkpoint]
- ⏳ Monaco editor setup
- ⏳ Client-side sandboxed execution (Web Worker JS, Pyodide Python, SQLite WASM, iframe HTML/CSS)
- ⏳ LeetCode-style practice tracker
- ⏳ Progressive AI coding assistant (4-step stepper)

## Phase 6 — Social Feed & Communities ⏳
## Phase 7 — Messaging & Collaborative Learning ⏳
## Phase 8 — Watch Together, Study Rooms & Whiteboard ⏳
## Phase 9 — Challenges & Universal Search ⏳
## Phase 10 — Admin Dashboard, Security Audit & Deployment ⏳
