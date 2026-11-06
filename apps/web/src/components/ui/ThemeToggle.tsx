import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore.ts';
import { cn } from '@/lib/utils.ts';

type Theme = 'light' | 'dark' | 'system';

const themes: { value: Theme; icon: React.ElementType; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light mode' },
  { value: 'dark', icon: Moon, label: 'Dark mode' },
  { value: 'system', icon: Monitor, label: 'System default' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  // Cycle through themes on click
  function handleClick() {
    const idx = themes.findIndex((t) => t.value === theme);
    const next = themes[(idx + 1) % themes.length];
    if (next) setTheme(next.value);
  }

  const current = themes.find((t) => t.value === theme) ?? themes[2]!;
  const Icon = current.icon;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center justify-center w-9 h-9 rounded-control',
        'text-text-secondary hover:text-text-default hover:bg-surface-subtle',
        'transition-colors duration-micro focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      )}
      aria-label={`Theme: ${current.label}. Click to switch.`}
      title={current.label}
    >
      <Icon size={18} strokeWidth={1.5} />
    </button>
  );
}
