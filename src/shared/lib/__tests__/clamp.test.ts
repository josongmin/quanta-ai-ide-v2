import { describe, it, expect } from 'vitest';
import { clamp, clamp01 } from '../clamp';

// Locks the numeric-clamp SSOT that the audit re-adopted across panelLayout,
// ChatAgent, FocusScanStack, SimilarDrawer, workspace-tabs, EffectSizeBar and
// passwordRules (replacing hand-rolled Math.max/Math.min nests).
describe('clamp', () => {
  it('returns the value inside the range untouched', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('pins to the bounds outside the range', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
    expect(clamp(10, 0, 10)).toBe(10); // inclusive
    expect(clamp(0, 0, 10)).toBe(0); // inclusive
  });
  it('handles negative ranges', () => {
    expect(clamp(-5, -2, 2)).toBe(-2);
    expect(clamp(5, -2, 2)).toBe(2);
  });
});

describe('clamp01', () => {
  it('pins into [0, 1]', () => {
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(1.7)).toBe(1);
  });
});
