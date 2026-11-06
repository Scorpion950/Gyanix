import type { AIProviderAdapter } from './types.js';
import { GeminiAdapter } from './providers/gemini.js';

export class AIRegistry {
  private adapters: Map<string, AIProviderAdapter> = new Map();
  private primaryProviderId = 'gemini';

  constructor() {
    // Register initial providers
    this.register(new GeminiAdapter());
  }

  register(adapter: AIProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  getAdapter(id?: string): AIProviderAdapter {
    const targetId = id || this.primaryProviderId;
    const adapter = this.adapters.get(targetId);
    if (!adapter) {
      // Fallback to first available
      const first = Array.from(this.adapters.values())[0];
      if (!first) throw new Error('No AI providers registered in registry');
      return first;
    }
    return adapter;
  }

  listProviders(): { id: string; name: string; capabilities: any }[] {
    return Array.from(this.adapters.values()).map((a) => ({
      id: a.id,
      name: a.name,
      capabilities: a.capabilities,
    }));
  }
}

export const aiRegistry = new AIRegistry();

