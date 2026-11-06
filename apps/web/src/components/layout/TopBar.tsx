import { Search, Plus, Menu } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { ThemeToggle } from '@/components/ui/ThemeToggle.tsx';
import { NotificationBell } from './NotificationBell.tsx';
import { cn } from '@/lib/utils.ts';
import { GyanixLogoMark } from '@/assets/Logo.tsx';
import { useNavigate } from 'react-router-dom';

export function TopBar({ onSearchClick }: { onSearchClick?: () => void }) {
  const { session } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-surface flex-shrink-0 z-10">
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
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

      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-2">
        <GyanixLogoMark className="h-6 w-6 text-primary" />
        <span className="font-heading font-semibold text-sm">Gyanix</span>
      </div>

      {/* Search — desktop */}
      <div className="hidden md:flex flex-1 max-w-sm">
        <button
          onClick={onSearchClick}
          className={cn(
            'flex items-center gap-2 w-full px-3 h-9 rounded-control',
            'bg-surface-subtle border border-border text-text-muted text-xs',
            'hover:border-primary/40 transition-colors duration-micro',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
          aria-label="Open search"
          aria-keyshortcuts="Control+K"
        >
          <Search size={14} strokeWidth={1.5} />
          <span>Search…</span>
          <kbd className="ml-auto text-2xs font-mono px-1.5 py-0.5 rounded bg-background border border-border">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Search — mobile */}
        <button
          className={cn(
            'md:hidden flex items-center justify-center w-9 h-9 rounded-control',
            'text-text-secondary hover:text-text-default hover:bg-surface-subtle',
            'transition-colors duration-micro',
          )}
          aria-label="Search"
        >
          <Search size={18} strokeWidth={1.5} />
        </button>

        {/* Quick add */}
        <button
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-control',
            'text-text-secondary hover:text-text-default hover:bg-surface-subtle',
            'transition-colors duration-micro',
          )}
          aria-label="Quick add"
          title="Quick add"
        >
          <Plus size={18} strokeWidth={1.5} />
        </button>

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
        >
          {session?.user.email?.[0]?.toUpperCase() ?? 'U'}
        </button>
      </div>
    </header>
  );
}
