import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';
import type { Request, Response, NextFunction } from 'express';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

/**
 * GET /api/notifications
 * Get user's notifications paginated
 */
notificationsRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const limit = Math.min(Number(req.query['limit']) || 20, 50);
    const offset = Number(req.query['offset']) || 0;

    const result = await notificationService.list(user.id, limit, offset);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications/unread-count
 */
notificationsRouter.get('/unread-count', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const count = await notificationService.getUnreadCount(user.id);
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id/read
 */
notificationsRouter.patch('/:id/read', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };

    await notificationService.markAsRead(user.id, id);
    res.json({ success: true, data: { id, isRead: true } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications/mark-all-read
 */
notificationsRouter.post('/mark-all-read', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    await notificationService.markAllAsRead(user.id);
    res.json({ success: true, data: { allRead: true } });
  } catch (err) {
    next(err);
  }
});
