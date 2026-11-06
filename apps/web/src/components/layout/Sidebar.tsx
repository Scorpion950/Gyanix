import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ClipboardCheck,
  Code2,
  BarChart3,
  Rss,
  Users,
  Trophy,
  FolderKanban,
  BookMarked,
  MessageSquare,
  Compass,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore.ts';
import { cn } from '@/lib/utils.ts';
import { GyanixLogoMark, GyanixWordmark } from '@/assets/Logo.tsx';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  /** Feature not yet built — shown with a "coming later" label */
  deferred?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Only show built features. Deferred features are hidden or labelled.
const navGroups: NavGroup[] = [
  {
    label: 'Learn',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'My Learning', to: '/learning', icon: BookOpen },
      { label: 'Notes', to: '/notes', icon: FileText, deferred: true },
      { label: 'Assessments', to: '/assessments', icon: ClipboardCheck, deferred: true },
    ],
  },
  {
    label: 'Practice',
    items: [
      { label: 'Code Playground', to: '/code', icon: Code2, deferred: true },
      { label: 'Practice Tracker', to: '/practice', icon: BarChart3, deferred: true },
    ],
  },
  {
    label: 'Community',
    items: [
      { label: 'Feed', to: '/feed', icon: Rss, deferred: true },
      { label: 'Communities', to: '/communities', icon: Users, deferred: true },
      { label: 'Challenges', to: '/challenges', icon: Trophy, deferred: true },
      { label: 'Projects', to: '/projects', icon: FolderKanban, deferred: true },
    ],
  },
  {
    label: 'Together',
    items: [
      { label: 'Study Rooms', to: '/rooms', icon: BookMarked, deferred: true },
      { label: 'Messages', to: '/messages', icon: MessageSquare, deferred: true },
    ],
  },
  {
    label: 'Explore',
    items: [
      { label: 'Discover', to: '/discover', icon: Compass, deferred: true },
    ],
  },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 264 }}
        transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
        className={cn(
          'hidden lg:flex flex-col flex-shrink-0 h-full',
          'bg-surface border-r border-border overflow-hidden',
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-border flex-shrink-0">
          <GyanixLogoMark className="h-7 w-7 text-primary flex-shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-2 overflow-hidden"
              >
                <GyanixWordmark className="h-5 text-text-default" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Sidebar navigation">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              {!sidebarCollapsed && (
                <p className="px-2 mb-1 text-2xs font-semibold uppercase tracking-widest text-text-muted">
                  {group.label}
                </p>
              )}
              <ul role="list" className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarNavItem
                    key={item.to}
                    item={item}
                    collapsed={sidebarCollapsed}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2">
          <button
            onClick={toggleSidebar}
            className={cn(
              'flex items-center justify-center w-full h-9 rounded-control',
              'text-text-muted hover:text-text-default hover:bg-surface-subtle',
              'transition-colors duration-micro focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            )}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={16} strokeWidth={1.5} />
            ) : (
              <div className="flex items-center gap-2 w-full px-2">
                <ChevronLeft size={16} strokeWidth={1.5} />
                <span className="text-xs">Collapse</span>
              </div>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
}

interface SidebarNavItemProps {
  item: NavItem;
  collapsed: boolean;
}

function SidebarNavItem({ item, collapsed }: SidebarNavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  const Icon = item.icon;

  if (item.deferred) {
    return (
      <li>
        <div
          className={cn(
            'flex items-center gap-3 px-2 h-9 rounded-control',
            'text-text-muted cursor-not-allowed',
            collapsed && 'justify-center',
          )}
          title={collapsed ? `${item.label} (coming soon)` : undefined}
          aria-disabled="true"
        >
          <Icon size={18} strokeWidth={1.5} className="flex-shrink-0 opacity-50" />
          {!collapsed && (
            <span className="text-xs flex-1 opacity-50">{item.label}</span>
          )}
          {!collapsed && (
            <span className="text-2xs px-1.5 py-0.5 rounded bg-surface-subtle text-text-muted opacity-75">
              Soon
            </span>
          )}
        </div>
      </li>
    );
  }

  return (
    <li>
      <NavLink
        to={item.to}
        className={cn(
          'flex items-center gap-3 px-2 h-9 rounded-control',
          'transition-colors duration-micro focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-text-secondary hover:text-text-default hover:bg-surface-subtle',
          collapsed && 'justify-center',
        )}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon
          size={18}
          strokeWidth={1.5}
          className={cn('flex-shrink-0', isActive && 'text-primary')}
        />
        {!collapsed && <span className="text-xs">{item.label}</span>}
      </NavLink>
    </li>
  );
}
