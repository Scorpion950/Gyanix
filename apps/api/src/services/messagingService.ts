import { supabaseAdmin } from '../config/supabase.js';
import type { SendMessageInput } from '@gyanix/shared';

export const messagingService = {
  /**
   * List conversations for user with participant details and latest message
   */
  async listConversations(userId: string) {
    // 1. Get conversation IDs for user
    const { data: myParticipations, error: pErr } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId);

    if (pErr) throw new Error(pErr.message);
    if (!myParticipations || myParticipations.length === 0) return [];

    const convIds = myParticipations.map((p) => p.conversation_id);

    // 2. Fetch conversations
    const { data: conversations, error: cErr } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .in('id', convIds)
      .order('updated_at', { ascending: false });

    if (cErr) throw new Error(cErr.message);

    // 3. Fetch participants for these conversations
    const { data: allParticipants } = await supabaseAdmin
      .from('conversation_participants')
      .select(
        `
        conversation_id, user_id, role,
        profiles:user_id (id, username, display_name, avatar_url)
      `
      )
      .in('conversation_id', convIds);

    // 4. Fetch latest message for each conversation
    const result: any[] = [];
    for (const conv of conversations || []) {
      const parts = (allParticipants || []).filter((p) => p.conversation_id === conv.id);
      const otherParts = parts.filter((p) => p.user_id !== userId);

      const { data: latestMsg } = await supabaseAdmin
        .from('messages')
        .select('id, content, created_at, sender_id')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      result.push({
        ...conv,
        participants: parts.map((p: any) => p.profiles),
        otherUser: conv.type === 'direct' ? otherParts[0]?.profiles : null,
        latestMessage: latestMsg || null,
      });
    }

    return result;
  },

  /**
   * Get or create Direct Message conversation between two users
   */
  async getOrCreateDM(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new Error('Cannot start a direct message with yourself');
    }

    // Check if target user is blocked
    const { data: blocked } = await supabaseAdmin
      .from('social_relationships')
      .select('status')
      .or(`and(source_user_id.eq.${userId},target_user_id.eq.${targetUserId}),and(source_user_id.eq.${targetUserId},target_user_id.eq.${userId})`)
      .eq('status', 'blocked')
      .maybeSingle();

    if (blocked) {
      throw new Error('Cannot message this user due to privacy preferences');
    }

    // Check for existing direct conversation between both users
    const { data: user1Convs } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (user1Convs && user1Convs.length > 0) {
      const cIds = user1Convs.map((c) => c.conversation_id);
      const { data: matched } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id, conversations!inner(type)')
        .eq('user_id', targetUserId)
        .eq('conversations.type', 'direct')
        .in('conversation_id', cIds)
        .maybeSingle();

      if (matched) {
        return { conversationId: matched.conversation_id };
      }
    }

    // Create new direct conversation
    const { data: newConv, error: cErr } = await supabaseAdmin
      .from('conversations')
      .insert({ type: 'direct', created_by: userId })
      .select()
      .single();

    if (cErr || !newConv) throw new Error(cErr?.message || 'Failed to create conversation');

    // Add both participants
    await supabaseAdmin.from('conversation_participants').insert([
      { conversation_id: newConv.id, user_id: userId, role: 'admin' },
      { conversation_id: newConv.id, user_id: targetUserId, role: 'member' },
    ]);

    return { conversationId: newConv.id };
  },

  /**
   * Create Study Group chat
   */
  async createGroup(userId: string, title: string, participantIds: string[]) {
    const { data: newConv, error: cErr } = await supabaseAdmin
      .from('conversations')
      .insert({ type: 'group', title, created_by: userId })
      .select()
      .single();

    if (cErr || !newConv) throw new Error(cErr?.message || 'Failed to create group');

    const participants = [
      { conversation_id: newConv.id, user_id: userId, role: 'admin' },
      ...participantIds.map((pId) => ({
        conversation_id: newConv.id,
        user_id: pId,
        role: 'member',
      })),
    ];

    await supabaseAdmin.from('conversation_participants').insert(participants);
    return newConv;
  },

  /**
   * List messages in a conversation
   */
  async listMessages(conversationId: string, userId: string, limit = 50, offset = 0) {
    // Verify participant
    const { data: isPart } = await supabaseAdmin
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!isPart) throw new Error('Not a participant in this conversation');

    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select(
        `
        id, conversation_id, sender_id, content, code_snippet, lecture_item_id,
        timestamp_seconds, is_pinned, created_at,
        profiles:sender_id (id, username, display_name, avatar_url)
      `
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    return (messages || []).map((m: any) => ({
      ...m,
      sender: m.profiles,
    }));
  },

  /**
   * Send a message
   */
  async sendMessage(userId: string, input: SendMessageInput) {
    // Verify participant
    const { data: isPart } = await supabaseAdmin
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', input.conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!isPart) throw new Error('Not a participant in this conversation');

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: input.conversationId,
        sender_id: userId,
        content: input.content,
        code_snippet: input.codeSnippet || null,
        lecture_item_id: input.lectureItemId || null,
        timestamp_seconds: input.timestampSeconds || null,
      })
      .select(
        `
        *,
        profiles:sender_id (id, username, display_name, avatar_url)
      `
      )
      .single();

    if (error) throw new Error(error.message);

    // Update conversation updated_at
    await supabaseAdmin
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', input.conversationId);

    return { ...data, sender: data.profiles };
  },

  /**
   * Pin / Unpin message
   */
  async togglePin(userId: string, messageId: string) {
    const { data: msg } = await supabaseAdmin
      .from('messages')
      .select('is_pinned, conversation_id')
      .eq('id', messageId)
      .single();

    if (!msg) throw new Error('Message not found');

    const { data, error } = await supabaseAdmin
      .from('messages')
      .update({ is_pinned: !msg.is_pinned })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
};
