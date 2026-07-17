import { beforeEach, describe, it, expect, vi, type Mock } from 'vitest';
import type * as SharedAuth from '@shared/auth';

// Mock the better-auth client so the action wrappers are tested in isolation.
// This locks the exact 1.6 method names + arg shapes and the {data}/{error}
// → {ok} normalization, with no network. The pure result helpers
// (normalizeResult/normalizeError) stay real via importOriginal — only the
// network-touching authClient is stubbed.
vi.mock('@shared/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof SharedAuth>()),
  authClient: {
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
  },
}));

import { authClient } from '@shared/auth';
import {
  signInWithPassword, signUpWithPassword, signOut,
  requestPasswordReset, resetPassword, verifyEmail,
} from '../model/actions';

// Concrete mock shape (no `any`) — the mocked module returns vi.fn()s.
const m = authClient as unknown as {
  signIn: { email: Mock };
  signUp: { email: Mock };
  signOut: Mock;
  requestPasswordReset: Mock;
  resetPassword: Mock;
  verifyEmail: Mock;
};

beforeEach(() => { vi.clearAllMocks(); });

describe('session actions — happy path normalization', () => {
  it('signInWithPassword calls signIn.email and returns ok (no 2FA)', async () => {
    m.signIn.email.mockResolvedValue({ data: {}, error: null });
    const r = await signInWithPassword({ email: 'a@b.com', password: 'pw' });
    expect(m.signIn.email).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });
    expect(r).toEqual({ ok: true, twoFactorRedirect: false });
  });

  it('signInWithPassword surfaces twoFactorRedirect when 2FA is required', async () => {
    m.signIn.email.mockResolvedValue({ data: { twoFactorRedirect: true }, error: null });
    const r = await signInWithPassword({ email: 'a@b.com', password: 'pw' });
    expect(r).toEqual({ ok: true, twoFactorRedirect: true });
  });

  it('signUpWithPassword forwards name (required by 1.6)', async () => {
    m.signUp.email.mockResolvedValue({ data: {}, error: null });
    const r = await signUpWithPassword({ email: 'a@b.com', password: 'pw', name: 'Sora' });
    expect(m.signUp.email).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw', name: 'Sora' });
    expect(r.ok).toBe(true);
  });

  it('requestPasswordReset forwards email + redirectTo', async () => {
    m.requestPasswordReset.mockResolvedValue({ error: null });
    await requestPasswordReset({ email: 'a@b.com', redirectTo: 'http://x/auth/reset' });
    expect(m.requestPasswordReset).toHaveBeenCalledWith({ email: 'a@b.com', redirectTo: 'http://x/auth/reset' });
  });

  it('resetPassword forwards newPassword + token', async () => {
    m.resetPassword.mockResolvedValue({ error: null });
    await resetPassword({ newPassword: 'pw', token: 'tok' });
    expect(m.resetPassword).toHaveBeenCalledWith({ newPassword: 'pw', token: 'tok' });
  });

  it('verifyEmail wraps token in { query: { token } }', async () => {
    m.verifyEmail.mockResolvedValue({ error: null });
    await verifyEmail({ token: 'tok' });
    expect(m.verifyEmail).toHaveBeenCalledWith({ query: { token: 'tok' } });
  });

  it('signOut calls authClient.signOut and normalizes ok', async () => {
    m.signOut.mockResolvedValue({ error: null });
    expect(await signOut()).toEqual({ ok: true });
    expect(m.signOut).toHaveBeenCalledTimes(1);
  });
});

describe('session actions — error normalization', () => {
  it('surfaces the server message', async () => {
    m.signIn.email.mockResolvedValue({ data: null, error: { message: 'Invalid credentials', status: 401 } });
    const r = await signInWithPassword({ email: 'a@b.com', password: 'bad' });
    expect(r).toEqual({ ok: false, error: 'Invalid credentials' });
  });

  it('falls back to a status-based message when none given', async () => {
    m.signIn.email.mockResolvedValue({ data: null, error: { status: 401 } });
    const r = await signInWithPassword({ email: 'a@b.com', password: 'bad' });
    expect(r).toEqual({ ok: false, error: 'Invalid email or password.' });
  });
});
