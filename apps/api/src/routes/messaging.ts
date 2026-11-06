import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { messagingService } from '../services/messagingService.js';
import {
  CreateDMConversationSchema,
  CreateGroupConversationSchema,
  SendMessageSchema,
} from '@gyanix/shared';

export const messagingRouter = Router();

messagingRouter.use(requireAuth);

messagingRouter.get('/conversations', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const conversations = await messagingService.listConversations(user.id);
    res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
});

messagingRouter.post('/conversations/dm', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = CreateDMConversationSchema.parse(req.body);
    const result = await messagingService.getOrCreateDM(user.id, input.targetUserId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

messagingRouter.post('/conversations/group', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = CreateGroupConversationSchema.parse(req.body);
    const result = await messagingService.createGroup(user.id, input.title, input.participantIds);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

messagingRouter.get('/conversations/:id/messages', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const conversationId = String(req.params['id']);
    const limit = req.query['limit'] ? Number(req.query['limit']) : 50;
    const offset = req.query['offset'] ? Number(req.query['offset']) : 0;

    const messages = await messagingService.listMessages(conversationId, user.id, limit, offset);
    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
});

messagingRouter.post('/send', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = SendMessageSchema.parse(req.body);
    const message = await messagingService.sendMessage(user.id, input);
    res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

messagingRouter.post('/:id/pin', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const messageId = String(req.params['id']);
    const message = await messagingService.togglePin(user.id, messageId);
    res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});
