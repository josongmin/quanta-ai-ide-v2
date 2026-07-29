import { describe, it, expect } from 'vitest';
import { pruneTtlRecord } from '../ttlMapStore';

type Entry = { at: string; v: number };
const isValid = (e: unknown): e is Entry =>
  typeof e === 'object' && e !== null && typeof (e as Entry).at === 'string';
const tsOf = (e: Entry) => e.at;

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 864e5).toISOString();
}

describe('pruneTtlRecord', () => {
  it('keeps fresh entries and drops expired ones', () => {
    const out = pruneTtlRecord<Entry>(
      { fresh: { at: iso(1), v: 1 }, old: { at: iso(90), v: 2 } },
      30, tsOf, isValid,
    );
    expect(Object.keys(out)).toEqual(['fresh']);
  });

  it('drops entries with a malformed timestamp instead of leaking them forever', () => {
    // Regression: `new Date("not-a-date").getTime()` is NaN, and `NaN < cutoff`
    // is false — the old code kept such entries permanently.
    const out = pruneTtlRecord<Entry>(
      { good: { at: iso(1), v: 1 }, bad: { at: 'not-a-date', v: 2 } },
      30, tsOf, isValid,
    );
    expect(Object.keys(out)).toEqual(['good']);
  });

  it('skips structurally-invalid entries', () => {
    const out = pruneTtlRecord<Entry>(
      { good: { at: iso(1), v: 1 }, junk: { nope: true } },
      30, tsOf, isValid,
    );
    expect(Object.keys(out)).toEqual(['good']);
  });

  it('handles null/undefined raw', () => {
    expect(pruneTtlRecord<Entry>(null, 30, tsOf, isValid)).toEqual({});
    expect(pruneTtlRecord<Entry>(undefined, 30, tsOf, isValid)).toEqual({});
  });
});
