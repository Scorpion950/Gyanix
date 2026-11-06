import { z } from 'zod';

export const CreateDMConversationSchema = z.object({
  targetUserId: z.string().uuid(),
});

export type CreateDMConversationInput = z.infer<typeof CreateDMConversationSchema>;

export const CreateGroupConversationSchema = z.object({
  title: z.string().min(2, 'Group title must be at least 2 characters').max(80),
  participantIds: z.array(z.string().uuid()).min(1, 'At least one participant required'),
});

export type CreateGroupConversationInput = z.infer<typeof CreateGroupConversationSchema>;

export const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1, 'Message cannot be empty').max(4000),
  codeSnippet: z.string().optional(),
  lectureItemId: z.string().uuid().optional(),
  timestampSeconds: z.number().int().min(0).optional(),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;

