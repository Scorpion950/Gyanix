import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Play,
  BookOpen,
  Search,
  Globe,
  Lock,
  Users,
  Compass,
  ArrowRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Card } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { cn } from '@/lib/utils.ts';
import { toast } from 'sonner';
import type { PathVisibility } from '@gyanix/shared';

interface LearningPathSummary {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  visibility: PathVisibility;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export function LearningPathsListPage() {
  const { session } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'my' | 'explore'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVisibility, setNewVisibility] = useState<PathVisibility>('private');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [importTitle, setImportTitle] = useState('');

  const apiUrl = import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api';
  const token = session?.access_token;

  // Query paths
  const { data: pathsData, isLoading } = useQuery({
    queryKey: ['learning-paths', activeTab],
    queryFn: async () => {
      const isPublic = activeTab === 'explore';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/learning-paths?public=${isPublic}`, { headers });
      const json = await res.json() as { success: boolean; data?: { paths: LearningPathSummary[] } };
      return json.data?.paths || [];
    },
  });

  // Create path mutation
  const createPathMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiUrl}/learning-paths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          visibility: newVisibility,
        }),
      });
      const json = await res.json() as any;
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create path');
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['learning-paths'] });
      setIsCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      toast.success('Learning path created!');
      navigate(`/learning/paths/${data.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Import playlist mutation
  const importPlaylistMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiUrl}/learning-paths/import-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          playlistUrl,
          pathTitle: importTitle || undefined,
        }),
      });
      const json = await res.json() as any;
      if (!res.ok) throw new Error(json.error?.message || 'Failed to import playlist');
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['learning-paths'] });
      setIsImportOpen(false);
      setPlaylistUrl('');
      setImportTitle('');
      toast.success('YouTube playlist imported successfully!');
      navigate(`/learning/paths/${data.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const paths = pathsData || [];
  const filteredPaths = paths.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-text-default">Learning Paths</h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Curate, organize into nested folders, and master video courses with zero distractions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportOpen(true)}
          >
            Import Playlist
          </Button>
          <Button
            variant="default"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={() => setIsCreateOpen(true)}
          >
            New Path
          </Button>
        </div>
      </div>

      {/* Tabs & Search Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('my')}
            className={cn(
              'px-3.5 py-1.5 rounded-control text-xs font-medium transition-colors',
              activeTab === 'my'
                ? 'bg-primary text-primary-foreground'
                : 'text-text-secondary hover:text-text-default hover:bg-surface-subtle',
            )}
          >
            My Paths
          </button>
          <button
            onClick={() => setActiveTab('explore')}
            className={cn(
              'px-3.5 py-1.5 rounded-control text-xs font-medium transition-colors',
              activeTab === 'explore'
                ? 'bg-primary text-primary-foreground'
                : 'text-text-secondary hover:text-text-default hover:bg-surface-subtle',
            )}
          >
            Explore Public Paths
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search paths…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs rounded-control bg-surface border border-border text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of Learning Paths */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-text-muted">Loading learning paths…</div>
      ) : filteredPaths.length === 0 ? (
        <Card className="p-12 text-center border border-border bg-surface">
          <BookOpen size={32} className="mx-auto text-text-muted/60 mb-2" />
          <h2 className="text-sm font-semibold text-text-default">
            {activeTab === 'my' ? 'No learning paths yet' : 'No public paths found'}
          </h2>
          <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
            {activeTab === 'my'
              ? 'Create a custom path from scratch or import an entire YouTube playlist in one click.'
              : 'Be the first to publish a public learning path to the community!'}
          </p>
          {activeTab === 'my' && (
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="default" size="sm" onClick={() => setIsCreateOpen(true)}>
                Create Path
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
                Import YouTube Playlist
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPaths.map((path) => (
            <Card
              key={path.id}
              className="border border-border bg-surface overflow-hidden card-interactive p-0 flex flex-col justify-between"
              onClick={() => navigate(`/learning/paths/${path.id}`)}
            >
              <div>
                {/* Cover / Placeholder */}
                <div className="h-32 bg-surface-subtle overflow-hidden relative">
                  {path.cover_url ? (
                    <img src={path.cover_url} alt={path.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted bg-primary/5">
                      <BookOpen size={28} className="text-primary/40" />
                    </div>
                  )}

                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-2xs bg-surface/90 backdrop-blur-sm">
                      {path.visibility === 'public' ? (
                        <span className="flex items-center gap-1"><Globe size={10} /> Public</span>
                      ) : path.visibility === 'friends' ? (
                        <span className="flex items-center gap-1"><Users size={10} /> Friends</span>
                      ) : (
                        <span className="flex items-center gap-1"><Lock size={10} /> Private</span>
                      )}
                    </Badge>
                  </div>
                </div>

                <div className="p-4">
                  <h2 className="text-sm font-heading font-bold text-text-default line-clamp-1">
                    {path.title}
                  </h2>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                    {path.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between text-2xs text-text-muted">
                <span>Updated recently</span>
                <span className="text-primary font-medium flex items-center gap-0.5">
                  View path <ArrowRight size={10} />
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Path Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border border-border bg-surface p-6 shadow-popover">
            <h2 className="text-lg font-heading font-bold text-text-default mb-4">Create Learning Path</h2>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-text-secondary mb-1">Path Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Systems & Raft Consensus"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-control border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-medium text-text-secondary mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="What will learners master in this path?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2.5 rounded-control border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-medium text-text-secondary mb-1">Visibility</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'private', label: 'Private', icon: Lock },
                    { id: 'friends', label: 'Friends', icon: Users },
                    { id: 'public', label: 'Public', icon: Globe },
                  ].map((v) => {
                    const Icon = v.icon;
                    const isSelected = newVisibility === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setNewVisibility(v.id as PathVisibility)}
                        className={cn(
                          'flex items-center justify-center gap-1.5 p-2 rounded-control border text-xs font-medium transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-surface-subtle border-border text-text-secondary hover:bg-surface',
                        )}
                      >
                        <Icon size={12} />
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={!newTitle.trim()}
                isLoading={createPathMutation.isPending}
                onClick={() => createPathMutation.mutate()}
              >
                Create
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Import YouTube Playlist Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border border-border bg-surface p-6 shadow-popover">
            <h2 className="text-lg font-heading font-bold text-text-default mb-1">
              Import YouTube Playlist
            </h2>
            <p className="text-xs text-text-secondary mb-4">
              Paste any public YouTube playlist URL. Gyanix automatically extracts all lectures into your course.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-text-secondary mb-1">Playlist URL *</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/playlist?list=PL..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-control border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-medium text-text-secondary mb-1">Custom Title (Optional)</label>
                <input
                  type="text"
                  placeholder="Defaults to original YouTube playlist title"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-control border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" size="sm" onClick={() => setIsImportOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={!playlistUrl.trim()}
                isLoading={importPlaylistMutation.isPending}
                onClick={() => importPlaylistMutation.mutate()}
              >
                Import Course
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

