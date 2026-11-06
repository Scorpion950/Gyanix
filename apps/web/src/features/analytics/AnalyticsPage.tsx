import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Flame,
  Award,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Card } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { cn } from '@/lib/utils.ts';
import { toast } from 'sonner';

export function AnalyticsPage() {
  const { session } = useAuthStore();
  const queryClient = useQueryClient();

  // Pomodoro timer state
  const [pomodoroLength, setPomodoroLength] = useState(25); // minutes
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');

  const apiUrl = import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api';
  const token = session?.access_token;

  // Fetch summary stats
  const { data: stats } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/analytics/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as any;
      return json.data || { todayMinutes: 0, streakDays: 1, weekProgress: [], pomodorosToday: 0 };
    },
    enabled: !!token,
  });

  // Fetch achievements
  const { data: achievements = [] } = useQuery({
    queryKey: ['analytics-achievements'],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/analytics/achievements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as any;
      return json.data || [];
    },
    enabled: !!token,
  });

  // Log completed pomodoro mutation
  const logPomodoroMutation = useMutation({
    mutationFn: async (durationMinutes: number) => {
      await fetch(`${apiUrl}/analytics/pomodoro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ durationMinutes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      toast.success('Pomodoro session completed & recorded!');
    },
  });

  // Timer tick effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      if (timerMode === 'focus') {
        logPomodoroMutation.mutate(pomodoroLength);
        setTimerMode('break');
        setSecondsLeft(5 * 60); // 5 min break
      } else {
        toast.info('Break completed! Ready to focus?');
        setTimerMode('focus');
        setSecondsLeft(pomodoroLength * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsLeft, timerMode, pomodoroLength]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-text-default">Focus & Analytics</h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Structured Pomodoro intervals, habit consistency, and verified skill milestones.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Pomodoro Widget (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border border-border bg-surface p-6 text-center space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-semibold uppercase tracking-wider text-text-muted">
                Pomodoro Focus Timer
              </span>
              <Badge variant={timerMode === 'focus' ? 'default' : 'secondary'} className="text-2xs">
                {timerMode === 'focus' ? 'Deep Work' : 'Short Break'}
              </Badge>
            </div>

            {/* Timer Dial Display */}
            <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-surface-subtle"
                  fill="transparent"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="6"
                  className={timerMode === 'focus' ? 'text-primary' : 'text-success'}
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={
                    2 * Math.PI * 88 * (1 - secondsLeft / (timerMode === 'focus' ? pomodoroLength * 60 : 5 * 60))
                  }
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-4xl font-mono font-bold text-text-default tabular-nums">
                  {timeFormatted}
                </span>
                <p className="text-2xs text-text-muted font-mono mt-1 uppercase">
                  {timerMode === 'focus' ? 'Stay in the zone' : 'Recharge'}
                </p>
              </div>
            </div>

            {/* Interval buttons */}
            <div className="flex justify-center gap-2">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  disabled={isTimerRunning}
                  onClick={() => {
                    setPomodoroLength(mins);
                    setSecondsLeft(mins * 60);
                    setTimerMode('focus');
                  }}
                  className={cn(
                    'px-3 py-1 text-xs font-mono rounded-control border transition-colors',
                    pomodoroLength === mins && timerMode === 'focus'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-surface-subtle text-text-secondary border-border hover:bg-surface',
                  )}
                >
                  {mins}m
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-3">
              <Button
                variant={isTimerRunning ? 'outline' : 'default'}
                size="md"
                leftIcon={isTimerRunning ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                onClick={() => setIsTimerRunning((v) => !v)}
              >
                {isTimerRunning ? 'Pause' : 'Start Focus'}
              </Button>
              <Button
                variant="ghost"
                size="md"
                leftIcon={<RotateCcw size={16} />}
                onClick={() => {
                  setIsTimerRunning(false);
                  setSecondsLeft(pomodoroLength * 60);
                  setTimerMode('focus');
                }}
              >
                Reset
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Streaks & Achievements (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Streak & Consistency Card */}
          <Card className="border border-border bg-surface p-5">
            <h2 className="text-sm font-heading font-semibold text-text-default mb-3">
              Habit Consistency
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-control bg-surface-subtle border border-border/50">
                <p className="text-2xs uppercase tracking-wider text-text-muted font-semibold">Active Streak</p>
                <p className="text-lg font-mono font-bold text-streak mt-0.5">
                  {stats?.streakDays || 1} Days 🔥
                </p>
              </div>

              <div className="p-3 rounded-control bg-surface-subtle border border-border/50">
                <p className="text-2xs uppercase tracking-wider text-text-muted font-semibold">Today's Study</p>
                <p className="text-lg font-mono font-bold text-text-default mt-0.5">
                  {stats?.todayMinutes || 0}m
                </p>
              </div>

              <div className="p-3 rounded-control bg-surface-subtle border border-border/50 col-span-2 sm:col-span-1">
                <p className="text-2xs uppercase tracking-wider text-text-muted font-semibold">Pomodoros</p>
                <p className="text-lg font-mono font-bold text-primary mt-0.5">
                  {stats?.pomodorosToday || 0} blocks
                </p>
              </div>
            </div>
          </Card>

          {/* Verified Achievements Showcase */}
          <Card className="border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-heading font-semibold text-text-default">
                Achievements & Badges
              </h2>
              <span className="text-2xs font-mono text-text-muted">
                {achievements.filter((a: any) => a.isUnlocked).length} / {achievements.length} unlocked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {achievements.map((ach: any) => (
                <div
                  key={ach.id}
                  className={cn(
                    'p-3 rounded-control border flex items-start gap-3 transition-colors',
                    ach.isUnlocked
                      ? 'bg-primary/5 border-primary/30 text-text-default'
                      : 'bg-surface-subtle/50 border-border text-text-muted opacity-60',
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold',
                      ach.isUnlocked ? 'bg-primary text-primary-foreground' : 'bg-border text-text-muted',
                    )}
                  >
                    <Award size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-text-default">{ach.title}</span>
                      <span className="text-2xs uppercase tracking-wider font-mono text-text-muted">
                        {ach.badge_tier}
                      </span>
                    </div>
                    <p className="text-2xs text-text-secondary mt-0.5 leading-relaxed">
                      {ach.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

