import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookMarked,
  Play,
  Users,
  Plus,
  Lock,
  Sparkles,
  ArrowRight,
  Loader2,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Avatar } from '@/components/ui/Avatar.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

interface StudyRoom {
  id: string;
  name: string;
  topic: string;
  current_video_url?: string | null;
  max_participants: number;
  participantCount: number;
  is_private: boolean;
  host?: {
    username: string;
    display_name: string;
    avatar_url?: string | null;
  };
}

export function StudyRoomsListPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data.success && data.data) {
        setRooms(data.data);
      }
    } catch {
      toast.error('Failed to load study rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !topic.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          topic: topic.trim(),
          currentVideoUrl: videoUrl.trim() || undefined,
          isPrivate,
          accessCode: isPrivate ? accessCode.trim() : undefined,
          maxParticipants: 6,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create room');
      }

      toast.success('Room created!');
      navigate(`/rooms/${data.data.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Error creating room');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <BookMarked className="w-3.5 h-3.5" />
              Watch Together & Audio Study Rooms
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Collaborative Study Rooms</h1>
          <p className="text-sm text-text-secondary">
            Watch lectures in synchronized lockstep, draw on real-time whiteboards, and study in low-latency WebRTC mesh rooms (up to 6 peers).
          </p>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          className="bg-primary text-white text-xs shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Study Room
        </Button>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-xl bg-surface space-y-2">
          <BookMarked className="w-10 h-10 text-text-muted/60 mx-auto" />
          <h3 className="text-base font-semibold text-text">No active study rooms right now</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Start a room and invite friends to study together or solve problems concurrently.
          </p>
          <Button
            size="sm"
            onClick={() => setShowModal(true)}
            className="mt-3 bg-primary text-white"
          >
            Create First Room
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="p-6 rounded-xl border border-border bg-surface flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    {room.topic}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-text-secondary">
                    <Users className="w-3.5 h-3.5 text-text-muted" />
                    <span>{room.participantCount}/{room.max_participants}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-text flex items-center gap-2">
                  {room.name}
                  {room.is_private && <Lock className="w-3.5 h-3.5 text-warning" />}
                </h3>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Avatar
                    src={room.host?.avatar_url || undefined}
                    alt={room.host?.display_name || 'Host'}
                    size="sm"
                  />
                  <span>Host: {room.host?.display_name || 'Learner'}</span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => navigate(`/rooms/${room.id}`)}
                className="w-full text-xs bg-primary text-white"
              >
                Join Room <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Room */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 rounded-2xl border border-border bg-surface-raised space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text">Create Study Room</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-text-muted hover:text-text"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Room Name *</label>
                <Input
                  placeholder="e.g. Distributed Consensus Paper Review"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Study Topic *</label>
                <Input
                  placeholder="e.g. Raft Algorithm, React Concurrency"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">
                  YouTube Video Link (Optional Watch Together)
                </label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="privateCheck"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="privateCheck" className="text-xs text-text">
                  Private Room (Requires Access Code)
                </label>
              </div>

              {isPrivate && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Access Code</label>
                  <Input
                    placeholder="e.g. 1234"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    required={isPrivate}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating || !name.trim() || !topic.trim()}
                  className="bg-primary text-white"
                >
                  Launch Room
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
