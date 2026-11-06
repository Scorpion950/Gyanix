import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { notesService } from '../services/notesService.js';
import { CreateNoteSchema, UpdateNoteSchema, CreateCollectionSchema } from '@gyanix/shared';
import type { Request, Response, NextFunction } from 'express';

export const notesRouter = Router();

notesRouter.use(requireAuth);

/**
 * GET /api/notes
 * List user's notes with optional filters (collection, pathItem, search query)
 */
notesRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const collectionId = req.query['collectionId'] as string | undefined;
    const pathItemId = req.query['pathItemId'] as string | undefined;
    const query = req.query['q'] as string | undefined;

    const notes = await notesService.listNotes(user.id, { collectionId, pathItemId, query });
    res.json({ success: true, data: notes });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notes
 * Create a new note
 */
notesRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const validated = CreateNoteSchema.parse(req.body);

    const note = await notesService.createNote(user.id, validated);
    res.json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notes/:id
 * Update an existing note
 */
notesRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };
    const validated = UpdateNoteSchema.parse(req.body);

    const updated = await notesService.updateNote(user.id, id, validated);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/notes/:id
 */
notesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };

    await notesService.deleteNote(user.id, id);
    res.json({ success: true, data: { id, deleted: true } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notes/collections
 */
notesRouter.get('/collections', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const collections = await notesService.listCollections(user.id);
    res.json({ success: true, data: collections });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notes/collections
 */
notesRouter.post('/collections', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const validated = CreateCollectionSchema.parse(req.body);

    const collection = await notesService.createCollection(user.id, validated);
    res.json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
});

