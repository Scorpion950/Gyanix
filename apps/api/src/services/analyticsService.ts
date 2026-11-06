import { supabaseAdmin } from '../config/supabase.js';

export const analyticsService = {
  /**
   * Records a validated heartbeat from an active studying session.
   * Capped to prevent fraudulent inflation of hours and streaks.
   */
  async recordHeartbeat(userId: string, pathItemId?: string, reportedDeltaSeconds = 30) {
    // 1. Cap delta between 1 and 60 seconds
    const validatedDelta = Math.min(Math.max(reportedDeltaSeconds, 1), 60);
    const today = new Date().toISOString().split('T')[0];

    // 2. Find or create an active session
    const { data: activeSession } = await supabaseAdmin
      .from('learning_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (activeSession) {
      await supabaseAdmin
        .from('learning_sessions')
        .update({
          duration_seconds: activeSession.duration_seconds + validatedDelta,
          heartbeat_count: activeSession.heartbeat_count + 1,
          last_heartbeat_at: new Date().toISOString(),
        })
        .eq('id', activeSession.id);
    } else {
      await supabaseAdmin.from('learning_sessions').insert({
        user_id: userId,
        path_item_id: pathItemId || null,
        duration_seconds: validatedDelta,
        heartbeat_count: 1,
        is_active: true,
      });
    }

    // 3. Upsert daily learning rollup
    const { data: rollup } = await supabaseAdmin
      .from('daily_learning_rollups')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (rollup) {
      await supabaseAdmin
        .from('daily_learning_rollups')
        .update({
          total_seconds: rollup.total_seconds + validatedDelta,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rollup.id);
    } else {
      await supabaseAdmin.from('daily_learning_rollups').insert({
        user_id: userId,
        date: today,
        total_seconds: validatedDelta,
      });
    }

    // Check streak milestones
    await this.checkStreakMilestone(userId);

    return { recorded: true, validatedDelta };
  },

  /**
   * Log completed Pomodoro block
   */
  async logPomodoro(userId: string, durationMinutes: number) {
    const today = new Date().toISOString().split('T')[0];
    const seconds = durationMinutes * 60;

    const { data: rollup } = await supabaseAdmin
      .from('daily_learning_rollups')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (rollup) {
      await supabaseAdmin
        .from('daily_learning_rollups')
        .update({
          total_seconds: rollup.total_seconds + seconds,
          pomodoros_completed: rollup.pomodoros_completed + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rollup.id);
    } else {
      await supabaseAdmin.from('daily_learning_rollups').insert({
        user_id: userId,
        date: today,
        total_seconds: seconds,
        pomodoros_completed: 1,
      });
    }

    return { success: true };
  },

  /**
   * Computes streak & stats summary for dashboard and profile
   */
  async getStatsSummary(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    // Today's rollup
    const { data: todayRollup } = await supabaseAdmin
      .from('daily_learning_rollups')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    // Last 7 days rollups
    const { data: recentRollups } = await supabaseAdmin
      .from('daily_learning_rollups')
      .select('date, total_seconds')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30);

    // Calculate real consecutive days streak
    let streakDays = 0;
    if (recentRollups && recentRollups.length > 0) {
      let checkDate = new Date();
      // If no activity today yet, start checking from yesterday
      const hasToday = recentRollups.some((r) => r.date === today && r.total_seconds > 0);
      if (!hasToday) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      for (let i = 0; i < 30; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const match = recentRollups.find((r) => r.date === dateStr && r.total_seconds > 0);
        if (match) {
          streakDays++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // 7-day mini bars
    const weekProgress: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const match = recentRollups?.find((r) => r.date === dStr);
      weekProgress.push(Math.round((match?.total_seconds || 0) / 60)); // in minutes
    }

    return {
      todayMinutes: Math.round((todayRollup?.total_seconds || 0) / 60),
      streakDays: Math.max(streakDays, 1),
      weekProgress,
      pomodorosToday: todayRollup?.pomodoros_completed || 0,
    };
  },

  /**
   * Check and unlock streak achievements
   */
  async checkStreakMilestone(userId: string) {
    // Check first lecture
    const { data: anyProgress } = await supabaseAdmin
      .from('user_lecture_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .limit(1);

    if (anyProgress && anyProgress.length > 0) {
      await this.unlockAchievement(userId, 'first_lecture');
    }
  },

  async unlockAchievement(userId: string, achievementCode: string) {
    const { data: ach } = await supabaseAdmin
      .from('achievements')
      .select('id')
      .eq('code', achievementCode)
      .single();

    if (!ach) return;

    try {
      await supabaseAdmin
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: ach.id,
        });
    } catch (_err) {
      // Ignore if already unlocked
    }
  },

  async getAchievements(userId: string) {
    const { data: all } = await supabaseAdmin.from('achievements').select('*');
    const { data: unlocked } = await supabaseAdmin
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId);

    const unlockedMap: Record<string, string> = {};
    for (const u of unlocked || []) {
      unlockedMap[u.achievement_id] = u.unlocked_at;
    }

    return (all || []).map((ach) => ({
      ...ach,
      isUnlocked: !!unlockedMap[ach.id],
      unlockedAt: unlockedMap[ach.id] || null,
    }));
  },
};
