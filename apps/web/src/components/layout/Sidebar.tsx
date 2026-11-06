import { NavLink, Link, useLocation } from 'react-router-dom';
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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
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

const navGroups: NavGroup[] = [
  {
    label: 'Learn',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'My Learning', to: '/learning', icon: BookOpen },
      { label: 'Notes', to: '/notes', icon: FileText },
      { label: 'AI Roadmaps', to: '/roadmaps', icon: Sparkles },
      { label: 'Assessments', to: '/assessments', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Practice',
    items: [
      { label: 'Code Playground', to: '/code', icon: Code2 },
      { label: 'Practice Tracker', to: '/practice', icon: BarChart3 },
    ],
  },
  {
    label: 'Community',
    items: [
      { label: 'Feed', to: '/feed', icon: Rss },
      { label: 'Communities', to: '/communities', icon: Users },
      { label: 'Challenges', to: '/challenges', icon: Trophy },
      { label: 'Projects', to: '/projects', icon: FolderKanban },
    ],
  },
  {
    label: 'Together',
    items: [
      { label: 'Study Rooms', to: '/rooms', icon: BookMarked },
      { label: 'Messages', to: '/messages', icon: MessageSquare },
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
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore();

  return (
    <>
      {/* Mobile Drawer with dark blur backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Blurry dark backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md"
              aria-hidden="true"
            />

            {/* Sliding Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0, 0, 0.2, 1] }}
              className="relative w-72 max-w-[85vw] h-full bg-surface border-r border-border flex flex-col shadow-2xl overflow-hidden"
              aria-label="Mobile navigation"
            >
              {/* Mobile Header with Logo Link & Close */}
              <div className="flex items-center justify-between h-14 px-4 border-b border-border flex-shrink-0">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 focus:outline-none"
                  title="Go to Dashboard"
                >
                  <GyanixLogoMark size={28} className="flex-shrink-0" />
                  <GyanixWordmark size={22} className="text-text-default" />
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-control text-text-muted hover:text-text-default hover:bg-surface-subtle transition-colors"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation list */}
              <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Mobile sidebar navigation">
                {navGroups.map((group) => (
                  <div key={group.label} className="mb-4">
                    <p className="px-2 mb-1.5 text-2xs font-semibold uppercase tracking-widest text-text-muted">
                      {group.label}
                    </p>
                    <ul className="space-y-1">
                      {group.items.map((item) => (
                        <SidebarNavItem
                          key={item.to}
                          item={item}
                          collapsed={false}
                          onNavigate={() => setMobileMenuOpen(false)}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

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
          <Link to="/dashboard" className="flex items-center gap-2 focus:outline-none" title="Go to Dashboard">
            <GyanixLogoMark size={30} className="flex-shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-2 overflow-hidden"
                >
                  <GyanixWordmark size={24} className="text-text-default" />
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
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
              <ul className="space-y-0.5">
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
  onNavigate?: () => void;
}

function SidebarNavItem({ item, collapsed, onNavigate }: SidebarNavItemProps) {
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
        onClick={onNavigate}
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
