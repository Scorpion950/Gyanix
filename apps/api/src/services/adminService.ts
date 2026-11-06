import { supabaseAdmin } from '../config/supabase.js';

export const adminService = {
  /**
   * Get Platform Health & Operational KPIs
   */
  async getKPIs() {
    const { count: totalUsers } = await supabaseAdmin.from('profiles').select('id', { count: 'exact' });
    const { count: totalPaths } = await supabaseAdmin.from('learning_paths').select('id', { count: 'exact' });
    const { count: totalSubmissions } = await supabaseAdmin.from('coding_submissions').select('id', { count: 'exact' });
    const { count: pendingReports } = await supabaseAdmin
      .from('content_reports')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    const { data: aiLogs } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('tokens_used, latency_ms');

    let totalTokens = 0;
    let avgLatency = 0;
    if (aiLogs && aiLogs.length > 0) {
      totalTokens = aiLogs.reduce((acc, log) => acc + (log.tokens_used || 0), 0);
      avgLatency = Math.round(aiLogs.reduce((acc, log) => acc + (log.latency_ms || 0), 0) / aiLogs.length);
    }

    return {
      totalUsers: totalUsers || 0,
      totalLearningPaths: totalPaths || 0,
      totalCodingSubmissions: totalSubmissions || 0,
      pendingReports: pendingReports || 0,
      totalAIRequests: aiLogs?.length || 0,
      totalAITokensUsed: totalTokens,
      averageAILatencyMs: avgLatency,
    };
  },

  /**
   * List pending content moderation queue
   */
  async listModerationQueue() {
    const { data, error } = await supabaseAdmin
      .from('content_reports')
      .select(
        `
        id, target_type, target_id, reason, details, status, created_at,
        profiles:reporter_id (id, username, display_name)
      `
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Take moderation action on reported content
   */
  async moderateReport(adminId: string, reportId: string, action: 'resolve' | 'dismiss' | 'remove') {
    const { data: report, error: rErr } = await supabaseAdmin
      .from('content_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (rErr || !report) throw new Error('Report not found');

    if (action === 'remove' && report.target_type === 'post') {
      // Mark post removed
      await supabaseAdmin
        .from('posts')
        .update({ moderation_status: 'removed' })
        .eq('id', report.target_id);
    }

    const newStatus = action === 'dismiss' ? 'dismissed' : 'resolved';
    const { data, error } = await supabaseAdmin
      .from('content_reports')
      .update({ status: newStatus })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: adminId,
      action: `moderate_${action}`,
      target_type: report.target_type,
      target_id: report.target_id,
      metadata: { reason: report.reason },
    });

    return data;
  },

  /**
   * List recent AI usage logs
   */
  async listAIUsageLogs(limit = 50) {
    const { data, error } = await supabaseAdmin
      .from('ai_usage_logs')
      .select(
        `
        id, feature_name, provider_id, model_id, tokens_used, latency_ms, status, created_at,
        profiles:user_id (id, username, display_name)
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  },
};

