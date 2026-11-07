import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  Plus,
  Play,
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
  Timer,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Card, CardContent } from '@/components/ui/Card.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Modal } from '@/components/ui/Modal.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePomodoroStore } from '@/stores/pomodoroStore.ts';
import { toast } from 'sonner';

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: number;
  category: string;
  acceptance_rate?: number;
  tags?: string[];
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
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

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

  // Pomodoro Focus state
  const {
    timeLeft,
    isRunning,
    startSession,
    togglePlayPause,
    resetTimer,
    externalSession,
  } = usePomodoroStore();

  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const [extWebsiteName, setExtWebsiteName] = useState('LeetCode');
  const [extProblemName, setExtProblemName] = useState('');
  const [pomodoroMins, setPomodoroMins] = useState(25);

  const pMinutes = Math.floor(timeLeft / 60);
  const pSeconds = timeLeft % 60;
  const timerDisplay = `${pMinutes.toString().padStart(2, '0')}:${pSeconds.toString().padStart(2, '0')}`;

  const handleStartExternalPomodoro = (e: React.FormEvent) => {
    e.preventDefault();
    startSession({
      durationMinutes: pomodoroMins,
      websiteName: extWebsiteName.trim() || 'External Coding',
      problemName: extProblemName.trim() || 'Practice Problem',
    });
    setShowPomodoroModal(false);
  };

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

      {/* Pomodoro Focus & Deep Work Bar */}
      <div className="p-4 sm:p-5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-surface to-surface shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="text-2xl">🍅</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Focus Pomodoro Timer
              </span>
              {isRunning && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-success/10 text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Running
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-text">
                {timerDisplay}
              </span>
              {externalSession?.websiteName && (
                <span className="text-xs text-text-secondary truncate max-w-[200px]">
                  solving on <span className="font-semibold text-text">{externalSession.websiteName}</span>
                  {externalSession.problemName ? `: ${externalSession.problemName}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timer Controls & External Problem Launcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-subtle border border-border">
            {[25, 45, 15].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => startSession({ durationMinutes: m })}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-text-secondary hover:text-text hover:bg-surface transition-colors cursor-pointer"
              >
                {m}m
              </button>
            ))}
          </div>

          <Button
            onClick={togglePlayPause}
            variant={isRunning ? 'secondary' : 'default'}
            size="sm"
            className="rounded-xl gap-1.5 text-xs font-semibold"
          >
            {isRunning ? (
              <>
                <Pause size={14} className="fill-current" /> Pause
              </>
            ) : (
              <>
                <Play size={14} className="fill-current" /> Start Focus
              </>
            )}
          </Button>

          <Button
            onClick={resetTimer}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
            title="Reset Pomodoro"
          >
            <RotateCcw size={14} />
          </Button>

          <Button
            onClick={() => setShowPomodoroModal(true)}
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5 font-semibold"
          >
            <Timer size={14} />
            Solve from Another Website
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
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search DSA problems by name, tag, or topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-surface text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-2xs font-semibold text-text-muted uppercase">Difficulty:</span>
              {(['all', '1', '2', '3'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-2.5 py-1 rounded text-2xs font-semibold transition-colors cursor-pointer ${
                    selectedDifficulty === diff
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border text-text-secondary hover:text-text'
                  }`}
                >
                  {diff === 'all' ? 'All' : diff === '1' ? 'Easy' : diff === '2' ? 'Medium' : 'Hard'}
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-2xs">
            {[
              'all',
              'Arrays & Hashing',
              'Two Pointers',
              'Sliding Window',
              'Stack',
              'Binary Search',
              'Linked List',
              'Trees',
              'Graphs',
              'Dynamic Programming',
              'Intervals',
            ].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer font-medium ${
                  selectedCategory === cat
                    ? 'bg-primary/10 text-primary border border-primary/40'
                    : 'bg-surface border border-border/80 text-text-secondary hover:text-text'
                }`}
              >
                {cat === 'all' ? 'All Topics' : cat}
              </button>
            ))}
          </div>

          {/* Problems Grid */}
          {(() => {
            const filteredProblems = problems.filter((prob) => {
              if (selectedCategory !== 'all' && prob.category.toLowerCase() !== selectedCategory.toLowerCase()) {
                return false;
              }
              if (selectedDifficulty !== 'all' && String(prob.difficulty) !== selectedDifficulty) {
                return false;
              }
              if (search.trim()) {
                const q = search.toLowerCase();
                const matchesTitle = prob.title.toLowerCase().includes(q);
                const matchesCat = prob.category.toLowerCase().includes(q);
                const matchesTag = prob.tags?.some((t) => t.toLowerCase().includes(q));
                if (!matchesTitle && !matchesCat && !matchesTag) return false;
              }
              return true;
            });

            if (filteredProblems.length === 0) {
              return (
                <div className="p-12 text-center border border-dashed border-border rounded-xl bg-surface space-y-2">
                  <Code2 className="w-8 h-8 mx-auto text-text-muted" />
                  <p className="text-sm font-semibold text-text">No DSA problems matching your filters</p>
                  <p className="text-xs text-text-secondary">Try adjusting your search query or category filters.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProblems.map((prob) => {
                  const matchedEntry = entries.find((e) => e.problem_id === prob.id || e.title.toLowerCase() === prob.title.toLowerCase());
                  const isSolved = matchedEntry?.status === 'solved';

                  const diffLabel = prob.difficulty === 1 ? 'Easy' : prob.difficulty === 2 ? 'Medium' : 'Hard';
                  const diffColor = prob.difficulty === 1 ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' : prob.difficulty === 2 ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' : 'text-rose-500 border-rose-500/30 bg-rose-500/10';

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
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${diffColor}`}>
                            {diffLabel}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-text leading-snug">{prob.title}</h3>

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {prob.tags?.map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-subtle text-text-muted border border-border/50">
                              {tag}
                            </span>
                          ))}
                          {prob.acceptance_rate && (
                            <span className="text-[10px] text-text-muted ml-auto font-mono">
                              {prob.acceptance_rate}% acc.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center gap-2">
                        <Button
                          onClick={() => navigate(`/practice/problems/${prob.slug}`)}
                          size="sm"
                          className="flex-1 bg-primary text-white hover:bg-primary-hover transition-colors text-xs cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                          Solve in Gyanix
                        </Button>
                        <a
                          href={`https://leetcode.com/problems/${prob.slug}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg border border-border bg-surface-subtle hover:bg-surface text-text-muted hover:text-text transition-colors"
                          title="Open on LeetCode"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
      <Modal isOpen={showLogModal} onClose={() => setShowLogModal(false)}>
        <div className="w-full max-w-md p-6 rounded-2xl border border-border bg-surface-raised space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-bold text-text">Log Practice Problem</h3>
            <button
              onClick={() => setShowLogModal(false)}
              className="text-text-muted hover:text-text cursor-pointer"
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
                    className={`flex-1 h-9 rounded-control border text-xs font-mono transition-colors cursor-pointer ${
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
        </div>
      </Modal>

      {/* Modal: Solve from Another Website with Pomodoro */}
      <Modal isOpen={showPomodoroModal} onClose={() => setShowPomodoroModal(false)}>
        <Card className="w-full max-w-md border border-border bg-surface p-6 shadow-popover">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🍅</span>
            <h2 className="text-lg font-bold text-text">Solve from Another Website</h2>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Practice problems on LeetCode, Codeforces, HackerRank, or any platform while Gyanix tracks your deep focus time.
          </p>

          <form onSubmit={handleStartExternalPomodoro} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-text-secondary mb-1">
                Platform / Website Name (Optional)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['LeetCode', 'Codeforces', 'HackerRank', 'GeeksforGeeks', 'CodeChef'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setExtWebsiteName(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      extWebsiteName === p
                        ? 'border-primary bg-primary text-white font-semibold'
                        : 'border-border bg-surface-subtle text-text-secondary hover:text-text'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Or custom site name..."
                value={extWebsiteName}
                onChange={(e) => setExtWebsiteName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-text-secondary mb-1">
                Problem Name or URL (Optional)
              </label>
              <Input
                placeholder="e.g. Two Sum, 3Sum, LRU Cache or https://..."
                value={extProblemName}
                onChange={(e) => setExtProblemName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-text-secondary mb-1">
                Focus Sprint Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { m: 25, label: '25m (Standard)' },
                  { m: 45, label: '45m (Deep)' },
                  { m: 60, label: '60m (Intense)' },
                ].map(({ m, label }) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPomodoroMins(m)}
                    className={`p-2 rounded-xl border text-center text-xs transition-all cursor-pointer ${
                      pomodoroMins === m
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-surface-subtle text-text-secondary hover:text-text'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPomodoroModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-white">
                Start Pomodoro Sprint
              </Button>
            </div>
          </form>
        </Card>
      </Modal>
    </div>
  );
}

