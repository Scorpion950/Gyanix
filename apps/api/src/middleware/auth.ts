import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role?: string;
  };
  accessToken: string;
}

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Attaches the verified user to req.user.
 * Never trusts user-editable data for roles — roles come from our roles table.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  const token = authHeader.slice(7);

  // Verify the token using Supabase
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired session' },
    });
    return;
  }

  (req as AuthenticatedRequest).user = {
    id: user.id,
    email: user.email ?? '',
  };
  (req as AuthenticatedRequest).accessToken = token;

  next();
}

/**
 * Middleware that requires the user to have the 'admin' role.
 * Must be used after requireAuth.
 * Roles are always read from our server-controlled roles table.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const { supabaseAdmin } = await import('../config/supabase.js');

  const { data: roleRow } = await supabaseAdmin
    .from('roles')
    .select('role')
    .eq('user_id', authReq.user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleRow) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Administrator access required' },
    });
    return;
  }

  authReq.user.role = 'admin';
  next();
}

/**
 * Middleware that requires moderator OR admin role.
 */
export async function requireModerator(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const { supabaseAdmin } = await import('../config/supabase.js');

  const { data: roleRow } = await supabaseAdmin
    .from('roles')
    .select('role')
    .eq('user_id', authReq.user.id)
    .in('role', ['admin', 'moderator'])
    .maybeSingle();

  if (!roleRow) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Moderator access required' },
    });
    return;
  }

  authReq.user.role = roleRow.role as string;
  next();
}
