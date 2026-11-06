import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { roomService } from '../services/roomService.js';
import {
  CreateRoomSchema,
  UpdateVideoSyncSchema,
  SaveWhiteboardSchema,
} from '@gyanix/shared';

export const roomsRouter = Router();

// List Active Study Rooms
roomsRouter.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rooms = await roomService.listRooms();
    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
});

// Create Room
roomsRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = CreateRoomSchema.parse(req.body);
    const room = await roomService.createRoom(user.id, input);
    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

// Get Room Details
roomsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roomId = String(req.params['id']);
    const room = await roomService.getRoom(roomId);
    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

// Join Room
roomsRouter.post('/:id/join', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const roomId = String(req.params['id']);
    const accessCode = req.body.accessCode as string | undefined;
    const room = await roomService.joinRoom(roomId, user.id, accessCode);
    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

// Leave Room
roomsRouter.post('/:id/leave', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const roomId = String(req.params['id']);
    const result = await roomService.leaveRoom(roomId, user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Sync Video Playback
roomsRouter.post('/:id/sync', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roomId = String(req.params['id']);
    const input = UpdateVideoSyncSchema.parse(req.body);
    const room = await roomService.updateVideoSync(roomId, input);
    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

// Save Whiteboard
roomsRouter.post('/:id/whiteboard', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roomId = String(req.params['id']);
    const input = SaveWhiteboardSchema.parse(req.body);
    const room = await roomService.saveWhiteboard(roomId, input.whiteboardData);
    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});
