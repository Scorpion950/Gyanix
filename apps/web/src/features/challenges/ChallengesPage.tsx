import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Zap,
  Flame,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Plus,
  Loader2,
  Edit2,
  Users,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Avatar } from '@/components/ui/Avatar.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

interface Challenge {
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
  participation?: {
    id: string;
    current_day: number;
    is_completed: boolean;
    started_at: string;
  } | null;
}

interface Participant {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  currentDay: number;
  progressPercent: number;
  pathTitle: string;
  joinedAt: string;
}

export function ChallengesPage() {
  const { session } = useAuthStore();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Active logging modal
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [dayNotes, setDayNotes] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  // Create / Edit modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDuration, setFormDuration] = useState(14);
  const [formCategory, setFormCategory] = useState('Algorithms');
  const [formPathTitle, setFormPathTitle] = useState('Systems Architecture & Algorithms');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Participants modal
  const [inspectingChallenge, setInspectingChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const res = await fetch('/api/challenges', {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      const data = await res.json();
      if (data.success && data.data) {
        setChallenges(data.data);
      }
    } catch {
      toast.error('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingChallenge(null);
    setFormTitle('');
    setFormDescription('');
    setFormDuration(14);
    setFormCategory('Algorithms');
    setFormPathTitle('Systems Architecture & Algorithms');
    setShowCreateModal(true);
  };

  const handleOpenEdit = (ch: Challenge) => {
    setEditingChallenge(ch);
    setFormTitle(ch.title);
    setFormDescription(ch.description);
    setFormDuration(ch.duration_days);
    setFormCategory(ch.category || 'Algorithms');
    setFormPathTitle(ch.learning_path_title || 'Systems Architecture & Algorithms');
    setShowCreateModal(true);
  };

  const handleSaveChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) return;

    setIsSubmittingForm(true);
    try {
      const url = editingChallenge ? `/api/challenges/${editingChallenge.id}` : '/api/challenges';
      const method = editingChallenge ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          durationDays: Number(formDuration),
          category: formCategory,
          learningPathTitle: formPathTitle.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save challenge');
      }

      toast.success(editingChallenge ? 'Challenge updated successfully!' : 'New challenge created!');
      setShowCreateModal(false);
      loadChallenges();
    } catch (err: any) {
      toast.error(err.message || 'Error saving challenge');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleViewParticipants = async (ch: Challenge) => {
    setInspectingChallenge(ch);
    setLoadingParticipants(true);
    try {
      const res = await fetch(`/api/challenges/${ch.id}/participants`);
      const data = await res.json();
      if (data.success && data.data) {
        setParticipants(data.data);
      }
    } catch {
      toast.error('Failed to load participants');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleJoin = async (challengeId: string) => {
    try {
      const res = await fetch('/api/challenges/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ challengeId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to join challenge');
      }

      toast.success('Enrolled in challenge! Let’s crush day 1.');
      loadChallenges();
    } catch (err: any) {
      toast.error(err.message || 'Error joining challenge');
    }
  };

  const handleLogDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChallenge || !activeChallenge.participation || !dayNotes.trim()) return;

    setIsLogging(true);
    try {
      const res = await fetch('/api/challenges/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          challengeId: activeChallenge.id,
          dayNumber: activeChallenge.participation.current_day,
          notes: dayNotes.trim(),
          proofUrl: proofUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit log');
      }

      if (data.data?.isCompleted) {
        toast.success('🎉 Incredible work! You completed this challenge sprint!');
      } else {
        toast.success(`Day ${activeChallenge.participation.current_day} logged! Keep your streak strong.`);
      }

      setActiveChallenge(null);
      setDayNotes('');
      setProofUrl('');
      loadChallenges();
    } catch (err: any) {
      toast.error(err.message || 'Error logging day');
    } finally {
      setIsLogging(false);
    }
  };

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-5 h-5 text-[#EA580C] dark:text-[#FB923C]" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-primary" />;
      case 'Trophy':
      default:
        return <Trophy className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Trophy className="w-3.5 h-3.5" />
              Sprints & Milestones
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Engineering Challenges</h1>
          <p className="text-sm text-text-secondary">
            Structured daily accountability sprints. Code every day, track peers, and follow dedicated learning paths.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-primary text-white text-xs shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Challenge
        </Button>
      </div>

      {/* Grid of Challenges */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : challenges.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-xl bg-surface space-y-2">
          <Trophy className="w-10 h-10 text-text-muted/60 mx-auto" />
          <h3 className="text-base font-semibold text-text">No active challenges found</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Create a custom sprint challenge or wait for community organizers to publish one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((ch) => {
            const part = ch.participation;
            const progressPercent = part
              ? Math.min(Math.round(((part.current_day - 1) / ch.duration_days) * 100), 100)
              : 0;

            return (
              <div
                key={ch.id}
                className="p-6 rounded-xl border border-border bg-surface flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border flex items-center justify-center shrink-0">
                      {getBadgeIcon(ch.badge_icon)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-2xs uppercase tracking-wider">
                        {ch.category}
                      </Badge>
                      <button
                        onClick={() => handleOpenEdit(ch)}
                        className="p-1 rounded text-text-muted hover:text-text-default hover:bg-surface-subtle transition-colors"
                        title="Edit Challenge"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-text mb-1">{ch.title}</h3>
                    <p className="text-xs text-text-secondary line-clamp-2">{ch.description}</p>
                  </div>

                  {ch.learning_path_title && (
                    <div className="flex items-center gap-1.5 text-2xs text-primary font-medium bg-primary/5 px-2 py-1 rounded-md border border-primary/10">
                      <Compass size={12} className="shrink-0" />
                      <span className="truncate">Path: {ch.learning_path_title}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {ch.duration_days} Days Sprint
                    </span>
                    <button
                      onClick={() => handleViewParticipants(ch)}
                      className="flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {ch.participant_count} enrolled
                    </button>
                  </div>

                  {part && (
                    <div className="space-y-1.5 pt-2 border-t border-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-text">
                          {part.is_completed ? 'Completed 🎉' : `Day ${part.current_day} of ${ch.duration_days}`}
                        </span>
                        <span className="font-mono text-text-secondary">{progressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-subtle overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 space-y-2">
                  {!part ? (
                    <Button
                      onClick={() => handleJoin(ch.id)}
                      size="sm"
                      className="w-full text-xs bg-primary text-white"
                    >
                      Join Sprint ({ch.participant_count} enrolled)
                    </Button>
                  ) : part.is_completed ? (
                    <Button variant="outline" size="sm" disabled className="w-full text-xs text-success">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Completed
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setActiveChallenge(ch)}
                      size="sm"
                      className="w-full text-xs bg-primary text-white"
                    >
                      Log Day {part.current_day} Progress <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  )}

                  <button
                    onClick={() => handleViewParticipants(ch)}
                    className="w-full py-1 text-2xs text-text-muted hover:text-text-default text-center transition-colors"
                  >
                    View enrolled members & paths →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create or Edit Challenge */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg p-6 rounded-2xl border border-border bg-surface-raised space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text">
                {editingChallenge ? 'Edit Challenge' : 'Create New Challenge'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveChallenge} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Challenge Title *</label>
                <Input
                  placeholder="e.g. 21 Days of Modern Rust & Concurrency"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Description *</label>
                <textarea
                  rows={3}
                  placeholder="What is the daily commitment and learning goals?"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Duration (Days)</label>
                  <Input
                    type="number"
                    min={3}
                    max={100}
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-control text-xs border border-border bg-surface text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Algorithms">Algorithms & DSA</option>
                    <option value="Backend">Backend & Systems</option>
                    <option value="Frontend">Frontend & UI</option>
                    <option value="DevOps">Cloud & DevOps</option>
                    <option value="AI">AI & Machine Learning</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Linked Curriculum / Learning Path</label>
                <Input
                  placeholder="e.g. Full-Stack & Systems Architecture"
                  value={formPathTitle}
                  onChange={(e) => setFormPathTitle(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingForm || !formTitle.trim()}
                  className="bg-primary text-white"
                >
                  {editingChallenge ? 'Save Changes' : 'Create Sprint'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: View Enrolled Participants & Paths */}
      {inspectingChallenge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl p-6 rounded-2xl border border-border bg-surface-raised space-y-4 shadow-xl max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-text flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  Enrolled Participants ({inspectingChallenge.participant_count})
                </h3>
                <p className="text-xs text-text-secondary">
                  Tracking members following this challenge and their assigned path.
                </p>
              </div>
              <button
                onClick={() => setInspectingChallenge(null)}
                className="text-text-muted hover:text-text"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 py-1">
              {loadingParticipants ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : participants.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">No participants enrolled yet.</p>
              ) : (
                participants.map((p) => (
                  <div
                    key={p.userId}
                    className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={p.avatarUrl} alt={p.displayName} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-text truncate">{p.displayName}</p>
                        <p className="text-2xs text-text-muted truncate">@{p.username}</p>
                        <p className="text-2xs text-primary font-medium truncate mt-0.5">
                          Following: {p.pathTitle}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-text">
                        Day {p.currentDay} / {inspectingChallenge.duration_days}
                      </span>
                      <div className="w-24 h-1.5 rounded-full bg-surface-subtle overflow-hidden mt-1">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${p.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectingChallenge(null)}
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal: Log Day */}
      {activeChallenge && activeChallenge.participation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 rounded-2xl border border-border bg-surface-raised space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text">
                Log Day {activeChallenge.participation.current_day} of {activeChallenge.duration_days}
              </h3>
              <button
                onClick={() => setActiveChallenge(null)}
                className="text-text-muted hover:text-text"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogDay} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">
                  What did you learn or code today? *
                </label>
                <textarea
                  rows={4}
                  placeholder="Summarize your key technical takeaway, code implemented, or obstacle overcome..."
                  value={dayNotes}
                  onChange={(e) => setDayNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">
                  Proof / Commit / Note URL (Optional)
                </label>
                <Input
                  placeholder="https://github.com/... or public note"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveChallenge(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLogging || !dayNotes.trim()}
                  className="bg-primary text-white"
                >
                  Submit Log
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
