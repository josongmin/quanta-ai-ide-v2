import { describe, it, expect } from 'vitest';
import { SurfaceLifecycle, isMounted, isVisible } from '../lifecycle';

describe('SurfaceLifecycle', () => {
  it('follows register -> activate -> mount -> hide -> show -> dispose', () => {
    const lc = new SurfaceLifecycle();
    expect(lc.current).toBe('registered');
    expect(lc.transition('activate').ok).toBe(true);
    expect(lc.transition('mount').ok).toBe(true);
    expect(lc.current).toBe('mounted');
    expect(lc.transition('hide').ok).toBe(true);
    expect(isMounted('hidden')).toBe(true); // hidden stays mounted (kept-alive)
    expect(isVisible('hidden')).toBe(false);
    expect(lc.transition('show').ok).toBe(true);
    expect(lc.current).toBe('mounted');
    expect(lc.transition('dispose').ok).toBe(true);
    expect(lc.current).toBe('disposed');
  });

  it('rejects an invalid transition order with a typed error', () => {
    const lc = new SurfaceLifecycle();
    const r = lc.transition('mount'); // cannot mount before activate
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.reason).toBe('invalid-transition');
    expect(lc.current).toBe('registered'); // state unchanged
  });

  it('rejects any transition out of disposed', () => {
    const lc = new SurfaceLifecycle();
    lc.transition('dispose');
    for (const event of ['activate', 'mount', 'hide', 'show', 'dispose'] as const) {
      expect(lc.transition(event).ok).toBe(false);
    }
  });

  it('disposes from any live state', () => {
    for (const setup of [[], ['activate'], ['activate', 'mount'], ['activate', 'mount', 'hide']] as const) {
      const lc = new SurfaceLifecycle();
      for (const e of setup) lc.transition(e);
      expect(lc.transition('dispose').ok).toBe(true);
      expect(lc.current).toBe('disposed');
    }
  });
});
