import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { InlineError } from '../InlineError';
import { RouteFallback } from '../RouteFallback';

describe('InlineError', () => {
  it('renders the message as an alert', () => {
    render(<InlineError message="Failed to load PRs" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load PRs');
  });

  it('shows a Retry button only when onRetry is provided, and calls it', async () => {
    const { rerender } = render(<InlineError />);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();

    const onRetry = vi.fn();
    rerender(<InlineError onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('RouteFallback', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('renders nothing before the delay, then a skeleton after (no flash on fast loads)', () => {
    vi.useFakeTimers();
    const { container } = render(<RouteFallback delayMs={250} />);
    expect(container).toBeEmptyDOMElement(); // fast/prefetched load shows nothing

    act(() => { vi.advanceTimersByTime(250); });
    expect(container).not.toBeEmptyDOMElement(); // slow load surfaces a skeleton
  });
});
