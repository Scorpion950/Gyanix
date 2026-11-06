import { z } from 'zod';

export const PathVisibilitySchema = z.enum(['private', 'public', 'friends']);

export const LectureStatusSchema = z.enum([
  'not_started',
  'watching',
  'completed',
  'on_hold',
  'skipped',
]);

export const CreateLearningPathSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  description: z.string().max(2000).optional(),
  coverUrl: z.string().url().optional().nullable(),
  visibility: PathVisibilitySchema.default('private'),
});

export const UpdateLearningPathSchema = CreateLearningPathSchema.partial();

export const CreateFolderSchema = z.object({
  title: z.string().min(1, 'Folder title is required').max(100),
  parentFolderId: z.string().uuid().optional().nullable(),
  position: z.number().int().default(0),
});

export const AddLectureSchema = z.object({
  youtubeUrl: z.string().min(1, 'YouTube URL is required'),
  folderId: z.string().uuid().optional().nullable(),
  customTitle: z.string().max(150).optional(),
  position: z.number().int().default(0),
});

export const ImportPlaylistSchema = z.object({
  playlistUrl: z.string().min(1, 'Playlist URL is required'),
  pathTitle: z.string().max(150).optional(),
  visibility: PathVisibilitySchema.default('private'),
});

export const UpdateLectureProgressSchema = z.object({
  status: LectureStatusSchema.optional(),
  playbackSeconds: z.number().int().min(0).optional(),
  skipReason: z.string().max(300).optional().nullable(),
  postLectureRemark: z.string().max(500).optional().nullable(),
});

export const ReorderItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      folderId: z.string().uuid().nullable().optional(),
      position: z.number().int(),
    }),
  ),
});

export type PathVisibility = z.infer<typeof PathVisibilitySchema>;
export type LectureStatus = z.infer<typeof LectureStatusSchema>;
export type CreateLearningPathInput = z.infer<typeof CreateLearningPathSchema>;
export type UpdateLearningPathInput = z.infer<typeof UpdateLearningPathSchema>;
export type CreateFolderInput = z.infer<typeof CreateFolderSchema>;
export type AddLectureInput = z.infer<typeof AddLectureSchema>;
export type ImportPlaylistInput = z.infer<typeof ImportPlaylistSchema>;
export type UpdateLectureProgressInput = z.infer<typeof UpdateLectureProgressSchema>;
export type ReorderItemsInput = z.infer<typeof ReorderItemsSchema>;
