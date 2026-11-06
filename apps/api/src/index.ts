import 'dotenv/config';
import { createApp } from './app.js';

const PORT = process.env['PORT'] ?? 3001;
const app = createApp();

app.listen(PORT, () => {
  console.info(`[api] Server running on http://localhost:${PORT}`);
});

// Vercel serverless export
export default app;
