import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Users,
  BookOpen,
  Code2,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Clock,
  Cpu,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

interface AdminKPIs {
  totalUsers: number;
  totalLearningPaths: number;
  totalCodingSubmissions: number;
  pendingReports: number;
  totalAIRequests: number;
  totalAITokensUsed: number;
  averageAILatencyMs: number;
}

interface ModerationReport {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details?: string | null;
  status: string;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
  };
}

interface AILog {
  id: string;
  feature_name: string;
  provider_id: string;
  model_id: string;
  tokens_used: number;
  latency_ms: number;
  status: string;
  created_at: string;
}

export function AdminDashboardPage() {
  const { session } = useAuthStore();
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [aiLogs, setAiLogs] = useState<AILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'moderation' | 'ai'>('moderation');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${session?.access_token}` };

      // 1. KPIs
      const kpiRes = await fetch('/api/admin/kpis', { headers });
      const kpiData = await kpiRes.json();
      if (kpiData.success) setKpis(kpiData.data);

      // 2. Moderation
      const modRes = await fetch('/api/admin/moderation', { headers });
      const modData = await modRes.json();
      if (modData.success) setReports(modData.data);

      // 3. AI Logs
      const aiRes = await fetch('/api/admin/ai-logs', { headers });
      const aiData = await aiRes.json();
      if (aiData.success) setAiLogs(aiData.data);
    } catch {
      toast.error('Failed to load admin telemetry');
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (reportId: string, action: 'resolve' | 'dismiss' | 'remove') => {
    try {
      const res = await fetch(`/api/admin/moderation/${reportId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (data.success) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        toast.success(`Report ${action}d`);
      }
    } catch {
      toast.error('Moderation action failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Persistent Admin Strip per Section 0.6 */}
      <div className="bg-[#DC2626]/10 border-b border-[#DC2626]/30 px-6 py-2 -mx-4 -mt-6 md:-mx-6 lg:-mx-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-danger" />
          <span className="text-xs font-bold text-danger uppercase tracking-wider">
            Gyanix Administrator Console • Root Privileges Active
          </span>
        </div>
        <button
          onClick={loadAdminData}
          className="text-xs text-text-muted hover:text-text flex items-center gap-1 font-mono transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh Metrics
        </button>
      </div>

      {/* Dense KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-secondary font-medium flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            Registered Learners
          </span>
          <div className="text-2xl font-bold text-text font-mono">
            {kpis?.totalUsers ?? '...'}
          </div>
          <span className="text-[11px] text-text-muted">Total platform profiles</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-secondary font-medium flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-success" />
            Curricula & Problems
          </span>
          <div className="text-2xl font-bold text-text font-mono">
            {(kpis?.totalLearningPaths || 0) + (kpis?.totalCodingSubmissions || 0)}
          </div>
          <span className="text-[11px] text-text-muted">Active paths & submissions</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-secondary font-medium flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-ai" />
            AI Operations
          </span>
          <div className="text-2xl font-bold text-ai font-mono">
            {kpis?.totalAIRequests ?? '...'}
          </div>
          <span className="text-[11px] text-text-muted font-mono">
            {kpis?.totalAITokensUsed?.toLocaleString() || 0} tokens • {kpis?.averageAILatencyMs || 0}ms avg
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-secondary font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            Pending Moderation
          </span>
          <div className="text-2xl font-bold text-warning font-mono">
            {kpis?.pendingReports ?? '0'}
          </div>
          <span className="text-[11px] text-text-muted">Flagged by community</span>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-4 border-b border-border text-xs font-semibold">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'moderation'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-text-secondary hover:text-text'
          }`}
        >
          Moderation Queue ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`pb-2.5 transition-colors border-b-2 ${
            activeTab === 'ai'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-text-secondary hover:text-text'
          }`}
        >
          AI Observability & Telemetry ({aiLogs.length})
        </button>
      </div>

      {/* Moderation Queue Table */}
      {activeTab === 'moderation' && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted">
              <CheckCircle2 className="w-8 h-8 mx-auto text-success/80 mb-2" />
              <p className="font-semibold text-text">Moderation Queue Clear</p>
              <p className="text-[11px]">No pending abuse or spam reports to review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle border-b border-border text-text-muted uppercase text-[10px] tracking-wider font-mono">
                  <tr>
                    <th className="p-3">Target</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Details</th>
                    <th className="p-3">Reporter</th>
                    <th className="p-3">Reported At</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reports.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="p-3 font-mono uppercase text-[10px] font-bold text-text">
                        {r.target_type}
                      </td>
                      <td className="p-3 font-semibold text-danger">{r.reason}</td>
                      <td className="p-3 text-text-secondary max-w-xs truncate">
                        {r.details || 'No details provided'}
                      </td>
                      <td className="p-3 text-text-muted">@{r.profiles?.username || 'user'}</td>
                      <td className="p-3 font-mono text-[11px] text-text-muted">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleModerate(r.id, 'dismiss')}
                          className="text-[11px] h-7"
                        >
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleModerate(r.id, 'remove')}
                          className="text-[11px] h-7 bg-danger text-white hover:bg-danger/90"
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* AI Observability Logs */}
      {activeTab === 'ai' && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle border-b border-border text-text-muted uppercase text-[10px] tracking-wider font-mono">
                <tr>
                  <th className="p-3">Feature</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Model</th>
                  <th className="p-3">Tokens</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-[11px]">
                {aiLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-subtle/50 transition-colors">
                    <td className="p-3 font-sans font-semibold text-text">{log.feature_name}</td>
                    <td className="p-3 text-primary">{log.provider_id}</td>
                    <td className="p-3 text-text-secondary">{log.model_id}</td>
                    <td className="p-3 font-bold text-text">{log.tokens_used}</td>
                    <td className="p-3 text-text-muted">{log.latency_ms}ms</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-success/10 text-success font-semibold">
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-text-muted">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
