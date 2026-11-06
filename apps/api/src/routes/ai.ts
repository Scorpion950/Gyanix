import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { aiService } from '../ai/service.js';
import { DoubtQuerySchema, GenerateRoadmapSchema, SubmitAssessmentSchema } from '@gyanix/shared';

export const aiRouter = Router();

// Doubt Solver
aiRouter.post('/doubt', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = DoubtQuerySchema.parse(req.body);
    const result = await aiService.solveDoubt(user.id, input);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Generate AI Roadmap
aiRouter.post('/roadmap', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = GenerateRoadmapSchema.parse(req.body);
    const result = await aiService.generateRoadmap(user.id, input);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// List User's Roadmaps
aiRouter.get('/roadmaps', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const roadmaps = await aiService.getUserRoadmaps(user.id);
    res.json({ success: true, data: roadmaps });
  } catch (err) {
    next(err);
  }
});

// Approve Roadmap & convert to Learning Path
aiRouter.post('/roadmaps/:id/approve', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const roadmapId = String(req.params['id']);
    const path = await aiService.approveRoadmap(user.id, roadmapId);
    res.json({ success: true, data: path });
  } catch (err) {
    next(err);
  }
});

// List Assessments
aiRouter.get('/assessments', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pathId = req.query['pathId'] as string | undefined;
    const assessments = await aiService.listAssessments(pathId);
    res.json({ success: true, data: assessments });
  } catch (err) {
    next(err);
  }
});

// Generate New Assessment
aiRouter.post('/assessments/generate', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { topic, pathId, difficulty } = req.body;
    if (!topic || typeof topic !== 'string') {
      res.status(400).json({ success: false, error: 'Topic is required' });
      return;
    }
    const assessment = await aiService.generateAssessment(
      user.id,
      pathId || null,
      topic,
      difficulty ? Number(difficulty) : 3,
    );
    res.json({ success: true, data: assessment });
  } catch (err) {
    next(err);
  }
});

// Get Assessment by ID
aiRouter.get('/assessments/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Partial<AuthenticatedRequest>;
    const userId = authReq.user?.id;
    const assessmentId = String(req.params['id']);
    const assessment = await aiService.getAssessment(assessmentId, userId);
    res.json({ success: true, data: assessment });
  } catch (err) {
    next(err);
  }
});

// Submit Assessment Attempt
aiRouter.post('/assessments/:id/submit', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const assessmentId = String(req.params['id']);
    const input = SubmitAssessmentSchema.parse(req.body);
    const attempt = await aiService.evaluateAttempt(user.id, assessmentId, input.answers);
    res.json({ success: true, data: attempt });
  } catch (err) {
    next(err);
  }
});
