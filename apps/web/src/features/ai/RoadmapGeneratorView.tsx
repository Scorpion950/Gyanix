import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Compass,
  ArrowRight,
  CheckCircle2,
  ListOrdered,
  Layers,
  FolderGit2,
  Calendar,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

interface RoadmapStage {
  stageNumber: number;
  title: string;
  topics: string[];
  searchTerms: string[];
}

interface SuggestedProject {
  title: string;
  description: string;
}

interface AIRoadmap {
  id: string;
  topic: string;
  target_role?: string | null;
  prerequisites: string[];
  stages: RoadmapStage[];
  suggested_projects: SuggestedProject[];
  is_approved: boolean;
  created_at: string;
}

const SKILL_LEVELS = [
  { level: 1, label: '●○○○○ Beginner' },
  { level: 2, label: '●●○○○ Elementary' },
  { level: 3, label: '●●●○○ Intermediate' },
  { level: 4, label: '●●●●○ Advanced' },
  { level: 5, label: '●●●●● Expert' },
];

export function RoadmapGeneratorView() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [topic, setTopic] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [skillLevel, setSkillLevel] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState<AIRoadmap | null>(null);
  const [previousRoadmaps, setPreviousRoadmaps] = useState<AIRoadmap[]>([]);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    fetchUserRoadmaps();
  }, []);

  const fetchUserRoadmaps = async () => {
    try {
      const res = await fetch('/api/ai/roadmaps', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPreviousRoadmaps(data.data);
        if (data.data.length > 0 && !activeRoadmap) {
          setActiveRoadmap(data.data[0]);
        }
      }
    } catch {
      // Non-blocking fetch
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error('Please enter a learning topic or technology.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/roadmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          topic: topic.trim(),
          targetRole: targetRole.trim() || undefined,
          currentSkillLevel: (
            { 1: 'beginner', 2: 'beginner', 3: 'intermediate', 4: 'advanced', 5: 'expert' }[skillLevel] || 'intermediate'
          ),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate roadmap');
      }

      setActiveRoadmap(data.data);
      setPreviousRoadmaps((prev) => [data.data, ...prev]);
      toast.success('Curriculum generated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Error communicating with AI service');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!activeRoadmap) return;
    setIsApproving(true);
    try {
      const res = await fetch(`/api/ai/roadmaps/${activeRoadmap.id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve roadmap');
      }

      toast.success('Converted into an active Learning Path!');
      navigate(`/learning/paths/${data.data.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create learning path');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-ai/10 text-ai border border-ai/20">
              <Sparkles className="w-3.5 h-3.5 text-ai" />
              AI Architect
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">AI Curriculum & Roadmap Architect</h1>
          <p className="text-sm text-text-secondary">
            Generate stage-by-stage learning pathways, verified lectures, and capstone projects tailored to your target role.
          </p>
        </div>
      </div>

      {/* Main Grid: Form + Generated Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & History */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border border-border bg-surface">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Generate New Curriculum</CardTitle>
              <CardDescription>Specify what you want to master</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Topic or Technology *</label>
                  <Input
                    placeholder="e.g. Distributed Systems in Go, React 19"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Target Role (Optional)</label>
                  <Input
                    placeholder="e.g. Senior Backend Engineer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Current Skill Level</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {SKILL_LEVELS.map((s) => (
                      <button
                        type="button"
                        key={s.level}
                        onClick={() => setSkillLevel(s.level)}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-mono transition-colors border ${
                          skillLevel === s.level
                            ? 'bg-primary/10 border-primary text-primary font-medium'
                            : 'border-border/60 hover:bg-surface-subtle text-text-secondary'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isGenerating || !topic.trim()}
                  className="w-full mt-2 bg-primary text-white"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Designing Syllabus...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 text-ai" />
                      Generate Roadmap
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Previous Roadmaps Rail */}
          {previousRoadmaps.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">
                Your Saved Curricula
              </h2>
              <div className="space-y-2">
                {previousRoadmaps.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveRoadmap(r)}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                      activeRoadmap?.id === r.id
                        ? 'border-ai bg-ai/5 shadow-xs'
                        : 'border-border bg-surface hover:bg-surface-subtle'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text truncate max-w-[180px]">{r.topic}</span>
                      {r.is_approved ? (
                        <Badge variant="outline" className="text-[10px] text-success border-success/30 bg-success/5">
                          Enrolled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-text-muted">
                          Draft
                        </Badge>
                      )}
                    </div>
                    {r.target_role && (
                      <p className="text-xs text-text-secondary mt-0.5 truncate">{r.target_role}</p>
                    )}
                    <span className="text-[10px] text-text-muted block mt-1">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Roadmap Visualizer */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {activeRoadmap ? (
              <motion.div
                key={activeRoadmap.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                {/* Roadmap Header Card */}
                <div className="p-6 rounded-xl border border-ai/20 bg-ai/[0.03] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-ai/10 text-ai">
                          <Sparkles className="w-3 h-3 text-ai" />
                          AI Structured Curriculum
                        </span>
                        {activeRoadmap.is_approved && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-success/10 text-success">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved Path
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-text">{activeRoadmap.topic}</h2>
                      {activeRoadmap.target_role && (
                        <p className="text-sm text-text-secondary">Target Role: {activeRoadmap.target_role}</p>
                      )}
                    </div>

                    {!activeRoadmap.is_approved ? (
                      <Button
                        onClick={handleApprove}
                        disabled={isApproving}
                        className="bg-primary text-white shrink-0 shadow-xs"
                      >
                        {isApproving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating Path...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve & Enroll in Path
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => navigate('/learning')}
                        variant="outline"
                        className="shrink-0"
                      >
                        Go to My Learning
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    )}
                  </div>

                  {/* Prerequisites */}
                  {activeRoadmap.prerequisites && activeRoadmap.prerequisites.length > 0 && (
                    <div className="pt-3 border-t border-border/50">
                      <span className="text-xs font-semibold text-text-secondary block mb-2">Prerequisites:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeRoadmap.prerequisites.map((p, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full text-xs bg-surface border border-border text-text-secondary"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stages Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Structured Learning Stages ({activeRoadmap.stages?.length || 0})
                  </h3>

                  <div className="space-y-4">
                    {activeRoadmap.stages?.map((stage, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-xl border border-border bg-surface space-y-3 transition-colors hover:border-primary/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                              {stage.stageNumber || idx + 1}
                            </span>
                            <h4 className="text-base font-semibold text-text">{stage.title}</h4>
                          </div>
                        </div>

                        {/* Topics */}
                        <div className="pl-10 space-y-2">
                          <span className="text-xs font-medium text-text-muted">Key Competencies:</span>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-text-secondary">
                            {stage.topics?.map((topicItem, tIdx) => (
                              <li key={tIdx} className="flex items-start gap-1.5">
                                <span className="text-primary font-bold">•</span>
                                <span>{topicItem}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Recommended Searches */}
                          {stage.searchTerms && stage.searchTerms.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/40">
                              <span className="text-[11px] text-text-muted block mb-1">
                                Curated Query Reference:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {stage.searchTerms.map((term, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-surface-subtle text-text-secondary border border-border font-mono"
                                  >
                                    {term}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Capstone Projects */}
                {activeRoadmap.suggested_projects && activeRoadmap.suggested_projects.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                      <FolderGit2 className="w-4 h-4 text-accent-orange" />
                      Practical Capstone Projects ({activeRoadmap.suggested_projects.length})
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeRoadmap.suggested_projects.map((proj, pIdx) => (
                        <div
                          key={pIdx}
                          className="p-4 rounded-xl border border-border bg-surface space-y-2 hover:border-border/80 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-text font-semibold text-sm">
                            <span className="w-2 h-2 rounded-full bg-accent-orange" />
                            {proj.title}
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">{proj.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl bg-surface/50">
                <Compass className="w-12 h-12 text-text-muted/60 mb-3" />
                <h3 className="text-base font-semibold text-text mb-1">No Active Roadmap Selected</h3>
                <p className="text-xs text-text-secondary max-w-sm">
                  Enter a topic on the left to synthesize an AI-designed technical syllabus, or select one of your saved curricula.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

