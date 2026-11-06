import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Supabase admin client — uses the service-role key.
 * NEVER send this client or its key to the frontend.
 * Use only for server-side admin/system operations that must bypass RLS.
 */
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Create a user-scoped Supabase client using the user's JWT.
 * This client respects Row Level Security policies.
 */
export function createUserClient(accessToken: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
