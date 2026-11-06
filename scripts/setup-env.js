import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const webEnvPath = path.join(rootDir, 'apps', 'web', '.env');
const apiEnvPath = path.join(rootDir, 'apps', 'api', '.env');
const examplePath = path.join(rootDir, '.env.example');

console.info('\n🚀 Gyanix Environment Initializer\n');

if (!fs.existsSync(examplePath)) {
  console.error('❌ .env.example not found at project root');
  process.exit(1);
}

const exampleContent = fs.readFileSync(examplePath, 'utf8');

// Setup apps/web/.env
if (fs.existsSync(webEnvPath)) {
  console.info('✔ apps/web/.env already exists');
} else {
  const webContent = `# apps/web — Frontend Environment
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:3001/api
VITE_APP_URL=http://localhost:5173
`;
  fs.writeFileSync(webEnvPath, webContent, 'utf8');
  console.info('✔ Created apps/web/.env');
}

// Setup apps/api/.env with generated encryption key
if (fs.existsSync(apiEnvPath)) {
  console.info('✔ apps/api/.env already exists');
} else {
  const generatedKey = crypto.randomBytes(32).toString('hex');
  const apiContent = `# apps/api — Backend Environment
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

GEMINI_API_KEY=your-gemini-api-key
ENCRYPTION_KEY=${generatedKey}

ALLOWED_ORIGINS=http://localhost:5173
APP_URL=http://localhost:5173
API_URL=http://localhost:3001
NODE_ENV=development

# Optional configurations
YOUTUBE_API_KEY=
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@gyanix.dev
`;
  fs.writeFileSync(apiEnvPath, apiContent, 'utf8');
  console.info('✔ Created apps/api/.env (Generated random 32-byte ENCRYPTION_KEY)');
}

console.info('\n👉 Next steps:');
console.info('   1. Open apps/web/.env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
console.info('   2. Open apps/api/.env and set SUPABASE_* keys and GEMINI_API_KEY');
console.info('   3. Run "pnpm dev" to start the platform\n');

