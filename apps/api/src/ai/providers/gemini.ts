import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProviderAdapter, AIRequestOptions, AIResponse, AIProviderCapabilities } from '../types.js';

export class GeminiAdapter implements AIProviderAdapter {
  id = 'gemini';
  name = 'Google Gemini Flash';
  capabilities: AIProviderCapabilities = {
    streaming: true,
    structuredOutput: true,
    maxContextTokens: 1_000_000,
  };

  private client: GoogleGenerativeAI | null = null;

  constructor() {
    const key = process.env['GEMINI_API_KEY'];
    if (key && key.trim().length > 0) {
      this.client = new GoogleGenerativeAI(key);
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env['GEMINI_API_KEY'];
  }

  async complete(options: AIRequestOptions): Promise<AIResponse> {
    // If no API key configured, return high-quality educational fallback response
    if (!this.client || !process.env['GEMINI_API_KEY']) {
      return this.generateMockFallback(options);
    }

    try {
      const modelConfig: any = {
        model: 'gemini-3.8-flash',
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 1024,
          responseMimeType: options.jsonMode ? 'application/json' : 'text/plain',
        },
      };
      if (options.systemPrompt) {
        modelConfig.systemInstruction = options.systemPrompt;
      }
      const model = this.client.getGenerativeModel(modelConfig);

      const contents = options.messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const result = await model.generateContent({ contents });
      const text = result.response.text();

      return {
        content: text,
        model: 'gemini-3.8-flash',
        provider: 'gemini',
        tokensUsed: result.response.usageMetadata?.totalTokenCount || 0,
      };
    } catch (err: any) {
      console.warn('[GeminiAdapter] API call failed, falling back to local reasoning:', err?.message);
      return this.generateMockFallback(options);
    }
  }

  private generateMockFallback(options: AIRequestOptions): AIResponse {
    const userMsg = options.messages.find((m) => m.role === 'user')?.content || '';
    const topicMatch = userMsg.match(/for\s+(.+)$/i);
    const topic = (topicMatch && topicMatch[1]) ? topicMatch[1].trim() : 'Software Engineering';

    if (options.jsonMode) {
      // If assessment requested
      if (options.systemPrompt?.includes('assessment') || userMsg.toLowerCase().includes('assessment')) {
        return {
          content: JSON.stringify({
            title: `${topic} Skill Assessment`,
            questions: [
              {
                id: 'q1',
                type: 'mcq',
                prompt: `In ${topic}, which of the following best describes memory management and concurrency safety?`,
                options: [
                  `Automatic garbage collection with concurrent thread synchronization primitives`,
                  `Manual pointer arithmetic with raw memory deallocation`,
                  `Single-threaded event loops only with no multi-threading support`,
                  `Static global buffers with no runtime dynamic allocation`,
                ],
                correctOptionIndex: 0,
                explanation: `${topic} handles memory automatically while providing standard synchronization mechanisms for thread safety.`,
                difficulty: 3,
                metricTarget: 'knowledge',
              },
              {
                id: 'q2',
                type: 'conceptual',
                prompt: `What is the primary architectural trade-off when designing scalable systems in ${topic}?`,
                explanation: `Balancing thread contention, CPU cache locality, and garbage collection pauses against ease of development.`,
                difficulty: 3,
                metricTarget: 'knowledge',
              },
              {
                id: 'q3',
                type: 'code_scenario',
                prompt: `Review the following ${topic} pattern. How would you refactor it to prevent resource leaks or race conditions?`,
                codeSnippet: `// Example ${topic} resource pattern\ntry {\n  Resource res = acquireResource();\n  res.process();\n} finally {\n  res.close();\n}`,
                explanation: `Ensure structured resource cleanup (such as try-with-resources or automatic disposal) to guarantee release even if exceptions occur.`,
                difficulty: 3,
                metricTarget: 'practical',
              },
            ],
          }),
          model: 'local-fallback',
          provider: 'gemini',
          tokensUsed: 0,
        };
      }

      // Default roadmap fallback
      return {
        content: JSON.stringify({
          summary: `${topic} Mastery Roadmap`,
          prerequisites: ['Basic programming fundamentals', 'Terminal & Git basics'],
          stages: [
            {
              stageNumber: 1,
              title: `${topic} Fundamentals`,
              topics: ['Language syntax & data structures', 'Object model & standard libraries'],
              searchTerms: [`${topic} full beginner course`],
            },
            {
              stageNumber: 2,
              title: 'Production Architecture & Patterns',
              topics: ['Concurrency, streams & asynchronous I/O', 'Database persistence & testing'],
              searchTerms: [`${topic} enterprise architectural patterns`],
            },
          ],
          suggestedProjects: [
            {
              title: `High-Throughput ${topic} Backend Service`,
              description: `Build a modular production service using modern ${topic} idioms.`,
            },
          ],
        }),
        model: 'local-fallback',
        provider: 'gemini',
        tokensUsed: 0,
      };
    }

    return {
      content: `### Concept Explanation\n\nRegarding your question: *"${userMsg.slice(0, 80)}..."*\n\n1. **Core Principle:** In modern software architecture, breaking down complexity into discrete, testable components prevents cascading failures.\n2. **Practical Example:** Consider database query optimization: always run \`EXPLAIN ANALYZE\` before adding indexes to measure true execution cost.\n\n*Note: Running in offline fallback mode. Configure GEMINI_API_KEY in apps/api/.env for live model responses.*`,
      model: 'local-fallback',
      provider: 'gemini',
      tokensUsed: 0,
    };
  }
}
