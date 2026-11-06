import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  UserCheck,
  Clock,
  ShieldAlert,
  Edit3,
  Globe,
  MapPin,
  Lock,
  Layers,
  BookOpen,
  Award,
  FileCode,
  Share2,
} from 'lucide-react';
import { Github } from '@/components/icons/BrandIcons.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { Button } from '@/components/ui/Button.tsx';
import { Avatar } from '@/components/ui/Avatar.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Card, CardContent } from '@/components/ui/Card.tsx';
import { cn } from '@/lib/utils.ts';
import { toast } from 'sonner';
import type { SocialRelationshipStatus } from '@gyanix/shared';

interface UserProfileData {
  id: string;
  auth_user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  profession: string | null;
  github_url: string | null;
  website_url: string | null;
  location: string | null;
  created_at: string;
  privacy?: {
    profile_visibility: 'public' | 'friends_only' | 'private';
    activity_visible: boolean;
    learning_paths_visible: boolean;
    streaks_visible: boolean;
  };
}

export function ProfilePage() {
  const { username: routeUsername } = useParams<{ username: string }>();
  const { session } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'paths' | 'projects' | 'achievements'>('overview');
  const [isEditing, setIsEditing] = useState(false);

  const apiUrl = import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api';
  const token = session?.access_token;

  // 1. Fetch current authenticated user's own profile to resolve username if not in route
  const { data: myProfile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      if (!token) return null;
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; data?: UserProfileData };
      return json.data || null;
    },
    enabled: !!token,
  });

  const fallbackUsername = (session?.user?.user_metadata as any)?.['username'] || session?.user?.email?.split('@')[0] || 'student';
  const targetUsername = routeUsername || myProfile?.username || fallbackUsername;
  const isOwnProfile = !routeUsername || (myProfile && targetUsername?.toLowerCase() === myProfile.username.toLowerCase()) || targetUsername === fallbackUsername;

  // 2. Fetch target profile
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', targetUsername],
    queryFn: async () => {
      if (!targetUsername) return null;
      const res = await fetch(`${apiUrl}/users/${targetUsername}`);
      const json = await res.json() as { success: boolean; data?: UserProfileData; error?: { message: string } };
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message || 'Profile not found');
      }
      return json.data;
    },
    enabled: !!targetUsername,
  });

  // 3. Fetch social relationship status (if logged in and not own profile)
  const { data: relationship } = useQuery<SocialRelationshipStatus>({
    queryKey: ['social-relationship', targetUsername],
    queryFn: async () => {
      if (!token || !targetUsername || isOwnProfile) return null as any;
      const res = await fetch(`${apiUrl}/users/${targetUsername}/relationship`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { success: boolean; data?: SocialRelationshipStatus };
      return json.data!;
    },
    enabled: !!token && !!targetUsername && !isOwnProfile,
  });

  // 4. Social action mutation
  const socialMutation = useMutation({
    mutationFn: async (action: string) => {
      if (!token || !targetUsername) return;
      const res = await fetch(`${apiUrl}/users/${targetUsername}/social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const json = await res.json() as { success: boolean; data?: SocialRelationshipStatus; error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message || 'Action failed');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-relationship', targetUsername] });
      toast.success('Relationship updated');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Edit profile form state
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editProfession, setEditProfession] = useState('');
  const [editGithubUrl, setEditGithubUrl] = useState('');
  const [editLocation, setEditLocation] = useState('');

  function openEditModal() {
    if (!profile) return;
    setEditDisplayName(profile.display_name || '');
    setEditBio(profile.bio || '');
    setEditProfession(profile.profession || '');
    setEditGithubUrl(profile.github_url || '');
    setEditLocation(profile.location || '');
    setIsEditing(true);
  }

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiUrl}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: editDisplayName,
          bio: editBio,
          profession: editProfession || undefined,
          githubUrl: editGithubUrl || null,
          location: editLocation || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Update failed');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', targetUsername] });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-text-muted">
        Loading profile…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="py-16 text-center max-w-sm mx-auto">
        <ShieldAlert size={36} className="mx-auto text-text-muted mb-3" />
        <h2 className="text-lg font-heading font-bold text-text-default">User not found</h2>
        <p className="text-xs text-text-secondary mt-1">This account does not exist or may have been deleted.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isFriendsOnly = profile.privacy?.profile_visibility === 'friends_only';
  const isPrivate = profile.privacy?.profile_visibility === 'private';
  const canViewFull = isOwnProfile || (!isPrivate && (!isFriendsOnly || relationship?.isFriend));

  return (
    <div className="space-y-6 max-w-page mx-auto">
      {/* Profile Header Card */}
      <Card className="border border-border bg-surface p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar
              alt={profile.display_name}
              src={profile.avatar_url || undefined}
              size="xl"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-heading font-bold text-text-default">
                  {profile.display_name}
                </h1>
                {profile.profession && (
                  <Badge variant="secondary" className="capitalize text-2xs">
                    {profile.profession.replace('_', ' ')}
                  </Badge>
                )}
              </div>
              <p className="text-xs font-mono text-text-muted mt-0.5">@{profile.username}</p>

              {profile.bio && (
                <p className="text-xs md:text-sm text-text-secondary mt-2 max-w-xl leading-relaxed">
                  {profile.bio}
                </p>
              )}

              {/* Meta details */}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-2xs text-text-muted">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {profile.location}
                  </span>
                )}
                {profile.github_url && (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-text-default transition-colors"
                  >
                    <Github size={12} /> GitHub
                  </a>
                )}
                {profile.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-text-default transition-colors"
                  >
                    <Globe size={12} /> Website
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            {isOwnProfile ? (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit3 size={14} />}
                onClick={openEditModal}
              >
                Edit Profile
              </Button>
            ) : (
              <>
                {/* Friend Button */}
                {relationship?.isFriend ? (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<UserCheck size={14} className="text-success" />}
                    onClick={() => socialMutation.mutate('unfriend')}
                  >
                    Friends
                  </Button>
                ) : relationship?.isFriendPendingSent ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Clock size={14} />}
                    onClick={() => socialMutation.mutate('cancel_friend_request')}
                  >
                    Request Sent
                  </Button>
                ) : relationship?.isFriendPendingReceived ? (
                  <Button
                    variant="default"
                    size="sm"
                    leftIcon={<UserPlus size={14} />}
                    onClick={() => socialMutation.mutate('accept_friend_request')}
                  >
                    Accept Friend
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<UserPlus size={14} />}
                    onClick={() => socialMutation.mutate('send_friend_request')}
                  >
                    Add Friend
                  </Button>
                )}

                {/* Follow Button */}
                {relationship?.isFollowing ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => socialMutation.mutate('unfollow')}
                  >
                    Following
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => socialMutation.mutate('follow')}
                  >
                    Follow
                  </Button>
                )}

                {/* Block Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-text-muted hover:text-danger"
                  onClick={() => {
                    if (confirm(`Are you sure you want to block @${profile.username}?`)) {
                      socialMutation.mutate('block');
                    }
                  }}
                  title="Block user"
                >
                  <ShieldAlert size={14} />
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-border text-xs font-medium">
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'paths', label: 'Learning Paths', icon: BookOpen },
          { id: 'projects', label: 'Projects', icon: FileCode },
          { id: 'achievements', label: 'Achievements', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors duration-micro -mb-px',
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-default',
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {!canViewFull ? (
        <Card className="p-8 text-center border border-border bg-surface">
          <Lock size={28} className="mx-auto text-text-muted mb-2" />
          <h3 className="text-sm font-semibold text-text-default">This section is private</h3>
          <p className="text-xs text-text-secondary mt-1">
            {profile.display_name} has restricted who can view their profile activity.
          </p>
        </Card>
      ) : (
        <div>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Stats & Skills */}
              <div className="space-y-4">
                <Card className="p-4 border border-border bg-surface">
                  <h3 className="text-xs font-semibold text-text-default uppercase tracking-wider mb-3">
                    Learning Stats
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-secondary">Current Streak</span>
                      <span className="font-mono text-streak font-medium">3 days 🔥</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-secondary">Lectures Watched</span>
                      <span className="font-mono text-text-default">18</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-secondary">Notes Authored</span>
                      <span className="font-mono text-text-default">12</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border border-border bg-surface">
                  <h3 className="text-xs font-semibold text-text-default uppercase tracking-wider mb-2">
                    Learning Focus
                  </h3>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['React', 'TypeScript', 'Node.js', 'System Design'].map((s) => (
                      <span
                        key={s}
                        className="text-2xs px-2 py-0.5 rounded-full bg-surface-subtle text-text-secondary border border-border"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right Column: Activity / Paths preview */}
              <div className="md:col-span-2 space-y-4">
                <Card className="p-5 border border-border bg-surface">
                  <h3 className="text-sm font-semibold text-text-default mb-3">Recent Learning Activity</h3>
                  <div className="space-y-3">
                    {[
                      {
                        title: 'Complete Web Development Bootcamp',
                        lecture: 'CSS Grid & Flexbox Mastery',
                        time: '2 hours ago',
                        timestamp: '14:20',
                      },
                      {
                        title: 'Distributed Systems & Microservices',
                        lecture: 'Raft Consensus Algorithm Explained',
                        time: 'Yesterday',
                        timestamp: '08:45',
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-control bg-surface-subtle border border-border/50 text-xs"
                      >
                        <div>
                          <p className="font-medium text-text-default">{item.lecture}</p>
                          <p className="text-2xs text-text-secondary mt-0.5">{item.title}</p>
                        </div>
                        <div className="text-right">
                          <span className="timestamp-chip">{item.timestamp}</span>
                          <p className="text-2xs text-text-muted mt-1">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'paths' && (
            <Card className="p-8 text-center border border-border bg-surface">
              <BookOpen size={24} className="mx-auto text-text-muted mb-2" />
              <p className="text-xs font-medium text-text-default">No public learning paths yet</p>
              <p className="text-2xs text-text-secondary mt-0.5">
                Learning paths created and shared by this user will appear here.
              </p>
            </Card>
          )}

          {activeTab === 'projects' && (
            <Card className="p-8 text-center border border-border bg-surface">
              <FileCode size={24} className="mx-auto text-text-muted mb-2" />
              <p className="text-xs font-medium text-text-default">No showcase projects yet</p>
              <p className="text-2xs text-text-secondary mt-0.5">
                Projects and GitHub repositories published by this user will appear here.
              </p>
            </Card>
          )}

          {activeTab === 'achievements' && (
            <Card className="p-8 text-center border border-border bg-surface">
              <Award size={24} className="mx-auto text-text-muted mb-2" />
              <p className="text-xs font-medium text-text-default">No certificates or badges yet</p>
              <p className="text-2xs text-text-secondary mt-0.5">
                Milestones and completed learning challenges will appear here.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <Card className="w-full max-w-md border border-border bg-surface p-6 shadow-popover">
            <h2 className="text-lg font-heading font-bold text-text-default mb-4">Edit Profile</h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-text-secondary mb-1">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full h-9 px-3 rounded-control border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-text-secondary mb-1">Bio (max 500 characters)</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full p-2.5 rounded-control border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-medium text-text-secondary mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, CA"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full h-9 px-3 rounded-control border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-text-secondary mb-1">GitHub URL</label>
                <input
                  type="url"
                  placeholder="https://github.com/username"
                  value={editGithubUrl}
                  onChange={(e) => setEditGithubUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-control border border-border bg-background text-text-default focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                isLoading={updateProfileMutation.isPending}
                onClick={() => updateProfileMutation.mutate()}
              >
                Save Changes
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

