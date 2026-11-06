import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { learningPathService } from '../services/learningPathService.js';
import { youtubeService } from '../services/youtubeService.js';
import {
  CreateLearningPathSchema,
  CreateFolderSchema,
  AddLectureSchema,
  ImportPlaylistSchema,
  UpdateLectureProgressSchema,
} from '@gyanix/shared';
import type { Request, Response, NextFunction } from 'express';

export const learningPathsRouter = Router();

/**
 * GET /api/learning-paths
 * List user's paths or public discoverable paths
 */
learningPathsRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const publicOnly = req.query['public'] === 'true';
    const limit = Math.min(Number(req.query['limit']) || 20, 50);
    const offset = Number(req.query['offset']) || 0;

    // Optional user token
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { createClient } = await import('@supabase/supabase-js');
      const { env } = await import('../config/env.js');
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    const result = await learningPathService.listPaths({
      userId: publicOnly ? undefined : userId,
      publicOnly,
      limit,
      offset,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/learning-paths
 * Create a new learning path
 */
learningPathsRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const validated = CreateLearningPathSchema.parse(req.body);

    const path = await learningPathService.createPath(user.id, validated);
    res.json({ success: true, data: path });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/learning-paths/resolve-video
 * Zero-quota lookup of YouTube video metadata (oEmbed / cached)
 */
learningPathsRouter.post('/resolve-video', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { url } = req.body as { url: string };
    if (!url) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'URL is required' } });
      return;
    }

    const metadata = await youtubeService.resolveVideo(url);
    res.json({ success: true, data: metadata });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/learning-paths/import-playlist
 * Import complete YouTube playlist into a newly created learning path
 */
learningPathsRouter.post('/import-playlist', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const validated = ImportPlaylistSchema.parse(req.body);

    // 1. Fetch playlist items
    const playlist = await youtubeService.getPlaylistVideos(validated.playlistUrl);

    // 2. Create the learning path
    const path = await learningPathService.createPath(user.id, {
      title: validated.pathTitle || playlist.title,
      description: `Imported from YouTube playlist: ${validated.playlistUrl}`,
      visibility: validated.visibility,
    });

    // 3. Add all videos as path items
    for (let i = 0; i < playlist.videos.length; i++) {
      const v = playlist.videos[i]!;
      await learningPathService.addLecture(path.id, user.id, {
        youtubeUrl: `https://www.youtube.com/watch?v=${v.youtubeVideoId}`,
        customTitle: v.title,
        position: i,
      });
    }

    const fullPath = await learningPathService.getPathDetails(path.id, user.id);
    res.json({ success: true, data: fullPath });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/learning-paths/:id
 * Retrieve path details, folder hierarchy, items, and caller's progress
 */
learningPathsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { createClient } = await import('@supabase/supabase-js');
      const { env } = await import('../config/env.js');
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    const details = await learningPathService.getPathDetails(id, userId);
    res.json({ success: true, data: details });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/learning-paths/:id/folders
 * Create a folder inside a path
 */
learningPathsRouter.post('/:id/folders', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };
    const validated = CreateFolderSchema.parse(req.body);

    const folder = await learningPathService.addFolder(id, user.id, validated);
    res.json({ success: true, data: folder });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/learning-paths/:id/lectures
 * Add a lecture (YouTube video) into a path or folder
 */
learningPathsRouter.post('/:id/lectures', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };
    const validated = AddLectureSchema.parse(req.body);

    const item = await learningPathService.addLecture(id, user.id, validated);
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/learning-paths/:id/duplicate
 * Fork / duplicate a public path into caller's personal library
 */
learningPathsRouter.post('/:id/duplicate', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };

    const duplicated = await learningPathService.duplicatePath(id, user.id);
    res.json({ success: true, data: duplicated });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/learning-paths/items/:itemId/progress
 * Update playback seconds, completion status, skip reason, or remark
 */
learningPathsRouter.patch('/items/:itemId/progress', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { itemId } = req.params as { itemId: string };
    const validated = UpdateLectureProgressSchema.parse(req.body);

    const progress = await learningPathService.updateLectureProgress(user.id, itemId, validated);
    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/learning-paths/items/:itemId/replace-video
 * Replace unavailable video with an alternative while preserving structure and notes
 */
learningPathsRouter.post('/items/:itemId/replace-video', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { itemId } = req.params as { itemId: string };
    const { newYoutubeUrl } = req.body as { newYoutubeUrl: string };

    if (!newYoutubeUrl) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'New YouTube URL is required' } });
      return;
    }

    const updated = await learningPathService.replaceVideo(itemId, user.id, newYoutubeUrl);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

