import { supabaseAdmin } from '../config/supabase.js';
import type { CreateNoteInput, UpdateNoteInput, CreateCollectionInput } from '@gyanix/shared';

export const notesService = {
  async createNote(userId: string, input: CreateNoteInput) {
    const { data, error } = await supabaseAdmin
      .from('notes')
      .insert({
        user_id: userId,
        collection_id: input.collectionId || null,
        path_id: input.pathId || null,
        path_item_id: input.pathItemId || null,
        timestamp_seconds: input.timestampSeconds ?? null,
        title: input.title,
        content_markdown: input.contentMarkdown || '',
        priority: input.priority || 'medium',
        deadline_at: input.deadlineAt || null,
        is_pinned: input.isPinned ?? false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Increment notes_created counter in today's rollup
    const today = new Date().toISOString().split('T')[0];
    try {
      await supabaseAdmin.rpc('increment_daily_notes', { p_user_id: userId, p_date: today });
    } catch (_err) {
      // Fallback: upsert manually if rpc not created
      await supabaseAdmin
        .from('daily_learning_rollups')
        .upsert(
          { user_id: userId, date: today, notes_created: 1 },
          { onConflict: 'user_id,date' },
        );
    }

    return data;
  },

  async updateNote(userId: string, noteId: string, input: UpdateNoteInput) {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload['title'] = input.title;
    if (input.contentMarkdown !== undefined) updatePayload['content_markdown'] = input.contentMarkdown;
    if (input.collectionId !== undefined) updatePayload['collection_id'] = input.collectionId;
    if (input.priority !== undefined) updatePayload['priority'] = input.priority;
    if (input.deadlineAt !== undefined) updatePayload['deadline_at'] = input.deadlineAt;
    if (input.isPinned !== undefined) updatePayload['is_pinned'] = input.isPinned;

    const { data, error } = await supabaseAdmin
      .from('notes')
      .update(updatePayload)
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async deleteNote(userId: string, noteId: string) {
    const { error } = await supabaseAdmin
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return true;
  },

  async listNotes(
    userId: string,
    options: {
      collectionId?: string | undefined;
      pathItemId?: string | undefined;
      query?: string | undefined;
    },
  ) {
    let q = supabaseAdmin
      .from('notes')
      .select(`
        *,
        collection:notes_collections (id, title, color)
      `)
      .eq('user_id', userId);

    if (options.collectionId) {
      q = q.eq('collection_id', options.collectionId);
    }
    if (options.pathItemId) {
      q = q.eq('path_item_id', options.pathItemId);
    }
    if (options.query) {
      q = q.ilike('title', `%${options.query}%`);
    }

    const { data, error } = await q.order('is_pinned', { ascending: false }).order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async listCollections(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('notes_collections')
      .select('*')
      .eq('user_id', userId)
      .order('title', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async createCollection(userId: string, input: CreateCollectionInput) {
    const { data, error } = await supabaseAdmin
      .from('notes_collections')
      .insert({
        user_id: userId,
        title: input.title,
        description: input.description || null,
        color: input.color || '#2563EB',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
};
