import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth, requireAdmin, type AuthenticatedRequest } from '../middleware/auth.js';
import { adminService } from '../services/adminService.js';

export const adminRouter = Router();

// Secure entire admin router: must be authenticated admin
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

adminRouter.get('/kpis', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const kpis = await adminService.getKPIs();
    res.json({ success: true, data: kpis });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/moderation', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const queue = await adminService.listModerationQueue();
    res.json({ success: true, data: queue });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/moderation/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const reportId = String(req.params['id']);
    const action = req.body.action as 'resolve' | 'dismiss' | 'remove';
    if (!['resolve', 'dismiss', 'remove'].includes(action)) {
      res.status(400).json({ success: false, error: 'Invalid moderation action' });
      return;
    }
    const result = await adminService.moderateReport(user.id, reportId, action);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/ai-logs', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logs = await adminService.listAIUsageLogs();
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});
