export interface AIMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export interface AIRequestOptions {
  messages: AIMessage[];
  systemPrompt?: string | undefined;
  maxTokens?: number | undefined;
  temperature?: number | undefined;
  jsonMode?: boolean | undefined;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  tokensUsed?: number | undefined;
  finishReason?: string | undefined;
}

export interface AIProviderCapabilities {
  streaming: boolean;
  structuredOutput: boolean;
  maxContextTokens: number;
}

export interface AIProviderAdapter {
  id: string;
  name: string;
  capabilities: AIProviderCapabilities;
  isAvailable(): Promise<boolean>;
  complete(options: AIRequestOptions): Promise<AIResponse>;
}

