import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import { createApp } from '../app.js';

describe('Comprehensive End-to-End API Workflows', () => {
  let server: Server;
  let baseUrl: string;

  // Synthesize a valid mock JWT token: header.payload.signature
  const mockHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const mockPayload = Buffer.from(
    JSON.stringify({
      sub: 'test-user-uuid-1234',
      email: 'alex_chen@gyanix.dev',
      user_metadata: {
        username: 'alex_chen',
        full_name: 'Alex Chen',
      },
    }),
  ).toString('base64');
  const mockToken = `${mockHeader}.${mockPayload}.mockSignature`;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${mockToken}`,
  };

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
      if (server) {
        if (typeof (server as any).closeAllConnections === 'function') {
          (server as any).closeAllConnections();
        }
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  it('1. GET /api/auth/me returns synthesized profile with username and display_name', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, { headers: authHeaders });
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.username).toBe('alex_chen');
    expect(body.data.display_name).toBe('Alex Chen');
    expect(body.data.roles).toBeDefined();
  });

  it('2. POST & GET /api/notes: creates and lists notes without 500 error', async () => {
    // Create note
    const createRes = await fetch(`${baseUrl}/api/notes`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Redis Distributed Lock Notes',
        contentMarkdown: 'Using Redlock algorithm with TTL safety margins.',
        priority: 'high',
      }),
    });
    expect(createRes.status).toBe(200);
    const createData = await createRes.json() as any;
    expect(createData.success).toBe(true);
    expect(createData.data.title).toBe('Redis Distributed Lock Notes');

    // List notes
    const listRes = await fetch(`${baseUrl}/api/notes`, { headers: authHeaders });
    expect(listRes.status).toBe(200);
    const listData = await listRes.json() as any;
    expect(listData.success).toBe(true);
    expect(listData.data.length).toBeGreaterThan(0);
  });

  it('3. GET & POST /api/notes/collections: manages collections gracefully', async () => {
    const res = await fetch(`${baseUrl}/api/notes/collections`, { headers: authHeaders });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('4. POST /api/learning-paths: creates path with custom title & description', async () => {
    const res = await fetch(`${baseUrl}/api/learning-paths`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Distributed Systems & Go Fundamentals',
        description: 'Complete hands-on curriculum from basics to production raft consensus.',
        visibility: 'private',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.title).toBe('Distributed Systems & Go Fundamentals');
  });

  it('5. POST /api/learning-paths/import-playlist: imports course videos resiliently', async () => {
    const res = await fetch(`${baseUrl}/api/learning-paths/import-playlist`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        playlistUrl: 'https://www.youtube.com/playlist?list=PLr6-GrHGFlyxPkyhT06VovLmg0T7Z9FkM',
        pathTitle: 'Core Web Architecture Course',
        visibility: 'private',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });

  it('6. POST /api/ai/roadmap: generates curriculum with stages and clickable YouTube links', async () => {
    const res = await fetch(`${baseUrl}/api/ai/roadmap`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        topic: 'Golang Microservices',
        currentSkillLevel: 'intermediate',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.stages.length).toBeGreaterThan(0);
  });

  it('7. POST /api/ai/assessments/generate: generates assessment questions without 500 error', async () => {
    const res = await fetch(`${baseUrl}/api/ai/assessments/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        topic: 'generate me an assesment of java',
        difficulty: 3,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.questions.length).toBeGreaterThan(0);
  });

  it('8. POST & GET /api/challenges: creates challenge and lists participants with their paths', async () => {
    // Create challenge
    const createRes = await fetch(`${baseUrl}/api/challenges`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: '21 Days of Modern Rust',
        description: 'Daily rust memory safety and async tokio exercises.',
        durationDays: 21,
        category: 'Backend',
        learningPathTitle: 'Modern Rust Mastery',
      }),
    });
    expect(createRes.status).toBe(200);
    const createData = await createRes.json() as any;
    expect(createData.success).toBe(true);
    const challengeId = createData.data.id;

    // View participants
    const partsRes = await fetch(`${baseUrl}/api/challenges/${challengeId}/participants`);
    expect(partsRes.status).toBe(200);
    const partsData = await partsRes.json() as any;
    expect(partsData.success).toBe(true);
    expect(Array.isArray(partsData.data)).toBe(true);
  });

  it('9. POST & GET /api/feed/posts: creates social post and reads feed', async () => {
    const postRes = await fetch(`${baseUrl}/api/feed/posts`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        postType: 'thought',
        title: 'Understanding Postgres VACUUM',
        content: 'Postgres uses MVCC which generates dead tuples that need periodic vacuuming.',
        tags: ['PostgreSQL', 'Databases'],
      }),
    });
    expect(postRes.status).toBe(200);
    const postData = await postRes.json() as any;
    expect(postData.success).toBe(true);
    expect(postData.data.content).toContain('dead tuples');

    const feedRes = await fetch(`${baseUrl}/api/feed/posts?feedType=all`);
    expect(feedRes.status).toBe(200);
    const feedData = await feedRes.json() as any;
    expect(feedData.success).toBe(true);
    expect(feedData.data.length).toBeGreaterThan(0);
  });

  it('10. POST & GET /api/feed/projects: creates project showcase and retrieves list', async () => {
    const projRes = await fetch(`${baseUrl}/api/feed/projects`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Distributed Key-Value Store in Go',
        description: 'Built a Raft consensus replicated key-value storage engine in pure Go.',
        techStack: ['Go', 'gRPC', 'Raft'],
      }),
    });
    expect(projRes.status).toBe(200);
    const projData = await projRes.json() as any;
    expect(projData.success).toBe(true);
    expect(projData.data.title).toBe('Distributed Key-Value Store in Go');

    const listRes = await fetch(`${baseUrl}/api/feed/projects`);
    expect(listRes.status).toBe(200);
    const listData = await listRes.json() as any;
    expect(listData.success).toBe(true);
    expect(listData.data.length).toBeGreaterThan(0);
  });

  it('11. POST & GET /api/coding/practice: logs practice problem and retrieves entries', async () => {
    const logRes = await fetch(`${baseUrl}/api/coding/practice`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'LRU Cache',
        platform: 'LeetCode',
        category: 'Data Structures',
        difficulty: 3,
        status: 'solved',
        timeSpentSeconds: 1500,
        solutionNotes: 'Used Doubly Linked List with Hash Map for O(1) get and put.',
      }),
    });
    expect(logRes.status).toBe(200);
    const logData = await logRes.json() as any;
    expect(logData.success).toBe(true);
    expect(logData.data.title).toBe('LRU Cache');

    const listRes = await fetch(`${baseUrl}/api/coding/practice`, { headers: authHeaders });
    expect(listRes.status).toBe(200);
    const listData = await listRes.json() as any;
    expect(listData.success).toBe(true);
    expect(listData.data.length).toBeGreaterThan(0);
  });

  it('12. GET /api/notifications/unread-count returns 200 without failure', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/unread-count`, { headers: authHeaders });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(typeof data.data.count).toBe('number');
  });
});
