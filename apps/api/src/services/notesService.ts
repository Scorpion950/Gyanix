import { supabaseAdmin } from '../config/supabase.js';
import type { CreateNoteInput, UpdateNoteInput, CreateCollectionInput } from '@gyanix/shared';

// Resilient in-memory store for environments without migrated Supabase tables
const inMemoryNotes = new Map<string, any[]>();
const inMemoryCollections = new Map<string, any[]>();

export const notesService = {
  async createNote(userId: string, input: CreateNoteInput) {
    try {
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

      if (!error && data) {
        // Increment notes_created counter in today's rollup
        const today = new Date().toISOString().split('T')[0];
        try {
          await supabaseAdmin.rpc('increment_daily_notes', { p_user_id: userId, p_date: today });
        } catch (_err) {
          try {
            await supabaseAdmin
              .from('daily_learning_rollups')
              .upsert(
                { user_id: userId, date: today, notes_created: 1 },
                { onConflict: 'user_id,date' },
              );
          } catch (_e) {}
        }
        return data;
      }
    } catch (_err) {
      // Fall through to in-memory fallback
    }

    const fallbackNote = {
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      collection: null,
    };

    const userNotes = inMemoryNotes.get(userId) || [];
    userNotes.unshift(fallbackNote);
    inMemoryNotes.set(userId, userNotes);
    return fallbackNote;
  },

  async updateNote(userId: string, noteId: string, input: UpdateNoteInput) {
    try {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      const content = input.contentMarkdown ?? (input as any).content_markdown;
      if (input.title !== undefined) updatePayload['title'] = input.title;
      if (content !== undefined) updatePayload['content_markdown'] = content;
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

      if (!error && data) return data;
    } catch (_err) {}

    const userNotes = inMemoryNotes.get(userId) || [];
    const note = userNotes.find((n) => n.id === noteId);
    if (note) {
      const content = input.contentMarkdown ?? (input as any).content_markdown;
      if (input.title !== undefined) note.title = input.title;
      if (content !== undefined) note.content_markdown = content;
      if (input.collectionId !== undefined) note.collection_id = input.collectionId;
      if (input.priority !== undefined) note.priority = input.priority;
      if (input.deadlineAt !== undefined) note.deadline_at = input.deadlineAt;
      if (input.isPinned !== undefined) note.is_pinned = input.isPinned;
      note.updated_at = new Date().toISOString();
      return note;
    }
    const content = input.contentMarkdown ?? (input as any).content_markdown;
    return { id: noteId, ...input, content_markdown: content ?? '', updated_at: new Date().toISOString() };
  },

  async deleteNote(userId: string, noteId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userId);

      if (!error) return true;
    } catch (_err) {}

    const userNotes = inMemoryNotes.get(userId) || [];
    inMemoryNotes.set(userId, userNotes.filter((n) => n.id !== noteId));
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
    try {
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

      if (!error && data) return data;
    } catch (_err) {}

    let list = inMemoryNotes.get(userId) || [];
    if (options.collectionId) {
      list = list.filter((n) => n.collection_id === options.collectionId);
    }
    if (options.query) {
      const q = options.query.toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.content_markdown.toLowerCase().includes(q));
    }
    return list;
  },

  async listCollections(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notes_collections')
        .select('*')
        .eq('user_id', userId)
        .order('title', { ascending: true });

      if (!error && data && data.length > 0) return data;
    } catch (_err) {}

    const userCollections = inMemoryCollections.get(userId) || [
      {
        id: 'col-core',
        user_id: userId,
        title: 'Core Architecture',
        description: 'Key engineering notes and system patterns',
        color: '#2563EB',
        created_at: new Date().toISOString(),
      },
      {
        id: 'col-quick',
        user_id: userId,
        title: 'Quick Snippets',
        description: 'Algorithms and reference links',
        color: '#10B981',
        created_at: new Date().toISOString(),
      },
    ];
    if (!inMemoryCollections.has(userId)) {
      inMemoryCollections.set(userId, userCollections);
    }
    return userCollections;
  },

  async createCollection(userId: string, input: CreateCollectionInput) {
    try {
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

      if (!error && data) return data;
    } catch (_err) {}

    const newCol = {
      id: 'col-' + Date.now(),
      user_id: userId,
      title: input.title,
      description: input.description || null,
      color: input.color || '#2563EB',
      created_at: new Date().toISOString(),
    };
    const list = inMemoryCollections.get(userId) || [];
    list.push(newCol);
    inMemoryCollections.set(userId, list);
    return newCol;
  },

  async deleteCollection(userId: string, collectionId: string) {
    try {
      await supabaseAdmin
        .from('notes_collections')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', userId);

      await supabaseAdmin
        .from('notes')
        .update({ collection_id: null })
        .eq('collection_id', collectionId)
        .eq('user_id', userId);
    } catch (_err) {}

    const list = inMemoryCollections.get(userId) || [];
    inMemoryCollections.set(userId, list.filter((c) => c.id !== collectionId));

    const userNotes = inMemoryNotes.get(userId) || [];
    for (const n of userNotes) {
      if (n.collection_id === collectionId) {
        n.collection_id = null;
      }
    }
    return true;
  },
};
