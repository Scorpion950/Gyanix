import { supabaseAdmin } from '../config/supabase.js';
import type { CreateRoomInput, UpdateVideoSyncInput } from '@gyanix/shared';

export const roomService = {
  /**
   * List active study rooms
   */
  async listRooms() {
    const { data: rooms, error } = await supabaseAdmin
      .from('study_rooms')
      .select(
        `
        *,
        profiles:host_id (id, username, display_name, avatar_url)
      `
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Get participant counts for each room
    const roomIds = (rooms || []).map((r) => r.id);
    let counts: Record<string, number> = {};

    if (roomIds.length > 0) {
      const { data: parts } = await supabaseAdmin
        .from('room_participants')
        .select('room_id')
        .in('room_id', roomIds);

      if (parts) {
        for (const p of parts) {
          counts[p.room_id] = (counts[p.room_id] || 0) + 1;
        }
      }
    }

    return (rooms || []).map((r: any) => ({
      ...r,
      host: r.profiles,
      participantCount: counts[r.id] || 1,
    }));
  },

  /**
   * Create a new Study Room
   */
  async createRoom(hostId: string, input: CreateRoomInput) {
    const { data, error } = await supabaseAdmin
      .from('study_rooms')
      .insert({
        host_id: hostId,
        name: input.name,
        topic: input.topic,
        current_video_url: input.currentVideoUrl || null,
        is_private: input.isPrivate,
        access_code: input.accessCode || null,
        max_participants: input.maxParticipants || 6,
      })
      .select(
        `
        *,
        profiles:host_id (id, username, display_name, avatar_url)
      `
      )
      .single();

    if (error) throw new Error(error.message);

    // Auto-join host
    await supabaseAdmin.from('room_participants').insert({
      room_id: data.id,
      user_id: hostId,
    });

    return { ...data, host: data.profiles, participantCount: 1 };
  },

  /**
   * Get room details
   */
  async getRoom(roomId: string) {
    const { data: room, error } = await supabaseAdmin
      .from('study_rooms')
      .select(
        `
        *,
        profiles:host_id (id, username, display_name, avatar_url)
      `
      )
      .eq('id', roomId)
      .single();

    if (error || !room) throw new Error('Study room not found');

    const { data: participants } = await supabaseAdmin
      .from('room_participants')
      .select(
        `
        user_id, joined_at, is_muted, is_video_on,
        profiles:user_id (id, username, display_name, avatar_url)
      `
      )
      .eq('room_id', roomId);

    return {
      ...room,
      host: room.profiles,
      participants: (participants || []).map((p: any) => ({
        ...p,
        user: p.profiles,
      })),
    };
  },

  /**
   * Join room with max participant cap (6 WebRTC mesh limit)
   */
  async joinRoom(roomId: string, userId: string, accessCode?: string) {
    const { data: room } = await supabaseAdmin
      .from('study_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (!room) throw new Error('Room not found');

    if (room.is_private && room.access_code && room.access_code !== accessCode) {
      throw new Error('Incorrect access code');
    }

    // Check count
    const { count } = await supabaseAdmin
      .from('room_participants')
      .select('id', { count: 'exact' })
      .eq('room_id', roomId);

    if ((count || 0) >= room.max_participants) {
      throw new Error(`Room is full (max ${room.max_participants} participants for WebRTC mesh)`);
    }

    await supabaseAdmin.from('room_participants').upsert(
      {
        room_id: roomId,
        user_id: userId,
      },
      { onConflict: 'room_id,user_id' }
    );

    return this.getRoom(roomId);
  },

  /**
   * Leave room
   */
  async leaveRoom(roomId: string, userId: string) {
    await supabaseAdmin
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    return { left: true };
  },

  /**
   * Synchronize YouTube Video Playback
   */
  async updateVideoSync(roomId: string, input: UpdateVideoSyncInput) {
    const updates: Record<string, any> = {
      current_timestamp_seconds: input.timestampSeconds,
      is_video_playing: input.isPlaying,
      updated_at: new Date().toISOString(),
    };
    if (input.currentVideoUrl) {
      updates['current_video_url'] = input.currentVideoUrl;
    }

    const { data, error } = await supabaseAdmin
      .from('study_rooms')
      .update(updates)
      .eq('id', roomId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Save Whiteboard strokes / scene
   */
  async saveWhiteboard(roomId: string, whiteboardData: any) {
    const { data, error } = await supabaseAdmin
      .from('study_rooms')
      .update({
        whiteboard_data: whiteboardData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId)
      .select('id, whiteboard_data')
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
};

