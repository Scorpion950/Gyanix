import { supabaseAdmin } from '../config/supabase.js';
import { notificationService } from './notificationService.js';
import type { SocialRelationshipStatus } from '@gyanix/shared';

export const socialService = {
  /**
   * Get the current relationship status between requester (userId) and target (targetUserId)
   */
  async getRelationshipStatus(userId: string, targetUserId: string): Promise<SocialRelationshipStatus> {
    if (userId === targetUserId) {
      return {
        isFriend: false,
        isFriendPendingSent: false,
        isFriendPendingReceived: false,
        isFollowing: false,
        isFollowedBy: false,
        isBlocked: false,
        isBlockedBy: false,
      };
    }

    const { data: records, error } = await supabaseAdmin
      .from('social_relationships')
      .select('*')
      .or(`and(user_id.eq.${userId},target_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},target_user_id.eq.${userId})`);

    if (error) {
      throw new Error(`Failed to fetch relationship: ${error.message}`);
    }

    let isFriend = false;
    let isFriendPendingSent = false;
    let isFriendPendingReceived = false;
    let isFollowing = false;
    let isFollowedBy = false;
    let isBlocked = false;
    let isBlockedBy = false;

    for (const rel of records || []) {
      if (rel.user_id === userId && rel.target_user_id === targetUserId) {
        if (rel.status === 'friends') isFriend = true;
        if (rel.status === 'friend_pending_sent') isFriendPendingSent = true;
        if (rel.status === 'following') isFollowing = true;
        if (rel.status === 'blocked') isBlocked = true;
      } else if (rel.user_id === targetUserId && rel.target_user_id === userId) {
        if (rel.status === 'friends') isFriend = true;
        if (rel.status === 'friend_pending_sent') isFriendPendingReceived = true;
        if (rel.status === 'following') isFollowedBy = true;
        if (rel.status === 'blocked') isBlockedBy = true;
      }
    }

    return {
      isFriend,
      isFriendPendingSent,
      isFriendPendingReceived,
      isFollowing,
      isFollowedBy,
      isBlocked,
      isBlockedBy,
    };
  },

  /**
   * Send a friend request from userId to targetUserId
   */
  async sendFriendRequest(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new Error('Cannot send friend request to yourself');

    const status = await this.getRelationshipStatus(userId, targetUserId);
    if (status.isBlocked || status.isBlockedBy) throw new Error('Action not allowed');
    if (status.isFriend) throw new Error('Already friends');
    if (status.isFriendPendingSent) throw new Error('Friend request already sent');

    // If target has already sent us a request, automatically accept it
    if (status.isFriendPendingReceived) {
      return this.acceptFriendRequest(userId, targetUserId);
    }

    // Upsert relationship
    const { error } = await supabaseAdmin
      .from('social_relationships')
      .upsert({
        user_id: userId,
        target_user_id: targetUserId,
        status: 'friend_pending_sent',
      });

    if (error) throw new Error(error.message);

    // Get sender's profile for the notification
    const { data: sender } = await supabaseAdmin
      .from('profiles')
      .select('display_name, username')
      .eq('auth_user_id', userId)
      .single();

    const senderName = sender?.display_name || sender?.username || 'Someone';

    await notificationService.create({
      userId: targetUserId,
      type: 'friend_request',
      title: 'New Friend Request',
      body: `${senderName} sent you a friend request.`,
      actionUrl: `/u/${sender?.username}`,
      metadata: { requesterId: userId },
    });

    return { success: true };
  },

  /**
   * Accept a pending friend request
   */
  async acceptFriendRequest(userId: string, requesterUserId: string) {
    // Both sides become friends in a mutual relationship record
    const { error: err1 } = await supabaseAdmin
      .from('social_relationships')
      .upsert({
        user_id: userId,
        target_user_id: requesterUserId,
        status: 'friends',
      });
    if (err1) throw new Error(err1.message);

    const { error: err2 } = await supabaseAdmin
      .from('social_relationships')
      .upsert({
        user_id: requesterUserId,
        target_user_id: userId,
        status: 'friends',
      });
    if (err2) throw new Error(err2.message);

    // Notify requester
    const { data: acceptor } = await supabaseAdmin
      .from('profiles')
      .select('display_name, username')
      .eq('auth_user_id', userId)
      .single();

    const acceptorName = acceptor?.display_name || acceptor?.username || 'A user';

    await notificationService.create({
      userId: requesterUserId,
      type: 'friend_accepted',
      title: 'Friend Request Accepted',
      body: `${acceptorName} accepted your friend request.`,
      actionUrl: `/u/${acceptor?.username}`,
      metadata: { friendId: userId },
    });

    return { success: true };
  },

  /**
   * Reject / Cancel friend request
   */
  async cancelOrRejectFriendRequest(userId: string, targetUserId: string) {
    const { error } = await supabaseAdmin
      .from('social_relationships')
      .delete()
      .or(`and(user_id.eq.${userId},target_user_id.eq.${targetUserId},status.eq.friend_pending_sent),and(user_id.eq.${targetUserId},target_user_id.eq.${userId},status.eq.friend_pending_sent)`);

    if (error) throw new Error(error.message);
    return { success: true };
  },

  /**
   * Unfriend
   */
  async unfriend(userId: string, targetUserId: string) {
    const { error } = await supabaseAdmin
      .from('social_relationships')
      .delete()
      .or(`and(user_id.eq.${userId},target_user_id.eq.${targetUserId},status.eq.friends),and(user_id.eq.${targetUserId},target_user_id.eq.${userId},status.eq.friends)`);

    if (error) throw new Error(error.message);
    return { success: true };
  },

  /**
   * Follow a user (one-way)
   */
  async follow(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new Error('Cannot follow yourself');

    const status = await this.getRelationshipStatus(userId, targetUserId);
    if (status.isBlocked || status.isBlockedBy) throw new Error('Action not allowed');

    const { error } = await supabaseAdmin
      .from('social_relationships')
      .upsert({
        user_id: userId,
        target_user_id: targetUserId,
        status: 'following',
      });

    if (error) throw new Error(error.message);

    // Notify target
    const { data: follower } = await supabaseAdmin
      .from('profiles')
      .select('display_name, username')
      .eq('auth_user_id', userId)
      .single();

    const followerName = follower?.display_name || follower?.username || 'Someone';

    await notificationService.create({
      userId: targetUserId,
      type: 'new_follower',
      title: 'New Follower',
      body: `${followerName} started following you.`,
      actionUrl: `/u/${follower?.username}`,
      metadata: { followerId: userId },
    });

    return { success: true };
  },

  /**
   * Unfollow
   */
  async unfollow(userId: string, targetUserId: string) {
    const { error } = await supabaseAdmin
      .from('social_relationships')
      .delete()
      .eq('user_id', userId)
      .eq('target_user_id', targetUserId)
      .eq('status', 'following');

    if (error) throw new Error(error.message);
    return { success: true };
  },

  /**
   * Block a user (removes any existing friendships or follows both ways)
   */
  async block(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new Error('Cannot block yourself');

    // Remove any friendship/follow records both ways
    await supabaseAdmin
      .from('social_relationships')
      .delete()
      .or(`and(user_id.eq.${userId},target_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},target_user_id.eq.${userId})`);

    // Insert block record
    const { error } = await supabaseAdmin
      .from('social_relationships')
      .insert({
        user_id: userId,
        target_user_id: targetUserId,
        status: 'blocked',
      });

    if (error) throw new Error(error.message);
    return { success: true };
  },

  /**
   * Unblock
   */
  async unblock(userId: string, targetUserId: string) {
    const { error } = await supabaseAdmin
      .from('social_relationships')
      .delete()
      .eq('user_id', userId)
      .eq('target_user_id', targetUserId)
      .eq('status', 'blocked');

    if (error) throw new Error(error.message);
    return { success: true };
  },

  /**
   * List friends of a user
   */
  async getFriends(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('social_relationships')
      .select('target_user_id, updated_at')
      .eq('user_id', userId)
      .eq('status', 'friends');

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return [];

    const friendIds = data.map((d) => d.target_user_id);
    const { data: profiles, error: pError } = await supabaseAdmin
      .from('profiles')
      .select('id, auth_user_id, username, display_name, avatar_url, profession, bio')
      .in('auth_user_id', friendIds)
      .eq('is_active', true);

    if (pError) throw new Error(pError.message);
    return profiles || [];
  },
};
