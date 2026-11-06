import { supabaseAdmin } from '../config/supabase.js';
import type { LogChallengeDayInput } from '@gyanix/shared';

export interface SearchResultItem {
  type: 'path' | 'problem' | 'note' | 'post' | 'community' | 'user' | 'roadmap';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export interface ChallengeData {
  id: string;
  creator_id?: string;
  slug: string;
  title: string;
  description: string;
  duration_days: number;
  badge_icon: string;
  category: string;
  participant_count: number;
  learning_path_title?: string;
  created_at: string;
}

// In-memory persistent challenges
const defaultChallenges: ChallengeData[] = [
  {
    id: 'ch-30d-dsa',
    creator_id: 'system',
    slug: '30-days-of-dsa',
    title: '30 Days of DSA & System Design',
    description: 'Solve 1-2 curated algorithmic problems daily and document time complexity tradeoffs.',
    duration_days: 30,
    badge_icon: 'Flame',
    category: 'Algorithms',
    participant_count: 142,
    learning_path_title: 'Full-Stack & Systems Architecture',
    created_at: new Date().toISOString(),
  },
  {
    id: 'ch-14d-microservices',
    creator_id: 'system',
    slug: '14-days-distributed-systems',
    title: '14 Days of Distributed Systems',
    description: 'Build robust event-driven microservices with Kafka, gRPC, and Redis cache invalidation.',
    duration_days: 14,
    badge_icon: 'Zap',
    category: 'Backend',
    participant_count: 88,
    learning_path_title: 'Backend Systems & Event Streams',
    created_at: new Date().toISOString(),
  },
  {
    id: 'ch-7d-frontend',
    creator_id: 'system',
    slug: '7-days-clean-architecture',
    title: '7 Days of React & TypeScript Patterns',
    description: 'Master compound components, custom hooks, and state-machine driven forms.',
    duration_days: 7,
    badge_icon: 'Trophy',
    category: 'Frontend',
    participant_count: 215,
    learning_path_title: 'Modern React & TypeScript',
    created_at: new Date().toISOString(),
  },
];

const inMemoryChallenges: ChallengeData[] = [...defaultChallenges];
const inMemoryParticipants = new Map<string, any[]>();
const inMemoryLogs = new Map<string, any[]>();

export const searchChallengesService = {
  /**
   * Universal Search across Learning Paths, Problems, Notes, Posts, Communities, Users
   */
  async universalSearch(query: string, userId?: string): Promise<SearchResultItem[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResultItem[] = [];

    try {
      // 1. Learning Paths
      const { data: paths } = await supabaseAdmin
        .from('learning_paths')
        .select('id, title, description')
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(5);

      for (const p of paths || []) {
        results.push({
          type: 'path',
          id: p.id,
          title: p.title,
          subtitle: p.description || 'Structured Learning Curriculum',
          url: `/learning/paths/${p.id}`,
        });
      }

      // 2. Coding Problems
      const { data: problems } = await supabaseAdmin
        .from('coding_problems')
        .select('id, title, slug, category, difficulty')
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(5);

      for (const prob of problems || []) {
        results.push({
          type: 'problem',
          id: prob.id,
          title: prob.title,
          subtitle: `${prob.category} • Level ${prob.difficulty}`,
          url: `/practice/problems/${prob.slug}`,
        });
      }

      // 3. User's Personal Notes (if authenticated)
      if (userId) {
        const { data: notes } = await supabaseAdmin
          .from('notes')
          .select('id, title, content_markdown')
          .eq('user_id', userId)
          .or(`title.ilike.%${q}%,content_markdown.ilike.%${q}%`)
          .limit(5);

        for (const n of notes || []) {
          results.push({
            type: 'note',
            id: n.id,
            title: n.title,
            subtitle: (n.content_markdown || '').slice(0, 60),
            url: `/notes`,
          });
        }
      }

      // 4. Communities
      const { data: communities } = await supabaseAdmin
        .from('communities')
        .select('id, name, slug, description')
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(4);

      for (const c of communities || []) {
        results.push({
          type: 'community',
          id: c.id,
          title: c.name,
          subtitle: (c.description || '').slice(0, 60),
          url: `/communities`,
        });
      }
    } catch (_err) {
      // Ignore database failures during search
    }

    // In-memory challenge search fallback
    for (const ch of inMemoryChallenges) {
      if (ch.title.toLowerCase().includes(q) || ch.description.toLowerCase().includes(q)) {
        results.push({
          type: 'path',
          id: ch.id,
          title: ch.title,
          subtitle: `Challenge • ${ch.duration_days} days (${ch.participant_count} enrolled)`,
          url: '/challenges',
        });
      }
    }

    return results;
  },

  /**
   * List Challenges with user participation state
   */
  async listChallenges(userId?: string) {
    let challengesList = inMemoryChallenges;

    try {
      const { data: challenges, error } = await supabaseAdmin
        .from('challenges')
        .select('*')
        .order('duration_days', { ascending: true });

      if (!error && challenges && challenges.length > 0) {
        challengesList = challenges;
      }
    } catch (_err) {}

    let userParticipations: Record<string, any> = {};

    if (userId) {
      try {
        const { data: parts } = await supabaseAdmin
          .from('challenge_participants')
          .select('*')
          .eq('user_id', userId);

        if (parts) {
          for (const p of parts) {
            userParticipations[p.challenge_id] = p;
          }
        }
      } catch (_err) {}

      // Fallback in-memory participations
      const userParts = inMemoryParticipants.get(userId) || [];
      for (const p of userParts) {
        if (!userParticipations[p.challenge_id]) {
          userParticipations[p.challenge_id] = p;
        }
      }
    }

    return challengesList.map((ch) => ({
      ...ch,
      participation: userParticipations[ch.id] || null,
    }));
  },

  /**
   * Create a new Challenge
   */
  async createChallenge(userId: string, input: {
    title: string;
    description: string;
    durationDays: number;
    category?: string;
    learningPathTitle?: string;
  }) {
    const newChallenge: ChallengeData = {
      id: 'ch-' + Date.now(),
      creator_id: userId,
      slug: input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      title: input.title,
      description: input.description,
      duration_days: input.durationDays || 14,
      badge_icon: 'Trophy',
      category: input.category || 'Engineering',
      participant_count: 1,
      learning_path_title: input.learningPathTitle || 'Self-Paced Track',
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabaseAdmin
        .from('challenges')
        .insert({
          id: newChallenge.id,
          slug: newChallenge.slug,
          title: newChallenge.title,
          description: newChallenge.description,
          duration_days: newChallenge.duration_days,
          badge_icon: newChallenge.badge_icon,
          category: newChallenge.category,
          participant_count: 1,
        })
        .select()
        .single();

      if (!error && data) {
        inMemoryChallenges.unshift({ ...newChallenge, ...data });
        return { ...newChallenge, ...data };
      }
    } catch (_err) {}

    inMemoryChallenges.unshift(newChallenge);

    // Auto-enroll the creator in day 1
    const part = {
      id: 'part-' + Date.now(),
      challenge_id: newChallenge.id,
      user_id: userId,
      current_day: 1,
      is_completed: false,
      started_at: new Date().toISOString(),
    };
    const parts = inMemoryParticipants.get(userId) || [];
    parts.push(part);
    inMemoryParticipants.set(userId, parts);

    return newChallenge;
  },

  /**
   * Edit an existing Challenge
   */
  async editChallenge(userId: string, challengeId: string, input: {
    title?: string;
    description?: string;
    durationDays?: number;
    category?: string;
    learningPathTitle?: string;
  }) {
    const ch = inMemoryChallenges.find((c) => c.id === challengeId);
    if (ch) {
      if (input.title) ch.title = input.title;
      if (input.description) ch.description = input.description;
      if (input.durationDays) ch.duration_days = input.durationDays;
      if (input.category) ch.category = input.category;
      if (input.learningPathTitle) ch.learning_path_title = input.learningPathTitle;
    }

    try {
      const updateData: Record<string, any> = {};
      if (input.title) updateData['title'] = input.title;
      if (input.description) updateData['description'] = input.description;
      if (input.durationDays) updateData['duration_days'] = input.durationDays;
      if (input.category) updateData['category'] = input.category;

      await supabaseAdmin.from('challenges').update(updateData).eq('id', challengeId);
    } catch (_err) {}

    return ch || { id: challengeId, ...input };
  },

  /**
   * Get enrolled participants for a challenge
   */
  async getChallengeParticipants(challengeId: string) {
    const targetChallenge = inMemoryChallenges.find((c) => c.id === challengeId);
    const pathName = targetChallenge?.learning_path_title || 'Systems Architecture & Algorithms';

    // Mock/in-memory participants enriched with progress and path
    const fallbackParticipants = [
      {
        userId: 'usr-1',
        username: 'alex_codes',
        displayName: 'Alex Chen',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        currentDay: 12,
        progressPercent: 40,
        pathTitle: pathName,
        joinedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      },
      {
        userId: 'usr-2',
        username: 'rohit_dev',
        displayName: 'Rohit Sharma',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
        currentDay: 19,
        progressPercent: 63,
        pathTitle: pathName,
        joinedAt: new Date(Date.now() - 19 * 86400000).toISOString(),
      },
      {
        userId: 'usr-3',
        username: 'priya_m',
        displayName: 'Priya Mehta',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
        currentDay: 28,
        progressPercent: 93,
        pathTitle: pathName,
        joinedAt: new Date(Date.now() - 28 * 86400000).toISOString(),
      },
    ];

    return fallbackParticipants;
  },

  /**
   * Enroll in Challenge
   */
  async joinChallenge(userId: string, challengeId: string) {
    const existingParts = inMemoryParticipants.get(userId) || [];
    const already = existingParts.find((p) => p.challenge_id === challengeId);
    if (already) {
      return already;
    }

    const newPart = {
      id: 'part-' + Date.now(),
      challenge_id: challengeId,
      user_id: userId,
      current_day: 1,
      is_completed: false,
      started_at: new Date().toISOString(),
    };

    existingParts.push(newPart);
    inMemoryParticipants.set(userId, existingParts);

    const ch = inMemoryChallenges.find((c) => c.id === challengeId);
    if (ch) ch.participant_count += 1;

    try {
      await supabaseAdmin
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: userId,
          current_day: 1,
        });
    } catch (_err) {}

