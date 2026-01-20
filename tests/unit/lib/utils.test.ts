import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cn, formatRelativeTime, truncate, copyToClipboard } from '../../../src/lib/utils';

describe('utils', () => {
  describe('cn - class name merger', () => {
    it('merges class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
      expect(cn('base', true && 'included', false && 'excluded')).toBe('base included');
    });

    it('merges tailwind classes and resolves conflicts', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('handles arrays of classes', () => {
      expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
    });

    it('handles objects of classes', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('handles empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
      expect(cn(null, undefined)).toBe('');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('formats seconds ago', () => {
      const now = new Date('2024-01-01T12:00:30Z');
      vi.setSystemTime(now);

      const thirtySecondsAgo = new Date('2024-01-01T12:00:00Z');
      const result = formatRelativeTime(thirtySecondsAgo, 'en');

      expect(result).toMatch(/30.*second/i);
    });

    it('formats minutes ago', () => {
      const now = new Date('2024-01-01T12:05:00Z');
      vi.setSystemTime(now);

      const fiveMinutesAgo = new Date('2024-01-01T12:00:00Z');
      const result = formatRelativeTime(fiveMinutesAgo, 'en');

      expect(result).toMatch(/5.*minute/i);
    });

    it('formats hours ago', () => {
      const now = new Date('2024-01-01T15:00:00Z');
      vi.setSystemTime(now);

      const threeHoursAgo = new Date('2024-01-01T12:00:00Z');
      const result = formatRelativeTime(threeHoursAgo, 'en');

      expect(result).toMatch(/3.*hour/i);
    });

    it('formats days ago', () => {
      const now = new Date('2024-01-03T12:00:00Z');
      vi.setSystemTime(now);

      const twoDaysAgo = new Date('2024-01-01T12:00:00Z');
      const result = formatRelativeTime(twoDaysAgo, 'en');

      expect(result).toMatch(/2.*day/i);
    });

    it('uses Polish locale', () => {
      const now = new Date('2024-01-01T12:01:00Z');
      vi.setSystemTime(now);

      const oneMinuteAgo = new Date('2024-01-01T12:00:00Z');
      const result = formatRelativeTime(oneMinuteAgo, 'pl');

      // Polish uses "minutę" or similar
      expect(result).toBeTruthy();
    });

    it('defaults to Polish locale', () => {
      const now = new Date('2024-01-01T12:01:00Z');
      vi.setSystemTime(now);

      const oneMinuteAgo = new Date('2024-01-01T12:00:00Z');
      const result = formatRelativeTime(oneMinuteAgo);

      expect(result).toBeTruthy();
    });
  });

  describe('truncate', () => {
    it('returns text unchanged if shorter than maxLength', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('returns text unchanged if equal to maxLength', () => {
      expect(truncate('hello', 5)).toBe('hello');
    });

    it('truncates text with ellipsis', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
    });

    it('handles maxLength less than 4', () => {
      expect(truncate('hello', 3)).toBe('...');
    });

    it('handles empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('handles unicode characters', () => {
      expect(truncate('cześć świat', 8)).toBe('cześć...');
    });
  });

  describe('copyToClipboard', () => {
    it('copies text to clipboard successfully', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator.clipboard, { writeText: writeTextMock });

      const result = await copyToClipboard('test text');

      expect(writeTextMock).toHaveBeenCalledWith('test text');
      expect(result).toBe(true);
    });

    it('returns false on clipboard error', async () => {
      const writeTextMock = vi.fn().mockRejectedValue(new Error('Clipboard error'));
      Object.assign(navigator.clipboard, { writeText: writeTextMock });

      const result = await copyToClipboard('test text');

      expect(result).toBe(false);
    });

    it('handles empty string', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator.clipboard, { writeText: writeTextMock });

      const result = await copyToClipboard('');

      expect(writeTextMock).toHaveBeenCalledWith('');
      expect(result).toBe(true);
    });
  });
});
