# Gyanix

> An AI-powered social and collaborative learning platform uniting structured curriculum management, interactive code execution, real-time study rooms, and community engagement into a cohesive experience.

[![CI](https://github.com/Scorpion950/Gyanix/actions/workflows/ci.yml/badge.svg)](https://github.com/Scorpion950/Gyanix/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm Version](https://img.shields.io/badge/pnpm-%3E%3D10.0.0-orange.svg)](https://pnpm.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

Gyanix bridges the gap between self-paced technical education and communal learning. Designed around the productivity and focus of Notion and the social dynamics of Discord, Gyanix provides students, developers, and lifelong learners with a unified hub to study, practice, collaborate, and track growth.

Built entirely on modern, cloud-native technologies with zero proprietary lock-in, Gyanix operates seamlessly within free-tier cloud architectures (Supabase PostgreSQL, Vercel Serverless, Google Gemini Flash AI, and client-side sandboxed runtimes).

---

## Core Capabilities

### 1. Structured Learning & Player Experience
- **Hierarchical Course Paths:** Multi-tier curriculum structuring with modules, folders, and sequenced lectures.
- **Quota-Aware YouTube Player:** Distraction-free custom playback controls with oEmbed fallbacks and YouTube Iframe API support.
- **Precision Timestamp Chips:** Interactive timestamp chips (`12:34`) embedded within notes, questions, and discussions that jump the media player directly to key moments.
- **Three-Metric Progress Engine:** Independent tracking for **Learning Progress** (curriculum completion), **Knowledge Progress** (concept mastery), and **Practical Progress** (applied coding problems).

### 2. Sandboxed Code Playground & Practice Workspace
- **Zero-Server Execution:** Browser-isolated Web Worker sandbox executing JavaScript, TypeScript, and Python without cloud compute costs or execution security risks.
- **Live Problem Sets:** Curated coding challenges categorized by difficulty with automated test suite runners and time/memory profiling.
- **Progressive Assistance:** Step-by-step guidance system providing conceptual hints, algorithmic pseudocode, and edge-case reminders without spoiling solutions.

### 3. Real-Time Collaborative Study Rooms
- **Watch Together:** Host-controlled synchronized video playback keeping study room participants aligned to the same second.
- **Collaborative Whiteboard:** Low-latency vector canvas supporting multi-user freehand sketching, geometric annotations, and visual problem solving.
- **Peer-to-Peer Audio/Video:** Mesh WebRTC connectivity enabling voice, video, and screen sharing directly between peers.

### 4. Community Hub & Social Graph
- **Topic Communities:** Dedicated spaces organized by technology, career path, and interest with fine-grained membership controls.
- **Multi-Stream Feeds:** Six distinct feed perspectives: *All*, *Following*, *Doubts*, *Projects*, *Achievements*, and *Discussions*.
- **Project Showcase:** Portfolio publishing engine featuring live demo links, repository integration, upvoting, and peer feedback.

### 5. AI-Assisted Learning Architecture
- **Contextual Doubt Solver:** AI queries enriched with the current lecture timestamp, video context, and student notes with automatic PII redaction.
- **Adaptive Syllabus Architect:** Generates structured learning roadmaps with module breakdowns and recommended resources from any user prompt.
- **Skill Diagnostic Assessments:** Dynamic quiz engine providing immediate feedback, rubric scoring, and targeted review topics.

### 6. Analytics & Productivity
- **Active-Time Heartbeat Tracker:** Measures focused study time with automatic idle detection (pauses when tabs lose focus).
- **Integrated Pomodoro System:** Configurable focus and break intervals linked directly to learning paths with session logs.
- **Activity Heatmap & Streaks:** GitHub-style daily activity grid celebrating consistency with gentle, non-punishing streak tracking.

### 7. Governance, Security & Administration
- **Granular Role-Based Access Control:** Strict database-level Row Level Security (RLS) driven by server-controlled role tables.
- **Audit Logging & Moderation:** Full administrative console for content flagging, automated moderation actions, and platform telemetry.

---

## Tech Stack

| Domain | Technologies |
|---|---|
| **Frontend** | React 24, TypeScript, Vite, Tailwind CSS, Radix UI primitives, Lucide Icons, Framer Motion, TanStack Query |
| **Backend** | Node.js (v24 LTS), Express, Helmet, CORS, Zod validation |
| **Database & Auth** | Supabase (PostgreSQL 15), Row Level Security (RLS), Supabase Auth JWT |
| **AI Integration** | Google Gemini Flash API (`@google/generative-ai`), privacy sanitization layer |
| **Execution Sandbox** | Client-side Web Workers, Blob URLs, iframe sandboxing |
| **Collaboration** | WebRTC mesh, HTML5 Canvas API, Supabase Realtime Channels |
| **Tooling** | pnpm workspaces, ESLint 9 (flat config), Vitest, Prettier, Husky |

---

## Project Structure

```
gyanix/
├── apps/
│   ├── web/                     # React + Vite frontend application
│   │   ├── src/
│   │   │   ├── components/      # UI component library and layouts
│   │   │   ├── features/        # Feature modules (learning, coding, rooms, feed, admin)
│   │   │   ├── lib/             # Client utilities, Web Worker runner, Supabase client
│   │   │   └── stores/          # Zustand application state stores
│   │   └── package.json
│   └── api/                     # Express REST API backend
│       ├── src/
│       │   ├── ai/              # Gemini Flash provider and privacy filters
│       │   ├── middleware/      # Auth, admin verification, error handling
│       │   ├── routes/          # API endpoint routers
│       │   ├── services/        # Business logic and database operations
│       │   └── __tests__/       # Vitest integration and security tests
│       └── package.json
├── packages/
│   └── shared/                  # Shared Zod validation schemas and TypeScript types
├── supabase/
│   ├── migrations/              # Versioned SQL migrations (001 through 011)
│   └── seed.sql                 # Administrative seed and sample data
├── docs/                        # Architectural documentation and technical guides
└── package.json                 # Monorepo root configuration
```

---

## Getting Started

### Prerequisites

- **Node.js:** `>= 24.0.0` ([nodejs.org](https://nodejs.org/))
- **pnpm:** `>= 10.0.0` (`corepack enable` or `npm install -g pnpm`)
- **Supabase Account:** Free tier project ([supabase.com](https://supabase.com))
- **Google AI Studio Key:** Free Gemini API key ([ai.google.dev](https://ai.google.dev))

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Scorpion950/Gyanix.git
cd Gyanix
pnpm install
```

### 2. Configure Environment Variables

Create environment configuration files for both the frontend and backend services:

```bash
# Frontend configuration
cp .env.example apps/web/.env

# Backend configuration
cp .env.example apps/api/.env
```

Set the corresponding keys in each `.env` file:
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `apps/web/.env`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY` in `apps/api/.env`

### 3. Initialize the Database

Apply the version-controlled SQL migrations to your Supabase project:

```bash
# Using the Supabase CLI
supabase db push

# Or apply migrations directly via psql:
cat supabase/migrations/*.sql | psql "$DATABASE_URL"
```

### 4. Seed Platform Data & First Admin

1. Create a user via Supabase Auth (email/password or OAuth).
2. Retrieve the user's UUID from the Supabase dashboard.
3. Replace the placeholder UUID in `supabase/seed.sql` with your user ID.
4. Run the seed script:
   ```bash
   psql "$DATABASE_URL" < supabase/seed.sql
   ```

### 5. Run Development Servers

```bash
pnpm dev
```

- **Frontend Client:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3001](http://localhost:3001)
- **Design System Explorer:** [http://localhost:5173/design-system](http://localhost:5173/design-system)

---

## Quality Assurance & Verification

The project enforces strict type-checking, code styling, and unit/integration testing:

```bash
# Build shared package types
pnpm --filter @gyanix/shared build

# TypeScript validation across all workspaces
pnpm typecheck

# Code formatting and lint verification
pnpm lint

# Execute full automated test suite
pnpm test

# Production build verification
pnpm build
```

---

## Technical Documentation

Detailed architectural and operational documentation is available in the [`docs/`](docs/) directory:

| Document | Focus Area |
|---|---|
| [PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md) | Comprehensive system manual and architectural specifications |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | High-level system architecture, service communication, and data flow |
| [DATABASE.md](docs/DATABASE.md) | Schema dictionary, entity relationships, and Row Level Security policies |
| [DECISIONS.md](docs/DECISIONS.md) | Architectural Decision Records (ADRs) and free-tier trade-offs |
| [PRIVACY.md](docs/PRIVACY.md) | PII sanitization pipelines and data security practices |
| [AI_PROVIDERS.md](docs/AI_PROVIDERS.md) | AI provider integration, rate limits, and fallback strategies |

---

## Security & Compliance

- **Service-Role Isolation:** The Supabase `service_role` key is strictly restricted to server-side environments and never exposed to client bundles.
- **Row Level Security (RLS):** Every database table enforces explicit PostgreSQL RLS policies; clients only access rows they own or are authorized to read.
- **Tamper-Proof Authorization:** Roles and administrative claims are stored in a protected server-side table, completely isolated from user metadata.
- **Privacy Sanitization:** User prompts and doubts pass through automatic regex redaction filters before dispatching to external AI model endpoints.

---

## License

This project is licensed under the [MIT License](LICENSE).
