import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { Request, Response, NextFunction } from 'express';

export const authRouter = Router();

/**
 * GET /api/auth/me
 * Returns the current authenticated user's profile.
 */
authRouter.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user, accessToken } = req as AuthenticatedRequest;
      const { createUserClient } = await import('../config/supabase.js');
      const supabase = createUserClient(accessToken);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const { supabaseAdmin } = await import('../config/supabase.js');

      let resolvedProfile = profile;
      if (!resolvedProfile) {
        const metadata = (user as any).user_metadata;
        const rawUsername = metadata?.['username'] || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`;
        const cleanUsername = String(rawUsername).replace(/[^a-zA-Z0-9_]/g, '');
        resolvedProfile = {
          id: user.id,
          auth_user_id: user.id,
          username: cleanUsername || 'developer',
          display_name: metadata?.['full_name'] || metadata?.['name'] || cleanUsername || 'Gyanix Learner',
          bio: 'Passionate learner & builder on Gyanix',
          avatar_url: metadata?.['avatar_url'] || null,
          profession: 'Full-Stack Engineer',
          reputation_score: 100,
          streak_count: 1,
          created_at: new Date().toISOString(),
        };

        try {
          await supabaseAdmin.from('profiles').upsert(resolvedProfile, { onConflict: 'auth_user_id' });
        } catch (_upsertErr) {
          // In-memory / graceful fallback
        }
      }

      // Fetch role from server-controlled roles table
      const { data: roleRows } = await supabaseAdmin
        .from('roles')
        .select('role')
        .eq('user_id', user.id);

      res.json({
        success: true,
        data: {
          ...resolvedProfile,
          roles: roleRows?.map((r) => r.role) ?? ['student'],
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/auth/logout
 * Invalidates the session on the server side.
 */
authRouter.post(
  '/logout',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { accessToken } = req as AuthenticatedRequest;
      const { createUserClient } = await import('../config/supabase.js');
      const supabase = createUserClient(accessToken);
      await supabase.auth.signOut();
      res.json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  },
);
