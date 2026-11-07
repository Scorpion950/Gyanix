# AI Providers Architecture & Configuration — Gyanix

## Architecture Overview
Gyanix separates AI feature logic from external AI SDKs via a central **AI Provider Adapter Layer** in `apps/api/src/ai/`.

```
Feature Code (Doubt Solver / Roadmap / Code Assistant)
                     │
                     ▼
                 AIService
                     │
         ProviderRegistry (Capability Map)
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
 GeminiAdapter                GroqAdapter (Phase 10)
(Google Gemini 3.8 Flash)   (OpenAI-Compatible Fallback)
```

## Supported Providers & Models

| Provider | Model | Tier | Capabilities |
|---|---|---|---|
| **Google Gemini** (Default) | `gemini-3.8-flash` | Free tier | Structured JSON, Streaming, 1M context |
| **Groq** (Secondary) | `llama-3.1-70b-versatile` | Free tier | Ultra-fast inference, Streaming |

## Environment Configuration
Initial deployment reads configuration from server-side environment variables:
```bash
# apps/api/.env
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-3.8-flash
```

*Note: Keys are never sent to the client browser.*

## Capability Map
Before calling an AI provider, `AIService` checks the model's capabilities:
- `streaming`: Supported by Gemini & Groq
- `structuredOutput`: Native JSON mode support
- `maxContextTokens`: Validated against request size

## Fallback Strategy
If the active provider encounters:
1. Rate limit (HTTP 429)
2. Quota exhaustion
3. Temporary 5xx outage

`AIService` automatically logs the incident to `audit_logs` and attempts fallback to the next enabled provider in configured priority order, while strictly applying identical privacy masking filters. If all providers are exhausted, a friendly "AI capacity currently reached, try again shortly" notice is returned while keeping all non-AI platform features fully usable.

