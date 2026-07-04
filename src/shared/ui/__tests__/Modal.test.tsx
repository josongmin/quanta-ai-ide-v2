import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from '../Modal';
import { Drawer } from '../Drawer';

// Regression guard for the aria-hidden bug: the backdrop wrapper must NOT be
// aria-hidden (it contains the dialog subtree, which would otherwise be stripped
// from the a11y tree). Plus the portal + dialog semantics + click-to-dismiss.

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={vi.fn()}>content</Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('portals a labelled, modal dialog when open', () => {
    render(<Modal open onClose={vi.fn()} ariaLabel="Settings">body</Modal>);
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('does NOT mark the backdrop wrapper aria-hidden (regression guard)', () => {
    render(<Modal open onClose={vi.fn()}>body</Modal>);
    const backdrop = screen.getByRole('dialog').parentElement;
    expect(backdrop?.getAttribute('aria-hidden')).toBeNull();
  });

  it('closes on backdrop click but not on content click', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose}><button type="button">inside</button></Modal>);
    fireEvent.click(screen.getByRole('button', { name: 'inside' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Drawer', () => {
  it('portals a labelled dialog with no aria-hidden backdrop (regression guard)', () => {
    render(<Drawer open onClose={vi.fn()} ariaLabel="Inspector">body</Drawer>);
    const dialog = screen.getByRole('dialog', { name: 'Inspector' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.parentElement?.getAttribute('aria-hidden')).toBeNull();
  });
});