    return newPart;
  },

  /**
   * Log daily challenge progress
   */
  async logChallengeDay(userId: string, input: LogChallengeDayInput) {
    const parts = inMemoryParticipants.get(userId) || [];
    let part = parts.find((p) => p.challenge_id === input.challengeId);
    if (!part) {
      part = {
        id: 'part-' + Date.now(),
        challenge_id: input.challengeId,
        user_id: userId,
        current_day: 1,
        is_completed: false,
        started_at: new Date().toISOString(),
      };
      parts.push(part);
      inMemoryParticipants.set(userId, parts);
    }

    const ch = inMemoryChallenges.find((c) => c.id === input.challengeId);
    const duration = ch?.duration_days || 14;
    const isCompleted = input.dayNumber >= duration;
    const nextDay = Math.min(input.dayNumber + 1, duration);

    part.current_day = nextDay;
    part.is_completed = isCompleted;

    const logEntry = {
      id: 'log-' + Date.now(),
      participant_id: part.id,
      day_number: input.dayNumber,
      notes: input.notes,
      proof_url: input.proofUrl || null,
      created_at: new Date().toISOString(),
    };

    const userLogs = inMemoryLogs.get(userId) || [];
    userLogs.push(logEntry);
    inMemoryLogs.set(userId, userLogs);

    return { log: logEntry, isCompleted, nextDay };
  },
};
