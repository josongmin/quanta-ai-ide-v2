import { describe, it, expect } from 'vitest';
import { safeNavigate } from '../safeNavigate';

// jsdom defaults window.location.origin to http://localhost:3000; the resolved
// hrefs below assume that origin for relative/protocol-relative inputs.

describe('safeNavigate', () => {
  it('passes absolute http(s) URLs through (resolved to href)', () => {
    expect(safeNavigate('https://x.com/a')).toBe('https://x.com/a');
    expect(safeNavigate('http://x.com/')).toBe('http://x.com/');
  });

  it('rejects protocol-relative //host (the open-redirect safeHref would allow)', () => {
    // safeHref('//evil.com') returns it verbatim — unsafe for window.location.
    // safeNavigate resolves it to https://evil.com and, with no allowlist,
    // returns that absolute href — so the DANGER is caught by the allowlist:
    expect(safeNavigate('//evil.com', ['*.stripe.com'])).toBeUndefined();
    expect(safeNavigate('//evil.com', ['accounts.example.com'])).toBeUndefined();
  });

  it('drops javascript:/data:/mailto: and other non-http schemes', () => {
    expect(safeNavigate('javascript:alert(1)')).toBeUndefined();
    expect(safeNavigate('  JavaScript:alert(1)')).toBeUndefined();
    expect(safeNavigate('data:text/html,<script>')).toBeUndefined();
    expect(safeNavigate('mailto:a@b.com')).toBeUndefined();
  });

  it('returns undefined for empty/nullish', () => {
    expect(safeNavigate('')).toBeUndefined();
    expect(safeNavigate('   ')).toBeUndefined();
    expect(safeNavigate(null)).toBeUndefined();
    expect(safeNavigate(undefined)).toBeUndefined();
  });

  it('enforces an exact-host allowlist', () => {
    expect(safeNavigate('https://accounts.example.com/authorize?x=1', ['accounts.example.com']))
      .toBe('https://accounts.example.com/authorize?x=1');
    expect(safeNavigate('https://evil.com/authorize', ['accounts.example.com'])).toBeUndefined();
  });

  it('supports a wildcard allowlist (*.stripe.com incl. apex)', () => {
    expect(safeNavigate('https://checkout.stripe.com/pay/abc', ['*.stripe.com']))
      .toBe('https://checkout.stripe.com/pay/abc');
    expect(safeNavigate('https://stripe.com/x', ['*.stripe.com'])).toBe('https://stripe.com/x');
    // Suffix-spoofing must not slip through.
    expect(safeNavigate('https://evilstripe.com/x', ['*.stripe.com'])).toBeUndefined();
    expect(safeNavigate('https://stripe.com.evil.com/x', ['*.stripe.com'])).toBeUndefined();
  });
});
