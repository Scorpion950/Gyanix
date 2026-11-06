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
        .single();

      if (error || !profile) {
        res.status(404).json({
          success: false,
          error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' },
        });
        return;
      }

      // Fetch role from server-controlled roles table
      const { supabaseAdmin } = await import('../config/supabase.js');
      const { data: roleRows } = await supabaseAdmin
        .from('roles')
        .select('role')
        .eq('user_id', user.id);

      res.json({
        success: true,
        data: {
          ...profile,
          roles: roleRows?.map((r) => r.role) ?? [],
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
