import { supabaseAdmin } from '../config/supabase.js';
import type { LogChallengeDayInput } from '@gyanix/shared';

export interface SearchResultItem {
  type: 'path' | 'problem' | 'note' | 'post' | 'community' | 'user';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export const searchChallengesService = {
  /**
   * Universal Search across Learning Paths, Problems, Notes, Posts, Communities, Users
   */
  async universalSearch(query: string, userId?: string) {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResultItem[] = [];

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
        .select('id, title, content')
        .eq('user_id', userId)
        .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
        .limit(5);

      for (const n of notes || []) {
        results.push({
          type: 'note',
          id: n.id,
          title: n.title,
          subtitle: (n.content || '').slice(0, 60),
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
        subtitle: c.description.slice(0, 60),
        url: `/communities`,
      });
    }

    // 5. User Profiles
    const { data: users } = await supabaseAdmin
      .from('profiles')
      .select('id, username, display_name, bio')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(4);

    for (const u of users || []) {
      results.push({
        type: 'user',
        id: u.id,
        title: u.display_name || u.username,
        subtitle: `@${u.username}`,
        url: `/u/${u.username}`,
      });
    }

    return results;
  },

  /**
   * List Challenges with user participation state
   */
  async listChallenges(userId?: string) {
    const { data: challenges, error } = await supabaseAdmin
      .from('challenges')
      .select('*')
      .order('duration_days', { ascending: true });

    if (error) throw new Error(error.message);

    let userParticipations: Record<string, any> = {};
    if (userId && challenges && challenges.length > 0) {
      const { data: parts } = await supabaseAdmin
        .from('challenge_participants')
        .select('*')
        .eq('user_id', userId);

      if (parts) {
        for (const p of parts) {
          userParticipations[p.challenge_id] = p;
        }
      }
    }

    return (challenges || []).map((ch) => ({
      ...ch,
      participation: userParticipations[ch.id] || null,
    }));
  },

  /**
   * Enroll in Challenge
   */
  async joinChallenge(userId: string, challengeId: string) {
    const { data, error } = await supabaseAdmin
      .from('challenge_participants')
      .insert({
        challenge_id: challengeId,
        user_id: userId,
        current_day: 1,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Already enrolled in this challenge');
      }
      throw new Error(error.message);
    }

    // Increment count
    const { data: ch } = await supabaseAdmin
      .from('challenges')
      .select('participant_count')
      .eq('id', challengeId)
      .single();

    if (ch) {
      await supabaseAdmin
        .from('challenges')
        .update({ participant_count: ch.participant_count + 1 })
        .eq('id', challengeId);
    }

    return data;
  },

  /**
   * Log daily challenge progress
   */
  async logChallengeDay(userId: string, input: LogChallengeDayInput) {
    // 1. Get participant record
    const { data: part, error: pErr } = await supabaseAdmin
      .from('challenge_participants')
      .select('id, current_day, challenge_id, challenges(duration_days)')
      .eq('challenge_id', input.challengeId)
      .eq('user_id', userId)
      .single();

    if (pErr || !part) throw new Error('You are not enrolled in this challenge');

    // 2. Insert log
    const { data: log, error: lErr } = await supabaseAdmin
      .from('challenge_daily_logs')
      .insert({
        participant_id: part.id,
        day_number: input.dayNumber,
        notes: input.notes,
        proof_url: input.proofUrl || null,
      })
      .select()
      .single();

    if (lErr) throw new Error(lErr.message);

    // 3. Check if final day or update day
    const duration = (part as any).challenges?.duration_days || 7;
    const isCompleted = input.dayNumber >= duration;
    const nextDay = Math.min(input.dayNumber + 1, duration);

    await supabaseAdmin
      .from('challenge_participants')
      .update({
        current_day: nextDay,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', part.id);

    return { log, isCompleted, nextDay };
  },
};

