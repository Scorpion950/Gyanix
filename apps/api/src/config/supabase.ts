import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Polyfill or fallback WebSocket for test environments or older runtime runners
if (typeof (globalThis as unknown as { WebSocket?: unknown }).WebSocket === 'undefined') {
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = class DummyWebSocket {};
}

/**
 * Custom bounded fetch with immediate failure on network disconnects.
 * Prevents PostgREST from hanging in exponential-backoff retry loops when remote Supabase
 * instances are sleeping, unreachable, unmigrated, or in test environments.
 */
const boundedFetch = async (url: any, options: any = {}): Promise<Response> => {
  const urlStr = typeof url === 'string' ? url : url.toString();

  // If in test mode with test.supabase.co or placeholder, return clean 404 so fallback stores handle it instantly
  if (process.env.NODE_ENV === 'test' || urlStr.includes('test.supabase.co')) {
    return new Response(JSON.stringify({ message: 'Offline/test mode fallback', code: '404' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 1200);

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (err: any) {
    // Return a clean 503 HTTP response so PostgREST immediately resolves without retrying 4 times
    return new Response(JSON.stringify({ message: err?.message || 'Network error', code: '503' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    clearTimeout(id);
  }
};

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
  global: {
    fetch: boundedFetch,
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
      fetch: boundedFetch,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
