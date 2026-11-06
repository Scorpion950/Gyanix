import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Check, ArrowRight, Edit3, X, BookOpen, UserCheck, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  member_count: number;
  isMember?: boolean;
}

interface CommunityMember {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
  learning_path: string;
  progress_pct: number;
}

export function CommunitiesListPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Create Community Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit Community Modal
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // View Members & Learning Paths Modal
  const [viewingMembersCommunity, setViewingMembersCommunity] = useState<Community | null>(null);
  const [membersList, setMembersList] = useState<CommunityMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      const res = await fetch('/api/feed/communities', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCommunities(data.data);
      }
    } catch {
      toast.error('Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleJoin = async (communityId: string) => {
    try {
      const res = await fetch(`/api/feed/communities/${communityId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCommunities((prev) =>
          prev.map((c) => {
            if (c.id === communityId) {
              const isMember = data.data.joined;
              return {
                ...c,
                isMember,
                member_count: isMember ? c.member_count + 1 : Math.max(1, c.member_count - 1),
              };
            }
            return c;
          })
        );
        toast.success(data.data.joined ? 'Joined community!' : 'Left community');
      }
    } catch {
      toast.error('Failed to update membership');
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      toast.error('Please provide a community name.');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = await fetch('/api/feed/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDesc.trim() || 'A community for collaborative learning and engineering discussions.',
          isPrivate: false,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setCommunities((prev) => [data.data, ...prev]);
        toast.success('Community created successfully!');
        setIsCreateOpen(false);
        setCreateName('');
        setCreateDesc('');
      } else {
        throw new Error(data.error?.message || 'Failed to create community');
      }
    } catch (err: any) {
      toast.error(err.message || 'Creation failed');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleOpenEdit = (comm: Community) => {
    setEditingCommunity(comm);
    setEditName(comm.name);
    setEditDesc(comm.description);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommunity || !editName.trim()) return;

    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/feed/communities/${editingCommunity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setCommunities((prev) =>
          prev.map((c) => (c.id === editingCommunity.id ? { ...c, ...data.data } : c))
        );
        toast.success('Community updated!');
        setEditingCommunity(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update community');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleViewMembers = async (comm: Community) => {
    setViewingMembersCommunity(comm);
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/feed/communities/${comm.id}/members`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMembersList(data.data);
      } else {
        setMembersList([]);
      }
    } catch {
      setMembersList([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const filtered = communities.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Users className="w-3.5 h-3.5" />
              Learning Guilds
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Topic Communities</h1>
          <p className="text-sm text-text-secondary">
            Join focused engineering and learning communities to share notes, answer doubts, and build together.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Input
            placeholder="Search communities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-60 text-xs"
          />

          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="bg-primary text-white shrink-0 text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Community
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="p-6 rounded-xl border border-border bg-surface flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleViewMembers(c)}
                  className="text-xs font-mono text-text-muted hover:text-primary transition-colors flex items-center gap-1"
                  title="View community members"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{c.member_count} members</span>
                </button>
                <div className="flex items-center gap-1.5">
                  {c.isMember && (
                    <Badge variant="outline" className="text-[10px] text-success border-success/30">
                      Joined
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(c)}
                    className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-subtle transition-colors"
                    title="Edit Community"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="text-base font-bold text-text">{c.name}</h3>
              <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{c.description}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Button
                  variant={c.isMember ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handleToggleJoin(c.id)}
                  className={`flex-1 text-xs ${!c.isMember ? 'bg-primary text-white' : ''}`}
                >
                  {c.isMember ? 'Leave' : 'Join Community'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewMembers(c)}
                  className="text-xs px-2.5 text-text-secondary hover:text-text"
                  title="See who is learning here"
                >
                  Members
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/feed')}
                  className="text-xs px-2 text-text-secondary"
                >
                  Feed <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Community Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-text">Create Topic Community</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-text-muted hover:text-text p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCommunity} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text">Community Name *</label>
                <Input
                  placeholder="e.g. Distributed Systems in Go"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text">Description</label>
                <textarea
                  placeholder="Describe the focus, topics, and goals of this engineering community..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-md bg-surface-subtle border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingCreate}
                  className="bg-primary text-white text-xs"
                >
                  {isSubmittingCreate ? 'Creating...' : 'Create Community'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Community Modal */}
      {editingCommunity && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-text">Edit Community</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingCommunity(null)}
                className="text-text-muted hover:text-text p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text">Community Name *</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-md bg-surface-subtle border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCommunity(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingEdit}
                  className="bg-primary text-white text-xs"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Members & Learning Paths Modal */}
      {viewingMembersCommunity && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-xl rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-text flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  {viewingMembersCommunity.name} Members
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Active participants and the learning paths they are following.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingMembersCommunity(null)}
                className="text-text-muted hover:text-text p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingMembers ? (
              <div className="py-8 text-center text-xs text-text-muted">Loading members...</div>
            ) : membersList.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">No members enrolled yet.</div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {membersList.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg border border-border/70 bg-surface-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {m.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-text">{m.display_name}</p>
                        <p className="text-[11px] text-text-muted font-mono">@{m.username}</p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface border border-border text-[11px] font-medium text-text">
                        <BookOpen className="w-3 h-3 text-primary" />
                        <span className="line-clamp-1 max-w-[180px]">{m.learning_path}</span>
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5 font-mono">
                        {m.progress_pct}% curriculum completed
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingMembersCommunity(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
