import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Flame,
  ArrowRight,
  BookOpen,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Card, CardContent } from '@/components/ui/Card.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: number;
  category: string;
}

interface PracticeEntry {
  id: string;
  problem_id?: string | null;
  external_url?: string | null;
  title: string;
  platform: string;
  category: string;
  difficulty: number;
  status: 'solved' | 'attempted' | 'revisit' | 'unsolved';
  time_spent_seconds: number;
  solution_notes?: string | null;
  last_practiced_at: string;
}

export function PracticeTrackerPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [entries, setEntries] = useState<PracticeEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'log'>('library');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal for logging external problem
  const [showLogModal, setShowLogModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newPlatform, setNewPlatform] = useState('LeetCode');
  const [newCategory, setNewCategory] = useState('Algorithms');
  const [newDifficulty, setNewDifficulty] = useState(3);
  const [newStatus, setNewStatus] = useState<'solved' | 'attempted' | 'revisit'>('solved');
  const [newMinutes, setNewMinutes] = useState(20);
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProblems();
    loadPracticeEntries();
  }, []);

  const loadProblems = async () => {
    try {
      const res = await fetch('/api/coding/problems');
      const data = await res.json();
      if (data.success && data.data) {
        setProblems(data.data);
      }
    } catch {
      // Non-blocking
    }
  };

  const loadPracticeEntries = async () => {
    try {
      const res = await fetch('/api/coding/practice', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setEntries(data.data);
      }
    } catch {
      // Non-blocking
    }
  };

  const handleCreateExternalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/coding/practice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          externalUrl: newUrl.trim() || undefined,
          platform: newPlatform,
          category: newCategory,
          difficulty: newDifficulty,
          status: newStatus,
          timeSpentSeconds: newMinutes * 60,
          solutionNotes: newNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to log problem');
      }

      setEntries((prev) => [data.data, ...prev]);
      setShowLogModal(false);
      resetForm();
      toast.success('Practice entry saved!');
    } catch (err: any) {
      toast.error(err.message || 'Error saving entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewUrl('');
    setNewNotes('');
    setNewMinutes(20);
  };

  const handleUpdateStatus = async (entryId: string, status: 'solved' | 'attempted' | 'revisit') => {
    try {
      const res = await fetch(`/api/coding/practice/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setEntries((prev) => prev.map((e) => (e.id === entryId ? data.data : e)));
        toast.success(`Marked as ${status}`);
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const getDifficultyDots = (level: number) => {
    const full = '●'.repeat(level);
    const empty = '○'.repeat(Math.max(0, 5 - level));
    const labels = ['', 'Easy', 'Medium', 'Hard', 'Very Hard', 'Expert'];
    return `${full}${empty} ${labels[level] || ''}`;
  };

  const solvedCount = entries.filter((e) => e.status === 'solved').length;
  const revisitCount = entries.filter((e) => e.status === 'revisit').length;

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EA580C]/10 text-[#EA580C] dark:text-[#FB923C] border border-[#EA580C]/20">
              <Code2 className="w-3.5 h-3.5" />
              Practice Tracker
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Code Practice & Problem Ledger</h1>
          <p className="text-sm text-text-secondary">
            Solve problems directly in Gyanix or track external practice from LeetCode, HackerRank, and Codeforces.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/code')}
            className="text-xs"
          >
            Open Sandbox
          </Button>
          <Button
            onClick={() => setShowLogModal(true)}
            className="bg-primary text-white text-xs shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Log External Problem
          </Button>
        </div>
      </div>

      {/* 4-Stat Strip per Section 0.7 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-secondary font-medium">Problems Solved</span>
          <div className="text-2xl font-bold text-text font-mono">{solvedCount}</div>
          <span className="text-[11px] text-success">Verified solutions</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-secondary font-medium">Practical Progress</span>
          <div className="text-2xl font-bold text-[#EA580C] dark:text-[#FB923C] font-mono">
            {Math.min(solvedCount * 15, 100)}%
          </div>
          <span className="text-[11px] text-text-muted">Targeting practical competency</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-secondary font-medium">Practice Consistency</span>
          <div className="text-2xl font-bold text-[#D97706] dark:text-[#FBBF24] font-mono flex items-center gap-1.5">
            <Flame className="w-5 h-5 fill-current" />
            Active
          </div>
          <span className="text-[11px] text-text-muted">Steady progress every week</span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-xs text-text-secondary font-medium">Needs Revisit</span>
          <div className="text-2xl font-bold text-warning font-mono">{revisitCount}</div>
          <span className="text-[11px] text-text-muted">Marked for review</span>
        </div>
      </div>

      {/* Mode Tabs: Built-in Problems Library vs Practice Log */}
      <div className="flex items-center border-b border-border gap-6">
        <button
          onClick={() => setActiveTab('library')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'library'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text'
          }`}
        >
          Gyanix Problem Library ({problems.length})
        </button>
        <button
          onClick={() => setActiveTab('log')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'log'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text'
          }`}
        >
          My Practice Log ({entries.length})
        </button>
      </div>

      {/* Tab 1: Built-in Problem Library */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {problems.map((prob) => {
              const matchedEntry = entries.find((e) => e.problem_id === prob.id);
              const isSolved = matchedEntry?.status === 'solved';

              return (
                <div
                  key={prob.id}
                  className="p-5 rounded-xl border border-border bg-surface space-y-3 hover:border-primary/40 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-text-muted">
                        {prob.category}
                      </span>
                      {isSolved && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Solved
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-text">{prob.title}</h3>
                    <div className="text-xs font-mono text-text-secondary">
                      {getDifficultyDots(prob.difficulty)}
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate(`/practice/problems/${prob.slug}`)}
                    size="sm"
                    className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-white transition-colors"
                  >
                    Solve in Gyanix
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: External Practice Log */}
      {activeTab === 'log' && (
        <div className="space-y-4">
          {entries.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border rounded-xl bg-surface space-y-2">
              <Code2 className="w-10 h-10 mx-auto text-text-muted/60" />
              <h3 className="text-base font-semibold text-text">No practice entries yet</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Log problems you solve on LeetCode or HackerRank to keep your practical metrics accurate.
              </p>
              <Button
                size="sm"
                onClick={() => setShowLogModal(true)}
                className="mt-3 bg-primary text-white"
              >
                Log First Problem
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-xl border border-border bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-border/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-subtle border border-border text-text-muted uppercase">
                        {entry.platform}
                      </span>
                      <h4 className="text-sm font-bold text-text">{entry.title}</h4>
                      {entry.external_url && (
                        <a
                          href={entry.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-muted hover:text-primary transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                      <span className="font-mono">{getDifficultyDots(entry.difficulty)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3 text-text-muted" />
                        {Math.round(entry.time_spent_seconds / 60)} min
                      </span>
                      <span>•</span>
                      <span className="text-[11px] text-text-muted">
                        {new Date(entry.last_practiced_at).toLocaleDateString()}
                      </span>
                    </div>

                    {entry.solution_notes && (
                      <p className="text-xs text-text-muted italic pt-1">
                        Note: {entry.solution_notes}
                      </p>
                    )}
                  </div>

                  {/* Status switcher */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateStatus(entry.id, 'solved')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                        entry.status === 'solved'
                          ? 'bg-success/10 border-success/30 text-success'
                          : 'border-border text-text-muted hover:text-text'
                      }`}
                    >
                      Solved
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(entry.id, 'revisit')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                        entry.status === 'revisit'
                          ? 'bg-warning/10 border-warning/30 text-warning'
                          : 'border-border text-text-muted hover:text-text'
                      }`}
                    >
                      Revisit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Log External Problem */}
      {showLogModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 rounded-2xl border border-border bg-surface-raised space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text">Log Practice Problem</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-text-muted hover:text-text"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExternalEntry} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Problem Title *</label>
                <Input
                  placeholder="e.g. 3Sum, LRU Cache"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">External URL (Optional)</label>
                <Input
                  placeholder="https://leetcode.com/problems/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Platform</label>
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    className="w-full h-10 px-3 rounded-control border border-border bg-surface text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="LeetCode">LeetCode</option>
                    <option value="HackerRank">HackerRank</option>
                    <option value="Codeforces">Codeforces</option>
                    <option value="NeetCode">NeetCode</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Minutes Spent</label>
                  <Input
                    type="number"
                    min="1"
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(Number(e.target.value))}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Difficulty (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setNewDifficulty(lvl)}
                      className={`flex-1 h-9 rounded-control border text-xs font-mono transition-colors ${
                        newDifficulty === lvl
                          ? 'bg-primary/10 border-primary text-primary font-bold'
                          : 'border-border text-text-muted hover:border-text-secondary'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Key Takeaways / Notes</label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Two-pointer approach beats O(N^2) sorting..."
                  className="w-full p-3 rounded-control border border-border bg-surface text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLogModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="bg-primary text-white"
                >
                  Save Entry
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

