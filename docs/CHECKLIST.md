# Implementation Checklist — Gyanix

> Legend: ✅ Done · 🔄 In Progress · ⏳ Pending · ❌ Deferred

---

## Phase 1A — Foundation (Current)

### Monorepo & Toolchain
- ✅ pnpm workspace monorepo
- ✅ TypeScript strict mode (all packages)
- ✅ ESLint + Prettier config
- ✅ `.gitignore` and `.env.example`
- ⏳ Husky + lint-staged pre-commit hook
- ✅ GitHub Actions CI (lint + typecheck + test)
- ✅ Supabase keep-alive workflow

### Design System
- ✅ CSS custom properties (design tokens)
- ✅ Tailwind theme extension
- ✅ Self-hosted fonts (Inter, Plus Jakarta Sans, JetBrains Mono)
- ✅ No-FOUC theme switching (inline script)
- ✅ Logo SVG (wordmark + logomark)
- ⏳ Favicon + apple-touch-icon + OG image (actual PNG files)
- ✅ `/design-system` route with all tokens

### UI Components
- ✅ Button (variants, sizes, loading, icons, asChild)
- ✅ Input (error, icons, label)
- ✅ Card (interactive, flat variants)
- ✅ Badge (default, success, warning, danger, ai)
- ✅ Avatar (Radix, sizes, initials fallback)
- ✅ Skeleton (text, circle, card composites)
- ✅ LoadingScreen
- ✅ EmptyState
- ✅ ErrorState
- ✅ ThemeToggle
- ⏳ Dialog/Sheet/Popover (Radix wrappers restyled)
- ⏳ Tooltip (Radix wrapper)
- ⏳ Select / Tabs / Switch (Radix wrappers)

### App Shell & Navigation
- ✅ AppShell (desktop/tablet/mobile layout)
- ✅ Sidebar (collapsible, icon rail, deferred labels)
- ✅ TopBar (search, notifications, theme, profile)
- ✅ AuthLayout (split desktop / form-only mobile)
- ⏳ Mobile bottom tab bar
- ⏳ Command palette (Phase 9)

### Authentication
- ✅ Login page (email + Google + GitHub)
- ✅ Register page (email + OAuth + username availability)
- ⏳ Forgot password page
- ⏳ Email verification flow

### Backend Foundation
- ✅ Express app (Helmet, CORS, body size limits)
- ✅ JWT middleware (requireAuth, requireAdmin, requireModerator)
- ✅ Central error handler
- ✅ Env validation (Zod)
- ✅ Supabase admin + user-scoped clients
- ✅ `/api/health` endpoint
- ✅ `/api/auth/me` and `/api/auth/logout`
- ✅ `/api/users/:username` and check-username
- ✅ AI service stub (interface defined, Phase 4 implementation)
- ✅ Audit log service

### Database (Phase 1A)
- ✅ Migration 001: profiles, roles, audit_logs, notifications
- ✅ handle_new_user trigger (auto-create profile on signup)
- ✅ updated_at trigger
- ✅ RLS policies: profiles, roles, audit_logs, notifications
- ✅ Indexes: username, auth_user_id, FTS, audit_logs
- ✅ Seed script (first admin)

### Role Model
- ✅ `roles` table (server-controlled, never user_metadata)
- ✅ Admin + moderator role checks in middleware
- ✅ Audit log table

### Documentation
- ✅ README (setup, structure, phases)
- ✅ ARCHITECTURE.md
- ✅ DECISIONS.md
- ✅ CHECKLIST.md (this file)
- ⏳ DATABASE.md
- ⏳ PRIVACY.md
- ⏳ AI_PROVIDERS.md
- ⏳ PROJECT_DOCUMENTATION.md skeleton

---

## Phase 1B — Onboarding & Dashboard ⏳

- ⏳ Onboarding flow (7 steps)
- ⏳ Profile page (view + edit)
- ⏳ Profile completion card
- ⏳ Social graph (friends, follow, block)
- ⏳ Notification service (realtime delivery)
- ⏳ Dashboard (Continue Learning, stats, AI recs)
- ⏳ Database: social_relationships, onboarding_progress

## Phase 2 — Learning Management ⏳
## Phase 3 — Progress & Notes ⏳
## Phase 4 — AI System ⏳
## Phase 5 — Coding Environment ⏳ [MVP checkpoint]
## Phase 6 — Social Feed ⏳
## Phase 7 — Messaging ⏳
## Phase 8 — Study Rooms ⏳
## Phase 9 — Challenges & Search ⏳
## Phase 10 — Admin & Deployment ⏳
