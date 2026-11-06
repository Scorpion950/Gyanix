import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore.ts';
import { cn } from '@/lib/utils.ts';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'flex items-center justify-center w-9 h-9 rounded-control',
        'text-text-secondary hover:text-text-default hover:bg-surface-subtle',
        'transition-colors duration-micro focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      )}
      aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
    >
      {isDark ? (
        <Sun size={18} strokeWidth={1.8} className="text-amber-400 hover:rotate-45 transition-transform duration-200" />
      ) : (
        <Moon size={18} strokeWidth={1.8} className="text-slate-700 hover:-rotate-12 transition-transform duration-200" />
      )}
    </button>
  );
}
