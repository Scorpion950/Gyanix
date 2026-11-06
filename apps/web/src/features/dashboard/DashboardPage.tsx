import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Clock,
  Sparkles,
  Flame,
  CheckCircle2,
  ChevronRight,
  Plus,
  Compass,
  ArrowRight,
  BookOpen,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Card, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { cn } from '@/lib/utils.ts';
import { toast } from 'sonner';

interface ProfileCompletionData {
  percentage: number;
  suggestions: string[];
  onboardingCompleted: boolean;
}

export function DashboardPage() {
  const { session } = useAuthStore();
  const navigate = useNavigate();
  const [completionDismissed, setCompletionDismissed] = useState(false);

  const apiUrl = import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api';
  const token = session?.access_token;

  // Fetch profile completion
  const { data: completion } = useQuery<ProfileCompletionData>({
    queryKey: ['profile-completion'],
    queryFn: async () => {
      if (!token) return { percentage: 80, suggestions: [], onboardingCompleted: true };
      const res = await fetch(`${apiUrl}/users/me/completion`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; data?: ProfileCompletionData };
      return json.data || { percentage: 60, suggestions: ['Complete onboarding'], onboardingCompleted: false };
    },
    enabled: !!token,
  });

  const email = session?.user.email || 'learner';
  const firstName = session?.user.user_metadata?.['full_name']?.split(' ')[0] || email.split('@')[0] || 'Learner';

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Demo active lecture for the Continue Learning Hero
  const continueLecture = {
    title: 'PostgreSQL Indexing & Query Execution Plans',
    pathTitle: 'Backend Architecture & Database Mastery',
    folderTitle: 'Database Optimization Deep Dive',
    thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&auto=format&fit=crop&q=80',
    timestamp: '18:42',
    totalDuration: '32:15',
    progressPercent: 58,
    timeLeftMinutes: 14,
  };

  // Demo stats
  const stats = {
    todayMinutes: 45,
    dailyGoalMinutes: 60,
    streakDays: 4,
    streakBest: 12,
    lecturesThisWeek: 9,
    weekProgress: [40, 60, 30, 45, 0, 50, 45], // 7 days (M T W T F S S)
  };

  // AI recommendations (nothing added without approval)
  const [aiRecs, setAiRecs] = useState([
    {
      id: 'rec-1',
      title: 'Building Distributed Systems with Go & Raft',
      reason: 'Recommended because you completed Docker & Microservices',
      duration: '4h 15m · 8 lectures',
      difficulty: 'Advanced',
    },
    {
      id: 'rec-2',
      title: 'Modern React Concurrency & Server Components',
      reason: 'Based on your interest in Full-Stack Web Development',
      duration: '3h 20m · 6 lectures',
      difficulty: 'Intermediate',
    },
  ]);

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Greeting & Date */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-default">
            Good day, {firstName}
          </h1>
          <p className="text-xs md:text-sm text-text-secondary mt-1">
            {todayDate} · Ready to continue your learning journey?
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Compass size={14} />}
            onClick={() => navigate('/discover')}
          >
            Explore Paths
          </Button>
          <Button
            variant="default"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => navigate('/learning/new')}
          >
            Import Course
          </Button>
        </div>
      </div>

      {/* Profile Completion Card (Dismissible) */}
      {!completionDismissed && completion && completion.percentage < 100 && (
        <Card className="border border-primary/20 bg-primary/5 p-4 relative overflow-hidden">
          <button
            onClick={() => setCompletionDismissed(true)}
            className="absolute top-3 right-3 text-text-muted hover:text-text-default transition-colors"
            aria-label="Dismiss profile completion card"
          >
            <X size={16} />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pr-6">
            {/* Circular Ring Progress */}
            <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-border"
                  fill="transparent"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-primary"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - completion.percentage / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute font-mono text-xs font-bold text-primary">
                {completion.percentage}%
              </span>
            </div>

            <div className="flex-1">
              <h2 className="text-sm font-heading font-semibold text-text-default">
                Complete your learner profile
              </h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {completion.suggestions.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => navigate('/onboarding')}
                    className="text-2xs font-medium px-2 py-1 rounded bg-surface border border-border text-text-secondary hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 2. Continue Learning Hero Card (Focus Mode entry) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-heading font-semibold uppercase tracking-wider text-text-secondary">
            Pick up where you left off
          </h2>
        </div>

        <Card className="border border-border bg-surface overflow-hidden card-interactive p-0">
          <div className="flex flex-col lg:flex-row">
            {/* Thumbnail */}
            <div className="relative lg:w-72 h-44 sm:h-52 lg:h-auto bg-surface-subtle flex-shrink-0 overflow-hidden">
              <img
                src={continueLecture.thumbnail}
                alt={continueLecture.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span className="absolute bottom-3 left-3 timestamp-chip bg-black/75 text-white border-0">
                {continueLecture.timestamp} / {continueLecture.totalDuration}
              </span>
            </div>

            {/* Content */}
            <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
              <div>
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-2xs text-text-muted mb-2 font-mono">
                  <span className="truncate max-w-xs">{continueLecture.pathTitle}</span>
                  <ChevronRight size={12} />
                  <span className="truncate max-w-xs">{continueLecture.folderTitle}</span>
                </div>

                <h3 className="text-base md:text-lg font-heading font-bold text-text-default leading-snug">
                  {continueLecture.title}
                </h3>

                <p className="text-xs text-text-secondary mt-1">
                  About {continueLecture.timeLeftMinutes} minutes remaining in this lecture.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-2xs font-mono text-text-muted mb-1">
                    <span>PROGRESS</span>
                    <span>{continueLecture.progressPercent}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-default"
                      style={{ width: `${continueLecture.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="flex items-center justify-between pt-1">
                  <Button
                    variant="default"
                    size="md"
                    leftIcon={<Play size={16} fill="currentColor" />}
                    onClick={() => navigate('/learning/player/demo')}
                  >
                    Resume at {continueLecture.timestamp}
                  </Button>

                  <span className="text-2xs text-text-muted font-mono hidden sm:inline-block">
                    Auto-saved 2h ago
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Today's Goal */}
        <Card className="p-4 border border-border bg-surface flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
            <svg className="w-10 h-10 transform -rotate-90">
              <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" className="text-surface-subtle" fill="transparent" />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="3"
                className="text-primary"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 16}
                strokeDashoffset={2 * Math.PI * 16 * (1 - Math.min(stats.todayMinutes / stats.dailyGoalMinutes, 1))}
                strokeLinecap="round"
              />
            </svg>
            <Clock size={14} className="absolute text-primary" />
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-text-muted font-semibold">Today's Time</p>
            <p className="text-sm font-bold text-text-default tabular-nums">
              {stats.todayMinutes}m <span className="text-text-muted font-normal text-xs">/ {stats.dailyGoalMinutes}m</span>
            </p>
          </div>
        </Card>

        {/* Gentle Streak */}
        <Card className="p-4 border border-border bg-surface flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-streak/10 text-streak flex items-center justify-center flex-shrink-0">
            <Flame size={20} fill="currentColor" />
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-text-muted font-semibold">Learning Streak</p>
            <p className="text-sm font-bold text-streak tabular-nums">
              {stats.streakDays} days <span className="text-text-muted font-normal text-2xs block">Best: {stats.streakBest} days</span>
            </p>
          </div>
        </Card>

        {/* Weekly Mini Bars */}
        <Card className="p-4 border border-border bg-surface flex items-center gap-3">
          <div className="flex items-end gap-1 h-9 flex-shrink-0">
            {stats.weekProgress.map((val, idx) => (
              <div key={idx} className="w-1.5 bg-surface-subtle rounded-full h-full flex items-end">
                <div
                  className={cn(
                    'w-full rounded-full',
                    val > 0 ? 'bg-primary' : 'bg-transparent',
                  )}
                  style={{ height: `${val > 0 ? (val / 60) * 100 : 0}%` }}
                />
              </div>
            ))}
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-text-muted font-semibold">Weekly Goal</p>
            <p className="text-sm font-bold text-text-default tabular-nums">5 / 7 days</p>
          </div>
        </Card>

        {/* Lectures Completed */}
        <Card className="p-4 border border-border bg-surface flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-2xs uppercase tracking-wider text-text-muted font-semibold">This Week</p>
            <p className="text-sm font-bold text-text-default tabular-nums">
              {stats.lecturesThisWeek} lectures <span className="text-text-muted font-normal text-2xs block">finished</span>
            </p>
          </div>
        </Card>
      </div>

      {/* 4. Progress Breakdown (Three Separate Metrics — never equated with time) */}
      <Card className="p-5 md:p-6 border border-border bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
          <div>
            <h2 className="text-sm font-heading font-semibold text-text-default">
              Skill & Competence Breakdown
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Time spent watching is not progress. Gyanix measures your understanding across three distinct dimensions:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Learning Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-text-default flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-progress-learning" />
                Learning Progress
              </span>
              <span className="font-mono text-text-muted">64%</span>
            </div>
            <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
              <div className="h-full bg-progress-learning rounded-full" style={{ width: '64%' }} />
            </div>
            <p className="text-2xs text-text-muted">Lectures completed & structured syllabus covered</p>
          </div>

          {/* Knowledge Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-text-default flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-progress-knowledge" />
                Knowledge Progress
              </span>
              <span className="font-mono text-text-muted">48%</span>
            </div>
            <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
              <div className="h-full bg-progress-knowledge rounded-full" style={{ width: '48%' }} />
            </div>
            <p className="text-2xs text-text-muted">Concept quizzes & diagnostic assessments validated</p>
          </div>

          {/* Practical Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-text-default flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-progress-practical" />
                Practical Progress
              </span>
              <span className="font-mono text-text-muted">35%</span>
            </div>
            <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
              <div className="h-full bg-progress-practical rounded-full" style={{ width: '35%' }} />
            </div>
            <p className="text-2xs text-text-muted">Hands-on code exercises & project challenges completed</p>
          </div>
        </div>
      </Card>

      {/* 5. Horizontal Scroll Rails with Snap: My Learning Paths & Pending Lectures */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-heading font-semibold uppercase tracking-wider text-text-secondary">
            My Learning Paths
          </h2>
          <Link to="/learning" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-thin">
          {[
            {
              id: 'p-1',
              title: 'Full-Stack TypeScript & Cloud Microservices',
              author: 'Gyanix Curated',
              lecturesCount: 24,
              completedCount: 16,
              progress: 67,
              cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&auto=format&fit=crop&q=80',
            },
            {
              id: 'p-2',
              title: 'Deep Learning & Neural Networks from Scratch',
              author: 'Community',
              lecturesCount: 18,
              completedCount: 4,
              progress: 22,
              cover: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&auto=format&fit=crop&q=80',
            },
            {
              id: 'p-3',
              title: 'Systems Programming & Operating Systems in Rust',
              author: 'Personal Path',
              lecturesCount: 12,
              completedCount: 0,
              progress: 0,
              cover: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&auto=format&fit=crop&q=80',
            },
          ].map((path) => (
            <Card
              key={path.id}
              className="w-72 sm:w-80 flex-shrink-0 snap-start border border-border bg-surface overflow-hidden card-interactive p-0"
              onClick={() => navigate(`/learning/paths/${path.id}`)}
            >
              <div className="h-32 bg-surface-subtle overflow-hidden relative">
                <img src={path.cover} alt={path.title} className="w-full h-full object-cover" />
                <span className="absolute bottom-2 right-2 text-2xs font-mono bg-black/75 text-white px-2 py-0.5 rounded">
                  {path.completedCount}/{path.lecturesCount} finished
                </span>
              </div>
              <div className="p-4">
                <p className="text-2xs text-text-muted font-mono">{path.author}</p>
                <h3 className="text-sm font-heading font-semibold text-text-default mt-1 line-clamp-1">
                  {path.title}
                </h3>
                <div className="mt-3">
                  <div className="flex justify-between text-2xs text-text-muted font-mono mb-1">
                    <span>PROGRESS</span>
                    <span>{path.progress}%</span>
                  </div>
                  <div className="h-1 bg-surface-subtle rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${path.progress}%` }} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 6. AI Recommendations (Violet-labelled cards — approval required) */}
      {aiRecs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="ai" className="text-2xs">✦ AI Recommendations</Badge>
            <span className="text-2xs text-text-muted">Nothing is added to your paths without your approval</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiRecs.map((rec) => (
              <Card key={rec.id} className="border border-ai/20 bg-ai/5 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-heading font-bold text-text-default">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1">{rec.reason}</p>
                    <div className="flex items-center gap-3 text-2xs font-mono text-text-muted mt-2">
                      <span>{rec.duration}</span>
                      <span>·</span>
                      <span className="text-primary">{rec.difficulty}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-ai hover:bg-ai/90 text-ai-foreground"
                    onClick={() => {
                      toast.success(`"${rec.title}" added to your Learning Paths.`);
                      setAiRecs((list) => list.filter((x) => x.id !== rec.id));
                    }}
                  >
                    Add to Paths
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast.info('Customise recommendations in Settings.');
                    }}
                  >
                    Customise
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-text-muted hover:text-text-default ml-auto"
                    onClick={() => {
                      setAiRecs((list) => list.filter((x) => x.id !== rec.id));
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
