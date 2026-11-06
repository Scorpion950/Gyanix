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
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

interface Challenge {
  id: string;
  slug: string;
  title: string;
  description: string;
  duration_days: number;
  badge_icon: string;
  category: string;
  participant_count: number;
  participation?: {
    id: string;
    current_day: number;
    is_completed: boolean;
    started_at: string;
  } | null;
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
        throw new Error(data.error || 'Failed to log progress');
      }

      toast.success(data.data.isCompleted ? '🎉 Challenge Completed!' : 'Day logged successfully!');
      setActiveChallenge(null);
      setDayNotes('');
      setProofUrl('');
      loadChallenges();
    } catch (err: any) {
      toast.error(err.message || 'Error submitting log');
    } finally {
      setIsLogging(false);
    }
  };

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'zap':
        return <Zap className="w-5 h-5 text-warning" />;
      case 'flame':
        return <Flame className="w-5 h-5 text-[#EA580C]" />;
      case 'trophy':
      default:
        return <Trophy className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D97706]/10 text-[#D97706] dark:text-[#FBBF24] border border-[#D97706]/20">
              <Trophy className="w-3.5 h-3.5" />
              Cohort Sprints
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Learning Challenges</h1>
          <p className="text-sm text-text-secondary">
            Structured 7-day and 30-day sprints. Log your daily learning proof, build consistency, and earn verified mastery badges.
          </p>
        </div>
      </div>

      {/* Challenges Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((ch) => {
            const part = ch.participation;
            const progressPercent = part
              ? Math.round((part.current_day / ch.duration_days) * 100)
              : 0;

            return (
              <div
                key={ch.id}
                className="p-6 rounded-xl border border-border bg-surface flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-surface-subtle border border-border flex items-center justify-center">
                      {getBadgeIcon(ch.badge_icon)}
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {ch.duration_days} Days
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-text">{ch.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{ch.description}</p>

                  {/* Progress if participating */}
                  {part && (
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-text">
                          {part.is_completed
                            ? 'Completed 🎉'
                            : `Day ${part.current_day} of ${ch.duration_days}`}
                        </span>
                        <span className="font-mono text-text-secondary">{progressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-subtle overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Log Day */}
      {activeChallenge && activeChallenge.participation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
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

