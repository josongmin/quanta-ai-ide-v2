import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@shared/theme';
import { UIRuntimeProvider } from '@shared/ui/runtime/UIRuntimeProvider';
import { OAuthRedirectOverlay } from '../OAuthRedirectOverlay';

// jsdom has no layout engine, so `offsetParent` is always null and the
// focus-trap's getFocusable() would filter out every element. Stub it so the
// dialog a11y contract (focus/trap) is actually exercised.
let orig: PropertyDescriptor | undefined;
beforeAll(() => {
  orig = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(this: HTMLElement) { return this.parentNode as HTMLElement | null; },
  });
});
afterAll(() => {
  if (orig) Object.defineProperty(HTMLElement.prototype, 'offsetParent', orig);
});

function renderOverlay(overrides: Partial<Parameters<typeof OAuthRedirectOverlay>[0]> = {}) {
  const onCancel = vi.fn();
  const onComplete = vi.fn();
  render(
    <ThemeProvider>
      <UIRuntimeProvider>
        <OAuthRedirectOverlay
          provider="github"
          onCancel={onCancel}
          onComplete={onComplete}
          {...overrides}
        />
      </UIRuntimeProvider>
    </ThemeProvider>,
  );
  return { onCancel, onComplete };
}

describe('OAuthRedirectOverlay — dialog contract', () => {
  it('renders as an accessible modal dialog', () => {
    renderOverlay();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('closes (calls onCancel) on Escape', () => {
    const { onCancel } = renderOverlay();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders the correct label for the bitbucket provider (not mislabeled as GitLab)', () => {
    renderOverlay({ provider: 'bitbucket' });
    expect(screen.getByText(/Redirecting to Bitbucket/i)).toBeInTheDocument();
    expect(screen.queryByText(/GitLab/i)).not.toBeInTheDocument();
  });
});
