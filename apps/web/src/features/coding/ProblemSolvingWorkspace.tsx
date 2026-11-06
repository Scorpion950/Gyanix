import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Check,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { CodeEditor } from '@/components/editor/CodeEditor.tsx';
import { executeJavaScript, type ExecutionResult } from '@/lib/sandboxedRunner.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: number;
  category: string;
  starter_templates: Record<string, string>;
  test_cases: Array<{ input: string; expected: string }>;
  hints: string[];
  solution_guide?: string;
}

export function ProblemSolvingWorkspace() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [activeTab, setActiveTab] = useState<'description' | 'hints' | 'ai'>('description');

  // Timer
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Execution & Submissions
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Progressive 4-Step AI Assistant
  const [aiStep, setAiStep] = useState<1 | 2 | 3 | 4>(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponses, setAiResponses] = useState<Record<number, string>>({});
  const [showSolutionConfirmed, setShowSolutionConfirmed] = useState(false);

  useEffect(() => {
    if (slug) {
      loadProblem(slug);
    }
  }, [slug]);

  // Stopwatch interval
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSecondsSpent((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const loadProblem = async (problemSlug: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/coding/problems/${problemSlug}`);
      const data = await res.json();
      if (data.success && data.data) {
        setProblem(data.data);
        const starter = data.data.starter_templates?.['javascript'] || '// Write your solution here\n';
        setCode(starter);
      } else {
        toast.error('Problem not found');
      }
    } catch {
      toast.error('Failed to load problem');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRunTests = async () => {
    if (!problem) return;
    setIsRunning(true);
    try {
      const result = await executeJavaScript(code, problem.test_cases || []);
      setExecutionResult(result);
      if (result.status === 'passed') {
        toast.success(`Passed all ${result.totalTests} test cases!`);
      } else if (result.status === 'failed') {
        toast.error(`Passed ${result.passedTests}/${result.totalTests} test cases.`);
      } else {
        toast.error(result.errorMessage || 'Execution encountered an error.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Execution error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!problem) return;
    setIsSubmitting(true);
    try {
      // 1. Run tests first
      const result = await executeJavaScript(code, problem.test_cases || []);
      setExecutionResult(result);

      // 2. Submit to backend
      const res = await fetch('/api/coding/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          problemId: problem.id,
          language: 'javascript',
          code,
          executionTimeMs: result.executionTimeMs,
          passedTests: result.passedTests,
          totalTests: result.totalTests,
          status: result.status,
          stdout: result.stdout,
          errorMessage: result.errorMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Submission failed');
      }

      if (result.status === 'passed') {
        setIsTimerRunning(false);
        toast.success('Solution submitted & marked as Solved!');
      } else {
        toast.error('Submission saved. Keep trying to pass all tests!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit solution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestAiStep = async (step: 1 | 2 | 3 | 4) => {
    if (!problem) return;
    if (step === 4 && !showSolutionConfirmed) {
      return;
    }

    setAiStep(step);
    if (aiResponses[step]) return; // already cached

    setAiLoading(true);
    try {
      const res = await fetch('/api/coding/assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          problemTitle: problem.title,
          problemDescription: problem.description,
          userCode: code,
          language: 'javascript',
          step,
          errorMessage: executionResult?.errorMessage || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI assist failed');
      }

      setAiResponses((prev) => ({ ...prev, [step]: data.data.content }));
    } catch (err: any) {
      toast.error(err.message || 'Error communicating with AI assistant');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="p-8 text-center text-text-muted">
        <p>Problem could not be found.</p>
        <Button onClick={() => navigate('/practice')} className="mt-4">
          Back to Practice Tracker
        </Button>
      </div>
    );
  }

  const getDifficultyDots = (level: number) => {
    const full = '●'.repeat(level);
    const empty = '○'.repeat(Math.max(0, 5 - level));
    const labels = ['', 'Easy', 'Medium', 'Hard', 'Very Hard', 'Expert'];
    return `${full}${empty} ${labels[level] || ''}`;
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/practice')}
            className="text-xs text-text-secondary"
          >
            ← Practice
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-text">{problem.title}</h1>
              <span className="text-xs font-mono text-text-muted">
                {getDifficultyDots(problem.difficulty)}
              </span>
            </div>
          </div>
        </div>

        {/* Stopwatch & Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-md border border-border bg-surface text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-text-muted" />
            <span className="tabular-nums font-semibold text-text">{formatTimer(secondsSpent)}</span>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="text-text-muted hover:text-text transition-colors ml-1"
              title={isTimerRunning ? 'Pause Timer' : 'Resume Timer'}
            >
              {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRunTests}
            disabled={isRunning}
            className="text-xs"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
            )}
            Run Tests
          </Button>

          <Button
            size="sm"
            onClick={handleSubmitSolution}
            disabled={isSubmitting}
            className="text-xs bg-primary text-white"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            )}
            Submit Solution
          </Button>
        </div>
      </div>

      {/* Split Workspace: Left (Problem / AI) + Right (Editor / Tests) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Description / Hints / 4-Step AI */}
        <div className="lg:col-span-5 rounded-xl border border-border bg-surface flex flex-col h-[700px] overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center border-b border-border bg-surface-subtle px-3 py-1 gap-1">
            <button
              onClick={() => setActiveTab('description')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'description'
                  ? 'bg-surface text-text shadow-xs'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              Problem Description
            </button>
            <button
              onClick={() => setActiveTab('hints')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'hints'
                  ? 'bg-surface text-text shadow-xs'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              Hints ({problem.hints?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'ai'
                  ? 'bg-ai/10 text-ai shadow-xs'
                  : 'text-text-secondary hover:text-ai'
              }`}
            >
              <Sparkles className="w-3 h-3 text-ai" />
              AI Assistant
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-text">
            {activeTab === 'description' && (
              <div className="space-y-4">
                <div className="whitespace-pre-wrap font-sans text-sm text-text-secondary">
                  {problem.description}
                </div>

                {/* Example Test Cases */}
                {problem.test_cases && problem.test_cases.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Example Test Cases:
                    </span>
                    {problem.test_cases.map((tc, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-surface-subtle border border-border/60 font-mono text-[11px] space-y-1">
                        <div><strong className="text-text">Input:</strong> <span className="text-text-secondary">{tc.input}</span></div>
                        <div><strong className="text-text">Expected:</strong> <span className="text-primary font-bold">{tc.expected}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'hints' && (
              <div className="space-y-3">
                {problem.hints && problem.hints.length > 0 ? (
                  problem.hints.map((hint, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg border border-border bg-surface-subtle space-y-1">
                      <span className="font-semibold text-text text-xs flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-warning" />
                        Hint {idx + 1}
                      </span>
                      <p className="text-xs text-text-secondary">{hint}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-text-muted">No hints available for this problem.</p>
                )}
              </div>
            )}

            {/* 4-Step Progressive AI Coding Assistant */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-ai/5 border border-ai/20 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-ai shrink-0" />
                  <span className="text-xs text-text-secondary">
                    Progressive assistance ensures learning without giving away the answer right away.
                  </span>
                </div>

                {/* 4-Step Stepper Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => requestAiStep(1)}
                    className={`py-2 px-1 text-center rounded border text-[11px] font-semibold transition-all ${
                      aiStep === 1
                        ? 'border-ai bg-ai/10 text-ai'
                        : 'border-border bg-surface text-text-muted hover:border-text-secondary'
                    }`}
                  >
                    1. Error Analysis
                  </button>
                  <button
                    onClick={() => requestAiStep(2)}
                    className={`py-2 px-1 text-center rounded border text-[11px] font-semibold transition-all ${
                      aiStep === 2
                        ? 'border-ai bg-ai/10 text-ai'
                        : 'border-border bg-surface text-text-muted hover:border-text-secondary'
                    }`}
                  >
                    2. Edge Hint
                  </button>
                  <button
                    onClick={() => requestAiStep(3)}
                    className={`py-2 px-1 text-center rounded border text-[11px] font-semibold transition-all ${
                      aiStep === 3
                        ? 'border-ai bg-ai/10 text-ai'
                        : 'border-border bg-surface text-text-muted hover:border-text-secondary'
                    }`}
                  >
                    3. Approaches
                  </button>
                  <button
                    onClick={() => {
                      if (!showSolutionConfirmed) {
                        setShowSolutionConfirmed(true);
                      } else {
                        requestAiStep(4);
                      }
                    }}
                    className={`py-2 px-1 text-center rounded border text-[11px] font-semibold transition-all ${
                      aiStep === 4
                        ? 'border-ai bg-ai/10 text-ai'
                        : 'border-border bg-surface text-text-muted hover:border-text-secondary'
                    }`}
                  >
                    4. Full Solution
                  </button>
                </div>

                {/* Step 4 Confirmation gate */}
                {aiStep === 4 && !aiResponses[4] && showSolutionConfirmed && (
                  <div className="p-4 rounded-xl border border-warning/30 bg-warning/5 space-y-2 text-center">
                    <ShieldAlert className="w-6 h-6 text-warning mx-auto" />
                    <p className="text-xs font-semibold text-text">Reveal Complete Code Solution?</p>
                    <p className="text-[11px] text-text-secondary">
                      Checking the solution prematurely reduces retained problem-solving progress.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => requestAiStep(4)}
                      className="bg-warning text-white text-xs mt-2"
                    >
                      Confirm and Reveal Solution
                    </Button>
                  </div>
                )}

                {/* Response area */}
                {aiLoading ? (
                  <div className="flex items-center justify-center p-8 text-ai">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-xs">Analyzing code and synthesizing pedagogical guidance...</span>
                  </div>
                ) : (
                  aiResponses[aiStep] && (
                    <div className="p-4 rounded-xl border border-border bg-surface-subtle whitespace-pre-wrap font-sans text-xs text-text leading-relaxed">
                      {aiResponses[aiStep]}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Code Editor + Test Results Console */}
        <div className="lg:col-span-7 space-y-4">
          <CodeEditor
            value={code}
            onChange={setCode}
            language="javascript"
            minHeight="420px"
            onRun={handleRunTests}
          />

          {/* Test Case Execution Output Panel */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" />
                Test Verification Results
              </span>

              {executionResult && (
                <span className="font-mono text-xs text-text-secondary">
                  Ran in {executionResult.executionTimeMs}ms
                </span>
              )}
            </div>

            {executionResult ? (
              <div className="space-y-2">
                {executionResult.testResults.map((tr, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
                      tr.passed
                        ? 'border-success/30 bg-success/5 text-success'
                        : 'border-danger/30 bg-danger/5 text-danger'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {tr.passed ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                      <span>Case {idx + 1}: input {tr.input}</span>
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      {tr.passed ? (
                        <span>Expected & got: {tr.expected}</span>
                      ) : (
                        <span>Expected: {tr.expected} | Got: {tr.actual || tr.error}</span>
                      )}
                    </div>
                  </div>
                ))}

                {executionResult.stdout && (
                  <div className="p-3 rounded-lg bg-[#0B0E14] text-[#A6AFC3] font-mono text-[11px] overflow-auto">
                    <span className="text-[10px] text-[#8089A0] block mb-1">Standard Output:</span>
                    <pre>{executionResult.stdout}</pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-muted py-4 text-center">
                Click "Run Tests" to execute against verification inputs.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Terminal(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}
