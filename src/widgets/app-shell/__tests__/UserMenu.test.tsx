import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// Session + router mocked; proves the menu shows the identity and that
// "Sign out" calls the action then routes to /auth/login.
const navigateMock = vi.fn();
const signOutMock = vi.fn(() => Promise.resolve({ ok: true as const }));
vi.mock('@entities/session', () => ({
  useSession: () => ({
    user: { id: 'u1', email: 'sora@acme.com', name: 'Sora Kim', image: null },
    isAuthenticated: true,
    isPending: false,
  }),
  signOut: () => signOutMock(),
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => navigateMock,
}));

import { UserMenu } from '../UserMenu';

beforeEach(() => { vi.clearAllMocks(); });

describe('UserMenu (real auth)', () => {
  it('shows initials and reveals identity on open', () => {
    render(<UserMenu />);
    expect(screen.getByRole('button', { name: /Sora Kim/i })).toHaveTextContent('SK');
    // closed → email not shown
    expect(screen.queryByText('sora@acme.com')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Account menu/i }));
    expect(screen.getByText('sora@acme.com')).toBeInTheDocument();
    expect(screen.getByText(/Account settings/i)).toBeInTheDocument();
  });

  it('Sign out calls signOut then navigates to /auth/login', async () => {
    render(<UserMenu />);
    fireEvent.click(screen.getByRole('button', { name: /Account menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Sign out/i }));
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith({ to: '/auth/login' });
    });
  });
});
