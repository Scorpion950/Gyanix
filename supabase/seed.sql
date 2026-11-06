-- ============================================================
-- Seed Script: First Admin User & Demo Data
-- Gyanix — Run after migrations are applied
-- ============================================================
-- Usage:
--   1. Apply all migrations first.
--   2. Create the admin user through Supabase Auth UI or CLI:
--        supabase auth create --email admin@gyanix.dev --password <strong-password>
--   3. Copy the returned user UUID and replace <ADMIN_USER_UUID> below.
--   4. Run: psql <connection-string> < supabase/seed.sql
-- ============================================================

-- Replace this with the actual UUID from step 2
DO $$
DECLARE
  admin_uuid UUID := '00000000-0000-0000-0000-000000000001'::UUID; -- REPLACE ME
BEGIN
  -- Grant admin role to the first user
  -- The profiles row is already created by the handle_new_user trigger
  INSERT INTO roles (user_id, role, granted_by)
  VALUES (admin_uuid, 'admin', admin_uuid)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Write to audit log
  INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (
    admin_uuid,
    'role_granted',
    'user',
    admin_uuid::TEXT,
    jsonb_build_object('role', 'admin', 'note', 'Initial seed — first administrator')
  );

  RAISE NOTICE 'Admin role granted to user %', admin_uuid;
END;
$$;
