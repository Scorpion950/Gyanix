-- ==============================================================================
-- Gyanix Schema Migration 011: Admin KPI Analytics & Moderation Workflow
-- ==============================================================================

-- Admin KPI Summary Aggregator Function
CREATE OR REPLACE FUNCTION public.get_admin_kpi_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    v_total_users INTEGER;
    v_active_learners INTEGER;
    v_total_paths INTEGER;
    v_total_submissions INTEGER;
    v_pending_reports INTEGER;
    v_ai_requests INTEGER;
    v_ai_tokens BIGINT;
BEGIN
    -- Check caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.roles
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Administrator privileges required.';
    END IF;

    SELECT COUNT(*) INTO v_total_users FROM public.profiles;
    SELECT COUNT(DISTINCT user_id) INTO v_active_learners FROM public.learning_sessions WHERE started_at >= NOW() - INTERVAL '7 days';
    SELECT COUNT(*) INTO v_total_paths FROM public.learning_paths;
    SELECT COUNT(*) INTO v_total_submissions FROM public.coding_submissions;
    SELECT COUNT(*) INTO v_pending_reports FROM public.content_reports WHERE status = 'pending';
    SELECT COUNT(*), COALESCE(SUM(tokens_used), 0) INTO v_ai_requests, v_ai_tokens FROM public.ai_usage_logs;

    result := jsonb_build_object(
        'totalUsers', v_total_users,
        'activeLearnersPastWeek', v_active_learners,
        'totalLearningPaths', v_total_paths,
        'totalCodingSubmissions', v_total_submissions,
        'pendingModerationReports', v_pending_reports,
        'totalAIRequests', v_ai_requests,
        'totalAITokens', v_ai_tokens
    );

    RETURN result;
END;
$$;

