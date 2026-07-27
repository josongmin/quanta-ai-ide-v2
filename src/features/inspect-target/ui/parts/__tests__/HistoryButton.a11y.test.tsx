import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UIRuntimeProvider } from '@shared/ui/runtime/UIRuntimeProvider';
import { buildRepo } from '@entities/repo';
import type { StackItem } from '../../../model/StackContext';
import { HistoryButton } from '../HistoryButton';

// jsdom has no layout engine, so `offsetParent` is always null and the
// focus-trap's getFocusable() would filter out every element. Stub it so the
// dialog a11y contract is exercised.
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

// Echo the i18n key so assertions can target the exact label key.
const t = (key: string) => key;
const repo = buildRepo(1);

function renderHistory() {
  const onClose = vi.fn();
  const items: StackItem[] = [{ kind: 'workspace' }, { kind: 'file', id: 0 }];
  render(
    <UIRuntimeProvider>
      <HistoryButton
        items={items}
        activeKey="workspace"
        isDark={false}
        thickness={28}
        onPick={vi.fn()}
        onClose={onClose}
        repo={repo}
        t={t}
      />
    </UIRuntimeProvider>,
  );
  return { onClose };
}

describe('HistoryButton — a11y', () => {
  it('gives the per-tab close (X) button an accessible name', () => {
    renderHistory();
    // Open the dropdown so the row + close button render.
    fireEvent.click(screen.getByRole('button', { name: 'stack_axis.openTabsHistory' }));
    // The X button is now reachable by its accessible name (aria-label), not
    // just a hover title.
    const closeButtons = screen.getAllByRole('button', { name: 'stack_axis.closeTab' });
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it('closes the dropdown on Escape (shared dialog a11y)', () => {
    renderHistory();
    fireEvent.click(screen.getByRole('button', { name: 'stack_axis.openTabsHistory' }));
    expect(screen.getByText('stack_axis.openTabsCount')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('stack_axis.openTabsCount')).not.toBeInTheDocument();
  });
});
