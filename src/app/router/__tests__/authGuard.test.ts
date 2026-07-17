import { describe, it, expect } from 'vitest';
import { decideAuthRedirect, isPublicPath } from '../authGuard';

describe('isPublicPath', () => {
  it('auth flow + marketing/legal/error surfaces are public', () => {
    for (const p of ['/auth/login', '/auth/reset', '/pricing', '/legal/terms', '/help', '/status', '/_errors/404', '/integrations/github']) {
      expect(isPublicPath(p)).toBe(true);
    }
  });
  it('app + account + admin surfaces are NOT public', () => {
    for (const p of ['/intelligence', '/me/profile', '/org/acme/members', '/onboarding', '/_admin', '/developers/api']) {
      expect(isPublicPath(p)).toBe(false);
    }
  });
});

describe('decideAuthRedirect', () => {
  it('mock mode never redirects (free browsing)', () => {
    expect(decideAuthRedirect({ authed: false, pathname: '/intelligence', useRealAuth: false })).toBeNull();
    expect(decideAuthRedirect({ authed: true, pathname: '/auth/login', useRealAuth: false })).toBeNull();
  });

  it('unauthenticated on a protected route → login, remembering the target', () => {
    const r = decideAuthRedirect({ authed: false, pathname: '/intelligence', useRealAuth: true });
    expect(r).toEqual({ to: '/auth/login', search: { redirect: '/intelligence' } });
  });

  it('unauthenticated on a public route → allowed (no redirect)', () => {
    expect(decideAuthRedirect({ authed: false, pathname: '/auth/login', useRealAuth: true })).toBeNull();
    expect(decideAuthRedirect({ authed: false, pathname: '/pricing', useRealAuth: true })).toBeNull();
  });

  it('authenticated on an auth page → bounce to the app', () => {
    expect(decideAuthRedirect({ authed: true, pathname: '/auth/login', useRealAuth: true })).toEqual({ to: '/intelligence' });
  });

  it('authenticated on session-expired stays (intentional re-auth)', () => {
    expect(decideAuthRedirect({ authed: true, pathname: '/auth/session-expired', useRealAuth: true })).toBeNull();
  });

  it('authenticated on a protected route → allowed', () => {
    expect(decideAuthRedirect({ authed: true, pathname: '/intelligence', useRealAuth: true })).toBeNull();
  });
});
