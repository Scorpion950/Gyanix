import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.tsx';
import { TopBar } from './TopBar.tsx';
import { UniversalSearchModal } from '@/components/search/UniversalSearchModal.tsx';
import { useUIStore } from '@/stores/uiStore.ts';
import { cn } from '@/lib/utils.ts';

/**
 * AppShell — the main application layout wrapper.
 * Desktop: left sidebar + top bar + main content + optional right panel
 * Tablet: icon rail + drawers
 * Mobile: bottom tab bar + compact top bar
 */
export function AppShell() {
  const { sidebarCollapsed: _sidebarCollapsed, focusMode } = useUIStore();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className={cn(
        'flex h-screen overflow-hidden bg-background',
        focusMode && 'focus-mode',
      )}
    >
      {/* Left Sidebar — hidden on mobile (bottom nav used instead) */}
      <Sidebar />

      {/* Main area: top bar + scrollable content */}
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-panel',
          'lg:ml-0',
        )}
      >
        <TopBar onSearchClick={() => setSearchOpen(true)} />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto focus:outline-none"
        >
          <div className="mx-auto max-w-page px-4 py-6 md:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Universal Search Modal (Ctrl/Cmd + K) */}
      <UniversalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
