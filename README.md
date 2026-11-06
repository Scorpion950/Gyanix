# Gyanix

> AI-powered social and collaborative learning platform

[![CI](https://github.com/Scorpion950/Gyanix/actions/workflows/ci.yml/badge.svg)](https://github.com/Scorpion950/Gyanix/actions/workflows/ci.yml)

## What is Gyanix?

Gyanix combines YouTube-based learning management, AI assistance, coding practice and social collaboration in one platform. Think Notion's productivity + Discord's community energy + a modern learning management system — all free.

**Tech stack:** React · TypeScript · Vite · Tailwind CSS · Node.js · Express · Supabase · PostgreSQL · Gemini Flash

---

## Quick start

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- A free Supabase project ([supabase.com](https://supabase.com))
- A free Gemini API key ([ai.google.dev](https://ai.google.dev))

### 1. Clone and install

```bash
git clone https://github.com/Scorpion950/Gyanix.git
cd Gyanix
pnpm install
```

### 2. Configure environment variables

```bash
# Frontend
cp .env.example apps/web/.env
# Edit apps/web/.env — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Backend
cp .env.example apps/api/.env
# Edit apps/api/.env — set all SUPABASE_* vars, GEMINI_API_KEY, SMTP_* vars
```

### 3. Apply database migrations

```bash
# Using Supabase CLI (recommended)
supabase db push

# Or manually via psql
psql "$DATABASE_URL" < supabase/migrations/001_core_foundation.sql
```

### 4. Seed the first admin user

```bash
# 1. Create admin user via Supabase Auth dashboard or CLI
# 2. Copy the UUID
# 3. Edit supabase/seed.sql — replace the placeholder UUID
# 4. Run:
psql "$DATABASE_URL" < supabase/seed.sql
```

### 5. Start development servers

```bash
pnpm dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

### 6. View the design system

Open [http://localhost:5173/design-system](http://localhost:5173/design-system) to see all tokens and components.

---

## Project structure

```
gyanix/
├── apps/
│   ├── web/          # React + Vite frontend
│   └── api/          # Express serverless backend
├── packages/
│   └── shared/       # Zod schemas, types, constants
├── supabase/
│   ├── migrations/   # Versioned SQL migrations
│   └── seed.sql      # First admin + demo data
└── docs/             # Architecture, database, decisions docs
```

---

## Documentation

| File | Contents |
|------|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, component diagram, request flow |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema overview, RLS, indexes |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Key decisions and free-tier trade-offs |
| [docs/CHECKLIST.md](docs/CHECKLIST.md) | Implementation status per phase |
| [docs/PRIVACY.md](docs/PRIVACY.md) | Data handling and AI data-use policy |
| [docs/AI_PROVIDERS.md](docs/AI_PROVIDERS.md) | AI provider setup, rotation, recovery |
| [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md) | Full polished project documentation |

---

## Development phases

| Phase | Scope |
|-------|-------|
| **1A** ✅ | Foundation, auth, design system, shell |
| **1B** | Onboarding, profiles, social graph, dashboard |
| **2** | Learning paths and YouTube integration |
| **3** | Progress, notes, Pomodoro, analytics |
| **4** | AI recommendations, doubt solver, assessments |
| **5** | Coding environment and practice tracker — **MVP** |
| **6** | Social feed, communities, project showcases |
| **7** | Messaging and collaborative editing |
| **8** | Watch Together, study rooms, whiteboard |
| **9** | Challenges, notifications, universal search |
| **10** | Admin dashboard, testing, security, final docs |

---

## Security notes

- Supabase service-role key is **never** sent to the frontend
- JWT is verified on **every** protected API route
- All database tables have Row Level Security enabled
- Roles come from a server-controlled `roles` table — never from user metadata
- Secrets are managed as environment variables and never committed

---

## Licence

MIT — see [LICENSE](LICENSE)
