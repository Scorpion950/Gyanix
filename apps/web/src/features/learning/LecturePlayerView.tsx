import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Pause,
  CheckCircle2,
  BookmarkPlus,
  HelpCircle,
  Clock,
  Sparkles,
  FileText,
  ListOrdered,
  Layers,
  ArrowLeft,
  Check,
  Send,
  AlertCircle,
  Keyboard,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Card } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { useUIStore } from '@/stores/uiStore.ts';
import { cn, formatTimestamp } from '@/lib/utils.ts';
import { toast } from 'sonner';
import type { LectureStatus } from '@gyanix/shared';

// Extend window for YouTube IFrame API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function LecturePlayerView() {
  const { itemId } = useParams<{ itemId: string }>();
  const { session } = useAuthStore();
  const { setFocusMode } = useUIStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'notes' | 'ai' | 'next' | 'resources'>('notes');
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [savedStatus, setSavedStatus] = useState<LectureStatus>('watching');
  const [postRemark, setPostRemark] = useState('');
  const [isSavedIndicator, setIsSavedIndicator] = useState(false);

  // Quick note state
  const [noteContent, setNoteContent] = useState('');
  const [notesList, setNotesList] = useState<
    { id: string; timestamp: number; text: string; createdAt: string }[]
  >([
    {
      id: 'demo-1',
      timestamp: 142,
      text: 'Key architectural insight: B-Tree indexes provide logarithmic search, insertion, and deletion guarantees.',
      createdAt: '10 mins ago',
    },
  ]);

  // AI Doubt State
  const [doubtQuestion, setDoubtQuestion] = useState('');
  const [doubtAnswers, setDoubtAnswers] = useState<
    { question: string; answer: string; timestamp: number }[]
  >([]);
  const [isAskingDoubt, setIsAskingDoubt] = useState(false);

  // Inactivity tracking (15 mins modal prompt)
  const [showInactivityPrompt, setShowInactivityPrompt] = useState(false);
  const [inactivityCountdown, setInactivityCountdown] = useState(60);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const playerRef = useRef<any>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const apiUrl = import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api';
  const token = session?.access_token;

  // Turn on Focus Mode on mount, revert on unmount
  useEffect(() => {
    setFocusMode(true);
    return () => setFocusMode(false);
  }, [setFocusMode]);

  // Demo item details (or fetched from backend)
  const lectureData = {
    id: itemId || 'demo-lecture',
    youtubeVideoId: 'HubezZ98VpU', // PostgreSQL query plan & indexing video
    title: 'PostgreSQL Indexing & Query Execution Plans',
    channelTitle: 'Hussein Nasser',
    durationSeconds: 1935,
  };

  // Update progress mutation
  const progressMutation = useMutation({
    mutationFn: async (payload: { status?: LectureStatus; playbackSeconds?: number; postLectureRemark?: string }) => {
      if (!token || !itemId) return;
      await fetch(`${apiUrl}/learning-paths/items/${itemId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setIsSavedIndicator(true);
      setTimeout(() => setIsSavedIndicator(false), 2500);
    },
  });

  // Load YouTube IFrame API Script safely
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player('yt-player', {
        videoId: lectureData.youtubeVideoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              lastActivityRef.current = Date.now();
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              setSavedStatus('completed');
              progressMutation.mutate({ status: 'completed' });
              toast.success('Lecture completed! Great work.');
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Playback time polling & periodic autosave
    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const time = Math.floor(playerRef.current.getCurrentTime() || 0);
          setCurrentSeconds(time);

          // Inactivity check: if paused for > 15 mins (simulated here for responsiveness)
          const idleTime = Date.now() - lastActivityRef.current;
          if (!isPlaying && idleTime > 15 * 60 * 1000) {
            setShowInactivityPrompt(true);
          }
        } catch (_e) {
          // Player not ready
        }
      }
    }, 1000);

    // Save playback position every 15s when playing
    const saveInterval = setInterval(() => {
      if (isPlaying && currentSeconds > 0) {
        progressMutation.mutate({ playbackSeconds: currentSeconds, status: 'watching' });
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      clearInterval(saveInterval);
    };
  }, [lectureData.youtubeVideoId, isPlaying, currentSeconds]);

  function seekTo(seconds: number) {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(seconds, true);
      playerRef.current.playVideo();
    }
  }

  function handleAddNote() {
    if (!noteContent.trim()) return;
    const newNote = {
      id: `note-${Date.now()}`,
      timestamp: currentSeconds,
      text: noteContent.trim(),
      createdAt: 'Just now',
    };
    setNotesList((prev) => [newNote, ...prev]);
    setNoteContent('');
    toast.success(`Note saved at ${formatTimestamp(currentSeconds)}`);
  }

  function handleAskDoubt() {
    if (!doubtQuestion.trim()) return;
    setIsAskingDoubt(true);

    // Simulated local AI doubt solver (real AI integration in Phase 4)
    setTimeout(() => {
      setDoubtAnswers((prev) => [
        {
          question: doubtQuestion,
          answer: `Regarding timestamp ${formatTimestamp(currentSeconds)}: In PostgreSQL, sequential scans are favored by the query planner when table size is small or when a high percentage of rows match the filter, because random disk I/O through an index can be slower than sequential disk I/O.`,
          timestamp: currentSeconds,
        },
        ...prev,
      ]);
      setDoubtQuestion('');
      setIsAskingDoubt(false);
    }, 800);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col space-y-4">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-default transition-colors"
        >
          <ArrowLeft size={14} /> Exit Player (Focus Mode)
        </button>

        <div className="flex items-center gap-3">
          {/* Subtle Saved Indicator */}
          {isSavedIndicator && (
            <span className="flex items-center gap-1 text-2xs font-mono text-success animate-fade-in">
              <Check size={12} /> Saved
            </span>
          )}

          <button
            onClick={() => setShowShortcutsHelp(true)}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-default p-1"
            title="Keyboard shortcuts"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Player (65%) | Workspace Tabs (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        {/* Left: 16:9 Player & Lecture Controls (7-8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* 16:9 Video Player Container */}
          <div
            ref={iframeContainerRef}
            className="w-full aspect-video rounded-card overflow-hidden bg-black shadow-lg relative border border-border"
          >
            <div id="yt-player" className="w-full h-full" />
          </div>

          {/* Player Bottom Control Strip */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-base sm:text-lg font-heading font-bold text-text-default">
                  {lectureData.title}
                </h1>
                <p className="text-xs text-text-secondary mt-0.5">
                  {lectureData.channelTitle} · Current position:{' '}
                  <span className="font-mono text-primary font-medium">{formatTimestamp(currentSeconds)}</span>
                </p>
              </div>

              {/* Status Selector & Mark Complete */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={savedStatus}
                  onChange={(e) => {
                    const next = e.target.value as LectureStatus;
                    setSavedStatus(next);
                    progressMutation.mutate({ status: next });
                  }}
                  className="h-8 px-2.5 text-xs rounded-control bg-surface border border-border text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="not_started">Not Started</option>
                  <option value="watching">Watching</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="skipped">Skipped</option>
                </select>

                <Button
                  variant={savedStatus === 'completed' ? 'secondary' : 'default'}
                  size="sm"
                  leftIcon={<CheckCircle2 size={14} />}
                  onClick={() => {
                    const next = savedStatus === 'completed' ? 'watching' : 'completed';
                    setSavedStatus(next);
                    progressMutation.mutate({ status: next });
                    if (next === 'completed') toast.success('Lecture marked as completed!');
                  }}
                >
                  {savedStatus === 'completed' ? 'Completed' : 'Mark Complete'}
                </Button>
              </div>
            </div>

            {/* Quick Note at Active Timestamp Button */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<BookmarkPlus size={14} />}
                onClick={() => {
                  setActiveTab('notes');
                  setNoteContent(`Note at ${formatTimestamp(currentSeconds)}: `);
                }}
              >
                Add note at <span className="font-mono ml-1">{formatTimestamp(currentSeconds)}</span>
              </Button>
            </div>

            {/* Post-Lecture Remarks Field */}
            <div className="pt-2">
              <label className="block text-2xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Post-Lecture Reflection / Remarks
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Key takeaway or concept to revisit..."
                  value={postRemark}
                  onChange={(e) => setPostRemark(e.target.value)}
                  className="flex-1 h-8 px-3 rounded-control text-xs bg-surface border border-border text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    progressMutation.mutate({ postLectureRemark: postRemark });
                    toast.success('Reflection saved');
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Resizable Context Tabs (Notes, Doubts/AI, Up Next) (4 cols) */}
        <div className="lg:col-span-4">
          <Card className="border border-border bg-surface p-0 overflow-hidden flex flex-col h-[600px]">
            {/* Tab Strip */}
            <div className="flex border-b border-border text-xs font-medium bg-surface-subtle/50">
              {[
                { id: 'notes', label: 'Notes', icon: FileText },
                { id: 'ai', label: 'AI Doubt', icon: Sparkles },
                { id: 'next', label: 'Up Next', icon: ListOrdered },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-3 border-b-2 text-xs transition-colors',
                      isActive
                        ? 'border-primary text-primary font-semibold bg-surface'
                        : 'border-transparent text-text-secondary hover:text-text-default',
                    )}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* NOTES TAB */}
              {activeTab === 'notes' && (
                <div className="space-y-4 flex flex-col h-full">
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      placeholder={`Write a note at ${formatTimestamp(currentSeconds)}…`}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="w-full p-2.5 rounded-control text-xs bg-background border border-border text-text-default focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                    />
                    <div className="flex justify-between items-center">
                      <span className="timestamp-chip" onClick={() => seekTo(currentSeconds)}>
                        {formatTimestamp(currentSeconds)}
                      </span>
                      <Button variant="default" size="sm" onClick={handleAddNote} disabled={!noteContent.trim()}>
                        Save Note
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-3 flex-1 overflow-y-auto space-y-2.5">
                    <h3 className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
                      Your Lecture Notes ({notesList.length})
                    </h3>
                    {notesList.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-control bg-surface-subtle border border-border/50 text-xs space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => seekTo(n.timestamp)}
                            className="timestamp-chip"
                            title="Jump to moment in lecture"
                          >
                            {formatTimestamp(n.timestamp)}
                          </button>
                          <span className="text-2xs text-text-muted font-mono">{n.createdAt}</span>
                        </div>
                        <p className="text-xs text-text-default leading-relaxed">{n.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI DOUBT TAB */}
              {activeTab === 'ai' && (
                <div className="space-y-4 flex flex-col h-full">
                  <div className="ai-surface border rounded-card p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-2xs font-semibold text-ai">
                      <Sparkles size={12} />
                      <span>Lecture Context Doubt Solver</span>
                    </div>
                    <p className="text-2xs text-text-secondary">
                      Ask about concepts occurring around{' '}
                      <span className="font-mono text-primary font-medium">{formatTimestamp(currentSeconds)}</span>.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Why would sequential scan be faster?"
                        value={doubtQuestion}
                        onChange={(e) => setDoubtQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskDoubt()}
                        className="flex-1 h-8 px-2.5 rounded-control text-xs bg-surface border border-border text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-ai text-ai-foreground hover:bg-ai/90"
                        isLoading={isAskingDoubt}
                        onClick={handleAskDoubt}
                      >
                        <Send size={12} />
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3">
                    {doubtAnswers.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-control border border-border bg-surface text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-text-default">{item.question}</span>
                          <span className="timestamp-chip" onClick={() => seekTo(item.timestamp)}>
                            {formatTimestamp(item.timestamp)}
                          </span>
                        </div>
                        <div className="ai-surface p-2.5 rounded-control text-2xs leading-relaxed text-text-default border">
                          {item.answer}
                        </div>
                      </div>
                    ))}
                    {doubtAnswers.length === 0 && (
                      <div className="text-center py-12 text-2xs text-text-muted">
                        No questions asked yet for this lecture.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* UP NEXT TAB */}
              {activeTab === 'next' && (
                <div className="space-y-2">
                  <h3 className="text-2xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                    Next in Course
                  </h3>
                  {[
                    { title: 'B-Tree vs Hash Indexes Deep Dive', duration: '24:10', current: false },
                    { title: 'Composite Indexes & Index Ordering Rules', duration: '31:45', current: false },
                    { title: 'PostgreSQL EXPLAIN ANALYZE Real World Walkthrough', duration: '28:12', current: false },
                  ].map((nxt, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-control border border-border bg-surface hover:bg-surface-subtle cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Play size={12} className="text-text-muted" fill="currentColor" />
                        <div>
                          <p className="text-xs font-medium text-text-default">{nxt.title}</p>
                          <p className="text-2xs text-text-muted">{nxt.duration}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Inactivity Prompt Modal (15-min idle pause check) */}
      {showInactivityPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <Card className="w-full max-w-sm border border-border bg-surface p-6 shadow-popover text-center space-y-4">
            <Clock size={36} className="mx-auto text-primary animate-pulse" />
            <h2 className="text-base font-heading font-bold text-text-default">
              Are you still studying?
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Video playback has been paused so your learning hours and streaks aren't artificially inflated.
            </p>
            <Button
              variant="default"
              size="md"
              className="w-full"
              onClick={() => {
                setShowInactivityPrompt(false);
                lastActivityRef.current = Date.now();
                if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
                  playerRef.current.playVideo();
                }
              }}
            >
              I'm still here!
            </Button>
          </Card>
        </div>
      )}

      {/* Keyboard Shortcuts Dialog */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <Card className="w-full max-w-md border border-border bg-surface p-6 shadow-popover space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-primary" />
                <h2 className="text-sm font-heading font-bold text-text-default">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="text-text-muted hover:text-text-default"
              >
                <X size={16} />
              </button>
            </div>

            <div className="divide-y divide-border text-xs">
              {[
                { key: 'Space / K', desc: 'Play / Pause lecture' },
                { key: 'J / L', desc: 'Rewind 10s / Fast forward 10s' },
                { key: 'N', desc: 'Focus note composer' },
                { key: 'M', desc: 'Mute / unmute audio' },
                { key: 'Esc', desc: 'Exit player focus mode' },
              ].map((item, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between">
                  <span className="text-text-secondary">{item.desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-surface-subtle border border-border font-mono text-2xs text-text-default">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

