import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { searchChallengesService } from '../services/searchChallengesService.js';
import { JoinChallengeSchema, LogChallengeDaySchema } from '@gyanix/shared';

export const searchChallengesRouter = Router();

// Universal Search
searchChallengesRouter.get('/search', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Partial<AuthenticatedRequest>;
    const userId = authReq.user?.id;
    const query = String(req.query['q'] || '');

    const results = await searchChallengesService.universalSearch(query, userId);
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

// List Challenges
searchChallengesRouter.get('/challenges', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Partial<AuthenticatedRequest>;
    const userId = authReq.user?.id;

    const challenges = await searchChallengesService.listChallenges(userId);
    res.json({ success: true, data: challenges });
  } catch (err) {
    next(err);
  }
});

// Join Challenge
searchChallengesRouter.post('/challenges/join', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = JoinChallengeSchema.parse(req.body);
    const result = await searchChallengesService.joinChallenge(user.id, input.challengeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Log Daily Challenge Progress
searchChallengesRouter.post('/challenges/log', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = LogChallengeDaySchema.parse(req.body);
    const result = await searchChallengesService.logChallengeDay(user.id, input);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});
