// Application-wide constants

export const APP_NAME = 'Gyanix' as const;
export const APP_VERSION = '0.1.0' as const;

// ─── Role constants ───────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
} as const;

// ─── Lecture status ───────────────────────────────────────────────────────────
export const LECTURE_STATUS = {
  NOT_STARTED: 'not_started',
  WATCHING: 'watching',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  SKIPPED: 'skipped',
} as const;

// ─── Difficulty levels ────────────────────────────────────────────────────────
export const DIFFICULTY = {
  ABSOLUTE_BEGINNER: 1,
  BEGINNER: 2,
  INTERMEDIATE: 3,
  ADVANCED: 4,
  EXPERT: 5,
} as const;

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Absolute Beginner',
  2: 'Beginner',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

// ─── Progress metric names ────────────────────────────────────────────────────
export const PROGRESS_METRICS = {
  LEARNING: 'learning',
  KNOWLEDGE: 'knowledge',
  PRACTICAL: 'practical',
} as const;

// ─── Learning path visibility ─────────────────────────────────────────────────
export const PATH_VISIBILITY = {
  PRIVATE: 'private',
  PUBLIC: 'public',
  FRIENDS: 'friends',
} as const;

// ─── Pagination defaults ──────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ─── File size limits ─────────────────────────────────────────────────────────
export const FILE_SIZE_LIMITS = {
  AVATAR: 5 * 1024 * 1024,          // 5 MB
  MESSAGE_IMAGE: 10 * 1024 * 1024,  // 10 MB
  VOICE_MESSAGE: 5 * 1024 * 1024,   // 5 MB
  WHITEBOARD_EXPORT: 20 * 1024 * 1024, // 20 MB
} as const;

// ─── Rate limiting ────────────────────────────────────────────────────────────
export const RATE_LIMITS = {
  AUTH_WINDOW_MS: 15 * 60 * 1000,   // 15 minutes
  AUTH_MAX_REQUESTS: 10,
  API_WINDOW_MS: 60 * 1000,         // 1 minute
  API_MAX_REQUESTS: 100,
  AI_WINDOW_MS: 60 * 1000,          // 1 minute
  AI_MAX_REQUESTS: 10,
  YOUTUBE_SEARCH_DAILY_MAX: 20,     // per user per day
} as const;

// ─── Inactivity timeout ───────────────────────────────────────────────────────
export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
export const HEARTBEAT_INTERVAL_MS = 30 * 1000;       // 30 seconds

// ─── WebRTC limits ────────────────────────────────────────────────────────────
export const MAX_ROOM_VOICE_VIDEO_PARTICIPANTS = 6;
