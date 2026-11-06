# Key Decisions — Gyanix

## D-001: Monorepo with pnpm workspaces
**Decision:** Use pnpm workspaces with three packages: `apps/web`, `apps/api`, `packages/shared`.
**Reason:** Shared Zod schemas and TypeScript types between frontend and backend eliminate drift. pnpm is fast and disk-efficient.
**Trade-off:** More initial setup complexity.

## D-002: Express + Vercel serverless (not Next.js)
**Decision:** Standard Express app deployed as a Vercel serverless function via `vercel.json` rewrites.
**Reason:** Cleaner separation of concerns; the backend can also be deployed to Railway or Render later. No vendor lock-in to Next.js conventions.
**Constraint:** No persistent processes. All state must be in Postgres. Rate limiting uses DB counters.

## D-003: Supabase Auth with our own JWT middleware
**Decision:** Frontend uses Supabase Auth SDK. The Express API verifies the JWT on every protected route and creates a user-scoped Supabase client for RLS.
**Reason:** RLS applies automatically. The service-role key never reaches the frontend.

## D-004: Roles from a server-controlled table, never user_metadata
**Decision:** A `roles` table in Postgres, managed only via the backend service role. The middleware queries it on every admin/moderator check.
**Reason:** user_metadata is writable by the user; app_metadata requires Supabase admin API; a custom table gives full control, audit history and extensibility.

## D-005: AI provider adapter layer
**Decision:** All AI features call a central `AIService` that delegates to `AIProviderAdapter` implementations. No feature imports a provider SDK directly.
**Reason:** Provider-independent by design. Switching providers requires only a configuration change, not code changes.
**Initial provider:** Gemini Flash (free tier).

## D-006: Client-side code execution sandboxes
**Decision:** JavaScript runs in a Web Worker. Python runs via Pyodide in a Web Worker. HTML/CSS runs in a sandboxed iframe. SQL uses an in-browser SQLite (WASM) engine.
**Reason:** No server resources used. User code never reaches the backend.
**Deferred:** Java, C, C++ — no safe free server-side sandbox verified yet. Labelled "Editor only".

## D-007: YouTube metadata caching
**Decision:** All YouTube API responses are cached in a `videos` table. oEmbed is used as a quota-free fallback for basic metadata. Per-user daily search limits enforced.
**Reason:** YouTube Data API quota is 10,000 units/day shared; a single search costs 100 units.

## D-008: Custom SMTP for email
**Decision:** Brevo free tier (300 emails/day) instead of Supabase's default email.
**Reason:** Supabase's default email service is rate-limited to ~4 emails/hour on the free plan.

## D-009: Postgres-backed rate limiting
**Decision:** Rate limiting uses a Postgres counter table, not in-memory structures.
**Reason:** Vercel serverless functions are stateless; in-memory counters reset on every invocation.

## D-010: Daily rollup tables for analytics
**Decision:** Dashboard stats and admin analytics are computed from daily rollup tables, not by scanning raw event tables.
**Reason:** Avoids full table scans on large event tables. Rollups are computed by pg_cron.

## D-011: No recording in study rooms
**Decision:** Session recording is not implemented.
**Reason:** Recording introduces storage costs, privacy/consent complexity and legal considerations out of scope for a free student project.

## D-012: WebRTC max 6 voice/video participants
**Decision:** Mesh WebRTC topology, maximum 6 simultaneous voice/video participants per room.
**Reason:** N² connections make mesh impractical beyond ~6 participants. Larger rooms use text chat and shared watching.

## Free-Tier Limitations

| Service | Limit | Mitigation |
|---------|-------|------------|
| Supabase DB | 500 MB | Store large files in Storage; size limits on uploads |
| Supabase Storage | 1 GB | File size limits; retention/cleanup policy |
| Supabase pausing | Pauses after 7 days inactive | GitHub Actions weekly keep-alive cron |
| YouTube API | 10,000 units/day | Cache all metadata; oEmbed fallback; per-user limits |
| Gemini Flash | RPM + TPD limits | Usage accounting; graceful quota message; fallback |
| Vercel bandwidth | 100 GB/month | CDN caching; lazy loading; image optimisation |
| TURN servers | None free reliably | Document limitation; show clear error on failure |
| Brevo SMTP | 300 emails/day | Acceptable for a learning platform |
