import { z } from 'zod';

export const DoubtQuerySchema = z.object({
  lectureTitle: z.string().min(1),
  timestampSeconds: z.number().int().min(0).default(0),
  question: z.string().min(3, 'Question must be at least 3 characters').max(1000),
  contextSnippet: z.string().max(2000).optional(),
});

export const GenerateRoadmapSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(100),
  targetRole: z.string().max(100).optional(),
  currentSkillLevel: z.union([
    z.enum(['absolute_beginner', 'beginner', 'intermediate', 'advanced', 'expert']),
    z.number(),
    z.string(),
  ]).default('beginner'),
});

export const AssessmentQuestionTypeSchema = z.enum(['mcq', 'conceptual', 'code_scenario']);

export const AssessmentQuestionSchema = z.object({
  id: z.string(),
  type: AssessmentQuestionTypeSchema,
  prompt: z.string(),
  codeSnippet: z.string().optional(),
  options: z.array(z.string()).optional(), // for MCQ
  correctOptionIndex: z.number().int().optional(),
  explanation: z.string(),
  difficulty: z.number().int().min(1).max(5),
  metricTarget: z.enum(['learning', 'knowledge', 'practical']).default('knowledge'),
});

export const SubmitAssessmentSchema = z.object({
  assessmentId: z.string().optional(),
  answers: z.record(z.union([z.number(), z.string()])),
});

export type DoubtQueryInput = z.infer<typeof DoubtQuerySchema>;
export type GenerateRoadmapInput = z.infer<typeof GenerateRoadmapSchema>;
export type AssessmentQuestionType = z.infer<typeof AssessmentQuestionTypeSchema>;
export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;
export type SubmitAssessmentInput = z.infer<typeof SubmitAssessmentSchema>;

