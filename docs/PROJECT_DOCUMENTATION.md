# Gyanix — Project Documentation & Engineering Specification

> **AI-Powered Social and Collaborative Learning Platform**  
> **Author:** Engineering Team  
> **Repository:** [https://github.com/Scorpion950/Gyanix.git](https://github.com/Scorpion950/Gyanix.git)  
> **Version:** 0.2.0 (Phase 1 Complete)  
> **Date:** November 2026  

---

## Table of Contents
1. [Abstract & Project Overview](#1-abstract--project-overview)
2. [Problem Statement, Objectives & Scope](#2-problem-statement-objectives--scope)
3. [Feature Status Matrix](#3-feature-status-matrix)
4. [Technology Stack & Rationale](#4-technology-stack--rationale)
5. [System Architecture](#5-system-architecture)
6. [Authentication, Authorisation & Security Design](#6-authentication-authorisation--security-design)
7. [Database Architecture & Data Models](#7-database-architecture--data-models)
8. [AI Provider Architecture](#8-ai-provider-architecture)
9. [Real-Time Collaboration Design](#9-real-time-collaboration-design)
10. [Client-Side Code Execution Sandboxing](#10-client-side-code-execution-sandboxing)
11. [Key Workflows & Sequence Diagrams](#11-key-workflows--sequence-diagrams)
12. [API Specification Overview](#12-api-specification-overview)
13. [Testing Strategy](#13-testing-strategy)
14. [Deployment & CI/CD Pipeline](#14-deployment--cicd-pipeline)
15. [Free-Tier Infrastructure Constraints & Mitigations](#15-free-tier-infrastructure-constraints--mitigations)
16. [User Guide](#16-user-guide)
17. [Challenges, Key Architectural Decisions & Retrospective](#17-challenges-key-architectural-decisions--retrospective)
18. [Future Work & Roadmap](#18-future-work--roadmap)
19. [Appendix](#19-appendix)

---

## 1. Abstract & Project Overview
Gyanix is an AI-powered collaborative learning platform combining Notion-like productivity, Discord-inspired community interaction, and structured educational management. Designed specifically for students and self-directed developers, the platform solves core flaws in modern online education: fragmented tools, passive video consumption, loneliness during study sessions, and lack of feedback.

---

## 2. Problem Statement, Objectives & Scope
- **Fragmented Learning Workflows:** Learners constantly juggle YouTube for videos, Notion for notes, Discord for study groups, and LeetCode for practice.
- **Passive Video Consumption:** Watching YouTube playlists lacks active engagement, automated timestamping, and concept validation.
- **Isolation:** Online learning has a high dropout rate due to lack of social accountability.
- **Objectives:**
  - Build an end-to-end, production-grade monorepo on strictly free-tier infrastructure.
  - Implement a provider-independent AI assistance layer with fallback.
  - Deliver accessible (WCAG 2.2 AA), responsive UI/UX across mobile, tablet, and desktop.

---

## 3. Feature Status Matrix

| Module | Feature | Status | Notes |
|---|---|---|---|
| **Foundation** | pnpm Monorepo & Workspaces | Implemented | `apps/web`, `apps/api`, `packages/shared` |
| **Foundation** | Design System & Token Layer | Implemented | CSS variables, Tailwind theme, 3 density modes |
| **Foundation** | No-FOUC Theme Switcher | Implemented | Inline synchronous head script |
| **Auth** | Supabase Auth + JWT API Middleware | Implemented | Google, GitHub, Email/Password |
| **Auth** | Role Model & Audit Logging | Implemented | DB-controlled roles, salted IP hash |
| **Onboarding** | 7-Step Interactive Stepper | Implemented | Autosaves, skip-anytime |
| **Profiles** | User Profiles & Privacy Controls | Implemented | Public/Friends/Private visibility |
| **Social** | Social Graph (Friends, Follow, Block) | Implemented | Mutual friends, follows, blocking |
| **Notifications** | Core Notification Service | Implemented | In-app notification bell, read tracking |
| **Dashboard** | Explore Mode Dashboard Shell | Implemented | Hero continue card, stats, 3 progress bars |
| **Learning** | YouTube Paths & Folder Tree | Phase 2 | Planned |
| **Notes** | Timestamp-linked Notes Library | Phase 3 | Planned |
| **AI** | Provider Adapter Layer & Gemini | Phase 4 | Interface defined |
| **Practice** | Monaco Editor & Practice Tracker | Phase 5 | Client sandboxing |

---

## 4. Technology Stack & Rationale
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui restyled primitives, Framer Motion, Zustand, TanStack Query.
- **Backend:** Node.js, Express, TypeScript, Zod, Helmet, CORS. Structured for Vercel serverless.
- **Database & Auth:** Supabase PostgreSQL with Row Level Security (RLS), Supabase Auth.
- **AI Engine:** Google Gemini Flash (`@google/generative-ai`) via an adapter layer.

---

## 5. System Architecture
The application runs as a monorepo with three logical packages:
- `apps/web`: Single Page Application (SPA) deployed to Vercel.
- `apps/api`: Express REST API running serverless on Vercel (`/api/*`).
- `packages/shared`: Common Zod schemas, TypeScript contracts, and constants shared between client and server.

```
React (Vite SPA) ──[HTTPS + JWT Bearer]──► Express REST API (Vercel Serverless)
                                                    │
                                             Supabase Client (User/Admin)
                                                    ▼
                                           PostgreSQL (RLS Policies)
```

---

## 6. Authentication, Authorisation & Security Design
- **JWT Verification:** Every protected route parses the Authorization Bearer header and verifies session authenticity using Supabase.
- **Row Level Security (RLS):** Security is enforced in the database layer. Direct database operations by users are restricted to their own rows.
- **Server-Controlled Roles:** Roles (`admin`, `moderator`) exist in a dedicated `roles` table managed solely via the server-side service role.
- **Audit Logging:** Administrative operations and critical security changes trigger append-only audit log records with one-way salted IP hashing.

---

## 7. Database Architecture & Data Models
- **Migration 001:** `profiles`, `roles`, `audit_logs`, `notifications`.
- **Migration 002:** `social_relationships`, `user_settings`.
- Triggers: `handle_new_user()`, `handle_new_user_settings()`, `set_updated_at()`.

---

## 8. AI Provider Architecture
- Decoupled `AIProviderAdapter` interface with a dynamic registry.
- Normalised responses, streaming support, and token usage accounting.
- Privacy filter preventing transmission of PII or private conversation data to AI providers.

---

## 9. Real-Time Collaboration Design
- Real-time signaling via Supabase Realtime (Broadcast).
- WebRTC mesh topology capped at 6 simultaneous audio/video participants to ensure quality on free STUN infrastructure.

---

## 10. Client-Side Code Execution Sandboxing
- Client-side execution in isolated Web Workers (JavaScript, Python via Pyodide WASM, SQL via SQLite WASM).
- Zero server execution risk; user code never runs inside the main backend container.

---

## 11. Key Workflows & Sequence Diagrams
- User Authentication & Auto-Profile Generation.
- Onboarding & Preference Synchronization.
- Social Graph & Mutual Friendship Workflow.

---

## 12. API Specification Overview
- `GET /api/health`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/users/check-username/:username`
- `GET /api/users/me/completion`
- `PUT /api/users/profile`
- `POST /api/users/onboarding`
- `GET /api/users/settings` & `PUT /api/users/settings`
- `GET /api/users/:username`
- `GET /api/users/:username/relationship`
- `POST /api/users/:username/social`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/mark-all-read`

---

## 13. Testing Strategy
- Unit tests via Vitest.
- Monorepo TypeScript strict typechecking (`tsc --noEmit`).
- Schema validation unit tests for Zod schemas.

---

## 14. Deployment & CI/CD Pipeline
- GitHub Actions CI workflow triggers on push/PR: lint, typecheck, build shared, test.
- Scheduled GitHub Action prevents Supabase free-tier project dormancy.

---

## 15. Free-Tier Infrastructure Constraints & Mitigations
- Detailed in `docs/DECISIONS.md`.

---

## 16. User Guide
- Step-by-step walkthrough of Onboarding, Dashboard, and Profile customization.

---

## 17. Challenges, Key Architectural Decisions & Retrospective
- Review of technical trade-offs between monolithic and microservice architecture, serverless connection pooling, and client-side code sandboxing.

---

## 18. Future Work & Roadmap
- Phases 2 through 10 implementation plan as specified in the Master Roadmap.

---

## 19. Appendix
- Glossaries, setup instructions, and license declarations.
