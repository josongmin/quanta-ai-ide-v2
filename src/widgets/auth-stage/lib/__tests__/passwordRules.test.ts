import { describe, it, expect } from 'vitest';
import {
  evaluatePassword,
  meetsClientPolicy,
  isCommonPassword,
} from '../passwordRules';

describe('meetsClientPolicy (client-side advisory minimum bar)', () => {
  it('rejects a weak-but-long single-class password (length alone is not enough)', () => {
    // 16 lowercase letters — previously passed at "score 3 / Good". Must fail now.
    const weakLong = 'aaaaaaaaaaaaaaaa';
    expect(weakLong.length).toBeGreaterThanOrEqual(16);
    expect(meetsClientPolicy(weakLong)).toBe(false);
  });

  it('rejects another long single-class password (all digits)', () => {
    expect(meetsClientPolicy('1234512345123451')).toBe(false);
  });

  it('rejects every built-in common password', () => {
    // Every built-in common password must be rejected by meetsClientPolicy.
    for (const common of ['password', 'password123', 'welcome123', 'admin1234', 'monkey1234']) {
      expect(isCommonPassword(common)).toBe(true);
      expect(meetsClientPolicy(common)).toBe(false);
    }
  });

  it('rejects a common password by membership even when its length clears the bar', () => {
    // Guard against a regression where a >= MIN_LENGTH common entry is added to
    // the list but slips through because only length is checked. We simulate
    // that by verifying the common check fires ahead of/independent of length:
    // a padded common string ('welcome123!!', 12 chars, 3 classes) passes only
    // because it is NOT itself on the list, while the bare form is rejected.
    expect(meetsClientPolicy('welcome123')).toBe(false);       // common
    expect(isCommonPassword('welcome123')).toBe(true);
    // Sanity: the check is exact-membership, so a distinct 12-char variant passes.
    expect(meetsClientPolicy('welcome123!!')).toBe(true);
  });

  it('rejects anything shorter than the minimum length', () => {
    expect(meetsClientPolicy('Ab1!xyz')).toBe(false); // strong classes but too short
  });

  it('rejects a password that embeds the user name', () => {
    expect(meetsClientPolicy('SoraKim-Passw0rd', 'Sora Kim')).toBe(false);
  });

  it('passes a genuinely strong password', () => {
    expect(meetsClientPolicy('Tr0ub4dour&3xtra')).toBe(true);
  });

  it('passes a strong two-class passphrase-style password over the length bar', () => {
    expect(meetsClientPolicy('correctHorseBatteryStaple')).toBe(true); // lower+upper, long
  });
});

describe('isCommonPassword (local heuristic, NOT a breach lookup)', () => {
  it('flags built-in common passwords case-insensitively', () => {
    expect(isCommonPassword('password')).toBe(true);
    expect(isCommonPassword('PASSWORD123')).toBe(true);
    expect(isCommonPassword('welcome123')).toBe(true);
  });

  it('does not flag an uncommon password', () => {
    expect(isCommonPassword('Tr0ub4dour&3xtra')).toBe(false);
  });
});

describe('evaluatePassword — score never inflates on length alone', () => {
  it('does not rate a long single-class password as Good/Strong', () => {
    const r = evaluatePassword('aaaaaaaaaaaaaaaa');
    expect(r.score).toBeLessThanOrEqual(1); // capped to Weak by class diversity
    expect(r.meetsPolicy).toBe(false);
  });

  it('marks common passwords with commonlyUsed and low score', () => {
    const r = evaluatePassword('password123');
    expect(r.commonlyUsed).toBe(true);
    expect(r.score).toBe(1);
    expect(r.meetsPolicy).toBe(false);
  });

  it('reports meetsPolicy=true for a genuinely strong password', () => {
    const r = evaluatePassword('Tr0ub4dour&3xtra');
    expect(r.meetsPolicy).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(3);
    expect(r.commonlyUsed).toBe(false);
  });

  it('treats the empty password as Empty and failing policy', () => {
    const r = evaluatePassword('');
    expect(r.label).toBe('Empty');
    expect(r.meetsPolicy).toBe(false);
  });
});
