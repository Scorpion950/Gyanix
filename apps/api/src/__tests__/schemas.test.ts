import { describe, it, expect } from 'vitest';
import {
  LoginSchema,
  RegisterSchema,
  CreateNoteSchema,
  CreatePracticeEntrySchema,
  SubmitCodeSchema,
  CreatePostSchema,
  SendMessageSchema,
  CreateRoomSchema,
  JoinChallengeSchema,
  DoubtQuerySchema,
} from '@gyanix/shared';

describe('Shared Schema Validation Suite', () => {
  it('validates auth credentials', () => {
    // Valid login
    const valid = LoginSchema.safeParse({
      email: 'student@gyanix.edu',
      password: 'StrongPassword123!',
    });
    expect(valid.success).toBe(true);

    // Invalid email
    const invalidEmail = LoginSchema.safeParse({
      email: 'not-an-email',
      password: 'StrongPassword123!',
    });
    expect(invalidEmail.success).toBe(false);

    // Too short password
    const shortPass = LoginSchema.safeParse({
      email: 'student@gyanix.edu',
      password: 'short',
    });
    expect(shortPass.success).toBe(false);
  });

  it('validates note creation with optional timestamp', () => {
    const validNote = CreateNoteSchema.safeParse({
      title: 'Distributed Transactions',
      content: 'Two-phase commit requires a coordinator node...',
      timestampSeconds: 145,
    });
    expect(validNote.success).toBe(true);
  });

  it('validates coding practice entries and difficulty limits (1-5)', () => {
    const validPractice = CreatePracticeEntrySchema.safeParse({
      title: 'Two Sum',
      platform: 'LeetCode',
      difficulty: 1,
      status: 'solved',
      timeSpentSeconds: 600,
    });
    expect(validPractice.success).toBe(true);

    // Invalid difficulty > 5
    const invalidDiff = CreatePracticeEntrySchema.safeParse({
      title: 'Impossible Problem',
      difficulty: 10,
    });
    expect(invalidDiff.success).toBe(false);
  });

  it('validates coding submission schema', () => {
    const validSub = SubmitCodeSchema.safeParse({
      problemId: '123e4567-e89b-12d3-a456-426614174000',
      language: 'javascript',
      code: 'function twoSum() { return [0, 1]; }',
      status: 'passed',
      passedTests: 3,
      totalTests: 3,
      executionTimeMs: 12,
    });
    expect(validSub.success).toBe(true);
  });

  it('validates social feed posts with post types', () => {
    const validPost = CreatePostSchema.safeParse({
      postType: 'doubt',
      content: 'Why does Go goroutine stack start at 2KB while OS threads are 2MB?',
      timestampSeconds: 420,
      tags: ['go', 'concurrency'],
    });
    expect(validPost.success).toBe(true);
  });

  it('validates collaborative messages and study rooms', () => {
    const validMsg = SendMessageSchema.safeParse({
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
      content: 'Check this lecture section at 12:34',
      timestampSeconds: 754,
    });
    expect(validMsg.success).toBe(true);

    const validRoom = CreateRoomSchema.safeParse({
      name: 'Algorithm Sprint',
      topic: 'Dynamic Programming',
      maxParticipants: 6,
    });
    expect(validRoom.success).toBe(true);

    // Rejecting rooms with > 6 participants for WebRTC mesh constraint
    const invalidRoom = CreateRoomSchema.safeParse({
      name: 'Oversized Room',
      topic: 'General',
      maxParticipants: 50,
    });
    expect(invalidRoom.success).toBe(false);
  });

  it('validates AI doubt queries with timestamp tracking', () => {
    const validDoubt = DoubtQuerySchema.safeParse({
      lectureTitle: 'Understanding Raft Leader Election',
      question: 'What happens if two candidates request votes at the exact same split-second?',
      timestampSeconds: 312,
    });
    expect(validDoubt.success).toBe(true);
  });
});
