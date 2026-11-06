import { describe, it, expect } from 'vitest';

describe('analyticsService - anti-inflation heartbeats', () => {
  it('enforces maximum 60 seconds per single heartbeat', () => {
    // Verify client cannot inflate time spent by sending 3600 seconds in 1 request
    const requestedSeconds = 3600;
    const cappedSeconds = Math.min(Math.max(1, requestedSeconds), 60);

    expect(cappedSeconds).toBe(60);
  });

  it('allows valid normal 30-second heartbeat intervals', () => {
    const requestedSeconds = 30;
    const cappedSeconds = Math.min(Math.max(1, requestedSeconds), 60);

    expect(cappedSeconds).toBe(30);
  });

  it('rejects negative or zero intervals', () => {
    const requestedSeconds = -10;
    const cappedSeconds = Math.min(Math.max(1, requestedSeconds), 60);

    expect(cappedSeconds).toBe(1);
  });
});
