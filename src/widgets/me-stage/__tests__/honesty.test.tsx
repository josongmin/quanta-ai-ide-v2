import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@shared/theme';
import { UIRuntimeProvider } from '@shared/ui';
import { DangerSection } from '../pages/parts/account/DangerSection';
import { SignOutEverywhere } from '../pages/parts/security/SignOutEverywhere';

// HONESTY pass regression tests. These demo-only panels previously FAKED
// success on consequential security actions: the account-delete primary ran a
// setTimeout then closed the modal (deleting nothing), and "sign out
// everywhere" just dismissed the confirm (revoking no sessions). The real
// backed variants live in me-stage/real/* and render under env.useRealAuth.
// Here we assert the demo mocks are honestly DISABLED with an accessible reason
// and never present a fake success/close.

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider><UIRuntimeProvider>{ui}</UIRuntimeProvider></ThemeProvider>);
}

describe('DangerSection (demo) — account deletion is not faked', () => {
  it('opens the confirm modal but the primary delete action is disabled with a reason', () => {
    renderWithTheme(<DangerSection />);
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));

    // Type the exact confirm phrase — in the old code this armed the fake delete.
    fireEvent.change(screen.getByPlaceholderText('delete sora@acme.com'), {
      target: { value: 'delete sora@acme.com' },
    });

    const primary = screen.getByRole('button', { name: /permanently delete/i });
    expect(primary).toBeDisabled();
    expect(primary).toHaveAttribute('aria-disabled', 'true');
    expect(primary.getAttribute('title')).toMatch(/demo build/i);

    // Clicking the disabled primary must NOT close the modal (no fake success).
    fireEvent.click(primary);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('delete sora@acme.com')).toBeInTheDocument();
  });
});

describe('SignOutEverywhere (demo) — session revocation is not faked', () => {
  it('reveals a confirm whose primary action is disabled with a reason', () => {
    renderWithTheme(<SignOutEverywhere />);
    fireEvent.click(screen.getByRole('button', { name: /sign out other devices/i }));

    const primary = screen.getByRole('button', { name: /yes, sign out everywhere/i });
    expect(primary).toBeDisabled();
    expect(primary).toHaveAttribute('aria-disabled', 'true');
    expect(primary.getAttribute('title')).toMatch(/demo build/i);

    // Cancel still works (a real local action stays live).
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('button', { name: /yes, sign out everywhere/i })).not.toBeInTheDocument();
  });
});
