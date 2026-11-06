import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FolderGit2,
  ExternalLink,
  Plus,
  Heart,
  MessageSquare,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Github } from '@/components/icons/BrandIcons.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Avatar } from '@/components/ui/Avatar.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

interface Project {
  id: string;
  author_id: string;
  title: string;
  description: string;
  cover_url?: string | null;
  repo_url?: string | null;
  live_demo_url?: string | null;
  tech_stack: string[];
  feedback_requests?: string | null;
  likes_count: number;
  created_at: string;
  author?: {
    username: string;
    display_name: string;
    avatar_url?: string | null;
  };
}

export function ProjectShowcasePage() {
  const { session } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [liveDemoUrl, setLiveDemoUrl] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [feedbackRequests, setFeedbackRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/feed/projects');
      const data = await res.json();
      if (data.success && data.data) {
        setProjects(data.data);
      }
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const techStack = techStackInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/feed/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          repoUrl: repoUrl.trim() || undefined,
          liveDemoUrl: liveDemoUrl.trim() || undefined,
          techStack,
          feedbackRequests: feedbackRequests.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish project');
      }

      setProjects((prev) => [data.data, ...prev]);
      setShowModal(false);
      resetForm();
      toast.success('Project showcase published!');
    } catch (err: any) {
      toast.error(err.message || 'Error publishing project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setRepoUrl('');
    setLiveDemoUrl('');
    setTechStackInput('');
    setFeedbackRequests('');
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EA580C]/10 text-[#EA580C] dark:text-[#FB923C] border border-[#EA580C]/20">
              <FolderGit2 className="w-3.5 h-3.5" />
              Capstone & Showcase
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Project Showcases</h1>
          <p className="text-sm text-text-secondary">
            Explore and review real projects built by peers. Share repos, test live demos, and exchange architectural feedback.
          </p>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          className="bg-primary text-white text-xs shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Showcase Your Project
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-xl bg-surface space-y-2">
          <FolderGit2 className="w-10 h-10 text-text-muted/60 mx-auto" />
          <h3 className="text-base font-semibold text-text">No showcases published yet</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Be the first to share an open-source project or capstone with the Gyanix community.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="p-6 rounded-xl border border-border bg-surface flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src={proj.author?.avatar_url || undefined}
                    alt={proj.author?.display_name || 'Builder'}
                    size="sm"
                  />
                  <div>
                    <h4 className="text-xs font-semibold text-text">
                      {proj.author?.display_name || 'Student Builder'}
                    </h4>
                    <span className="text-[10px] text-text-muted">
                      @{proj.author?.username || 'builder'}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-text">{proj.title}</h3>
                <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed">
                  {proj.description}
                </p>

                {/* Tech stack */}
                {proj.tech_stack && proj.tech_stack.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {proj.tech_stack.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10px] bg-surface-subtle border border-border font-mono text-text-secondary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Feedback question */}
                {proj.feedback_requests && (
                  <div className="p-2.5 rounded-lg bg-surface-subtle text-[11px] text-text-muted border border-border/50 italic">
                    "Looking for feedback on: {proj.feedback_requests}"
                  </div>
                )}
              </div>

              {/* Links Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs">
                <div className="flex items-center gap-3">
                  {proj.repo_url && (
                    <a
                      href={proj.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-text-secondary hover:text-text"
                    >
                      <Github className="w-3.5 h-3.5" />
                      Repo
                    </a>
                  )}
                  {proj.live_demo_url && (
                    <a
                      href={proj.live_demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Live Demo
                    </a>
                  )}
                </div>

                <span className="text-[11px] text-text-muted">
                  {new Date(proj.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Showcase Project */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg p-6 rounded-2xl border border-border bg-surface-raised space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text">Showcase Your Project</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-text-muted hover:text-text"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Project Title *</label>
                <Input
                  placeholder="e.g. Distributed Key-Value Store in Go"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Project Description *</label>
                <textarea
                  rows={3}
                  placeholder="Describe the architecture, problem solved, and key engineering challenges..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">GitHub Repo URL</label>
                  <Input
                    placeholder="https://github.com/..."
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Live Demo URL</label>
                  <Input
                    placeholder="https://..."
                    value={liveDemoUrl}
                    onChange={(e) => setLiveDemoUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Technologies (comma separated)</label>
                <Input
                  placeholder="Rust, WebAssembly, PostgreSQL, Docker"
                  value={techStackInput}
                  onChange={(e) => setTechStackInput(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Specific Feedback Desired</label>
                <Input
                  placeholder="e.g. Code structure, database indexing, latency optimization..."
                  value={feedbackRequests}
                  onChange={(e) => setFeedbackRequests(e.target.value)}
                />
              </div>

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
                  disabled={isSubmitting || !title.trim() || !description.trim()}
                  className="bg-primary text-white"
                >
                  Publish Showcase
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

