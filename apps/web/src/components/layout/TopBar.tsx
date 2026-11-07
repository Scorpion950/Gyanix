import { useState, useRef, useEffect } from 'react';
import { Search, Plus, Menu, FileText, BookOpen, Sparkles, ClipboardCheck, FolderKanban, BarChart3, Play, Pause, RotateCcw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { usePomodoroStore } from '@/stores/pomodoroStore.ts';
import { ThemeToggle } from '@/components/ui/ThemeToggle.tsx';
import { NotificationBell } from './NotificationBell.tsx';
import { cn } from '@/lib/utils.ts';
import { GyanixLogoMark } from '@/assets/Logo.tsx';
import { useNavigate, Link } from 'react-router-dom';

export function TopBar({ onSearchClick }: { onSearchClick?: () => void }) {
  const { session } = useAuthStore();
  const { setMobileMenuOpen } = useUIStore();
  const navigate = useNavigate();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const quickAddRef = useRef<HTMLDivElement>(null);

  // Global Pomodoro Timer state
  const { isRunning, timeLeft, tick, externalSession, activeProblemTitle, togglePlayPause, resetTimer } = usePomodoroStore();

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [isRunning, tick]);

  const pMinutes = Math.floor(timeLeft / 60);
  const pSeconds = timeLeft % 60;
  const timeFormatted = `${pMinutes.toString().padStart(2, '0')}:${pSeconds.toString().padStart(2, '0')}`;

  // Close quick add menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quickAddRef.current && !quickAddRef.current.contains(event.target as Node)) {
        setQuickAddOpen(false);
      }
    }
    if (quickAddOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [quickAddOpen]);

  const quickActions = [
    { label: 'New Note', icon: FileText, to: '/notes', desc: 'Capture code snippets or thoughts' },
    { label: 'Create Learning Path', icon: BookOpen, to: '/learning', desc: 'Curate a structured course or playlist' },
    { label: 'Generate AI Roadmap', icon: Sparkles, to: '/roadmaps', desc: 'Synthesize custom syllabus & videos' },
    { label: 'Take Assessment', icon: ClipboardCheck, to: '/assessments', desc: 'Test competency in any topic' },
    { label: 'Showcase Project', icon: FolderKanban, to: '/projects', desc: 'Share your repository or demo' },
    { label: 'Log Practice Problem', icon: BarChart3, to: '/practice', desc: 'Record solved DSA or SQL problems' },
  ];

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-surface flex-shrink-0 z-10">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className={cn(
          'lg:hidden flex items-center justify-center w-9 h-9 rounded-control',
          'text-text-secondary hover:text-text-default hover:bg-surface-subtle',
          'transition-colors duration-micro focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        )}
        aria-label="Open navigation menu"
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      {/* Mobile logo — always clickable and redirects to dashboard */}
      <div className="lg:hidden flex items-center">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 focus:outline-none"
          title="Go to Dashboard"
        >
          <GyanixLogoMark className="h-6 w-6 text-primary flex-shrink-0" />
          <span className="font-heading font-semibold text-sm text-text-default">Gyanix</span>
        </Link>
      </div>

      {/* Search — desktop */}
      <div className="hidden md:flex flex-1 max-w-lg">
        <button
          onClick={onSearchClick}
          className={cn(
            'flex items-center gap-2.5 w-full px-4 h-9 rounded-full',
            'bg-surface-subtle border border-border text-text-muted text-xs',
            'hover:border-primary/50 hover:bg-surface transition-all duration-micro cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          )}
          aria-label="Open search"
          aria-keyshortcuts="Control+K"
        >
          <Search size={14} strokeWidth={1.5} className="shrink-0" />
          <span className="truncate text-text-muted">Search paths, problems, notes, roadmaps, communities...</span>
          <kbd className="ml-auto text-2xs font-mono px-1.5 py-0.5 rounded bg-background border border-border shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex-1" />

      {/* Live Active Pomodoro Timer Pill */}
      {(isRunning || timeLeft < 1500) && (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono font-medium shadow-xs">
          <span className="flex items-center gap-1.5">
            <span className="text-sm">🍅</span>
            <span className="font-bold">{timeFormatted}</span>
          </span>

          {(externalSession?.websiteName || activeProblemTitle) && (
            <span className="hidden sm:inline-block max-w-[130px] truncate text-[11px] text-text-secondary border-l border-primary/20 pl-2">
              {externalSession?.websiteName ? `${externalSession.websiteName}` : activeProblemTitle}
            </span>
          )}

          <div className="flex items-center gap-1 border-l border-primary/20 pl-1.5 ml-0.5">
            <button
              onClick={togglePlayPause}
              className="p-1 hover:text-text-default rounded transition-colors cursor-pointer"
              title={isRunning ? 'Pause Pomodoro' : 'Resume Pomodoro'}
            >
              {isRunning ? <Pause size={12} className="fill-current" /> : <Play size={12} className="fill-current" />}
            </button>
            <button
              onClick={resetTimer}
              className="p-1 hover:text-danger rounded transition-colors cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Search — mobile */}
        <button
          onClick={onSearchClick}
          className={cn(
            'md:hidden flex items-center justify-center w-9 h-9 rounded-control',
            'text-text-secondary hover:text-text-default hover:bg-surface-subtle',
            'transition-colors duration-micro',
          )}
          aria-label="Search"
        >
          <Search size={18} strokeWidth={1.5} />
        </button>

        {/* Quick add dropdown */}
        <div className="relative" ref={quickAddRef}>
          <button
            onClick={() => setQuickAddOpen((prev) => !prev)}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-control',
              'text-text-secondary hover:text-text-default hover:bg-surface-subtle',
              'transition-colors duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              quickAddOpen && 'bg-surface-subtle text-text-default',
            )}
            aria-label="Quick create"
            title="Create new..."
          >
            <Plus size={18} strokeWidth={1.5} />
          </button>

          {quickAddOpen && (
            <div className="absolute right-0 mt-2 w-64 p-1.5 rounded-lg border border-border bg-surface shadow-2xl z-50">
              <div className="px-2 py-1.5 border-b border-border mb-1">
                <p className="text-2xs font-semibold uppercase tracking-wider text-text-muted">Create New</p>
              </div>
              <div className="space-y-0.5">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.to}
                      onClick={() => {
                        setQuickAddOpen(false);
                        navigate(action.to);
                      }}
                      className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-control text-left hover:bg-surface-subtle transition-colors group"
                    >
                      <Icon size={16} className="text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-text-default group-hover:text-primary transition-colors">
                          {action.label}
                        </p>
                        <p className="text-2xs text-text-muted line-clamp-1">{action.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Profile avatar */}
        <button
          onClick={() => navigate('/profile')}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-full',
            'bg-primary/10 text-primary text-xs font-semibold',
            'hover:bg-primary/20 transition-colors duration-micro',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
          aria-label="View your profile"
          title="Profile & Settings"
        >
          {session?.user.email?.[0]?.toUpperCase() ?? 'U'}
        </button>
      </div>
    </header>
  );
}
