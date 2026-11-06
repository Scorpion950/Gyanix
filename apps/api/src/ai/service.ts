/**
 * AI Provider Adapter Layer — Phase 4 stubs
 *
 * The full implementation is built in Phase 4. This file defines the common
 * interface so other modules can import types without circular dependencies.
 *
 * Architecture:
 *   - Each provider implements AIProviderAdapter
 *   - AIService selects the active provider from the registry
 *   - All AI features call AIService, never provider SDKs directly
 */

export interface AIMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export interface AIRequestOptions {
  messages: AIMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  /** Whether to stream the response */
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  tokensUsed?: number;
  finishReason?: string;
}

export interface AIProviderCapabilities {
  streaming: boolean;
  structuredOutput: boolean;
  maxContextTokens: number;
  supportedFeatures: string[];
}

export interface AIProviderAdapter {
  id: string;
  name: string;
  capabilities: AIProviderCapabilities;
  isAvailable(): Promise<boolean>;
  complete(options: AIRequestOptions): Promise<AIResponse>;
}

/**
 * Stub AI service — returns a clear "not yet available" response.
 * Replaced in Phase 4 with the full provider registry.
 */
export const aiService = {
  async complete(_options: AIRequestOptions): Promise<AIResponse> {
    throw new Error('AI service not yet configured. This feature is available in Phase 4.');
  },
};
