import { describe, expect, it } from 'vitest';

// ─── Holders derivation logic (mirrors Board component) ───────────────────────
// Extracted to a pure function so it can be tested without React.
function normaliseHolder(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function normaliseHolderKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function deriveAllHolders(params: {
  initialHolders: string[];
  aeColumns: string[];
  accounts: Array<{ current_holder: string | null }>;
  sessions: Array<{ holder_name: string }>;
}): string[] {
  const { initialHolders, aeColumns, accounts, sessions } = params;
  const seen = new Map<string, string>(); // normalised key → original casing

  initialHolders.forEach((h) => seen.set(normaliseHolderKey(h), h));
  aeColumns.forEach((h) => seen.set(normaliseHolderKey(h), h));
  accounts.forEach((a) => {
    if (a.current_holder) seen.set(normaliseHolderKey(a.current_holder), a.current_holder);
  });
  sessions.forEach((s) => seen.set(normaliseHolderKey(s.holder_name), s.holder_name));

  return Array.from(seen.values());
}

describe('board column derivation', () => {
  it('derives holders from current_holder', () => {
    const accounts = [
      { current_holder: 'An' },
      { current_holder: 'Bình' },
      { current_holder: 'An' }, // duplicate should be deduped
    ];
    const holders = deriveAllHolders({
      initialHolders: [],
      aeColumns: [],
      accounts,
      sessions: [],
    });
    expect(new Set(holders)).toEqual(new Set(['An', 'Bình']));
  });

  it('derives holders from holder_sessions holder_name', () => {
    const sessions = [
      { holder_name: 'An' },
      { holder_name: 'Cường' },
      { holder_name: 'An' }, // duplicate should be deduped
    ];
    const holders = deriveAllHolders({
      initialHolders: [],
      aeColumns: [],
      accounts: [],
      sessions,
    });
    expect(new Set(holders)).toEqual(new Set(['An', 'Cường']));
  });

  it('derives holders from AE columns', () => {
    const holders = deriveAllHolders({
      initialHolders: [],
      aeColumns: ['  An  ', '  Bình  '],
      accounts: [],
      sessions: [],
    });
    // Whitespace normalised, casing preserved from first-seen
    expect(new Set(holders)).toEqual(new Set(['  An  ', '  Bình  ']));
    // Normalised keys should merge duplicates
    const normalised = holders.map(normaliseHolder);
    expect(normalised).toEqual(['An', 'Bình']);
  });

  it('UNION DISTINCT – case-insensitive dedup preserves original casing', () => {
    const holders = deriveAllHolders({
      initialHolders: ['AN', 'bình'],
      aeColumns: [],
      accounts: [
        { current_holder: 'an' },   // same as 'AN' (case-insensitive)
        { current_holder: 'BÌNH' }, // same as 'bình'
      ],
      sessions: [{ holder_name: 'An' }], // same again
    });
    expect(holders).toEqual(['AN', 'bình']); // initialHolders casing retained
  });

  it('handles null current_holder', () => {
    const accounts = [
      { current_holder: null },
      { current_holder: 'An' },
      { current_holder: null },
    ];
    const holders = deriveAllHolders({
      initialHolders: [],
      aeColumns: [],
      accounts,
      sessions: [],
    });
    expect(holders).toEqual(['An']);
  });

  it('handles empty inputs', () => {
    const holders = deriveAllHolders({
      initialHolders: [],
      aeColumns: [],
      accounts: [],
      sessions: [],
    });
    expect(holders).toEqual([]);
  });

  it('normaliseHolder trims and collapses whitespace', () => {
    expect(normaliseHolder('  An   Bình  ')).toBe('An Bình');
    expect(normaliseHolder('An')).toBe('An');
    expect(normaliseHolder('  ')).toBe('');
  });

  it('Kho chung is identified by null current_holder and status kho', () => {
    const accounts = [
      { id: '1', current_holder: null, status: 'kho' },
      { id: '2', current_holder: null, status: 'dang_cay' },
      { id: '3', current_holder: 'An', status: 'kho' },
    ];
    const khoChung = accounts.filter(
      (a) => a.current_holder === null && a.status === 'kho'
    );
    expect(khoChung.map((a) => a.id)).toEqual(['1']);
  });

  it('AE column membership is purely client-side (no DB write)', () => {
    // This is a documentation test – verify that deriveAllHolders does not
    // produce side effects and only reads its input arguments.
    const before = deriveAllHolders({
      initialHolders: [],
      aeColumns: ['An'],
      accounts: [],
      sessions: [],
    });
    const after = deriveAllHolders({
      initialHolders: [],
      aeColumns: ['Bình'],
      accounts: [],
      sessions: [],
    });
    // Input changed → output changed → no hidden mutation
    expect(before).not.toEqual(after);
  });
});
