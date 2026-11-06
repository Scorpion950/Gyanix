import { Router, type Request, type Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { searchChallengesService } from '../services/searchChallengesService.js';
import { JoinChallengeSchema, LogChallengeDaySchema } from '@gyanix/shared';

export const searchChallengesRouter = Router();

// Universal Search
searchChallengesRouter.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as Partial<AuthenticatedRequest>;
    const userId = authReq.user?.id;
    const query = String(req.query['q'] || '');

    const results = await searchChallengesService.universalSearch(query, userId);
    res.json({ success: true, data: results });
  } catch (_err) {
    res.json({ success: true, data: [] });
  }
});

// List Challenges
searchChallengesRouter.get('/challenges', async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as Partial<AuthenticatedRequest>;
    const userId = authReq.user?.id;

    const challenges = await searchChallengesService.listChallenges(userId);
    res.json({ success: true, data: challenges });
  } catch (_err) {
    const fallback = await searchChallengesService.listChallenges();
    res.json({ success: true, data: fallback });
  }
});

// Create Challenge
searchChallengesRouter.post('/challenges', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { title, description, durationDays, category, learningPathTitle } = req.body;
    if (!title || !description) {
      res.status(400).json({ success: false, error: 'Title and description are required' });
      return;
    }

    const created = await searchChallengesService.createChallenge(user.id, {
      title,
      description,
      durationDays: Number(durationDays) || 14,
      category,
      learningPathTitle,
    });
    res.json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to create challenge' });
  }
});

// Edit Challenge
searchChallengesRouter.patch('/challenges/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };
    const { title, description, durationDays, category, learningPathTitle } = req.body;

    const updatePayload: Record<string, any> = {
      title,
      description,
      category,
      learningPathTitle,
    };
    if (durationDays !== undefined && durationDays !== null) {
      updatePayload['durationDays'] = Number(durationDays);
    }

    const updated = await searchChallengesService.editChallenge(user.id, id, updatePayload);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to edit challenge' });
  }
});

// Get Challenge Participants & their tracked learning paths
searchChallengesRouter.get('/challenges/:id/participants', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const participants = await searchChallengesService.getChallengeParticipants(id);
    res.json({ success: true, data: participants });
  } catch (_err) {
    res.json({ success: true, data: [] });
  }
});

// Join Challenge
searchChallengesRouter.post('/challenges/join', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = JoinChallengeSchema.parse(req.body);
    const result = await searchChallengesService.joinChallenge(user.id, input.challengeId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to join challenge' });
  }
});

// Log Daily Challenge Progress
searchChallengesRouter.post('/challenges/log', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = LogChallengeDaySchema.parse(req.body);
    const result = await searchChallengesService.logChallengeDay(user.id, input);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to log day' });
  }
});
