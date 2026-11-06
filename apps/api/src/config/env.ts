import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_JWT_SECRET: z.string().min(1, 'SUPABASE_JWT_SECRET is required'),
  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:3001'),
  // AI
  GEMINI_API_KEY: z.string().optional(),
  // Encryption
  ENCRYPTION_KEY: z.string().optional(),
  // YouTube
  YOUTUBE_API_KEY: z.string().optional(),
  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
});

function validateEnv() {
  if (process.env['NODE_ENV'] === 'test' || process.env['VITEST']) {
    return {
      NODE_ENV: 'test' as const,
      PORT: '3001',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      SUPABASE_JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
      ALLOWED_ORIGINS: 'http://localhost:5173',
      APP_URL: 'http://localhost:5173',
      API_URL: 'http://localhost:3001',
      GEMINI_API_KEY: undefined,
      ENCRYPTION_KEY: undefined,
      YOUTUBE_API_KEY: undefined,
      SMTP_HOST: undefined,
      SMTP_PORT: undefined,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
      SMTP_FROM: undefined,
    };
  }

  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('[env] ❌ Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
export type Env = typeof env;
