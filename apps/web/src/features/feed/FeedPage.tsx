import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rss,
  MessageSquare,
  Heart,
  Share2,
  Flag,
  Sparkles,
  HelpCircle,
  FolderGit2,
  Trophy,
  Code2,
  Clock,
  Send,
  Users,
  Plus,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Avatar } from '@/components/ui/Avatar.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

interface PostAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
}

interface Post {
  id: string;
  author_id: string;
  community_id?: string | null;
  post_type: 'thought' | 'doubt' | 'project' | 'resource' | 'milestone';
  title?: string | null;
  content: string;
  code_snippet?: string | null;
  timestamp_seconds?: number | null;
  tags: string[];
  likes_count: number;
  comments_count: number;
  isLiked?: boolean;
  created_at: string;
  author?: PostAuthor;
  community?: { id: string; name: string; slug: string };
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: PostAuthor;
  replies?: Comment[];
}

const FEED_TABS = [
  { id: 'all', label: 'All Feeds' },
  { id: 'doubts', label: 'Doubts & Q&A' },
  { id: 'projects', label: 'Projects' },
  { id: 'milestones', label: 'Milestones' },
];

export function FeedPage() {
  const { session } = useAuthStore();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedCommunity, setSelectedCommunity] = useState<any | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Composer
  const [postType, setPostType] = useState<'thought' | 'doubt' | 'project' | 'resource' | 'milestone'>('thought');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [timestampMinutes, setTimestampMinutes] = useState<number | ''>('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Active comments drawer per post
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    loadPosts(activeTab, selectedCommunity?.id);
    loadCommunities();
  }, [activeTab, selectedCommunity]);

  const loadCommunities = async () => {
    try {
      const res = await fetch('/api/feed/communities', {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCommunities(data.data);
      }
    } catch {
      // Non-blocking
    }
  };

  const loadPosts = async (feedType: string, communityId?: string) => {
    setLoading(true);
    try {
      let url = `/api/feed/posts?feedType=${feedType}`;
      if (communityId) {
        url += `&communityId=${encodeURIComponent(communityId)}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPosts(data.data);
      }
    } catch {
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsPosting(true);
    try {
      const timestampSeconds =
        timestampMinutes !== '' ? Number(timestampMinutes) * 60 : undefined;

      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          postType,
          title: title.trim() || undefined,
          content: content.trim(),
          codeSnippet: codeSnippet.trim() || undefined,
          timestampSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish post');
      }

      setPosts((prev) => [data.data, ...prev]);
      setContent('');
      setTitle('');
      setCodeSnippet('');
      setTimestampMinutes('');
      setShowCodeInput(false);
      toast.success('Post published to feed!');
    } catch (err: any) {
      toast.error(err.message || 'Error publishing post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = !p.isLiked;
          return {
            ...p,
            isLiked,
            likes_count: isLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1),
          };
        }
        return p;
      })
    );

    try {
      await fetch(`/api/feed/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
    } catch {
      // Revert if failed
      toast.error('Like action failed');
    }
  };

  const toggleComments = async (postId: string) => {
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null);
      return;
    }

    setOpenCommentsPostId(postId);
    if (!commentsMap[postId]) {
      try {
        const res = await fetch(`/api/feed/posts/${postId}/comments`);
        const data = await res.json();
        if (data.success && data.data) {
          setCommentsMap((prev) => ({ ...prev, [postId]: data.data }));
        }
      } catch {
        // Non-blocking
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentDraft.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/feed/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          postId,
          content: commentDraft.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Comment failed');
      }

      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data.data],
      }));

      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
      );

      setCommentDraft('');
      toast.success('Comment added');
    } catch (err: any) {
      toast.error(err.message || 'Error posting comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReport = async (postId: string) => {
    try {
      const res = await fetch('/api/feed/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          targetType: 'post',
          targetId: postId,
          reason: 'spam',
          details: 'Reported by user from community feed.',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Already reported');
      }
      toast.success('Report submitted for moderator review.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit report');
    }
  };

  const formatTimestamp = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8">
      {/* 2-Column Responsive Layout: Centre 680px + Right Rail 320px */}
      <div className="flex flex-col lg:flex-row justify-center gap-8">
        {/* Centre Column: max 680px */}
        <div className="w-full max-w-[680px] space-y-6">
          {/* Feed Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
            {FEED_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface hover:bg-surface-subtle text-text-secondary border border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Community Banner */}
          {selectedCommunity && (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                  {selectedCommunity.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-text truncate">{selectedCommunity.name}</h2>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30 shrink-0">
                      Community Feed
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                    {selectedCommunity.description || 'Community discussion, doubts, and engineering posts'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCommunity(null)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-surface text-text-muted hover:text-text hover:bg-surface-subtle transition-colors shrink-0 cursor-pointer"
                title="Return to global feed"
              >
                Show All
              </button>
            </div>
          )}

          {/* Post Composer Card */}
          <div className="p-4 rounded-xl border border-border bg-surface space-y-3 shadow-xs">
            {/* Post Type Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-muted font-medium">Post type:</span>
              <div className="flex gap-1">
                {(['thought', 'doubt', 'project', 'milestone'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostType(t)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                      postType === t
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3">
              {postType !== 'thought' && (
                <Input
                  placeholder="Title or question summary..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs"
                />
              )}

              <textarea
                rows={3}
                placeholder={
                  postType === 'doubt'
                    ? 'Ask a doubt or question about a concept or lecture timestamp...'
                    : postType === 'milestone'
                    ? 'Celebrate your learning milestone (e.g. finished a course or streak)...'
                    : 'Share insights, notes, or discuss an engineering topic...'
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3 rounded-lg border border-border bg-surface-subtle text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />

              {/* Optional Code Snippet input */}
              {showCodeInput && (
                <textarea
                  rows={4}
                  placeholder="// Paste relevant code snippet here..."
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-[#0B0E14] text-[#E8ECF4] font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              )}

              {/* Composer Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50 text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCodeInput(!showCodeInput)}
                    className={`px-3 py-1.5 rounded-control text-xs border flex items-center gap-1.5 transition-colors ${
                      showCodeInput ? 'border-primary text-primary bg-primary/10' : 'border-border text-text-muted hover:text-text'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Code Snippet
                  </button>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-control border border-border bg-surface-subtle">
                    <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <input
                      type="number"
                      placeholder="Timestamp (min)"
                      value={timestampMinutes}
                      onChange={(e) =>
                        setTimestampMinutes(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-32 bg-transparent text-xs text-text placeholder:text-text-muted outline-none border-none focus:outline-none"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isPosting || !content.trim()}
                  size="sm"
                  className="bg-primary text-white text-xs h-9 px-4"
                >
                  {isPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                  Publish
                </Button>
              </div>
            </form>
          </div>

          {/* Posts Stream */}
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border rounded-xl bg-surface space-y-2">
              <Rss className="w-8 h-8 text-text-muted mx-auto" />
              <p className="text-xs text-text-secondary">No posts in this feed yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="p-5 rounded-xl border border-border bg-surface space-y-3 hover:border-border/80 transition-colors"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={post.author?.avatar_url || undefined}
                        alt={post.author?.display_name || 'Author'}
                        size="sm"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-text">
                            {post.author?.display_name || 'Learner'}
                          </span>
                          <span className="text-[11px] text-text-muted">
                            @{post.author?.username || 'learner'}
                          </span>
                        </div>
                        <span className="text-[10px] text-text-muted">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Post Type Badge */}
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {post.post_type}
                      </Badge>

                      {/* Timestamp Chip per Part 0 */}
                      {post.timestamp_seconds !== null && post.timestamp_seconds !== undefined && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-surface-subtle border border-border text-primary font-bold">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(post.timestamp_seconds)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Body */}
                  {post.title && <h3 className="text-sm font-bold text-text">{post.title}</h3>}
                  <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Code Snippet */}
                  {post.code_snippet && (
                    <div className="p-3 rounded-lg bg-[#0B0E14] text-[#E8ECF4] font-mono text-[11px] overflow-x-auto border border-[#232B3B]">
                      <pre>{post.code_snippet}</pre>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-text-muted">
                    <div className="flex items-center gap-4">
                      {/* Like button */}
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-1.5 transition-colors ${
                          post.isLiked ? 'text-danger font-bold' : 'hover:text-text'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${post.isLiked ? 'fill-current' : ''}`} />
                        <span>{post.likes_count}</span>
                      </button>

                      {/* Comments toggle */}
                      <button
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-1.5 hover:text-text transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{post.comments_count}</span>
                      </button>
                    </div>

                    {/* Report button */}
                    <button
                      onClick={() => handleReport(post.id)}
                      className="hover:text-warning transition-colors"
                      title="Report Content"
                    >
                      <Flag className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Comments Drawer */}
                  <AnimatePresence>
                    {openCommentsPostId === post.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-3 border-t border-border/60 space-y-3"
                      >
                        <div className="space-y-2">
                          {(commentsMap[post.id] || []).map((comm) => (
                            <div key={comm.id} className="p-2.5 rounded-lg bg-surface-subtle text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-text">
                                  {comm.author?.display_name || 'Peer'}
                                </span>
                                <span className="text-[10px] text-text-muted">
                                  {new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-text-secondary leading-normal">{comm.content}</p>
                            </div>
                          ))}
                        </div>

                        {/* Add Comment Field */}
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Write a thoughtful reply or doubt answer..."
                            value={commentDraft}
                            onChange={(e) => setCommentDraft(e.target.value)}
                            className="text-xs h-8"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddComment(post.id)}
                            disabled={submittingComment || !commentDraft.trim()}
                            className="h-8 text-xs bg-primary text-white shrink-0"
                          >
                            Reply
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Rail: 320px per Section 0.5 */}
        <div className="w-full lg:w-[320px] space-y-6 shrink-0">
          {/* Trending Communities Widget */}
          <div className="p-5 rounded-xl border border-border bg-surface space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-primary" />
                Learning Communities
              </h3>
              <Link to="/communities" className="text-2xs text-primary hover:underline font-medium">
                View all
              </Link>
            </div>

            {communities.length > 0 ? (
              <div className="space-y-2.5">
                {communities.map((c) => (
                  <div
                    key={c.id || c.slug}
                    onClick={() => setSelectedCommunity(c)}
                    className="flex items-start justify-between gap-2 p-2 rounded-lg border border-border/60 bg-surface-subtle/50 hover:bg-surface-subtle hover:border-primary/40 transition-all cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0 pr-1">
                      <h4 className="font-semibold text-text text-xs group-hover:text-primary transition-colors leading-snug">
                        {c.name}
                      </h4>
                      <span className="text-[11px] text-text-muted mt-0.5 block">
                        {c.member_count ?? c.members_count ?? 1} members
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30 shrink-0 mt-0.5">
                      {c.isMember || c.isJoined ? 'Joined' : 'Join'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center space-y-2">
                <p className="text-xs text-text-muted">No communities created yet.</p>
                <Link
                  to="/communities"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  Create or explore communities &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* Social Learning Guidelines per Part 0 */}
          <div className="p-5 rounded-xl border border-border bg-surface-subtle space-y-2 text-xs">
            <span className="font-bold text-text flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-ai" />
              Community Guidelines
            </span>
            <p className="text-text-secondary leading-relaxed text-[11px]">
              Gyanix prioritizes deep collaborative learning over doomscrolling. Share insights with timestamp context, avoid zero-effort spam, and celebrate real milestones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
