import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Code2,
  Play,
  RotateCcw,
  Save,
  Terminal,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { CodeEditor } from '@/components/editor/CodeEditor.tsx';
import { executeJavaScript } from '@/lib/sandboxedRunner.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from 'sonner';

const DEFAULT_SNIPPETS: Record<string, string> = {
  javascript: `// Gyanix In-Browser Free JavaScript Sandbox
// Zero server compute cost — runs locally in Web Worker

function calculateFibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}

console.log("Fibonacci(10):", calculateFibonacci(10));
console.log("Fibonacci(25):", calculateFibonacci(25));
`,
  web: `<!-- Interactive Web Component Sandbox -->
<div style="font-family: system-ui, sans-serif; padding: 24px; text-align: center;">
  <h2 style="color: #2563EB;">Hello from Gyanix Web Preview!</h2>
  <p style="color: #4A5168;">Edit the HTML & CSS live to see updates.</p>
  <button id="counterBtn" style="padding: 8px 16px; background: #2563EB; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
    Clicked 0 times
  </button>
</div>

<script>
  let count = 0;
  const btn = document.getElementById('counterBtn');
  btn.addEventListener('click', () => {
    count++;
    btn.textContent = 'Clicked ' + count + ' times!';
  });
</script>
`,
};

export function CodePlaygroundPage() {
  const { session } = useAuthStore();
  const [language, setLanguage] = useState<'javascript' | 'web'>('javascript');
  const [code, setCode] = useState(DEFAULT_SNIPPETS['javascript'] || '');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleLanguageChange = (lang: 'javascript' | 'web') => {
    setLanguage(lang);
    setCode(DEFAULT_SNIPPETS[lang] || '');
    setOutput('');
    setStatus('idle');
  };

  const handleRun = async () => {
    if (language === 'web') {
      // Web preview executes via iframe srcdoc automatically
      setStatus('success');
      return;
    }

    setIsRunning(true);
    setStatus('idle');
    try {
      const res = await executeJavaScript(code, []);
      setOutput(res.stdout || (res.errorMessage ? `Error: ${res.errorMessage}` : 'No output'));
      setExecutionTime(res.executionTimeMs);
      setStatus(res.status === 'passed' ? 'success' : 'error');
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
      setStatus('error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Code2 className="w-3.5 h-3.5" />
              Interactive Code Playground
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Sandboxed Execution Environment</h1>
          <p className="text-sm text-text-secondary">
            Execute code locally in-browser with zero latency and full privacy.
          </p>
        </div>

        {/* Language selector & Run trigger */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border bg-surface p-1">
            <button
              onClick={() => handleLanguageChange('javascript')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                language === 'javascript'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              JavaScript
            </button>
            <button
              onClick={() => handleLanguageChange('web')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                language === 'web'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              HTML/Web Preview
            </button>
          </div>

          <Button
            onClick={handleRun}
            disabled={isRunning}
            className="bg-primary text-white shadow-xs"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2 fill-current" />
            )}
            Run Code
          </Button>
        </div>
      </div>

      {/* Main Split Grid: Editor + Terminal/Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Code Editor */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-text-muted px-1">
            <span className="font-semibold uppercase tracking-wider">Source Editor</span>
            <span className="font-mono text-[11px]">Press Ctrl+Enter to Run</span>
          </div>

          <CodeEditor
            value={code}
            onChange={setCode}
            language={language === 'web' ? 'html' : 'javascript'}
            minHeight="480px"
            onRun={handleRun}
          />
        </div>

        {/* Right: Output Console or Web Preview */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-text-muted px-1">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              {language === 'web' ? <Eye className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
              {language === 'web' ? 'Live Component Preview' : 'Console Output'}
            </span>
            {executionTime !== null && language !== 'web' && (
              <span className="font-mono text-[11px] text-text-secondary">
                {executionTime}ms
              </span>
            )}
          </div>

          {language === 'web' ? (
            <div className="rounded-xl border border-border bg-surface overflow-hidden h-[480px]">
              <iframe
                title="Web Preview"
                srcDoc={code}
                sandbox="allow-scripts allow-modals"
                className="w-full h-full border-none"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-[#0B0E14] text-[#E8ECF4] h-[480px] p-4 font-mono text-xs overflow-auto flex flex-col justify-between">
              <pre className="whitespace-pre-wrap leading-relaxed text-[#A6AFC3]">
                {output || '// Console output will appear here after execution.'}
              </pre>

              {status !== 'idle' && (
                <div className="pt-3 border-t border-[#232B3B] flex items-center justify-between text-[11px]">
                  <span
                    className={`flex items-center gap-1.5 font-medium ${
                      status === 'success' ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    Execution {status === 'success' ? 'completed' : 'failed'}
                  </span>
                  <button
                    onClick={() => setOutput('')}
                    className="text-[#8089A0] hover:text-[#E8ECF4] transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

