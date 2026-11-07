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
  Brain,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Card } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { cn } from '@/lib/utils.ts';
import { toast } from 'sonner';

interface ProfileCompletionData {
  percentage: number;
  suggestions: string[];
  onboardingCompleted: boolean;
}

interface RecentLecture {
  itemId: string;
  pathId: string;
  title: string;
  pathTitle: string;
  folderTitle: string;
  thumbnail: string;
  timestamp: string;
  totalDuration: string;
  progressPercent: number;
  timeLeftMinutes: number;
}

interface StatsSummary {
  todayMinutes: number;
  dailyGoalMinutes: number;
  streakDays: number;
  streakBest: number;
  lecturesThisWeek: number;
  weekProgress: number[];
  pomodorosToday: number;
}

interface LearningPathItem {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  visibility: string;
  is_featured?: boolean;
  totalLectures?: number;
  completedLectures?: number;
  progressPercent?: number;
}

interface AIRecItem {
  id: string;
  title: string;
  reason: string;
  duration: string;
  difficulty: string;
}

export function DashboardPage() {
  const { session } = useAuthStore();
  const navigate = useNavigate();
  const [completionDismissed, setCompletionDismissed] = useState(false);

  const apiUrl = import.meta.env['VITE_API_URL'] || '/api';
  const token = session?.access_token;

  // 1. Fetch profile completion
  const { data: completion } = useQuery<ProfileCompletionData>({
    queryKey: ['profile-completion'],
    queryFn: async () => {
      if (!token) return { percentage: 60, suggestions: ['Complete onboarding'], onboardingCompleted: false };
      const res = await fetch(`${apiUrl}/users/me/completion`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { success: boolean; data?: ProfileCompletionData };
      return json.data || { percentage: 60, suggestions: ['Complete onboarding'], onboardingCompleted: false };
    },
    enabled: !!token,
  });

  // 2. Fetch recent active lecture for Continue Learning Hero
  const { data: continueLecture } = useQuery<RecentLecture | null>({
    queryKey: ['recent-lecture'],
    queryFn: async () => {
      if (!token) return null;
      const res = await fetch(`${apiUrl}/learning-paths/recent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { success: boolean; data?: RecentLecture | null };
      return json.data || null;
    },
    enabled: !!token,
  });

  // 3. Fetch analytics & stats summary
  const { data: stats } = useQuery<StatsSummary>({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const defaultStats: StatsSummary = {
        todayMinutes: 0,
        dailyGoalMinutes: 60,
        streakDays: 0,
        streakBest: 0,
        lecturesThisWeek: 0,
        weekProgress: [0, 0, 0, 0, 0, 0, 0],
        pomodorosToday: 0,
      };
      if (!token) return defaultStats;
      const res = await fetch(`${apiUrl}/analytics/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return defaultStats;
      const json = (await res.json()) as { success: boolean; data?: StatsSummary };
      return json.data || defaultStats;
    },
    enabled: !!token,
  });

  // 4. Fetch user's learning paths
  const { data: paths = [] } = useQuery<LearningPathItem[]>({
    queryKey: ['my-learning-paths'],
    queryFn: async () => {
      if (!token) return [];
      const res = await fetch(`${apiUrl}/learning-paths?public=false`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as { success: boolean; data?: { paths: LearningPathItem[] } };
      return json.data?.paths || [];
    },
    enabled: !!token,
  });

  // AI recommendations state (default empty for new users)
  const [aiRecs, setAiRecs] = useState<AIRecItem[]>([]);

  const email = session?.user.email || 'learner';
  const firstName = session?.user.user_metadata?.['full_name']?.split(' ')[0] || email.split('@')[0] || 'Learner';

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Safe stat fallbacks
  const todayMinutes = stats?.todayMinutes ?? 0;
  const dailyGoalMinutes = stats?.dailyGoalMinutes || 60;
  const streakDays = stats?.streakDays ?? 0;
  const streakBest = stats?.streakBest ?? 0;
  const lecturesThisWeek = stats?.lecturesThisWeek ?? 0;
  const weekProgress = stats?.weekProgress || [0, 0, 0, 0, 0, 0, 0];
  const isStatsEmpty = todayMinutes === 0 && streakDays === 0 && lecturesThisWeek === 0;

  // Competence metrics: calculate or 0
  const learningProgress = paths.length > 0
    ? Math.round(
        paths.reduce((acc, p) => acc + (p.progressPercent || 0), 0) / paths.length
      )
    : 0;
  const knowledgeProgress = 0; // Populates as quizzes/diagnostic assessments are taken
  const practicalProgress = 0; // Populates as problems/code playground challenges are completed
  const isCompetenceEmpty = learningProgress === 0 && knowledgeProgress === 0 && practicalProgress === 0;

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
            onClick={() => navigate('/learning')}
          >
            Explore Paths
          </Button>
          <Button
            variant="default"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => navigate('/learning?import=true')}
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
              <p className="text-xs text-text-secondary mt-0.5">
                Configure your daily study targets and learning preferences to personalize your dashboard.
              </p>
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

      {/* 2. Hero: Pick Up Where You Left Off */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-heading font-semibold uppercase tracking-wider text-text-secondary">
            Pick up where you left off
          </h2>
        </div>

        {continueLecture ? (
          /* Populated State: Active in-progress lecture */
          <Card className="border border-border bg-surface overflow-hidden card-interactive p-0">
            <div className="flex flex-col lg:flex-row">
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

              <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
                <div>
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

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="default"
                      size="md"
                      leftIcon={<Play size={16} fill="currentColor" />}
                      onClick={() => navigate(`/learning/player/${continueLecture.itemId}`)}
                    >
                      Resume at {continueLecture.timestamp}
                    </Button>
                    <span className="text-2xs text-text-muted font-mono hidden sm:inline-block">
                      Auto-saved position
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          /* Empty State: Educational card with guidance on how it appears */
          <Card className="border border-dashed border-border bg-surface/50 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/20">
                <Play size={22} className="ml-0.5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-heading font-bold text-text-default">
                  No active lecture in progress
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Your most recently watched lecture will appear here automatically with your playback position and timestamp saved, allowing you to jump back in with one click.
                </p>
                <div className="pt-2 flex items-center gap-2 text-2xs text-text-muted font-mono">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary/70 animate-pulse" />
                  <span>Where this comes from: Starts automatically when you begin any video inside My Learning.</span>
                </div>
              </div>
              <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                <Button
                  variant="default"
                  size="sm"
                  leftIcon={<Compass size={14} />}
                  onClick={() => navigate('/learning')}
                  className="w-full sm:w-auto"
                >
                  Browse Paths
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={() => navigate('/learning?import=true')}
                  className="w-full sm:w-auto"
                >
                  Import Course
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 3. Stat Strip */}
      <div className="space-y-2">
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
                  strokeDashoffset={2 * Math.PI * 16 * (1 - Math.min(todayMinutes / dailyGoalMinutes, 1))}
                  strokeLinecap="round"
                />
              </svg>
              <Clock size={14} className="absolute text-primary" />
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-text-muted font-semibold">Today's Time</p>
              <p className="text-sm font-bold text-text-default tabular-nums">
                {todayMinutes}m <span className="text-text-muted font-normal text-xs">/ {dailyGoalMinutes}m</span>
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
                {streakDays} days <span className="text-text-muted font-normal text-2xs block">Best: {streakBest} days</span>
              </p>
            </div>
          </Card>

          {/* Weekly Mini Bars */}
          <Card className="p-4 border border-border bg-surface flex items-center gap-3">
            <div className="flex items-end gap-1 h-9 flex-shrink-0">
              {weekProgress.map((val, idx) => (
                <div key={idx} className="w-1.5 bg-surface-subtle rounded-full h-full flex items-end">
                  <div
                    className={cn(
                      'w-full rounded-full',
                      val > 0 ? 'bg-primary' : 'bg-transparent',
                    )}
                    style={{ height: `${val > 0 ? Math.min((val / 60) * 100, 100) : 0}%` }}
                  />
                </div>
              ))}
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-text-muted font-semibold">Weekly Goal</p>
              <p className="text-sm font-bold text-text-default tabular-nums">
                {weekProgress.filter((v) => v > 0).length} / 7 days
              </p>
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
                {lecturesThisWeek} lectures <span className="text-text-muted font-normal text-2xs block">finished</span>
              </p>
            </div>
          </Card>
        </div>

        {/* Empty Telemetry Guidance: Only visible when no activity is recorded */}
        {isStatsEmpty && (
          <div className="px-3 py-2 rounded-lg bg-surface-subtle/50 border border-border/50 text-2xs text-text-secondary flex items-center gap-2">
            <HelpCircle size={14} className="text-primary flex-shrink-0" />
            <span>
              <strong>Where this comes from:</strong> Real-time learning telemetry starts accumulating automatically as you watch lectures, write markdown notes, or solve coding exercises. No manual time entry required.
            </span>
          </div>
        )}
      </div>

      {/* 4. Progress Breakdown: Three Separate Metrics */}
      <Card className="p-5 md:p-6 border border-border bg-surface space-y-4">
        <div>
          <h2 className="text-sm font-heading font-semibold text-text-default">
            Skill & Competence Breakdown
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Time spent watching is not progress. Gyanix measures your understanding across three distinct dimensions:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
          {/* Learning Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-text-default flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-progress-learning" />
                Learning Progress
              </span>
              <span className="font-mono text-text-muted">{learningProgress}%</span>
            </div>
            <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-progress-learning rounded-full transition-all duration-default"
                style={{ width: `${learningProgress}%` }}
              />
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
              <span className="font-mono text-text-muted">{knowledgeProgress}%</span>
            </div>
            <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-progress-knowledge rounded-full transition-all duration-default"
                style={{ width: `${knowledgeProgress}%` }}
              />
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
              <span className="font-mono text-text-muted">{practicalProgress}%</span>
            </div>
            <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-progress-practical rounded-full transition-all duration-default"
                style={{ width: `${practicalProgress}%` }}
              />
            </div>
            <p className="text-2xs text-text-muted">Hands-on code exercises & project challenges completed</p>
          </div>
        </div>

        {/* Empty Competence Guidance: Guides user where each dimension fills from */}
        {isCompetenceEmpty && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="p-3.5 rounded-lg bg-surface-subtle/60 border border-border text-xs space-y-2.5">
              <p className="text-2xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <HelpCircle size={13} className="text-primary" />
                Where each dimension advances from:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-2xs text-text-secondary">
                <div className="p-2.5 rounded bg-surface border border-border/60">
                  <span className="font-semibold text-progress-learning block mb-1">1. Learning Progress</span>
                  Advances as you finish lectures and mark sections completed inside{' '}
                  <Link to="/learning" className="text-primary hover:underline font-medium inline-flex items-center gap-0.5">
                    My Learning <ArrowRight size={10} />
                  </Link>
                </div>
                <div className="p-2.5 rounded bg-surface border border-border/60">
                  <span className="font-semibold text-progress-knowledge block mb-1">2. Knowledge Progress</span>
                  Advances when you test your theoretical understanding with{' '}
                  <Link to="/assessments" className="text-primary hover:underline font-medium inline-flex items-center gap-0.5">
                    Assessments <ArrowRight size={10} />
                  </Link>
                </div>
                <div className="p-2.5 rounded bg-surface border border-border/60">
                  <span className="font-semibold text-progress-practical block mb-1">3. Practical Progress</span>
                  Advances when you submit working code solutions in the{' '}
                  <Link to="/practice" className="text-primary hover:underline font-medium inline-flex items-center gap-0.5">
                    Practice Tracker <ArrowRight size={10} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 5. Horizontal Scroll Rails: My Learning Paths */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-heading font-semibold uppercase tracking-wider text-text-secondary">
            My Learning Paths
          </h2>
          <Link to="/learning" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {paths.length > 0 ? (
          /* Populated State: User's actual paths */
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-thin">
            {paths.map((path) => (
              <Card
                key={path.id}
                className="w-72 sm:w-80 flex-shrink-0 snap-start border border-border bg-surface overflow-hidden card-interactive p-0"
                onClick={() => navigate(`/learning/paths/${path.id}`)}
              >
                <div className="h-32 bg-surface-subtle overflow-hidden relative">
                  <img
                    src={path.cover_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80'}
                    alt={path.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 right-2 text-2xs font-mono bg-black/75 text-white px-2 py-0.5 rounded">
                    {path.completedLectures || 0}/{path.totalLectures || 0} finished
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-2xs text-text-muted font-mono capitalize">{path.visibility} Path</p>
                  <h3 className="text-sm font-heading font-semibold text-text-default mt-1 line-clamp-1">
                    {path.title}
                  </h3>
                  <div className="mt-3">
                    <div className="flex justify-between text-2xs text-text-muted font-mono mb-1">
                      <span>PROGRESS</span>
                      <span>{path.progressPercent || 0}%</span>
                    </div>
                    <div className="h-1 bg-surface-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${path.progressPercent || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State: Clear explanation and action buttons */
          <Card className="border border-dashed border-border bg-surface/50 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/20">
                <BookOpen size={22} />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-heading font-bold text-text-default">
                  No learning paths added yet
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Learning paths organize courses, YouTube playlists, and tutorials into structured syllabi with automated milestones, progress bars, and timestamped notes.
                </p>
                <div className="pt-2 flex items-center gap-2 text-2xs text-text-muted font-mono">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary/70 animate-pulse" />
                  <span>Where this comes from: Import a YouTube playlist, create a custom path, or clone community syllabi.</span>
                </div>
              </div>
              <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                <Button
                  variant="default"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={() => navigate('/learning?import=true')}
                  className="w-full sm:w-auto"
                >
                  Import Course
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Compass size={14} />}
                  onClick={() => navigate('/learning')}
                  className="w-full sm:w-auto"
                >
                  Explore Paths
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Sparkles size={14} className="text-ai" />}
                  onClick={() => navigate('/roadmaps')}
                  className="w-full sm:w-auto text-xs"
                >
                  AI Roadmaps
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 6. AI Recommendations (Violet-labelled cards — approval required) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="ai" className="text-2xs">✦ AI Recommendations</Badge>
          <span className="text-2xs text-text-muted">Nothing is added to your paths without your approval</span>
        </div>

        {aiRecs.length > 0 ? (
          /* Populated State */
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
        ) : (
          /* Empty State: Explaining what will appear and how to unlock */
          <Card className="border border-dashed border-ai/30 bg-ai/5 p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-ai/10 text-ai flex items-center justify-center flex-shrink-0 border border-ai/20">
                <Sparkles size={22} />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-heading font-bold text-text-default">
                  Personalized recommendations will appear here
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  As you study lectures, complete quizzes, and solve coding challenges, Gyanix AI analyzes your learning patterns to suggest the most relevant next courses and prerequisite refreshers.
                </p>
                <div className="pt-2 flex items-center gap-2 text-2xs text-text-muted font-mono">
                  <span className="inline-block w-2 h-2 rounded-full bg-ai/70 animate-pulse" />
                  <span>Where this comes from: Unlocks automatically as you finish lectures or take a diagnostic assessment.</span>
                </div>
              </div>
              <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Brain size={14} className="text-ai" />}
                  onClick={() => navigate('/assessments')}
                  className="w-full sm:w-auto"
                >
                  Take Assessment
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Sparkles size={14} className="text-ai" />}
                  onClick={() => navigate('/roadmaps')}
                  className="w-full sm:w-auto text-xs"
                >
                  Create AI Roadmap
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
