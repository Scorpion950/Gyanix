import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Folder,
  Plus,
  Search,
  Pin,
  Calendar,
  Clock,
  Trash2,
  FileText,
  Tag,
  Check,
  Eye,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Card } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { cn, formatTimestamp } from '@/lib/utils.ts';
import { toast } from 'sonner';
import type { NotePriority } from '@gyanix/shared';

interface NoteItem {
  id: string;
  user_id: string;
  collection_id: string | null;
  path_id: string | null;
  path_item_id: string | null;
  timestamp_seconds: number | null;
  title: string;
  content_markdown: string;
  priority: NotePriority;
  deadline_at: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  collection?: { id: string; title: string; color: string } | null;
}

interface NoteCollection {
  id: string;
  title: string;
  description: string | null;
  color: string;
}

export function NotesLibraryPage() {
  const { session } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Active note editor form state
  const [activeTitle, setActiveTitle] = useState('');
  const [activeContent, setActiveContent] = useState('');
  const [activePriority, setActivePriority] = useState<NotePriority>('medium');
  const [activeDeadline, setActiveDeadline] = useState('');
  const [activeIsPinned, setActiveIsPinned] = useState(false);

  // Collection creation modal
  const [isNewCollectionOpen, setIsNewCollectionOpen] = useState(false);
  const [collectionTitle, setCollectionTitle] = useState('');

  const apiUrl = import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api';
  const token = session?.access_token;
  const autosaveTimerRef = useRef<any>(null);

  // Fetch collections
  const { data: collections = [] } = useQuery<NoteCollection[]>({
    queryKey: ['notes-collections'],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/notes/collections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as any;
      return json.data || [];
    },
    enabled: !!token,
  });

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery<NoteItem[]>({
    queryKey: ['notes-list', selectedCollectionId, searchQuery],
    queryFn: async () => {
      let url = `${apiUrl}/notes?`;
      if (selectedCollectionId) url += `collectionId=${selectedCollectionId}&`;
      if (searchQuery) url += `q=${encodeURIComponent(searchQuery)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as any;
      return json.data || [];
    },
    enabled: !!token,
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiUrl}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Untitled Note',
          contentMarkdown: '',
          collectionId: selectedCollectionId,
          priority: 'medium',
        }),
      });
      const json = await res.json() as any;
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create note');
      return json.data;
    },
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes-list'] });
      setSelectedNoteId(newNote.id);
      setActiveTitle(newNote.title);
      setActiveContent(newNote.content_markdown);
      setActivePriority(newNote.priority);
      setActiveIsPinned(newNote.is_pinned);
      toast.success('Note created');
    },
  });

  // Create collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiUrl}/notes/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: collectionTitle }),
      });
      const json = await res.json() as any;
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create collection');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes-collections'] });
      setIsNewCollectionOpen(false);
      setCollectionTitle('');
      toast.success('Collection created');
    },
  });

  // Delete note mutation (with undo toast)
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await fetch(`${apiUrl}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes-list'] });
      setSelectedNoteId(null);
      toast.success('Note deleted', {
        action: {
          label: 'Undo',
          onClick: () => {
            // Re-create note if requested
            createNoteMutation.mutate();
          },
        },
      });
    },
  });

  // Synchronise selected note into form fields
  useEffect(() => {
    if (!selectedNoteId && notes.length > 0) {
      const first = notes[0]!;
      setSelectedNoteId(first.id);
      setActiveTitle(first.title);
      setActiveContent(first.content_markdown);
      setActivePriority(first.priority);
      setActiveIsPinned(first.is_pinned);
      setActiveDeadline(first.deadline_at ? first.deadline_at.split('T')[0]! : '');
    } else if (selectedNoteId) {
      const current = notes.find((n) => n.id === selectedNoteId);
      if (current) {
        setActiveTitle(current.title);
        setActiveContent(current.content_markdown);
        setActivePriority(current.priority);
        setActiveIsPinned(current.is_pinned);
        setActiveDeadline(current.deadline_at ? current.deadline_at.split('T')[0]! : '');
      }
    }
  }, [selectedNoteId, notes]);

  // Silent Autosave with 1.2s debounce
  function triggerAutosave(updatedFields: Partial<NoteItem>) {
    if (!selectedNoteId) return;
    setSaveStatus('saving');

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`${apiUrl}/notes/${selectedNoteId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedFields),
        });
        setSaveStatus('saved');
        queryClient.invalidateQueries({ queryKey: ['notes-list'] });
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (_err) {
        setSaveStatus('idle');
      }
    }, 1200);
  }

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-heading font-bold text-text-default">Notes Library</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Timestamp-linked thoughts, lecture summaries, and personal research.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-2xs font-mono text-text-muted">Saving…</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-2xs font-mono text-success flex items-center gap-1">
              <Check size={12} /> Saved
            </span>
          )}

          <Button
            variant="default"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => createNoteMutation.mutate()}
          >
            New Note
          </Button>
        </div>
      </div>

      {/* 3-Pane Desktop Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-12rem)] items-start">
        {/* Pane 1: Collections (2.5 cols) */}
        <div className="md:col-span-3 lg:col-span-2 h-full flex flex-col space-y-2 border-r border-border/70 pr-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
              Collections
            </span>
            <button
              onClick={() => setIsNewCollectionOpen(true)}
              className="text-text-muted hover:text-text-default p-1"
              title="New collection"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5">
            <button
              onClick={() => setSelectedCollectionId(null)}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-control text-xs font-medium transition-colors text-left',
                selectedCollectionId === null
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-surface-subtle hover:text-text-default',
              )}
            >
              <span className="flex items-center gap-2">
                <FileText size={14} /> All Notes
              </span>
              <span className="text-2xs font-mono text-text-muted">{notes.length}</span>
            </button>

            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => setSelectedCollectionId(col.id)}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-control text-xs font-medium transition-colors text-left',
                  selectedCollectionId === col.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-surface-subtle hover:text-text-default',
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: col.color || '#2563EB' }}
                  />
                  <span className="truncate">{col.title}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Pane 2: Notes Search & List (3.5 cols) */}
        <div className="md:col-span-4 lg:col-span-4 h-full flex flex-col space-y-3 border-r border-border/70 pr-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search notes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-control bg-surface border border-border text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 divide-y divide-border/30">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-text-muted">Loading notes…</div>
            ) : notes.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">
                No notes found.
              </div>
            ) : (
              notes.map((note) => {
                const isSelected = selectedNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={cn(
                      'p-3 rounded-control cursor-pointer transition-colors duration-micro space-y-1',
                      isSelected
                        ? 'bg-primary/10 border-l-2 border-primary'
                        : 'hover:bg-surface-subtle bg-surface',
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {note.is_pinned && <Pin size={12} className="text-primary flex-shrink-0" />}
                        <h3 className="text-xs font-semibold text-text-default truncate">
                          {note.title || 'Untitled Note'}
                        </h3>
                      </div>
                      <PriorityBadge priority={note.priority} />
                    </div>

                    <p className="text-2xs text-text-secondary line-clamp-2 leading-relaxed">
                      {note.content_markdown || 'No content.'}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-2xs text-text-muted font-mono">
                      {note.timestamp_seconds !== null ? (
                        <span className="timestamp-chip">
                          {formatTimestamp(note.timestamp_seconds)}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span>
                        {new Date(note.updated_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pane 3: Note Editor & Markdown Preview (6 cols) */}
        <div className="md:col-span-5 lg:col-span-6 h-full flex flex-col space-y-3 bg-surface p-4 rounded-card border border-border">
          {selectedNote ? (
            <>
              {/* Note Header Controls */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  {/* Pin toggle */}
                  <button
                    onClick={() => {
                      const next = !activeIsPinned;
                      setActiveIsPinned(next);
                      triggerAutosave({ is_pinned: next });
                    }}
                    className={cn(
                      'p-1.5 rounded-control transition-colors',
                      activeIsPinned
                        ? 'text-primary bg-primary/10'
                        : 'text-text-muted hover:text-text-default',
                    )}
                    title={activeIsPinned ? 'Unpin note' : 'Pin note to top'}
                  >
                    <Pin size={14} />
                  </button>

                  {/* Priority selector */}
                  <select
                    value={activePriority}
                    onChange={(e) => {
                      const next = e.target.value as NotePriority;
                      setActivePriority(next);
                      triggerAutosave({ priority: next });
                    }}
                    className="h-7 px-2 text-2xs rounded bg-surface-subtle border border-border text-text-default focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>

                  {/* Timestamp chip (if linked to video lecture) */}
                  {selectedNote.timestamp_seconds !== null && (
                    <span className="timestamp-chip">
                      {formatTimestamp(selectedNote.timestamp_seconds)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Preview / Edit Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-2xs"
                    onClick={() => setIsPreviewMode((v) => !v)}
                  >
                    {isPreviewMode ? (
                      <>
                        <Edit2 size={12} className="mr-1" /> Edit
                      </>
                    ) : (
                      <>
                        <Eye size={12} className="mr-1" /> Preview
                      </>
                    )}
                  </Button>

                  {/* Delete button */}
                  <button
                    onClick={() => deleteNoteMutation.mutate(selectedNote.id)}
                    className="p-1.5 text-text-muted hover:text-danger rounded-control transition-colors"
                    title="Delete note"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Title input */}
              <input
                type="text"
                placeholder="Note Title"
                value={activeTitle}
                onChange={(e) => {
                  setActiveTitle(e.target.value);
                  triggerAutosave({ title: e.target.value });
                }}
                className="w-full text-base font-heading font-bold bg-transparent text-text-default border-none focus:outline-none placeholder:text-text-muted"
              />

              {/* Content editor / preview */}
              <div className="flex-1 overflow-y-auto">
                {isPreviewMode ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-text-default">
                    {activeContent ? (
                      <div className="whitespace-pre-wrap">{activeContent}</div>
                    ) : (
                      <p className="text-text-muted italic">Nothing to preview yet.</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    rows={15}
                    placeholder="Write Markdown notes, code snippets, or key insights…"
                    value={activeContent}
                    onChange={(e) => {
                      setActiveContent(e.target.value);
                      triggerAutosave({ content_markdown: e.target.value });
                    }}
                    className="w-full h-full p-0 bg-transparent text-xs text-text-default placeholder:text-text-muted border-none focus:outline-none resize-none font-sans leading-relaxed"
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-text-muted text-xs">
              <FileText size={32} className="mb-2 text-text-muted/40" />
              <p>Select a note from the list or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Collection Modal */}
      {isNewCollectionOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <Card className="w-full max-w-sm border border-border bg-surface p-6 shadow-popover space-y-4">
            <h2 className="text-sm font-heading font-bold text-text-default">Create Collection</h2>
            <div>
              <label className="block text-2xs font-medium text-text-secondary mb-1">
                Collection Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed Systems Notes"
                value={collectionTitle}
                onChange={(e) => setCollectionTitle(e.target.value)}
                className="w-full h-8 px-3 rounded-control text-xs border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsNewCollectionOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={!collectionTitle.trim()}
                isLoading={createCollectionMutation.isPending}
                onClick={() => createCollectionMutation.mutate()}
              >
                Create
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: NotePriority }) {
  switch (priority) {
    case 'high':
      return <span className="text-2xs font-mono font-medium text-danger bg-danger/10 px-1.5 py-0.2 rounded">High</span>;
    case 'medium':
      return <span className="text-2xs font-mono font-medium text-warning bg-warning/10 px-1.5 py-0.2 rounded">Med</span>;
    case 'low':
    default:
      return <span className="text-2xs font-mono text-text-muted bg-surface-subtle px-1.5 py-0.2 rounded">Low</span>;
  }
}

