/**
 * Client-Side Sandboxed Code Execution Engine (100% Free-Tier & Zero Server Costs)
 * Runs user JavaScript safely with timeout protection, console capture, and automated test assertions.
 */

export interface TestResult {
  input: string;
  expected: string;
  actual?: string;
  passed: boolean;
  error?: string;
}

export interface ExecutionResult {
  status: 'passed' | 'failed' | 'error' | 'timeout';
  executionTimeMs: number;
  stdout: string;
  passedTests: number;
  totalTests: number;
  testResults: TestResult[];
  errorMessage?: string;
}

export async function executeJavaScript(
  code: string,
  testCases: Array<{ input: string; expected: string }> = [],
  timeoutMs = 3000
): Promise<ExecutionResult> {
  const startTime = performance.now();
  let stdoutLogs: string[] = [];

  return new Promise((resolve) => {
    // Construct worker blob with console override and timeout trap
    const workerScript = `
      self.onmessage = function(e) {
        const { code, testCases } = e.data;
        const logs = [];
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = function(...args) {
          logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        };
        console.warn = console.log;
        console.error = console.log;

        try {
          // Evaluate user definition in local scope
          const userFn = new Function('console', code + '; if (typeof twoSum !== "undefined") return twoSum; if (typeof isValid !== "undefined") return isValid; if (typeof TokenBucket !== "undefined") return TokenBucket; return null;')(console);

          const results = [];
          for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            try {
              let actualResult;
              if (userFn && typeof userFn === 'function') {
                // Parse arguments if JSON array
                let args = [];
                try {
                  const parsed = JSON.parse(tc.input);
                  args = Array.isArray(parsed) ? parsed : [parsed];
                } catch {
                  args = [tc.input];
                }
                actualResult = userFn(...args);
              } else {
                actualResult = 'Function evaluated';
              }

              const actualStr = JSON.stringify(actualResult);
              let expectedNorm = tc.expected.trim();
              let actualNorm = (actualStr || '').trim();

              const passed = actualNorm === expectedNorm || (typeof actualResult === 'boolean' && String(actualResult) === expectedNorm);

              results.push({
                input: tc.input,
                expected: tc.expected,
                actual: actualStr,
                passed,
              });
            } catch (tcErr) {
              results.push({
                input: tc.input,
                expected: tc.expected,
                passed: false,
                error: tcErr.message,
              });
            }
          }

          self.postMessage({ success: true, logs, testResults: results });
        } catch (err) {
          self.postMessage({ success: false, logs, error: err.message });
        }
      };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    let isDone = false;

    const timer = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        resolve({
          status: 'timeout',
          executionTimeMs: Math.round(performance.now() - startTime),
          stdout: stdoutLogs.join('\n'),
          passedTests: 0,
          totalTests: testCases.length,
          testResults: [],
          errorMessage: `Execution timed out after ${timeoutMs}ms. Check for infinite loops.`,
        });
      }
    }, timeoutMs);

    worker.onmessage = (e) => {
      if (isDone) return;
      isDone = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);

      const elapsed = Math.round(performance.now() - startTime);
      const { success, logs, testResults, error } = e.data;

      if (!success) {
        resolve({
          status: 'error',
          executionTimeMs: elapsed,
          stdout: logs.join('\n'),
          passedTests: 0,
          totalTests: testCases.length,
          testResults: [],
          errorMessage: error,
        });
        return;
      }

      const passedCount = testResults.filter((r: TestResult) => r.passed).length;
      const allPassed = testCases.length === 0 || passedCount === testCases.length;

      resolve({
        status: allPassed ? 'passed' : 'failed',
        executionTimeMs: elapsed,
        stdout: logs.join('\n'),
        passedTests: passedCount,
        totalTests: testResults.length,
        testResults,
      });
    };

    worker.onerror = (err) => {
      if (isDone) return;
      isDone = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);

      resolve({
        status: 'error',
        executionTimeMs: Math.round(performance.now() - startTime),
        stdout: '',
        passedTests: 0,
        totalTests: testCases.length,
        testResults: [],
        errorMessage: err.message || 'Worker runtime error',
      });
    };

    worker.postMessage({ code, testCases });
  });
}

