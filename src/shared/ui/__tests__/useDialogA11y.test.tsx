import { render, screen, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { useDialogA11y } from '../useDialogA11y';

// jsdom has no layout engine, so `offsetParent` is always null and
// getFocusable() would filter out every element. Stub it so the focus-trap
// paths are actually exercised.
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

function Dialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(ref, open, onClose);
  if (!open) return null;
  return (
    <div role="dialog" ref={ref} tabIndex={-1}>
      <button type="button">first</button>
      <button type="button">last</button>
    </div>
  );
}

const withTrigger = (open: boolean, onClose: () => void) => (
  <>
    <button type="button" data-testid="trigger">trigger</button>
    <Dialog open={open} onClose={onClose} />
  </>
);

describe('useDialogA11y', () => {
  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when closed', () => {
    const onClose = vi.fn();
    render(<Dialog open={false} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('restores focus to the previously-focused element on close', () => {
    const onClose = vi.fn();
    const { rerender } = render(withTrigger(false, onClose));
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(trigger).toHaveFocus();

    rerender(withTrigger(true, onClose));   // opens — captures trigger as prev-focus
    rerender(withTrigger(false, onClose));  // closes — cleanup restores focus
    expect(trigger).toHaveFocus();
  });

  it('traps Tab at the last focusable, wrapping to the first', () => {
    render(<Dialog open onClose={vi.fn()} />);
    const first = screen.getByRole('button', { name: 'first' });
    screen.getByRole('button', { name: 'last' }).focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(first).toHaveFocus();
  });
});
