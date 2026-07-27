import type { ReactNode } from 'react';
import type * as ReactI18next from 'react-i18next';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@shared/theme';

// Real-mode wiring test: env gated on, router hooks + the session action mocked.
// Proves the SignInPage real branch calls the action and navigates on success /
// shows the error on failure — no network, no full router.
const navigateMock = vi.fn();
vi.mock('@shared/config/env', () => ({
  env: {
    useRealAuth: true, useRealApi: false, authMode: 'real', apiMode: 'mock',
    accountsUrl: 'http://localhost:4000', apiBaseUrl: '',
  },
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => navigateMock,
}));
vi.mock('@entities/session', () => ({ signInWithPassword: vi.fn(), signInWithProvider: vi.fn() }));
// Echo i18n keys so assertions can target stable keys instead of translated copy.
// Spread the real module so config.ts's initReactI18next stays intact.
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof ReactI18next>()),
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

import SignInPage from '../SignInPage';
import { signInWithPassword } from '@entities/session';

const signIn = vi.mocked(signInWithPassword);

function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText('signIn.emailPlaceholder'), {
    target: { value: 'me@nowhere.io' },
  });
  fireEvent.change(screen.getByPlaceholderText('signIn.passwordPlaceholder'), {
    target: { value: 'super-secret-pw' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'common.signIn' }));
}

beforeEach(() => { vi.clearAllMocks(); });

describe('SignInPage — real mode', () => {
  it('calls signInWithPassword and navigates to /intelligence on success', async () => {
    signIn.mockResolvedValue({ ok: true, twoFactorRedirect: false });
    render(<ThemeProvider><SignInPage /></ThemeProvider>);
    fillAndSubmit();
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({ email: 'me@nowhere.io', password: 'super-secret-pw' });
      expect(navigateMock).toHaveBeenCalledWith({ to: '/intelligence' });
    });
  });

  it('routes to the 2FA challenge when a second factor is required', async () => {
    signIn.mockResolvedValue({ ok: true, twoFactorRedirect: true });
    render(<ThemeProvider><SignInPage /></ThemeProvider>);
    fillAndSubmit();
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: '/auth/mfa' }),
      );
    });
  });

  it('shows the error and does not navigate on failure', async () => {
    signIn.mockResolvedValue({ ok: false, error: 'Invalid email or password.' });
    render(<ThemeProvider><SignInPage /></ThemeProvider>);
    fillAndSubmit();
    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('shows real OAuth (GitHub/Google) but not the demo creds in real mode', () => {
    signIn.mockResolvedValue({ ok: true, twoFactorRedirect: false });
    render(<ThemeProvider><SignInPage /></ThemeProvider>);
    expect(screen.getByText('signIn.continueWithGithub')).toBeInTheDocument();
    expect(screen.queryByText(/sefield-demo/i)).not.toBeInTheDocument();
  });
});
