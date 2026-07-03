import { render, screen, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import { describe, it, expect } from 'vitest';
import { useRovingMenuFocus } from '../useRovingMenuFocus';

// One harness covers the keyboard nav shared by all 3 menus (settings-kit
// RowMenu, public-stage admin RowMenu, coding-stage TurnContextMenu).

function Menu(opts: { skipDisabled?: boolean; focusOnMount?: boolean } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const { onKeyDown } = useRovingMenuFocus(ref, opts);
  return (
    <div role="menu" ref={ref} onKeyDown={onKeyDown}>
      <button type="button" role="menuitem">One</button>
      <button type="button" role="menuitem" disabled>Two</button>
      <button type="button" role="menuitem">Three</button>
    </div>
  );
}

const items = () => ({
  one: screen.getByRole('menuitem', { name: 'One' }),
  three: screen.getByRole('menuitem', { name: 'Three' }),
  menu: screen.getByRole('menu'),
});

describe('useRovingMenuFocus', () => {
  it('focuses the first enabled item on mount', () => {
    render(<Menu />);
    expect(items().one).toHaveFocus();
  });

  it('ArrowDown moves to the next enabled item, skipping disabled', () => {
    render(<Menu />);
    fireEvent.keyDown(items().menu, { key: 'ArrowDown' });
    expect(items().three).toHaveFocus(); // Two is disabled → skipped
  });

  it('ArrowUp from the first item wraps to the last', () => {
    render(<Menu />);
    fireEvent.keyDown(items().menu, { key: 'ArrowUp' });
    expect(items().three).toHaveFocus();
  });

  it('Home / End jump to first / last', () => {
    render(<Menu />);
    fireEvent.keyDown(items().menu, { key: 'End' });
    expect(items().three).toHaveFocus();
    fireEvent.keyDown(items().menu, { key: 'Home' });
    expect(items().one).toHaveFocus();
  });

  it('does not move focus on an unhandled key', () => {
    render(<Menu />);
    items().one.focus();
    fireEvent.keyDown(items().menu, { key: 'a' });
    expect(items().one).toHaveFocus();
  });

  it('with skipDisabled=false, does not skip a disabled item in the ring', () => {
    render(<Menu skipDisabled={false} />);
    // ring is [One, Two(disabled), Three]; ArrowDown from One targets Two.
    // jsdom won't focus a disabled button, so focus stays off Three.
    fireEvent.keyDown(items().menu, { key: 'ArrowDown' });
    expect(items().three).not.toHaveFocus();
  });
});
