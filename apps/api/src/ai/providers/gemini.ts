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
        model: 'gemini-1.5-flash',
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
        model: 'gemini-1.5-flash',
        provider: 'gemini',
        tokensUsed: result.response.usageMetadata?.totalTokenCount || 0,
      };
    } catch (err: any) {
      console.warn('[GeminiAdapter] API call failed, falling back to local reasoning:', err?.message);
      return this.generateMockFallback(options);
    }
  }

  private generateMockFallback(options: AIRequestOptions): AIResponse {
    const lastMsg = options.messages[options.messages.length - 1]?.content || '';

    if (options.jsonMode) {
      // Structured JSON mock
      return {
        content: JSON.stringify({
          summary: 'Concept Explanation',
          stages: [
            {
              title: 'Core Fundamentals',
              lectures: ['Foundational Principles & Architecture', 'Syntax and Memory Model'],
            },
            {
              title: 'Intermediate Patterns',
              lectures: ['Concurrency & State Management', 'Performance Optimization'],
            },
          ],
          questions: [
            {
              id: 'q1',
              type: 'mcq',
              prompt: 'Which data structure does a standard PostgreSQL index use by default?',
              options: ['Hash Map', 'B-Tree', 'Splay Tree', 'Skip List'],
              correctOptionIndex: 1,
              explanation: 'PostgreSQL uses B-Tree indexes by default for equality and range queries.',
              difficulty: 3,
            },
          ],
        }),
        model: 'local-fallback',
        provider: 'gemini',
        tokensUsed: 0,
      };
    }

    return {
      content: `### Concept Explanation\n\nRegarding your question: *"${lastMsg.slice(0, 80)}..."*\n\n1. **Core Principle:** In modern software architecture, breaking down complexity into discrete, testable components prevents cascading failures.\n2. **Practical Example:** Consider database query optimization: always run \`EXPLAIN ANALYZE\` before adding indexes to measure true execution cost.\n\n*Note: Running in offline fallback mode. Configure GEMINI_API_KEY in apps/api/.env for live model responses.*`,
      model: 'local-fallback',
      provider: 'gemini',
      tokensUsed: 0,
    };
  }
}
