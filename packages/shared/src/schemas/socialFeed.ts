import { z } from 'zod';

export const PostTypeEnum = z.enum(['thought', 'doubt', 'project', 'resource', 'milestone']);
export type PostType = z.infer<typeof PostTypeEnum>;

export const CreatePostSchema = z.object({
  communityId: z.string().uuid().optional(),
  postType: PostTypeEnum.default('thought'),
  title: z.string().max(200).optional(),
  content: z.string().min(1, 'Post content is required').max(5000),
  codeSnippet: z.string().optional(),
  lectureItemId: z.string().uuid().optional(),
  timestampSeconds: z.number().int().min(0).optional(),
  tags: z.array(z.string()).default([]),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

export const CreateCommentSchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
  timestampSeconds: z.number().int().min(0).optional(),
  isDoubtAnswer: z.boolean().default(false),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

export const CreateReportSchema = z.object({
  targetType: z.enum(['post', 'comment', 'user']),
  targetId: z.string().uuid(),
  reason: z.enum(['spam', 'harassment', 'hate_speech', 'misinformation', 'other']),
  details: z.string().max(1000).optional(),
});

export type CreateReportInput = z.infer<typeof CreateReportSchema>;

export const CreateCommunitySchema = z.object({
  name: z.string().min(3).max(80),
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().min(10).max(500),
  isPrivate: z.boolean().default(false),
});

export type CreateCommunityInput = z.infer<typeof CreateCommunitySchema>;

export const CreateProjectSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(3000),
  coverUrl: z.string().url().optional().or(z.literal('')),
  repoUrl: z.string().url().optional().or(z.literal('')),
  liveDemoUrl: z.string().url().optional().or(z.literal('')),
  techStack: z.array(z.string()).default([]),
  feedbackRequests: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
