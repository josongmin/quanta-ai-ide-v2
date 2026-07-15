import { describe, it, expect } from 'vitest';
import { safeHref } from '../safeHref';

describe('safeHref', () => {
  it('passes http(s) and protocol-relative URLs through', () => {
    expect(safeHref('https://x.com/a')).toBe('https://x.com/a');
    expect(safeHref('http://x.com')).toBe('http://x.com');
    expect(safeHref('//cdn.x.com/a')).toBe('//cdn.x.com/a');
  });

  it('drops javascript:/data: and other non-http schemes (XSS guard)', () => {
    expect(safeHref('javascript:alert(document.cookie)')).toBeUndefined();
    expect(safeHref('  JavaScript:alert(1)')).toBeUndefined(); // trimmed + case-insensitive
    expect(safeHref('data:text/html,<script>')).toBeUndefined();
    expect(safeHref('vbscript:msgbox(1)')).toBeUndefined();
  });

  it('returns undefined for empty/nullish', () => {
    expect(safeHref('')).toBeUndefined();
    expect(safeHref(null)).toBeUndefined();
    expect(safeHref(undefined)).toBeUndefined();
  });
});
