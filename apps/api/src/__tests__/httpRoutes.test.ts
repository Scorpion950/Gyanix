import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import { createApp } from '../app.js';

describe('HTTP Endpoints & Security Middleware', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /api/health returns HTTP 200 with service health payload', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { success: boolean; data: { status: string; timestamp: string; version: string } };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.timestamp).toBeDefined();
    expect(body.data.version).toBeDefined();
  });

  it('Verifies security headers injected by helmet middleware', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-dns-prefetch-control')).toBe('off');
  });

  it('Protected routes reject requests without Authorization Bearer token (401)', async () => {
    const protectedPaths = [
      '/api/notes',
      '/api/analytics/stats',
      '/api/messages/conversations',
      '/api/coding/practice',
      '/api/admin/kpis',
      '/api/admin/moderation',
    ];

    for (const path of protectedPaths) {
      const res = await fetch(`${baseUrl}${path}`);
      expect(res.status).toBe(401);
      const body = (await res.json()) as { success: boolean; error: { code: string; message: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Authentication required');
    }
  });

  it('Protected routes reject malformed or non-Bearer authorization headers (401)', async () => {
    const res = await fetch(`${baseUrl}/api/notes`, {
      headers: {
        Authorization: 'Basic dXNlcjpwYXNzd29yZA==',
      },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { success: boolean; error: { code: string; message: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
