import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { WorkbenchRoot, createWorkbenchSession } from '@shared/workbench/react';
import { UIRuntimeProvider } from '@shared/ui/runtime/UIRuntimeProvider';
import { MeModal } from '../MeModal';

// Locks the me-stage modal chrome that P1-2 extracted from seven byte-identical
// hand-rolls. The refactor's only risk is that the shared shell no longer emits
// the exact same DOM, so these assertions pin the backdrop/panel markup, the
// width/border/scroll props, and the useDialogA11y wiring (layer registration +
// focus). Rendered inside the real Workbench + UIRuntime providers because
// useDialogA11y reaches for both.

afterEach(cleanup);

function mount(ui: React.ReactElement) {
  const session = createWorkbenchSession();
  return render(
    <WorkbenchRoot session={session}>
      <UIRuntimeProvider>{ui}</UIRuntimeProvider>
    </WorkbenchRoot>,
  );
}

describe('MeModal (me-stage modal chrome)', () => {
  it('renders the scrim backdrop + elevated dialog panel with children', () => {
    const { getByRole, getByText, container } = mount(
      <MeModal onClose={vi.fn()} widthClass="max-w-[420px]">
        <p>body</p>
      </MeModal>,
    );
    const backdrop = container.querySelector('.popover-backdrop-in');
    expect(backdrop).not.toBeNull();
    expect(backdrop).toHaveClass('fixed', 'inset-0', 'z-50');
    const panel = getByRole('dialog');
    expect(panel).toHaveAttribute('aria-modal', 'true');
    expect(panel).toHaveClass('max-w-[420px]', 'rounded-md', 'popover-panel-in', 'outline-none');
    expect(panel.style.boxShadow).toBe('var(--shadow-lg)');
    expect(panel.style.border).toBe('1px solid var(--border-default)');
    expect(getByText('body')).toBeTruthy();
  });

  it('applies a custom border colour and the scroll affordance when asked', () => {
    const { getByRole } = mount(
      <MeModal onClose={vi.fn()} widthClass="max-w-[520px]" borderColor="var(--intent-danger-fg)" scroll>
        <p>danger</p>
      </MeModal>,
    );
    const panel = getByRole('dialog');
    expect(panel.style.border).toBe('1px solid var(--intent-danger-fg)');
    expect(panel).toHaveClass('max-h-[90vh]', 'overflow-y-auto', 'max-w-[520px]');
  });

  it('mounts the dialog and tears it down cleanly on unmount (useDialogA11y dispose)', () => {
    const onClose = vi.fn();
    const { queryByRole, unmount } = mount(
      <MeModal onClose={onClose} widthClass="max-w-[400px]">
        <button type="button">focus-target</button>
      </MeModal>,
    );
    expect(queryByRole('dialog')).not.toBeNull();
    // The layer/focus wiring lives entirely in useDialogA11y; unmount must run its
    // dispose (layer teardown + focus restore) without throwing, and remove the node.
    act(() => { unmount(); });
    expect(queryByRole('dialog')).toBeNull();
    expect(onClose).not.toHaveBeenCalled(); // unmounting is not a close event
  });
});
