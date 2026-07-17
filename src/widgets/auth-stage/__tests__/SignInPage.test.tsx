import type { ReactNode } from 'react';
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
vi.mock('@entities/session', () => ({ signInWithPassword: vi.fn() }));

import SignInPage from '../SignInPage';
import { signInWithPassword } from '@entities/session';

const signIn = vi.mocked(signInWithPassword);

function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText('you@company.com'), {
    target: { value: 'me@nowhere.io' },
  });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), {
    target: { value: 'super-secret-pw' },
  });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

beforeEach(() => { vi.clearAllMocks(); });

describe('SignInPage — real mode', () => {
  it('calls signInWithPassword and navigates to /intelligence on success', async () => {
    signIn.mockResolvedValue({ ok: true });
    render(<ThemeProvider><SignInPage /></ThemeProvider>);
    fillAndSubmit();
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({ email: 'me@nowhere.io', password: 'super-secret-pw' });
      expect(navigateMock).toHaveBeenCalledWith({ to: '/intelligence' });
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

  it('hides the OAuth / demo-cred affordances in real mode', () => {
    signIn.mockResolvedValue({ ok: true });
    render(<ThemeProvider><SignInPage /></ThemeProvider>);
    expect(screen.queryByText(/Continue with GitHub/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sefield-demo/i)).not.toBeInTheDocument();
  });
});
