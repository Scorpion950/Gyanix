import { supabaseAdmin } from '../config/supabase.js';
import type { NotificationType } from '@gyanix/shared';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
}

const inMemoryNotifications = new Map<string, any[]>();

export const notificationService = {
  async create(params: CreateNotificationParams) {
    const { userId, type, title, body = null, actionUrl = null, metadata = {} } = params;

    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          body,
          action_url: actionUrl,
          metadata,
          is_read: false,
        })
        .select()
        .single();

      if (!error && data) return data;
    } catch (_err) {}

    const notif = {
      id: 'notif-' + Date.now(),
      user_id: userId,
      type,
      title,
      body,
      action_url: actionUrl,
      metadata,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    const list = inMemoryNotifications.get(userId) || [];
    list.unshift(notif);
    inMemoryNotifications.set(userId, list);
    return notif;
  },

  async list(userId: string, limit = 20, offset = 0) {
    try {
      const { data, error, count } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        return {
          notifications: data,
          total: count || data.length,
        };
      }
    } catch (_err) {}

    const list = inMemoryNotifications.get(userId) || [
      {
        id: 'welcome-notif',
        user_id: userId,
        type: 'system',
        title: 'Welcome to Gyanix!',
        body: 'Start your learning journey by exploring AI Roadmaps or creating a Note.',
        action_url: '/roadmaps',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ];
    return {
      notifications: list.slice(offset, offset + limit),
      total: list.length,
    };
  },

  async getUnreadCount(userId: string) {
    try {
      const { count, error } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (!error && typeof count === 'number') {
        return count;
      }
    } catch (_err) {}

    const list = inMemoryNotifications.get(userId) || [];
    const unread = list.filter((n) => !n.is_read);
    return unread.length;
  },

  async markAsRead(userId: string, notificationId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (!error) return true;
    } catch (_err) {}

    const list = inMemoryNotifications.get(userId) || [];
    const item = list.find((n) => n.id === notificationId);
    if (item) item.is_read = true;
    return true;
  },

  async markAllAsRead(userId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (!error) return true;
    } catch (_err) {}

    const list = inMemoryNotifications.get(userId) || [];
    list.forEach((n) => { n.is_read = true; });
    return true;
  },
};
