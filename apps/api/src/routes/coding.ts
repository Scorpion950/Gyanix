import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { codingService } from '../services/codingService.js';
import {
  CreatePracticeEntrySchema,
  UpdatePracticeEntrySchema,
  SubmitCodeSchema,
  CreateSnippetSchema,
  UpdateSnippetSchema,
  AICodingAssistSchema,
} from '@gyanix/shared';

export const codingRouter = Router();

// ─── Problems (Public/Authenticated) ──────────────────────────────────────────

codingRouter.get('/problems', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = req.query['category'] as string | undefined;
    const difficulty = req.query['difficulty'] ? Number(req.query['difficulty']) : undefined;
    const search = req.query['search'] as string | undefined;

    const problems = await codingService.listProblems({ category, difficulty, search });
    res.json({ success: true, data: problems });
  } catch (err) {
    next(err);
  }
});

codingRouter.get('/problems/:slug', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const slug = String(req.params['slug']);
    const problem = await codingService.getProblemBySlug(slug);
    res.json({ success: true, data: problem });
  } catch (err) {
    next(err);
  }
});

codingRouter.post('/submit', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = SubmitCodeSchema.parse(req.body);
    const result = await codingService.submitSolution(user.id, input);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── Practice Tracker ─────────────────────────────────────────────────────────

codingRouter.get('/practice', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const status = req.query['status'] as string | undefined;
    const category = req.query['category'] as string | undefined;

    const entries = await codingService.listPracticeEntries(user.id, { status, category });
    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
});

codingRouter.post('/practice', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = CreatePracticeEntrySchema.parse(req.body);
    const entry = await codingService.createPracticeEntry(user.id, input);
    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
});

codingRouter.patch('/practice/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const entryId = String(req.params['id']);
    const input = UpdatePracticeEntrySchema.parse(req.body);
    const updated = await codingService.updatePracticeEntry(user.id, entryId, input);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

codingRouter.delete('/practice/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const entryId = String(req.params['id']);
    await codingService.deletePracticeEntry(user.id, entryId);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

// ─── Snippets / Playgrounds ───────────────────────────────────────────────────

codingRouter.get('/snippets', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const snippets = await codingService.listSnippets(user.id);
    res.json({ success: true, data: snippets });
  } catch (err) {
    next(err);
  }
});

codingRouter.post('/snippets', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = CreateSnippetSchema.parse(req.body);
    const snippet = await codingService.createSnippet(user.id, input);
    res.json({ success: true, data: snippet });
  } catch (err) {
    next(err);
  }
});

codingRouter.patch('/snippets/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const snippetId = String(req.params['id']);
    const input = UpdateSnippetSchema.parse(req.body);
    const updated = await codingService.updateSnippet(user.id, snippetId, input);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

codingRouter.delete('/snippets/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const snippetId = String(req.params['id']);
    await codingService.deleteSnippet(user.id, snippetId);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

// ─── 4-Step AI Coding Assistant ──────────────────────────────────────────────

codingRouter.post('/assist', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = AICodingAssistSchema.parse(req.body);
    const result = await codingService.aiCodingAssist(user.id, input);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});
