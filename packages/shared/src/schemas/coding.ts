import { z } from 'zod';

export const PracticeStatusEnum = z.enum(['solved', 'attempted', 'revisit', 'unsolved']);
export type PracticeStatus = z.infer<typeof PracticeStatusEnum>;

export const CreatePracticeEntrySchema = z.object({
  problemId: z.string().uuid().optional(),
  externalUrl: z.string().url().optional().or(z.literal('')),
  title: z.string().min(1, 'Title is required').max(200),
  platform: z.string().default('Gyanix'),
  category: z.string().default('General'),
  difficulty: z.number().int().min(1).max(5).default(3),
  status: PracticeStatusEnum.default('attempted'),
  timeSpentSeconds: z.number().int().min(0).default(0),
  solutionNotes: z.string().optional(),
  language: z.string().default('javascript'),
});

export type CreatePracticeEntryInput = z.infer<typeof CreatePracticeEntrySchema>;

export const UpdatePracticeEntrySchema = z.object({
  status: PracticeStatusEnum.optional(),
  timeSpentSeconds: z.number().int().min(0).optional(),
  solutionNotes: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  category: z.string().optional(),
});

export type UpdatePracticeEntryInput = z.infer<typeof UpdatePracticeEntrySchema>;

export const SubmitCodeSchema = z.object({
  problemId: z.string().uuid(),
  language: z.string(),
  code: z.string().min(1, 'Code cannot be empty'),
  executionTimeMs: z.number().int().min(0).default(0),
  passedTests: z.number().int().min(0).default(0),
  totalTests: z.number().int().min(0).default(0),
  status: z.enum(['passed', 'failed', 'error', 'timeout']),
  stdout: z.string().optional(),
  errorMessage: z.string().optional(),
});

export type SubmitCodeInput = z.infer<typeof SubmitCodeSchema>;

export const CreateSnippetSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  language: z.string().default('javascript'),
  code: z.string(),
  isPublic: z.boolean().default(false),
});

export type CreateSnippetInput = z.infer<typeof CreateSnippetSchema>;

export const UpdateSnippetSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  language: z.string().optional(),
  code: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export type UpdateSnippetInput = z.infer<typeof UpdateSnippetSchema>;

export const AICodingAssistSchema = z.object({
  problemTitle: z.string(),
  problemDescription: z.string(),
  userCode: z.string(),
  language: z.string().default('javascript'),
  step: z.number().int().min(1).max(4), // 1: error breakdown, 2: small hint, 3: algorithmic approaches, 4: full solution
  errorMessage: z.string().optional(),
});

export type AICodingAssistInput = z.infer<typeof AICodingAssistSchema>;
