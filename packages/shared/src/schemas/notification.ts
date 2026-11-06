import { z } from 'zod';

export const NotificationTypeSchema = z.enum([
  'friend_request',
  'friend_accepted',
  'new_follower',
  'new_message',
  'mention',
  'reply',
  'doubt_discussion',
  'friend_completed_course',
  'friend_joined_room',
  'achievement_earned',
  'ai_suggestion',
  'learning_reminder',
  'incomplete_lecture',
  'system',
]);

export const NotificationItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string().nullable().optional(),
  actionUrl: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  isRead: z.boolean().default(false),
  createdAt: z.string(),
});

export const MarkNotificationReadSchema = z.object({
  notificationId: z.string().uuid().optional(),
  all: z.boolean().optional(),
});

export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationItem = z.infer<typeof NotificationItemSchema>;
export type MarkNotificationReadInput = z.infer<typeof MarkNotificationReadSchema>;

