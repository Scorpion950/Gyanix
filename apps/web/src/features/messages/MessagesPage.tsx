import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Code2,
  Clock,
  Pin,
  Users,
  Search,
  Plus,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Avatar } from '@/components/ui/Avatar.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  code_snippet?: string | null;
  lecture_item_id?: string | null;
  timestamp_seconds?: number | null;
  is_pinned: boolean;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string | null;
  };
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title?: string | null;
  updated_at: string;
  otherUser?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string | null;
  };
  latestMessage?: {
    id: string;
    content: string;
    created_at: string;
  };
}

export function MessagesPage() {
  const { session } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Composer
  const [content, setContent] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [timestampMinutes, setTimestampMinutes] = useState<number | ''>('');
  const [showCode, setShowCode] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoadingConvs(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setConversations(data.data);
        if (data.data.length > 0 && !activeConvId) {
          setActiveConvId(data.data[0].id);
        }
      }
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setLoadingConvs(false);
    }
  };

  const loadMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages/conversations/${convId}/messages`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMessages(data.data);
      }
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || !content.trim()) return;

    setIsSending(true);
    try {
      const timestampSeconds =
        timestampMinutes !== '' ? Number(timestampMinutes) * 60 : undefined;

      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          conversationId: activeConvId,
          content: content.trim(),
          codeSnippet: codeSnippet.trim() || undefined,
          timestampSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send');
      }

      setMessages((prev) => [...prev, data.data]);
      setContent('');
      setCodeSnippet('');
      setTimestampMinutes('');
      setShowCode(false);
    } catch (err: any) {
      toast.error(err.message || 'Error sending message');
    } finally {
      setIsSending(false);
    }
  };

  const handleTogglePin = async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, is_pinned: data.data.is_pinned } : m))
        );
        toast.success(data.data.is_pinned ? 'Message pinned' : 'Message unpinned');
      }
    } catch {
      toast.error('Pin toggle failed');
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const formatTimestamp = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <MessageSquare className="w-3.5 h-3.5" />
              Collaborative Messenger
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Direct & Group Study Rooms</h1>
        </div>

        {/* Anti-pressure assurance per Part 0 */}
        <div className="flex items-center gap-1.5 text-xs text-text-muted bg-surface-subtle px-3 py-1.5 rounded-full border border-border">
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
          <span>Zero social pressure: No read receipts or typing indicators</span>
        </div>
      </div>

      {/* 2-Pane Messenger: Left List (320px) + Right Chat Room */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px] rounded-2xl border border-border bg-surface overflow-hidden">
        {/* Left Pane: Conversations */}
        <div className="lg:col-span-4 border-r border-border flex flex-col h-full bg-surface-subtle/40">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Chats & Groups ({conversations.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingConvs ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted space-y-1">
                <p>No conversations yet.</p>
                <p className="text-[11px]">Connect with peers from their profile or communities.</p>
              </div>
            ) : (
              conversations.map((c) => {
                const title =
                  c.type === 'direct'
                    ? c.otherUser?.display_name || 'Study Peer'
                    : c.title || 'Study Group';

                const isActive = c.id === activeConvId;

                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConvId(c.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center gap-3 ${
                      isActive
                        ? 'border-primary bg-primary/10 shadow-xs'
                        : 'border-border/60 bg-surface hover:bg-surface-subtle'
                    }`}
                  >
                    <Avatar
                      src={c.otherUser?.avatar_url || undefined}
                      alt={title}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-text truncate max-w-[140px]">{title}</span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary truncate">
                        {c.latestMessage?.content || 'Started conversation'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Room */}
        <div className="lg:col-span-8 flex flex-col h-full bg-surface">
          {activeConv ? (
            <>
              {/* Chat Top Bar */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle/30">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={activeConv.otherUser?.avatar_url || undefined}
                    alt={activeConv.otherUser?.display_name || activeConv.title || 'Chat'}
                    size="sm"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-text">
                      {activeConv.type === 'direct'
                        ? activeConv.otherUser?.display_name || 'Study Peer'
                        : activeConv.title || 'Study Group'}
                    </h3>
                    <span className="text-[10px] text-text-muted">
                      {activeConv.type === 'direct' ? '@' + activeConv.otherUser?.username : 'Group Collaboration'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-12 text-center text-xs text-text-muted space-y-1">
                    <p>No messages in this room yet.</p>
                    <p className="text-[11px]">Send a message or share a lecture timestamp note.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-3 text-xs">
                      <Avatar
                        src={msg.sender?.avatar_url || undefined}
                        alt={msg.sender?.display_name || 'Sender'}
                        size="sm"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text">
                            {msg.sender?.display_name || 'Learner'}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {/* Lecture Timestamp Chip per Part 0 */}
                          {msg.timestamp_seconds !== null && msg.timestamp_seconds !== undefined && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 font-bold">
                              <Clock className="w-2.5 h-2.5" />
                              {formatTimestamp(msg.timestamp_seconds)}
                            </span>
                          )}

                          {msg.is_pinned && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-warning font-semibold">
                              <Pin className="w-2.5 h-2.5 fill-current" />
                              Pinned
                            </span>
                          )}

                          <button
                            onClick={() => handleTogglePin(msg.id)}
                            className="text-text-muted hover:text-text ml-auto"
                            title="Pin message"
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Content */}
                        <div className="p-3 rounded-xl bg-surface-subtle text-text leading-relaxed border border-border/40 inline-block max-w-2xl">
                          {msg.content}
                        </div>

                        {/* Code Snippet if present */}
                        {msg.code_snippet && (
                          <div className="p-3 rounded-lg bg-[#0B0E14] text-[#E8ECF4] font-mono text-[11px] overflow-x-auto border border-[#232B3B] max-w-2xl">
                            <pre>{msg.code_snippet}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <div className="p-4 border-t border-border bg-surface space-y-2">
                {showCode && (
                  <textarea
                    rows={3}
                    placeholder="// Paste code snippet to discuss..."
                    value={codeSnippet}
                    onChange={(e) => setCodeSnippet(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-border bg-[#0B0E14] text-[#E8ECF4] font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    className={`p-2 rounded-lg border text-text-muted hover:text-text transition-colors ${
                      showCode ? 'border-primary text-primary bg-primary/10' : 'border-border'
                    }`}
                    title="Attach Code"
                  >
                    <Code2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder="Min (e.g. 12)"
                      value={timestampMinutes}
                      onChange={(e) =>
                        setTimestampMinutes(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-20 text-xs h-9"
                      title="Timestamp minute in active lecture"
                    />
                  </div>

                  <Input
                    placeholder="Type a collaborative note or question..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="flex-1 text-xs h-9"
                    required
                  />

                  <Button
                    type="submit"
                    disabled={isSending || !content.trim()}
                    className="h-9 px-4 bg-primary text-white text-xs shrink-0"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted">
              <MessageSquare className="w-12 h-12 mb-3 text-text-muted/60" />
              <h3 className="text-base font-semibold text-text mb-1">Select a Conversation</h3>
              <p className="text-xs text-text-secondary max-w-sm">
                Pick a chat from the left or connect with a peer from their profile page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
