import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Code2,
  Brain,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  BookOpen,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Card, CardContent } from '@/components/ui/Card.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

interface Question {
  id: string;
  type: 'mcq' | 'conceptual' | 'code_scenario';
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  explanation: string;
  difficulty: number;
  metricTarget: 'learning' | 'knowledge' | 'practical';
  codeSnippet?: string;
}

interface Assessment {
  id: string;
  title: string;
  difficulty_level: number;
  questions: Question[];
}

interface AttemptResult {
  score_percent: number;
  learning_score: number;
  knowledge_score: number;
  practical_score: number;
  answers: Record<string, any>;
}

export function AssessmentRunnerView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<AttemptResult | null>(null);

  // New assessment generator input
  const [newTopic, setNewTopic] = useState('');
  const [newDifficulty, setNewDifficulty] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (id) {
      loadAssessment(id);
    } else {
      // Load recent assessments or prompt creation
      loadRecentAssessments();
    }
  }, [id]);

  const loadRecentAssessments = async () => {
    try {
      const res = await fetch('/api/ai/assessments');
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setAssessment(data.data[0]);
      }
    } catch {
      // Non-blocking
    }
  };

  const loadAssessment = async (assessmentId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAssessment(data.data);
        if (data.data.latestAttempt) {
          setAttemptResult(data.data.latestAttempt);
        }
      } else {
        toast.error('Assessment not found');
      }
    } catch {
      toast.error('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/assessments/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          topic: newTopic.trim(),
          difficulty: newDifficulty,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate assessment');
      }

      setAssessment(data.data);
      setCurrentIdx(0);
      setUserAnswers({});
      setAttemptResult(null);
      toast.success('Assessment generated!');
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleSubmit = async () => {
    if (!assessment) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/ai/assessments/${assessment.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ assessmentId: assessment.id, answers: userAnswers }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = typeof data.error === 'string' ? data.error : (data.error?.message || 'Submission failed');
        throw new Error(errorMsg);
      }

      setAttemptResult(data.data);
      toast.success('Assessment completed!');
    } catch (err: any) {
      const errorMsg = typeof err === 'string' ? err : (err?.message || 'Failed to submit assessment');
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const questions = assessment?.questions || [];
  const currentQ = questions[currentIdx];

  const getDifficultyDots = (level: number) => {
    const full = '●'.repeat(level);
    const empty = '○'.repeat(Math.max(0, 5 - level));
    const labels = ['', 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];
    return `${full}${empty} ${labels[level] || ''}`;
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <ClipboardCheck className="w-3.5 h-3.5" />
              Skill Assessments
            </span>
            {assessment && (
              <span className="text-xs font-mono text-text-muted">
                {getDifficultyDots(assessment.difficulty_level)}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {assessment ? assessment.title : 'Technical Competency Assessments'}
          </h1>
        </div>

        {/* Generate quick assessment trigger */}
        <div className="flex items-center gap-2">
          {!assessment && (
            <form onSubmit={handleGenerateAssessment} className="flex items-center gap-2">
              <Input
                placeholder="Topic (e.g. Docker, Python GIL)..."
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="w-48 text-xs"
              />
              <Button type="submit" disabled={isGenerating || !newTopic.trim()} size="sm">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-ai" />
                Generate
              </Button>
            </form>
          )}
          {attemptResult && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAttemptResult(null);
                setUserAnswers({});
                setCurrentIdx(0);
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Retake
            </Button>
          )}
        </div>
      </div>

      {/* No assessment loaded fallback */}
      {!assessment && !loading && (
        <Card className="border border-dashed border-border p-12 text-center bg-surface">
          <Brain className="w-12 h-12 mx-auto text-primary/60 mb-3" />
          <h2 className="text-base font-semibold text-text mb-1">Create an AI-Powered Assessment</h2>
          <p className="text-xs text-text-secondary max-w-sm mx-auto mb-4">
            Test and measure your mastery in any language, framework, or architectural discipline.
          </p>
          <form onSubmit={handleGenerateAssessment} className="max-w-md mx-auto space-y-3">
            <Input
              placeholder="e.g. PostgreSQL Query Optimization"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="text-sm"
              required
            />
            <Button type="submit" disabled={isGenerating || !newTopic.trim()} className="w-full">
              <Sparkles className="w-4 h-4 mr-2 text-ai" />
              Generate 3-Question Assessment
            </Button>
          </form>
        </Card>
      )}

      {/* Assessment in progress */}
      {assessment && !attemptResult && (
        <div className="space-y-6">
          {/* Progress Indicator Strip */}
          <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
            <span>
              Question {currentIdx + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-1.5">
              {questions.map((q, qIndex) => {
                const isAnswered = userAnswers[q.id] !== undefined;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(qIndex)}
                    className={`w-6 h-6 rounded-md text-xs font-mono transition-all flex items-center justify-center border ${
                      currentIdx === qIndex
                        ? 'border-primary bg-primary text-white font-bold'
                        : isAnswered
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border bg-surface text-text-muted hover:border-text-secondary'
                    }`}
                  >
                    {qIndex + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Question Card */}
          {currentQ && (
            <div className="p-6 rounded-xl border border-border bg-surface space-y-5">
              {/* Question metadata */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Type: {currentQ.type.replace('_', ' ')}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-surface-subtle font-mono text-text-secondary">
                  Target: {currentQ.metricTarget} progress
                </span>
              </div>

              {/* Prompt */}
              <h3 className="text-base md:text-lg font-semibold text-text leading-snug">
                {currentQ.prompt}
              </h3>

              {/* Code Snippet if present */}
              {currentQ.codeSnippet && (
                <div className="rounded-lg bg-surface-raised border border-border p-4 font-mono text-xs overflow-x-auto text-text">
                  <pre>
                    <code>{currentQ.codeSnippet}</code>
                  </pre>
                </div>
              )}

              {/* Options for MCQ */}
              {currentQ.type === 'mcq' && currentQ.options && (
                <div className="space-y-2 pt-2">
                  {currentQ.options.map((opt, optIndex) => {
                    const isSelected = userAnswers[currentQ.id] === optIndex;
                    return (
                      <button
                        type="button"
                        key={optIndex}
                        onClick={() => handleSelectOption(currentQ.id, optIndex)}
                        className={`w-full text-left p-3.5 rounded-lg border text-sm transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border bg-surface hover:bg-surface-subtle text-text'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-mono shrink-0 ${
                            isSelected
                              ? 'border-primary bg-primary text-white'
                              : 'border-border text-text-muted'
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Conceptual or Code Scenario Textarea */}
              {currentQ.type !== 'mcq' && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-medium text-text-secondary">
                    Provide your technical analysis or code solution:
                  </label>
                  <textarea
                    rows={4}
                    value={userAnswers[currentQ.id] || ''}
                    onChange={(e) => handleTextAnswer(currentQ.id, e.target.value)}
                    placeholder="Explain the architectural considerations, runtime guarantees, or implementation..."
                    className="w-full p-3 rounded-lg border border-border bg-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}

              {/* Navigation Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => i - 1)}
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Previous
                </Button>

                {currentIdx < questions.length - 1 ? (
                  <Button size="sm" onClick={() => setCurrentIdx((i) => i + 1)}>
                    Next Question
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-primary text-white"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Submit Assessment
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completed Results Screen */}
      {attemptResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          {/* Top Score Banner */}
          <div className="p-6 rounded-xl border border-border bg-surface text-center space-y-3">
            {/* Restrained checkmark per Part 0 */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="w-12 h-12 mx-auto rounded-full bg-success/10 text-success flex items-center justify-center"
            >
              <CheckCircle2 className="w-6 h-6" />
            </motion.div>
            <h2 className="text-xl font-bold text-text">Assessment Complete</h2>
            <div className="text-3xl font-extrabold text-primary font-mono">
              {attemptResult.score_percent}%
            </div>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Evaluation computed across three distinct competency metrics.
            </p>
          </div>

          {/* Three Separate Progress Bars per Section 0.4 */}
          <div className="p-5 rounded-xl border border-border bg-surface space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Competency Progression
              </span>
              <span className="text-[11px] text-text-muted">Time spent is never equated with progress</span>
            </div>

            <div className="space-y-3">
              {/* Learning Progress (Primary Blue) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-primary flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Learning Progress
                  </span>
                  <span className="font-mono text-text-secondary font-medium">
                    {attemptResult.learning_score}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-subtle overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${attemptResult.learning_score}%` }}
                  />
                </div>
              </div>

              {/* Knowledge Progress (Teal) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#0D9488] dark:text-[#2DD4BF] flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" />
                    Knowledge Progress
                  </span>
                  <span className="font-mono text-text-secondary font-medium">
                    {attemptResult.knowledge_score}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-subtle overflow-hidden">
                  <div
                    className="h-full bg-[#0D9488] dark:bg-[#2DD4BF] rounded-full transition-all duration-500"
                    style={{ width: `${attemptResult.knowledge_score}%` }}
                  />
                </div>
              </div>

              {/* Practical Progress (Orange) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#EA580C] dark:text-[#FB923C] flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    Practical Progress
                  </span>
                  <span className="font-mono text-text-secondary font-medium">
                    {attemptResult.practical_score}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-subtle overflow-hidden">
                  <div
                    className="h-full bg-[#EA580C] dark:bg-[#FB923C] rounded-full transition-all duration-500"
                    style={{ width: `${attemptResult.practical_score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Question Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Question Explanations & Review
            </h3>

            {questions.map((q, idx) => {
              const userAns = attemptResult.answers?.[q.id];
              const isCorrect = q.type === 'mcq' ? userAns === q.correctOptionIndex : !!userAns;

              return (
                <div key={q.id} className="p-4 rounded-xl border border-border bg-surface space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-danger shrink-0" />
                      )}
                      <span className="text-xs font-bold text-text">Question {idx + 1}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {q.metricTarget}
                    </Badge>
                  </div>

                  <p className="text-xs font-medium text-text pl-6">{q.prompt}</p>

                  <div className="pl-6 pt-1 text-xs text-text-secondary bg-surface-subtle/50 p-2.5 rounded-lg border border-border/40 mt-1">
                    <span className="font-semibold text-text block mb-0.5">Explanation:</span>
                    {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

