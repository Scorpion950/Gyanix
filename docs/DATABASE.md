# Database Design — Gyanix

## Architecture Overview

Gyanix uses PostgreSQL managed by Supabase, enforcing:
- UUID primary keys (`uuid_generate_v4()`)
- Automatic `updated_at` timestamps via triggers
- Row Level Security (RLS) enabled on every table
- `citext` for case-insensitive unique usernames
- Server-controlled roles table (never client-editable metadata)
- Append-only audit logs with hashed IPs

---

## Migration 001: Core Foundation (Phase 1A)

### Tables

#### `profiles`
Created automatically via the `handle_new_user()` trigger on `auth.users` insert.
- `id` (UUID PK)
- `auth_user_id` (UUID UNIQUE FK -> auth.users.id ON DELETE CASCADE)
- `username` (CITEXT UNIQUE NOT NULL, 3-30 chars, alphanumeric + _ -)
- `display_name` (TEXT NOT NULL, 1-60 chars)
- `bio` (TEXT, max 500 chars)
- `avatar_url` (TEXT)
- `profession` (TEXT)
- `github_url` (TEXT)
- `website_url` (TEXT)
- `location` (TEXT, max 100 chars)
- `is_active` (BOOLEAN DEFAULT true)
- `onboarding_completed` (BOOLEAN DEFAULT false)
- `daily_goal_minutes` (INTEGER DEFAULT 30, 5-480)
- `preferred_session_length` (TEXT DEFAULT 'medium')
- `learning_style` (TEXT DEFAULT 'mixed')
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_profiles_username` (btree)
- `idx_profiles_auth_user_id` (btree)
- `idx_profiles_fts` (gin full-text search on display_name, username, bio)

**RLS:**
- `profiles_select_active`: Everyone can read active profiles.
- `profiles_update_own`: Users can update only their own row (`auth_user_id = auth.uid()`).

#### `roles`
Server-controlled roles. Authorisation NEVER depends on user metadata.
- `id` (UUID PK)
- `user_id` (UUID FK -> auth.users.id ON DELETE CASCADE)
- `role` (ENUM: 'admin', 'moderator')
- `granted_by` (UUID FK -> auth.users.id)
- `granted_at` (TIMESTAMPTZ)
- UNIQUE (`user_id`, `role`)

**RLS:**
- Read restricted to administrators; write denied to standard users (service-role only).

#### `audit_logs`
Append-only log of sensitive operations.
- `id` (UUID PK)
- `actor_id` (UUID FK -> auth.users.id)
- `action` (TEXT)
- `target_type` (TEXT)
- `target_id` (TEXT)
- `metadata` (JSONB)
- `ip_hash` (TEXT, salted SHA-256)
- `created_at` (TIMESTAMPTZ)

**RLS:**
- Read restricted to administrators; insert only allowed via service role.

#### `notifications`
- `id` (UUID PK)
- `user_id` (UUID FK -> auth.users.id ON DELETE CASCADE)
- `type` (ENUM notification_type)
- `title` (TEXT NOT NULL)
- `body` (TEXT)
- `action_url` (TEXT)
- `metadata` (JSONB)
- `is_read` (BOOLEAN DEFAULT false)
- `created_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_notifications_user_id_unread` (`user_id`, `is_read`, `created_at` DESC)

**RLS:**
- Users can select and update (`is_read`) only their own notifications.

---

## Migration 002: Social Graph & Settings (Phase 1B)

#### `social_relationships`
Models friend requests, mutual friendships, one-way follows, and blocks.
- `id` (UUID PK)
- `user_id` (UUID FK -> auth.users.id ON DELETE CASCADE)
- `target_user_id` (UUID FK -> auth.users.id ON DELETE CASCADE)
- `status` (ENUM: 'friend_pending_sent', 'friend_pending_received', 'friends', 'following', 'blocked')
- `created_at`, `updated_at` (TIMESTAMPTZ)
- CONSTRAINT: `user_id != target_user_id`
- UNIQUE: (`user_id`, `target_user_id`)

**Indexes:**
- `idx_social_user_status` (`user_id`, `status`)
- `idx_social_target_user` (`target_user_id`, `status`)

**RLS:**
- Users can read relationships where they are either the actor or the target.
- Users can insert, update, and delete only their own side (`user_id = auth.uid()`).

#### `user_settings`
User privacy preferences, notification choices, and AI opt-out.
- `id` (UUID PK)
- `user_id` (UUID UNIQUE FK -> auth.users.id ON DELETE CASCADE)
- `profile_visibility` (ENUM: 'public', 'friends_only', 'private')
- `activity_visible` (BOOLEAN DEFAULT true)
- `learning_paths_visible` (BOOLEAN DEFAULT true)
- `streaks_visible` (BOOLEAN DEFAULT true)
- `ai_personalisation` (BOOLEAN DEFAULT true)
- `email_notifications` (BOOLEAN DEFAULT false)
- `unfinished_lecture_reminders` (BOOLEAN DEFAULT true)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS:**
- Read and update restricted strictly to the owning user (`user_id = auth.uid()`).

---

## Triggers & Helper Functions

1. `set_updated_at()`: updates `updated_at` timestamp before any `UPDATE`.
2. `handle_new_user()`: derives an initial unique username and creates a row in `profiles` on every signup.
3. `handle_new_user_settings()`: creates default `user_settings` for every new user.
4. `is_blocked(user_a, user_b)`: security-definer helper checking if either user has blocked the other.
