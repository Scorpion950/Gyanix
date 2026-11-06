import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Check, ArrowRight } from 'lucide-react';
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

export function CommunitiesListPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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

        <Input
          placeholder="Search communities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 text-xs"
        />
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
                <span className="text-xs font-mono text-text-muted">{c.member_count} members</span>
                {c.isMember && (
                  <Badge variant="outline" className="text-[10px] text-success border-success/30">
                    Joined
                  </Badge>
                )}
              </div>
              <h3 className="text-base font-bold text-text">{c.name}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{c.description}</p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <Button
                variant={c.isMember ? 'outline' : 'default'}
                size="sm"
                onClick={() => handleToggleJoin(c.id)}
                className={`flex-1 text-xs ${!c.isMember ? 'bg-primary text-white' : ''}`}
              >
                {c.isMember ? 'Leave' : 'Join Community'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/feed')}
                className="text-xs text-text-secondary"
              >
                Feed <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

