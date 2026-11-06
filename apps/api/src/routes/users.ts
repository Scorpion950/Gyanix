import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { Request, Response, NextFunction } from 'express';

export const usersRouter = Router();

/**
 * GET /api/users/:username
 * Returns a public user profile by username.
 */
usersRouter.get(
  '/:username',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { supabaseAdmin } = await import('../config/supabase.js');
      const { username } = req.params as { username: string };

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select(
          'id, username, display_name, bio, avatar_url, profession, github_url, website_url, location, created_at',
        )
        .ilike('username', username)
        .eq('is_active', true)
        .single();

      if (error || !profile) {
        res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/users/check-username/:username
 * Checks whether a username is available (case-insensitive).
 */
usersRouter.get(
  '/check-username/:username',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { supabaseAdmin } = await import('../config/supabase.js');
      const { username } = req.params as { username: string };

      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();

      res.json({ success: true, data: { available: !data } });
    } catch (err) {
      next(err);
    }
  },
);
