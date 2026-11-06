import { z } from 'zod';

export const ProfileVisibilitySchema = z.enum(['public', 'friends_only', 'private']);

export const UserSettingsSchema = z.object({
  profileVisibility: ProfileVisibilitySchema.default('public'),
  activityVisible: z.boolean().default(true),
  learningPathsVisible: z.boolean().default(true),
  streaksVisible: z.boolean().default(true),
  aiPersonalisation: z.boolean().default(true),
  emailNotifications: z.boolean().default(false),
  unfinishedLectureReminders: z.boolean().default(true),
});

export const SocialActionTypeSchema = z.enum([
  'send_friend_request',
  'accept_friend_request',
  'reject_friend_request',
  'cancel_friend_request',
  'unfriend',
  'follow',
  'unfollow',
  'block',
  'unblock',
]);

export const SocialActionSchema = z.object({
  action: SocialActionTypeSchema,
  targetUsername: z.string().min(3).max(30),
});

export type ProfileVisibility = z.infer<typeof ProfileVisibilitySchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type SocialActionType = z.infer<typeof SocialActionTypeSchema>;
export type SocialActionInput = z.infer<typeof SocialActionSchema>;

export interface SocialRelationshipStatus {
  isFriend: boolean;
  isFriendPendingSent: boolean;
  isFriendPendingReceived: boolean;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isBlocked: boolean;
  isBlockedBy: boolean;
}

