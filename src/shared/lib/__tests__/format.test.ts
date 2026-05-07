import { describe, it, expect } from 'vitest';
import { pct, round1, languageHue } from '../format';

describe('pct', () => {
  it('returns 0 for 0/0 (no NaN, no division by zero)', () => {
    expect(pct(0, 0)).toBe(0);
  });

  it('returns 0 when total is 0 even if n is non-zero', () => {
    expect(pct(5, 0)).toBe(0);
  });

  it('computes 25% for 1/4', () => {
    expect(pct(1, 4)).toBe(25);
  });

  it('rounds to nearest integer', () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(2, 3)).toBe(67);
  });

  it('handles 100%', () => {
    expect(pct(7, 7)).toBe(100);
  });
});

describe('round1', () => {
  it('rounds 1.234 to 1.2', () => {
    expect(round1(1.234)).toBe(1.2);
  });

  it('rounds 1.25 to 1.3 (Math.round half-up for positives)', () => {
    expect(round1(1.25)).toBe(1.3);
  });

  it('rounds 0 to 0', () => {
    expect(round1(0)).toBe(0);
  });

  it('handles negatives', () => {
    expect(round1(-1.55)).toBeCloseTo(-1.5, 5);
  });
});

describe('languageHue', () => {
  it('returns a light shade in dark mode for ts', () => {
    const hue = languageHue('ts', true);
    expect(hue).toContain('255,255,255');
  });

  it('returns a dark shade in light mode for ts', () => {
    const hue = languageHue('ts', false);
    expect(hue).toContain('0,0,0');
  });

  it('returns a fallback for unknown languages', () => {
    const hueDark = languageHue('rust', true);
    const hueLight = languageHue('rust', false);
    expect(hueDark).toContain('255,255,255');
    expect(hueLight).toContain('0,0,0');
  });

  it('ts is a stronger shade than tsx in dark mode', () => {
    // alpha: ts = 0.85, tsx = 0.65 — ts string contains '0.85'
    expect(languageHue('ts', true)).toContain('0.85');
    expect(languageHue('tsx', true)).toContain('0.65');
  });
});
