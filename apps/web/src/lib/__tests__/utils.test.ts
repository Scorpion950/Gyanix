import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDuration,
  formatTimestamp,
  truncate,
  getInitials,
  isYouTubeUrl,
  extractYouTubeVideoId,
  extractYouTubePlaylistId,
  safeJsonParse,
} from '../utils.js';

describe('Web Utility Functions', () => {
  describe('cn (Tailwind class merger)', () => {
    it('merges multiple classes and resolves collisions', () => {
      expect(cn('p-2', 'p-4', 'text-red-500')).toBe('p-4 text-red-500');
    });

    it('handles conditional classes properly', () => {
      const isHidden = false;
      const isVisible = true;
      expect(cn('base', isHidden && 'hidden', isVisible && 'block')).toBe('base block');
    });
  });

  describe('formatDuration and formatTimestamp', () => {
    it('formats seconds into MM:SS format when under 1 hour', () => {
      expect(formatDuration(75)).toBe('1:15');
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(599)).toBe('9:59');
    });

    it('formats seconds into HH:MM:SS format when 1 hour or more', () => {
      expect(formatDuration(3665)).toBe('1:01:05');
      expect(formatDuration(7200)).toBe('2:00:00');
    });

    it('formatTimestamp handles decimals by flooring to seconds', () => {
      expect(formatTimestamp(125.7)).toBe('2:05');
    });
  });

  describe('truncate', () => {
    it('returns original string if within max length', () => {
      expect(truncate('Hello World', 20)).toBe('Hello World');
    });

    it('truncates with ellipsis when length exceeds limit', () => {
      expect(truncate('Hello World from Gyanix platform', 10)).toBe('Hello W…');
    });
  });

  describe('getInitials', () => {
    it('extracts two uppercase initials from a full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Alice B. Smith')).toBe('AB');
    });

    it('handles single word names', () => {
      expect(getInitials('Gyanix')).toBe('G');
    });
  });

  describe('YouTube URL Parsers', () => {
    it('identifies valid YouTube URLs', () => {
      expect(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
      expect(isYouTubeUrl('https://vimeo.com/12345')).toBe(false);
    });

    it('extracts YouTube video IDs correctly', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('https://example.com')).toBeNull();
    });

    it('extracts playlist ID from URL', () => {
      expect(
        extractYouTubePlaylistId('https://www.youtube.com/watch?v=xyz&list=PL1234567890'),
      ).toBe('PL1234567890');
      expect(extractYouTubePlaylistId('https://www.youtube.com/watch?v=xyz')).toBeNull();
    });
  });

  describe('safeJsonParse', () => {
    it('parses valid JSON string', () => {
      expect(safeJsonParse('{"a": 1}', {})).toEqual({ a: 1 });
    });

    it('returns fallback on invalid JSON', () => {
      expect(safeJsonParse('{invalid}', { default: true })).toEqual({ default: true });
    });
  });
});
