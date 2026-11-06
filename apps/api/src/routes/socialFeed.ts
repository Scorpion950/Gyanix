import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { communityFeedService } from '../services/communityFeedService.js';
import {
  CreatePostSchema,
  CreateCommentSchema,
  CreateReportSchema,
  CreateCommunitySchema,
  CreateProjectSchema,
} from '@gyanix/shared';

export const socialFeedRouter = Router();

// ─── Posts & Feeds ────────────────────────────────────────────────────────────

socialFeedRouter.get('/posts', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Partial<AuthenticatedRequest>;
    const userId = authReq.user?.id;
    const feedType = req.query['feedType'] as any;
    const communityId = req.query['communityId'] as string | undefined;
    const limit = req.query['limit'] ? Number(req.query['limit']) : 20;
    const offset = req.query['offset'] ? Number(req.query['offset']) : 0;

    const posts = await communityFeedService.listPosts(userId, { feedType, communityId, limit, offset });
    res.json({ success: true, data: posts });
  } catch (err) {
    next(err);
  }
});

socialFeedRouter.post('/posts', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = CreatePostSchema.parse(req.body);
    const post = await communityFeedService.createPost(user.id, input);
    res.json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
});

socialFeedRouter.post('/posts/:id/like', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const postId = String(req.params['id']);
    const result = await communityFeedService.toggleLikePost(user.id, postId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── Comments ─────────────────────────────────────────────────────────────────

socialFeedRouter.get('/posts/:id/comments', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const postId = String(req.params['id']);
    const comments = await communityFeedService.listComments(postId);
    res.json({ success: true, data: comments });
  } catch (err) {
    next(err);
  }
});

socialFeedRouter.post('/posts/:id/comments', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = CreateCommentSchema.parse(req.body);
    const comment = await communityFeedService.createComment(user.id, input);
    res.json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
});

// ─── Reports ──────────────────────────────────────────────────────────────────

socialFeedRouter.post('/reports', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = CreateReportSchema.parse(req.body);
    const report = await communityFeedService.createReport(user.id, input);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// ─── Communities ──────────────────────────────────────────────────────────────

socialFeedRouter.get('/communities', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Partial<AuthenticatedRequest>;
    const userId = authReq.user?.id;
    const communities = await communityFeedService.listCommunities(userId);
    res.json({ success: true, data: communities });
  } catch (err) {
    next(err);
  }
});

socialFeedRouter.get('/communities/:slug', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as Partial<AuthenticatedRequest>;
    const userId = authReq.user?.id;
    const slug = String(req.params['slug']);
    const community = await communityFeedService.getCommunity(slug, userId);
    res.json({ success: true, data: community });
  } catch (err) {
    next(err);
  }
});

socialFeedRouter.post('/communities/:id/join', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const communityId = String(req.params['id']);
    const result = await communityFeedService.toggleJoinCommunity(user.id, communityId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── Projects ─────────────────────────────────────────────────────────────────

socialFeedRouter.get('/projects', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const projects = await communityFeedService.listProjects();
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
});

socialFeedRouter.post('/projects', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const input = CreateProjectSchema.parse(req.body);
    const project = await communityFeedService.createProject(user.id, input);
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});
