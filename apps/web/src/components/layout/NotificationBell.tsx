import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { cn } from '@/lib/utils.ts';
import { useNavigate } from 'react-router-dom';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { session } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const apiUrl = import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api';
  const token = session?.access_token;

  // Unread count
  const { data: countData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      if (!token) return 0;
      const res = await fetch(`${apiUrl}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; data?: { count: number } };
      return json.data?.count ?? 0;
    },
    enabled: !!token,
    refetchInterval: 30_000, // gentle polling
  });

  // Notifications list
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: async () => {
      if (!token) return [];
      const res = await fetch(`${apiUrl}/notifications?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; data?: { notifications: NotificationItem[] } };
      return json.data?.notifications ?? [];
    },
    enabled: isOpen && !!token,
  });

  // Mark all read mutation
  const markAllMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${apiUrl}/notifications/mark-all-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  // Mark single read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${apiUrl}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = countData || 0;
  const notifications = notificationsData || [];

  const todayNotifications = notifications.filter((n) => {
    const d = new Date(n.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const earlierNotifications = notifications.filter((n) => {
    const d = new Date(n.created_at);
    const today = new Date();
    return d.toDateString() !== today.toDateString();
  });

  function handleItemClick(n: NotificationItem) {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    if (n.action_url) {
      setIsOpen(false);
      navigate(n.action_url);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'relative flex items-center justify-center w-9 h-9 rounded-control',
          'text-text-secondary hover:text-text-default hover:bg-surface-subtle',
          'transition-colors duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isOpen && 'bg-surface-subtle text-text-default',
        )}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={18} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-card border border-border bg-surface-raised shadow-popover z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
            <div className="flex items-center gap-2">
              <span className="text-xs font-heading font-semibold text-text-default">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-2xs font-mono px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                className="flex items-center gap-1 text-2xs text-text-muted hover:text-text-default transition-colors"
                title="Mark all as read"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-text-muted">Loading notifications…</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={24} className="mx-auto text-text-muted/40 mb-2" />
                <p className="text-xs font-medium text-text-default">All caught up</p>
                <p className="text-2xs text-text-secondary mt-0.5">No notifications right now.</p>
              </div>
            ) : (
              <>
                {todayNotifications.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 text-2xs font-semibold tracking-wider text-text-muted uppercase bg-surface-subtle/50">
                      Today
                    </div>
                    {todayNotifications.map((n) => (
                      <NotificationRow key={n.id} item={n} onClick={() => handleItemClick(n)} />
                    ))}
                  </div>
                )}

                {earlierNotifications.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 text-2xs font-semibold tracking-wider text-text-muted uppercase bg-surface-subtle/50">
                      Earlier
                    </div>
                    {earlierNotifications.map((n) => (
                      <NotificationRow key={n.id} item={n} onClick={() => handleItemClick(n)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ item, onClick }: { item: NotificationItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 flex gap-3 transition-colors duration-micro hover:bg-surface-subtle',
        !item.is_read && 'bg-primary/5',
      )}
    >
      <div className="mt-1">
        <span
          className={cn(
            'block w-2 h-2 rounded-full',
            !item.is_read ? 'bg-primary' : 'bg-transparent',
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-default truncate">{item.title}</p>
        {item.body && (
          <p className="text-xs text-text-secondary line-clamp-2 mt-0.5 leading-relaxed">
            {item.body}
          </p>
        )}
      </div>
      {item.action_url && (
        <ExternalLink size={12} className="text-text-muted flex-shrink-0 mt-1" />
      )}
    </button>
  );
}

