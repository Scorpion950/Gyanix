import { z } from 'zod';

export const JoinChallengeSchema = z.object({
  challengeId: z.string().min(1, 'Challenge ID is required'),
});

export type JoinChallengeInput = z.infer<typeof JoinChallengeSchema>;

export const LogChallengeDaySchema = z.object({
  challengeId: z.string().min(1, 'Challenge ID is required'),
  dayNumber: z.number().int().min(1).max(100),
  notes: z.string().min(5, 'Notes must be at least 5 characters').max(2000),
  proofUrl: z.string().url().optional().or(z.literal('')),
});

export type LogChallengeDayInput = z.infer<typeof LogChallengeDaySchema>;

