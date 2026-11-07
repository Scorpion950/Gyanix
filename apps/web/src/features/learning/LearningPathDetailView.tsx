import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderPlus,
  Video,
  Play,
  CheckCircle2,
  Circle,
  PauseCircle,
  SkipForward,
  Copy,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  RefreshCw,
  Clock,
  ArrowLeft,
  Lock,
  Globe,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Card } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Modal } from '@/components/ui/Modal.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { cn, formatDuration } from '@/lib/utils.ts';
import { toast } from 'sonner';
import type { LectureStatus } from '@gyanix/shared';

interface PathDetailItem {
  id: string;
  path_id: string;
  folder_id: string | null;
  position: number;
  custom_title: string | null;
  video: {
    id: string;
    youtube_video_id: string;
    title: string;
    channel_title: string;
    thumbnail_url: string;
    duration_seconds: number;
    is_available: boolean;
  };
}

interface PathFolder {
  id: string;
  title: string;
  position: number;
  parent_folder_id: string | null;
}

export function LearningPathDetailView() {
  const { pathId } = useParams<{ pathId: string }>();
  const { session } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Modals
  const [isAddLectureOpen, setIsAddLectureOpen] = useState(false);
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [replaceTargetItemId, setReplaceTargetItemId] = useState<string | null>(null);

  // Form states
  const [lectureUrl, setLectureUrl] = useState('');
  const [lectureCustomTitle, setLectureCustomTitle] = useState('');
  const [lectureFolderId, setLectureFolderId] = useState<string>('');
  const [folderTitle, setFolderTitle] = useState('');
  const [replacementUrl, setReplacementUrl] = useState('');

  const apiUrl = import.meta.env['VITE_API_URL'] || '/api';
  const token = session?.access_token;

  // Fetch full path details
  const { data: path, isLoading, error } = useQuery({
    queryKey: ['path-details', pathId],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiUrl}/learning-paths/${pathId}`, { headers });
      const json = await res.json() as any;
      if (!res.ok) throw new Error(json.error?.message || 'Path not found');
      return json.data;
    },
    enabled: !!pathId,
  });

  // Add lecture mutation
  const addLectureMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiUrl}/learning-paths/${pathId}/lectures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          youtubeUrl: lectureUrl,
          folderId: lectureFolderId || null,
          customTitle: lectureCustomTitle || undefined,
        }),
      });
      const json = await res.json() as any;
      if (!res.ok) throw new Error(json.error?.message || 'Failed to add lecture');
      return json.data;
    },
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: ['path-details', pathId] });
      setIsAddLectureOpen(false);
      setLectureUrl('');
      setLectureCustomTitle('');
      setSelectedItemId(newItem.id);
      toast.success('Lecture added to course!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Add folder mutation
  const addFolderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiUrl}/learning-paths/${pathId}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: folderTitle,
        }),
      });
      const json = await res.json() as any;
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create folder');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['path-details', pathId] });
      setIsAddFolderOpen(false);
      setFolderTitle('');
      toast.success('Folder created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Replace unavailable video mutation
  const replaceVideoMutation = useMutation({
    mutationFn: async () => {
      if (!replaceTargetItemId) return;
      const res = await fetch(`${apiUrl}/learning-paths/items/${replaceTargetItemId}/replace-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newYoutubeUrl: replacementUrl,
        }),
      });
      const json = await res.json() as any;
      if (!res.ok) throw new Error(json.error?.message || 'Failed to replace video');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['path-details', pathId] });
      setIsReplaceOpen(false);
      setReplacementUrl('');
      setReplaceTargetItemId(null);
      toast.success('Video replaced successfully! Your notes and progress are preserved.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Toggle lecture progress directly from syllabus tree
  const toggleProgressMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: LectureStatus }) => {
      if (!token) return;
      await fetch(`${apiUrl}/learning-paths/items/${itemId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['path-details', pathId] });
      toast.success('Lecture status updated');
    },
  });

  // Fork / duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiUrl}/learning-paths/${pathId}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as any;
      if (!res.ok) throw new Error(json.error?.message || 'Failed to duplicate path');
      return json.data;
    },
    onSuccess: (newPath) => {
      toast.success('Course duplicated into your personal library!');
      navigate(`/learning/paths/${newPath.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="py-16 text-center text-xs text-text-muted">Loading learning path…</div>;
  }

  if (error || !path) {
    return (
      <div className="py-16 text-center max-w-sm mx-auto">
        <h2 className="text-base font-bold text-text-default">Course not found</h2>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/learning')}>
          Back to Paths
        </Button>
      </div>
    );
  }

  const isOwner = session?.user.id === path.creator_id;
  const items: PathDetailItem[] = path.items || [];
  const folders: PathFolder[] = path.folders || [];
  const userProgress: Record<string, any> = path.userProgress || {};

  // Default selection
  const selectedItem = items.find((i) => i.id === selectedItemId) || items[0] || null;

  function toggleFolder(folderId: string) {
    setCollapsedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate('/learning')}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-default transition-colors w-fit"
        >
          <ArrowLeft size={14} /> Back to Learning Paths
        </button>

        <div className="flex items-center gap-2">
          {!isOwner && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Copy size={14} />}
              isLoading={duplicateMutation.isPending}
              onClick={() => duplicateMutation.mutate()}
            >
              Duplicate Course
            </Button>
          )}

          {isOwner && (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FolderPlus size={14} />}
                onClick={() => setIsAddFolderOpen(true)}
              >
                New Folder
              </Button>
              <Button
                variant="default"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => setIsAddLectureOpen(true)}
              >
                Add Lecture
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Path Header Banner */}
      <Card className="border border-border bg-surface p-6">
        <div className="flex flex-col md:flex-row items-start gap-5">
          {(() => {
            const rawCover = path.cover_url && !path.cover_url.includes('unsplash.com') ? path.cover_url : null;
            const effectiveCover = rawCover || path.items?.[0]?.video?.thumbnail_url;
            if (!effectiveCover) return null;
            return (
              <div className="w-28 h-28 rounded-card overflow-hidden bg-surface-subtle flex-shrink-0 border border-border">
                <img src={effectiveCover} alt={path.title} className="w-full h-full object-cover" />
              </div>
            );
          })()}

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="secondary" className="text-2xs">
                {path.visibility === 'public' ? (
                  <span className="flex items-center gap-1"><Globe size={10} /> Public</span>
                ) : path.visibility === 'friends' ? (
                  <span className="flex items-center gap-1"><Users size={10} /> Friends</span>
                ) : (
                  <span className="flex items-center gap-1"><Lock size={10} /> Private</span>
                )}
              </Badge>
              <span className="text-2xs text-text-muted font-mono">
                By {path.creator?.display_name || 'Creator'}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-heading font-bold text-text-default">
              {path.title}
            </h1>
            <p className="text-xs md:text-sm text-text-secondary mt-1.5 max-w-3xl leading-relaxed">
              {path.description || 'Structured course path.'}
            </p>

            <div className="flex items-center gap-4 mt-4 text-2xs font-mono text-text-muted">
              <span>{items.length} lectures total</span>
              <span>·</span>
              <span>
                {items.filter((i) => userProgress[i.id]?.status === 'completed').length} completed
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 2-Pane Course View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Collapsible Folder & Lecture Tree (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-heading font-semibold uppercase tracking-wider text-text-secondary">
              Course Syllabus
            </h2>
            <span className="text-2xs text-text-muted font-mono">{items.length} items</span>
          </div>

          <Card className="border border-border bg-surface p-2 divide-y divide-border/40">
            {/* Root Items (No Folder) */}
            {items
              .filter((i) => !i.folder_id)
              .map((item) => (
                <LectureTreeRow
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  progress={userProgress[item.id]}
                  onSelect={() => setSelectedItemId(item.id)}
                  onPlay={() => navigate(`/learning/player/${item.id}`)}
                  onToggleComplete={(targetId, nextStatus) =>
                    toggleProgressMutation.mutate({ itemId: targetId, status: nextStatus })
                  }
                />
              ))}

            {/* Folders & Their Children */}
            {folders.map((folder) => {
              const folderItems = items.filter((i) => i.folder_id === folder.id);
              const isCollapsed = collapsedFolders[folder.id];
              const folderCompletedCount = folderItems.filter(
                (i) => userProgress[i.id]?.status === 'completed',
              ).length;

              return (
                <div key={folder.id} className="pt-2 pb-1">
                  {/* Folder Header */}
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-control text-xs font-semibold text-text-default hover:bg-surface-subtle transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      <span>{folder.title}</span>
                    </div>
                    <span className="text-2xs font-mono text-text-muted">
                      {folderCompletedCount}/{folderItems.length}
                    </span>
                  </button>

                  {/* Folder Items */}
                  {!isCollapsed && (
                    <div className="pl-4 mt-1 space-y-0.5 border-l border-border/70 ml-3">
                      {folderItems.length === 0 ? (
                        <p className="text-2xs text-text-muted py-2 pl-2">Folder is empty</p>
                      ) : (
                        folderItems.map((item) => (
                          <LectureTreeRow
                            key={item.id}
                            item={item}
                            isSelected={selectedItem?.id === item.id}
                            progress={userProgress[item.id]}
                            onSelect={() => setSelectedItemId(item.id)}
                            onPlay={() => navigate(`/learning/player/${item.id}`)}
                            onToggleComplete={(targetId, nextStatus) =>
                              toggleProgressMutation.mutate({ itemId: targetId, status: nextStatus })
                            }
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {items.length === 0 && (
              <div className="p-8 text-center text-xs text-text-muted">
                This course has no lectures yet.
                {isOwner && (
                  <p className="text-2xs mt-1 text-primary">
                    Click "Add Lecture" to import your first video.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Pane: Selected Lecture Preview & Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedItem ? (
            <Card className="border border-border bg-surface p-6">
              {/* Unavailable Video Warning */}
              {!selectedItem.video.is_available && (
                <div className="mb-4 p-3 rounded-card bg-warning/10 border border-warning/30 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-text-default">This video is currently unavailable</p>
                      <p className="text-2xs text-text-secondary mt-0.5">
                        The video may have been deleted or made private on YouTube. Your notes and progress are preserved.
                      </p>
                    </div>
                  </div>
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setReplaceTargetItemId(selectedItem.id);
                        setIsReplaceOpen(true);
                      }}
                    >
                      Replace Video
                    </Button>
                  )}
                </div>
              )}

              {/* Lecture Preview Thumbnail & Play Button */}
              <div className="relative h-64 sm:h-72 rounded-card overflow-hidden bg-black/90 group">
                <img
                  src={selectedItem.video.thumbnail_url}
                  alt={selectedItem.video.title}
                  className="w-full h-full object-cover opacity-85 group-hover:scale-102 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <button
                    onClick={() => navigate(`/learning/player/${selectedItem.id}`)}
                    className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
                    aria-label="Start watching lecture"
                  >
                    <Play size={24} fill="currentColor" className="ml-1" />
                  </button>
                </div>
                <span className="absolute bottom-3 left-3 timestamp-chip bg-black/80 text-white border-0">
                  {selectedItem.video.channel_title}
                </span>
              </div>

              {/* Lecture Metadata */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={userProgress[selectedItem.id]?.status || 'not_started'} />
                  {userProgress[selectedItem.id]?.playback_seconds > 0 && (
                    <span className="text-2xs font-mono text-text-muted">
                      Saved position: {formatDuration(userProgress[selectedItem.id].playback_seconds)}
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-heading font-bold text-text-default mt-2">
                  {selectedItem.custom_title || selectedItem.video.title}
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Channel: {selectedItem.video.channel_title}
                </p>
              </div>

              {/* Action Controls */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                <Button
                  variant="default"
                  size="md"
                  leftIcon={<Play size={16} fill="currentColor" />}
                  onClick={() => navigate(`/learning/player/${selectedItem.id}`)}
                >
                  Watch Lecture
                </Button>

                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-text-muted hover:text-text-default"
                    onClick={() => {
                      setReplaceTargetItemId(selectedItem.id);
                      setIsReplaceOpen(true);
                    }}
                  >
                    Replace Video
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center border border-border bg-surface text-text-muted text-xs">
              Select a lecture from the course syllabus to preview.
            </Card>
          )}
        </div>
      </div>

      {/* Add Lecture Modal */}
      <Modal isOpen={isAddLectureOpen} onClose={() => setIsAddLectureOpen(false)}>
        <Card className="w-full max-w-md border border-border bg-surface p-6 shadow-popover">
          <h2 className="text-lg font-heading font-bold text-text-default mb-1">Add Lecture</h2>
          <p className="text-xs text-text-secondary mb-4">
            Enter any YouTube video URL. Metadata is automatically resolved.
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-text-secondary mb-1">YouTube URL *</label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={lectureUrl}
                onChange={(e) => setLectureUrl(e.target.value)}
                className="w-full h-9 px-3 rounded-control border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block font-medium text-text-secondary mb-1">Custom Title (Optional)</label>
              <input
                type="text"
                placeholder="Defaults to YouTube video title"
                value={lectureCustomTitle}
                onChange={(e) => setLectureCustomTitle(e.target.value)}
                className="w-full h-9 px-3 rounded-control border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {folders.length > 0 && (
              <div>
                <label className="block font-medium text-text-secondary mb-1">Folder (Optional)</label>
                <select
                  value={lectureFolderId}
                  onChange={(e) => setLectureFolderId(e.target.value)}
                  className="w-full h-9 px-3 rounded-control border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">No folder (Root course level)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" size="sm" onClick={() => setIsAddLectureOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!lectureUrl.trim()}
              isLoading={addLectureMutation.isPending}
              onClick={() => addLectureMutation.mutate()}
            >
              Add
            </Button>
          </div>
        </Card>
      </Modal>

      {/* Add Folder Modal */}
      <Modal isOpen={isAddFolderOpen} onClose={() => setIsAddFolderOpen(false)}>
        <Card className="w-full max-w-sm border border-border bg-surface p-6 shadow-popover">
          <h2 className="text-lg font-heading font-bold text-text-default mb-4">Create Folder</h2>
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-text-secondary mb-1">Folder Title *</label>
              <input
                type="text"
                placeholder="e.g. Module 1: Foundations"
                value={folderTitle}
                onChange={(e) => setFolderTitle(e.target.value)}
                className="w-full h-9 px-3 rounded-control border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" size="sm" onClick={() => setIsAddFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!folderTitle.trim()}
              isLoading={addFolderMutation.isPending}
              onClick={() => addFolderMutation.mutate()}
            >
              Create Folder
            </Button>
          </div>
        </Card>
      </Modal>

      {/* Replace Video Modal */}
      <Modal isOpen={isReplaceOpen} onClose={() => setIsReplaceOpen(false)}>
        <Card className="w-full max-w-md border border-border bg-surface p-6 shadow-popover">
          <h2 className="text-lg font-heading font-bold text-text-default mb-1">Replace Video</h2>
          <p className="text-xs text-text-secondary mb-4">
            Enter a new YouTube URL. The position, custom title, user notes, and completion progress will remain completely preserved.
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-text-secondary mb-1">Replacement YouTube URL *</label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={replacementUrl}
                onChange={(e) => setReplacementUrl(e.target.value)}
                className="w-full h-9 px-3 rounded-control border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" size="sm" onClick={() => setIsReplaceOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!replacementUrl.trim()}
              isLoading={replaceVideoMutation.isPending}
              onClick={() => replaceVideoMutation.mutate()}
            >
              Confirm Replacement
            </Button>
          </div>
        </Card>
      </Modal>
    </div>
  );
}

// Sub-component for syllabus tree item
function LectureTreeRow({
  item,
  isSelected,
  progress,
  onSelect,
  onPlay,
  onToggleComplete,
}: {
  item: PathDetailItem;
  isSelected: boolean;
  progress?: { status: LectureStatus };
  onSelect: () => void;
  onPlay: () => void;
  onToggleComplete: (itemId: string, nextStatus: LectureStatus) => void;
}) {
  const status: LectureStatus = progress?.status || 'not_started';
  const isCompleted = status === 'completed';

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex items-center justify-between p-2 rounded-control cursor-pointer transition-colors duration-micro',
        isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-surface-subtle text-text-default',
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(item.id, isCompleted ? 'not_started' : 'completed');
          }}
          className="p-0.5 rounded hover:scale-110 active:scale-95 transition-all text-text-muted hover:text-success"
          title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
        >
          {isCompleted ? (
            <CheckCircle2 size={16} className="text-success flex-shrink-0" fill="currentColor" />
          ) : (
            <Circle size={16} className="text-border hover:text-success flex-shrink-0" />
          )}
        </button>
        <span className={cn('text-xs font-medium truncate', isCompleted && 'line-through text-text-muted')}>
          {item.custom_title || item.video.title}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {!item.video.is_available && (
          <span title="Video unavailable">
            <AlertTriangle size={14} className="text-warning" />
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-primary transition-opacity p-1"
          aria-label="Play lecture"
        >
          <Play size={14} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: LectureStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={16} className="text-success flex-shrink-0" />;
    case 'watching':
      return <Play size={16} className="text-primary flex-shrink-0" fill="currentColor" />;
    case 'on_hold':
      return <PauseCircle size={16} className="text-streak flex-shrink-0" />;
    case 'skipped':
      return <SkipForward size={16} className="text-text-muted flex-shrink-0" />;
    case 'not_started':
    default:
      return <Circle size={16} className="text-border flex-shrink-0" />;
  }
}

function StatusBadge({ status }: { status: LectureStatus }) {
  switch (status) {
    case 'completed':
      return <Badge variant="success" className="text-2xs">Completed</Badge>;
    case 'watching':
      return <Badge variant="default" className="text-2xs">Currently Watching</Badge>;
    case 'on_hold':
      return <Badge variant="warning" className="text-2xs">On Hold</Badge>;
    case 'skipped':
      return <Badge variant="secondary" className="text-2xs">Skipped</Badge>;
    case 'not_started':
    default:
      return <Badge variant="secondary" className="text-2xs">Not Started</Badge>;
  }
}

