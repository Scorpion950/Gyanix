import { z } from 'zod';

export const CreateRoomSchema = z.object({
  name: z.string().min(3, 'Room name must be at least 3 characters').max(80),
  topic: z.string().min(2, 'Topic is required').max(100),
  currentVideoUrl: z.string().url().optional().or(z.literal('')),
  isPrivate: z.boolean().default(false),
  accessCode: z.string().max(20).optional(),
  maxParticipants: z.number().int().min(2).max(6).default(6),
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;

export const UpdateVideoSyncSchema = z.object({
  currentVideoUrl: z.string().optional(),
  timestampSeconds: z.number().int().min(0),
  isPlaying: z.boolean(),
});

export type UpdateVideoSyncInput = z.infer<typeof UpdateVideoSyncSchema>;

export const SaveWhiteboardSchema = z.object({
  whiteboardData: z.record(z.any()),
});

export type SaveWhiteboardInput = z.infer<typeof SaveWhiteboardSchema>;
