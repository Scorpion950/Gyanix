import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookMarked,
  Play,
  Pause,
  RotateCcw,
  Users,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Paintbrush,
  Eraser,
  Save,
  Send,
  Clock,
  Sparkles,
  ArrowLeft,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Avatar } from '@/components/ui/Avatar.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

interface RoomDetails {
  id: string;
  name: string;
  topic: string;
  current_video_url?: string | null;
  current_timestamp_seconds: number;
  is_video_playing: boolean;
  max_participants: number;
  whiteboard_data?: any;
  host_id: string;
  host?: {
    username: string;
    display_name: string;
    avatar_url?: string | null;
  };
  participants: Array<{
    user_id: string;
    is_muted: boolean;
    is_video_on: boolean;
    user?: {
      username: string;
      display_name: string;
      avatar_url?: string | null;
    };
  }>;
}

export function StudyRoomWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'video' | 'whiteboard'>('video');

  // Media Controls (Mock WebRTC mesh controls)
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);

  // In-room chat
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; sender: string; text: string; timestamp?: string }>
  >([
    { id: '1', sender: 'System', text: 'Welcome to the collaborative study room!' },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Video State
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoTimestamp, setVideoTimestamp] = useState(0);

  // Whiteboard Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#2563EB');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');

  useEffect(() => {
    if (id) {
      loadRoom(id);
    }
  }, [id]);

  const loadRoom = async (roomId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setRoom(data.data);
        setIsPlaying(data.data.is_video_playing);
        setVideoTimestamp(data.data.current_timestamp_seconds);
      } else {
        toast.error('Study room not found');
      }
    } catch {
      toast.error('Failed to load study room');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!id) return;
    try {
      await fetch(`/api/rooms/${id}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
    } catch {
      // Leave gracefully
    }
    navigate('/rooms');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: 'You',
        text: chatInput.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatInput('');
  };

  // Whiteboard Canvas Drawing Logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : drawColor;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const extractYouTubeId = (url?: string | null): string | null => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match && match[1] ? match[1] : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-8 text-center text-text-muted">
        <p>Room not available.</p>
        <Button onClick={() => navigate('/rooms')} className="mt-4">
          Back to Study Rooms
        </Button>
      </div>
    );
  }

  const ytId = extractYouTubeId(room.current_video_url);

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeave}
            className="text-xs text-text-secondary"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Exit Room
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-text">{room.name}</h1>
              <Badge variant="outline" className="text-[10px] text-primary">
                {room.topic}
              </Badge>
            </div>
          </div>
        </div>

        {/* Mode Selector & Media Toggles */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border bg-surface p-1">
            <button
              onClick={() => setActiveTab('video')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                activeTab === 'video'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              Watch Together
            </button>
            <button
              onClick={() => setActiveTab('whiteboard')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                activeTab === 'whiteboard'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              Collaborative Whiteboard
            </button>
          </div>

          <div className="flex items-center gap-1.5 border-l border-border pl-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMicOn(!isMicOn)}
              className={isMicOn ? 'text-text' : 'text-danger'}
            >
              {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={isVideoOn ? 'text-primary' : 'text-text-muted'}
            >
              {isVideoOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Stage (9 cols) + Right Peer Strip & Chat (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Stage (9 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-border bg-surface overflow-hidden flex flex-col h-[680px]">
          {activeTab === 'video' ? (
            <div className="flex-1 flex flex-col justify-between bg-black">
              {ytId ? (
                <div className="relative w-full h-full aspect-video">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${ytId}?enablejsapi=1&origin=${window.location.origin}`}
                    title="Watch Together Player"
                    className="w-full h-full border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-text-muted">
                  <Play className="w-12 h-12 mb-3 text-text-muted/60" />
                  <p className="text-sm font-semibold">No video loaded in this room.</p>
                  <p className="text-xs text-text-secondary mt-1">
                    Paste a YouTube link in the room settings to watch together.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Whiteboard Canvas Stage */
            <div className="flex-1 flex flex-col bg-[#121723]">
              {/* Whiteboard Toolbar */}
              <div className="p-2 border-b border-border flex items-center justify-between text-xs bg-surface-subtle">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTool('brush')}
                    className={`p-1.5 rounded ${tool === 'brush' ? 'bg-primary/10 text-primary' : 'text-text-muted'}`}
                    title="Brush"
                  >
                    <Paintbrush className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('eraser')}
                    className={`p-1.5 rounded ${tool === 'eraser' ? 'bg-primary/10 text-primary' : 'text-text-muted'}`}
                    title="Eraser"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 border-l border-border pl-2">
                    {['#2563EB', '#7C3AED', '#0D9488', '#EA580C', '#DC2626', '#0F1424'].map((col) => (
                      <button
                        key={col}
                        onClick={() => {
                          setDrawColor(col);
                          setTool('brush');
                        }}
                        className={`w-4 h-4 rounded-full border ${drawColor === col ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={clearCanvas}
                    className="p-1.5 rounded text-text-muted hover:text-danger transition-colors"
                    title="Clear Canvas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Canvas Element */}
              <div className="flex-1 relative overflow-hidden cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={900}
                  height={620}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full h-full block"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): WebRTC Peer Strip + Room Chat */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-surface flex flex-col h-[680px] overflow-hidden">
          {/* Peer Mesh Strip */}
          <div className="p-4 border-b border-border bg-surface-subtle/40 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                Mesh Participants ({room.participants?.length || 1}/6)
              </span>
              <span className="text-[10px] text-text-muted">Low Latency</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Host/Self Card */}
              <div className="p-2.5 rounded-lg border border-border bg-surface text-center space-y-1">
                <Avatar
                  src={room.host?.avatar_url || undefined}
                  alt="Host"
                  size="sm"
                  className="mx-auto"
                />
                <span className="text-[10px] font-bold text-text block truncate">
                  {room.host?.display_name || 'Host'}
                </span>
                <span className="text-[9px] text-success block">Active</span>
              </div>

              {/* Other Peers */}
              {room.participants
                ?.filter((p) => p.user_id !== room.host_id)
                .map((peer, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-border bg-surface text-center space-y-1">
                    <Avatar
                      src={peer.user?.avatar_url || undefined}
                      alt={peer.user?.display_name || 'Peer'}
                      size="sm"
                      className="mx-auto"
                    />
                    <span className="text-[10px] font-bold text-text block truncate">
                      {peer.user?.display_name || 'Peer'}
                    </span>
                    <span className="text-[9px] text-text-muted block">Listening</span>
                  </div>
                ))}
            </div>
          </div>

          {/* In-Room Realtime Chat */}
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-text text-[11px]">{msg.sender}</span>
                    {msg.timestamp && (
                      <span className="text-[9px] text-text-muted">{msg.timestamp}</span>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-surface-subtle text-text-secondary text-xs">
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-border flex items-center gap-2">
              <Input
                placeholder="Message study peers..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="text-xs h-8"
              />
              <Button type="submit" size="sm" className="h-8 px-3 bg-primary text-white text-xs shrink-0">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
