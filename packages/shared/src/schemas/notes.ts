import { z } from 'zod';

export const NotePrioritySchema = z.enum(['low', 'medium', 'high']);

export const CreateNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  contentMarkdown: z.string().default(''),
  collectionId: z.string().uuid().optional().nullable(),
  pathId: z.string().uuid().optional().nullable(),
  pathItemId: z.string().uuid().optional().nullable(),
  timestampSeconds: z.number().int().min(0).optional().nullable(),
  priority: NotePrioritySchema.default('medium'),
  deadlineAt: z.string().datetime().optional().nullable(),
  isPinned: z.boolean().default(false),
});

export const UpdateNoteSchema = CreateNoteSchema.partial();

export const CreateCollectionSchema = z.object({
  title: z.string().min(1, 'Collection title is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().default('#2563EB'),
});

export const HeartbeatSessionSchema = z.object({
  sessionId: z.string().uuid().optional(),
  pathItemId: z.string().uuid().optional(),
  secondsDelta: z.number().int().min(1).max(60).default(30), // Validated heartbeat delta
});

export const PomodoroLogSchema = z.object({
  durationMinutes: z.number().int().min(5).max(120),
});

export type NotePriority = z.infer<typeof NotePrioritySchema>;
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;
export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;
export type HeartbeatSessionInput = z.infer<typeof HeartbeatSessionSchema>;
export type PomodoroLogInput = z.infer<typeof PomodoroLogSchema>;

