import { describe, it, expect } from 'vitest';
import { privacyFilter } from '../privacyFilter.js';

describe('privacyFilter', () => {
  it('sanitizes API keys and bearer tokens', () => {
    const input = 'My key is sk-1234567890abcdef1234567890abcdef and secret AIzaSyD-1234567890abcdef1234567890abc';
    const sanitized = privacyFilter.sanitizeText(input);

    expect(sanitized).not.toContain('sk-1234567890abcdef1234567890abcdef');
    expect(sanitized).not.toContain('AIzaSyD-1234567890abcdef1234567890abc');
    expect(sanitized).toContain('[REDACTED_KEY]');
  });

  it('sanitizes user email addresses and phone numbers', () => {
    const input = 'Contact me at student.dev@example.com or call +1-555-123-4567';
    const sanitized = privacyFilter.sanitizeText(input);

    expect(sanitized).not.toContain('student.dev@example.com');
    expect(sanitized).toContain('[REDACTED_EMAIL]');
    expect(sanitized).toContain('[REDACTED_PHONE]');
  });

  it('preserves clean code blocks and normal technical terms', () => {
    const cleanCode = 'function calculateTotal(items) { return items.reduce((a, b) => a + b, 0); }';
    const sanitized = privacyFilter.sanitizeText(cleanCode);

    expect(sanitized).toBe(cleanCode);
  });
});
