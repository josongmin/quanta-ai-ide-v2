import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@shared/theme';
import { UIRuntimeProvider } from '@shared/ui/runtime/UIRuntimeProvider';
import { CommandPalette } from '../CommandPalette';
import { CodingStageProvider } from '../../../model/CodingStageContext';
import type { Task } from '../../types';

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

const ACTIONS = [
  { id: 'a1', label: 'New task', onRun: vi.fn() },
];

function renderPalette(overrides: Partial<Parameters<typeof CommandPalette>[0]> = {}) {
  const onClose = vi.fn();
  render(
    <ThemeProvider>
      <UIRuntimeProvider>
        <CodingStageProvider>
          <button type="button" data-testid="trigger">trigger</button>
          <CommandPalette
            open
            onClose={onClose}
            actions={ACTIONS}
            tasks={[] as Task[]}
            onJumpTask={vi.fn()}
            onInsertSlash={vi.fn()}
            {...overrides}
          />
        </CodingStageProvider>
      </UIRuntimeProvider>
    </ThemeProvider>,
  );
  return { onClose };
}

describe('CommandPalette — dialog a11y', () => {
  it('exposes an accessible modal dialog name', () => {
    renderPalette();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Command palette');
  });

  it('closes on Escape', () => {
    const { onClose } = renderPalette();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab within the palette (wraps last -> first)', () => {
    renderPalette();
    const focusables = screen.getByRole('dialog').querySelectorAll<HTMLElement>(
      'button, input, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    last.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(first).toHaveFocus();
  });
});
