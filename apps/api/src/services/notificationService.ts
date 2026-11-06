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

export const notificationService = {
  /**
   * Create a notification for a user and deliver via database (realtime listener on client picks it up)
   */
  async create(params: CreateNotificationParams) {
    const { userId, type, title, body = null, actionUrl = null, metadata = {} } = params;

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

    if (error) {
      console.error('[notificationService] Failed to create notification:', error.message);
      return null;
    }

    return data;
  },

  async list(userId: string, limit = 20, offset = 0) {
    const { data, error, count } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to list notifications: ${error.message}`);
    }

    return {
      notifications: data || [],
      total: count || 0,
    };
  },

  async getUnreadCount(userId: string) {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new Error(`Failed to get unread count: ${error.message}`);
    }

    return count || 0;
  },

  async markAsRead(userId: string, notificationId: string) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
    return true;
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new Error(`Failed to mark all as read: ${error.message}`);
    }
    return true;
  },
};

