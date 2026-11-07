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

// In-memory persistent challenges — only real user-created challenges, no fake defaults
const inMemoryChallenges: ChallengeData[] = [];
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
        // Exclude dummy static seed challenges that user did not create
        const real = challenges.filter(
          (c) => c.creator_id || c.id?.startsWith('ch-') || (userId && c.creator_id === userId)
        );
        challengesList = real.length > 0 ? real : inMemoryChallenges;
      }
    } catch (_err) { }

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
      } catch (_err) { }

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
      isCreator: userId ? ch.creator_id === userId : false,
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
    } catch (_err) { }

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
    if (ch && ch.creator_id && ch.creator_id !== userId) {
      throw new Error('Unauthorized: Only the challenge creator can edit this challenge.');
    }

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
    } catch (_err) { }

    return ch || { id: challengeId, ...input };
  },

  /**
   * Get enrolled participants for a challenge — only real participants, no fake defaults
   */
  async getChallengeParticipants(challengeId: string) {
    const targetChallenge = inMemoryChallenges.find((c) => c.id === challengeId);
    const pathName = targetChallenge?.learning_path_title || 'Target Curriculum';

    try {
      const { data } = await supabaseAdmin
        .from('challenge_participants')
        .select(`
          id,
          user_id,
          current_day,
          is_completed,
          created_at,
          profiles:user_id (id, username, display_name, avatar_url)
        `)
        .eq('challenge_id', challengeId);

      if (data && data.length > 0) {
        return data.map((p: any) => ({
          userId: p.profiles?.id || p.user_id,
          username: p.profiles?.username || 'learner',
          displayName: p.profiles?.display_name || 'Gyanix Learner',
          avatarUrl: p.profiles?.avatar_url || null,
          currentDay: p.current_day || 1,
          progressPercent: Math.round(((p.current_day || 1) / (targetChallenge?.duration_days || 14)) * 100),
          pathTitle: pathName,
          joinedAt: p.created_at || new Date().toISOString(),
        }));
      }
    } catch (_err) {}

    // In-memory enrolled participants
    const realParticipants: any[] = [];
    for (const [userId, parts] of inMemoryParticipants.entries()) {
      const part = parts.find((p) => p.challenge_id === challengeId);
      if (part) {
        realParticipants.push({
          userId: userId,
          username: 'learner',
          displayName: 'Current User',
          avatarUrl: null,
          currentDay: part.current_day || 1,
          progressPercent: Math.round(((part.current_day || 1) / (targetChallenge?.duration_days || 14)) * 100),
          pathTitle: pathName,
          joinedAt: part.started_at || new Date().toISOString(),
        });
      }
    }

    return realParticipants;
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
    } catch (_err) { }

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
