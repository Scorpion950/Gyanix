import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { analyticsService } from '../services/analyticsService.js';
import { HeartbeatSessionSchema, PomodoroLogSchema } from '@gyanix/shared';
import type { Request, Response, NextFunction } from 'express';

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

/**
 * POST /api/analytics/heartbeat
 * Validated active learning session heartbeat (capped server-side)
 */
analyticsRouter.post('/heartbeat', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const validated = HeartbeatSessionSchema.parse(req.body);

    const result = await analyticsService.recordHeartbeat(user.id, validated.pathItemId, validated.secondsDelta);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/analytics/pomodoro
 * Record completed Pomodoro block
 */
analyticsRouter.post('/pomodoro', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const validated = PomodoroLogSchema.parse(req.body);

    const result = await analyticsService.logPomodoro(user.id, validated.durationMinutes);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/summary
 * Dashboard stats: today's minutes, streak days, weekly progress bars, pomodoro count
 */
analyticsRouter.get('/summary', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const stats = await analyticsService.getStatsSummary(user.id);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/achievements
 * Unlocked & available achievements
 */
analyticsRouter.get('/achievements', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const achievements = await analyticsService.getAchievements(user.id);
    res.json({ success: true, data: achievements });
  } catch (err) {
    next(err);
  }
});

