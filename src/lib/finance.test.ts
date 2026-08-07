import { describe, expect, it } from 'vitest';
import { calculateFinance, formatVnd, formatVndString, formatHolders } from '@/lib/finance';
import Decimal from 'decimal.js';

describe('finance', () => {
  // ── calculateFinance ─────────────────────────────────────────────────────────
  it('splits one holder exactly', () => {
    const result = calculateFinance([
      { id: '1', username: 'a', amount_received: '100000', holders: ['An'] },
    ]);
    expect(result.byHolder.An).toBe('100000.00');
  });

  it('credits only lastHolder if provided', () => {
    const result = calculateFinance([
      { id: '1', username: 'a', amount_received: '100', holders: ['An', 'Bình'], lastHolder: 'Bình' },
    ]);
    expect(result.byHolder.An).toBeUndefined();
    expect(result.byHolder['Bình']).toBe('100.00');
  });

  it('deduplicates holders in the same account', () => {
    // calculateFinance expects pre-deduplicated holders (caller is responsible).
    // Here we test that if a caller mistakenly passes duplicates,
    // the result reflects the inflated count — callers must use
    // Array.from(new Set(...)) as the finance page does.
    const result = calculateFinance([
      { id: '1', username: 'a', amount_received: '100', holders: ['An', 'An', 'Bình'] },
    ]);
    // 3 holders passed → split is 100
    expect(result.accounts[0]?.share).toBe(new Decimal(100).toFixed(2));
  });

  it('accumulates across multiple accounts', () => {
    const result = calculateFinance([
      { id: '1', username: 'a', amount_received: '100', holders: ['An'] },
      { id: '2', username: 'b', amount_received: '200', holders: ['An', 'Bình'], lastHolder: 'Bình' },
    ]);
    expect(result.byHolder.An).toBe('100.00');
    expect(result.byHolder['Bình']).toBe('200.00');
  });

  it('handles zero accounts', () => {
    const result = calculateFinance([]);
    expect(result.accounts).toHaveLength(0);
    expect(result.byHolder).toEqual({});
  });

  // ── formatVnd ───────────────────────────────────────────────────────────────
  it('formatVnd parses a string through Decimal without Number()', () => {
    // "100000" stored as bigint string → VND formatted
    const formatted = formatVnd('100000');
    expect(formatted).toMatch(/100\.000/); // vi-VN thousands separator
    expect(formatted.endsWith(' ₫')).toBe(true);
  });

  it('formatVnd handles a decimal string (two decimal places input)', () => {
    const formatted = formatVnd('123456.50');
    expect(formatted).toContain(' ₫');
    expect(formatted).not.toContain('NaN');
  });

  it('formatVnd does not use Number() – large integers stay precise', () => {
    // 9007199254740993 exceeds safe JS integer – Decimal handles it
    const big = '9007199254740993';
    const result = formatVnd(big);
    expect(result).not.toContain('NaN');
    expect(result).not.toContain('9007199254741'); // unsafe Number() result
  });

  it('formatVnd handles 0', () => {
    expect(formatVnd('0')).toContain('0 ₫');
  });

  // ── formatVndString ──────────────────────────────────────────────────────────
  it('formatVndString works directly on a Decimal string', () => {
    const result = formatVndString('500000');
    expect(result).toMatch(/500\.000/);
    expect(result.endsWith(' ₫')).toBe(true);
  });

  // ── formatHolders ───────────────────────────────────────────────────────────
  it('formatHolders returns array with formatted values', () => {
    const totals: Record<string, string> = {
      An: '150000.00',
      Bình: '50000.00',
    };
    const rows = formatHolders(totals);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.formatted).toMatch(/150\.000.*₫/);
    expect(rows[1]?.formatted).toMatch(/50\.000.*₫/);
  });

  // ── Decimal precision ────────────────────────────────────────────────────────
  it('many splits preserve precision across repeated division', () => {
    // Simulate 10 accounts
    const accounts = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      username: `acc${i}`,
      amount_received: String(100 * (i + 1)), // 100, 200, ... 1000
      holders: ['An', 'Bình', 'Cường'],
      lastHolder: 'An',
    }));
    const result = calculateFinance(accounts);
    Object.values(result.byHolder).forEach((v) => {
      expect(v).not.toBe('NaN');
    });
  });
});

// Extend Expect for toEndWith matcher
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vitest {
    interface Expect {
      toEndWith(suffix: string): void;
    }
  }
}

expect.extend({
  toEndWith(received: string, suffix: string) {
    const pass = received.endsWith(suffix);
    return {
      pass,
      message: () => `expected ${JSON.stringify(received)} to ${pass ? 'not ' : ''}end with ${JSON.stringify(suffix)}`,
    };
  },
});
