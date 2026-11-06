# Architecture — Gyanix

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  React + Vite · Zustand · TanStack Query · Framer Motion         │
│                                                                  │
│  Supabase Auth SDK ──► Auth · OAuth · Session refresh            │
│  Supabase Realtime  ──► Private channels (rooms, messages, notif)│
│  Supabase Storage   ──► Direct uploads (RLS-protected buckets)   │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTPS · Bearer JWT
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│               Express API (Vercel Serverless)                    │
│                                                                  │
│  Middleware: JWT verify → Helmet → CORS → Rate limit             │
│  Routes: /api/auth  /api/users  /api/paths  /api/ai  …          │
│  Services: auditLog · aiService · youtubeService …              │
│  AI Layer: provider registry → Gemini adapter (→ fallbacks)      │
└───────────────────────┬─────────────────────────────────────────┘
                        │ Service-role key (server only)
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase                                    │
│                                                                  │
│  PostgreSQL + RLS · Auth · Storage · Realtime · pg_cron          │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow

1. User performs an action in the React UI.
2. The UI calls the Express API with `Authorization: Bearer <supabase-jwt>`.
3. The API's `requireAuth` middleware verifies the JWT using Supabase's `getUser`.
4. The middleware creates a user-scoped Supabase client so RLS applies.
5. Business logic runs in the service layer; the response is normalised and returned.
6. For AI features, the API calls the AI service layer, which selects the active provider.

## Serverless Design

The Express app exports its handler for Vercel. Each request is a cold or warm invocation.
Implications:
- No in-memory sessions or rate-limiting counters — Postgres-backed for all state.
- No persistent WebSocket connections — Supabase Realtime handles that.
- Long operations (AI calls) use streaming or chunking to stay within the 30s function limit.
- Scheduled jobs use pg_cron (Supabase) and GitHub Actions, not long-running processes.

## Monorepo Packages

| Package | Role |
|---------|------|
| `apps/web` | React frontend, Vite, Tailwind, Zustand, TanStack Query |
| `apps/api` | Express backend, serverless handler, all business logic |
| `packages/shared` | Zod schemas, TypeScript types, constants — imported by both apps |

## AI Provider Architecture

```
Feature code
    │
    ▼
 AIService (central service layer)
    │
    ├── ProviderRegistry (reads config from env → DB in Phase 10)
    │       ├── GeminiAdapter    (primary — free tier)
    │       ├── GroqAdapter      (fallback — verify availability)
    │       └── [future adapters]
    │
    └── Normalised AIResponse → Zod validation → Feature handler
```

All adapters implement the same `AIProviderAdapter` interface. The rest of the codebase
never imports a provider SDK directly.
