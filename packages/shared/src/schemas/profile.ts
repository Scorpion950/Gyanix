import { z } from 'zod';

// ─── Profile Schemas ─────────────────────────────────────────────────────────

export const SkillLevelSchema = z.enum([
  'absolute_beginner',
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);

export const ProfessionSchema = z.enum([
  'student',
  'software_engineer',
  'data_scientist',
  'designer',
  'product_manager',
  'devops_engineer',
  'researcher',
  'educator',
  'other',
]);

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  bio: z.string().max(500).optional(),
  profession: ProfessionSchema.optional(),
  avatarUrl: z.string().url().optional().nullable(),
  githubUrl: z
    .string()
    .url()
    .regex(/github\.com\//, 'Must be a GitHub URL')
    .optional()
    .nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  location: z.string().max(100).optional().nullable(),
});

export const OnboardingSchema = z.object({
  displayName: z.string().min(1).max(60),
  profession: ProfessionSchema,
  interests: z.array(z.string()).max(20),
  careerGoals: z.string().max(500).optional(),
  skillLevel: SkillLevelSchema,
  technologiesToLearn: z.array(z.string()).max(20),
  learningPreferences: z.object({
    dailyGoalMinutes: z.number().int().min(5).max(480).default(30),
    preferredSessionLength: z.enum(['short', 'medium', 'long']).default('medium'),
    learningStyle: z.enum(['visual', 'reading', 'hands_on', 'mixed']).default('mixed'),
  }).optional(),
});

export type SkillLevel = z.infer<typeof SkillLevelSchema>;
export type Profession = z.infer<typeof ProfessionSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type OnboardingInput = z.infer<typeof OnboardingSchema>;
