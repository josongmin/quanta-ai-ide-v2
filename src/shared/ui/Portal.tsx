import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Plain portal — no backdrop, no escape, no scroll lock. Use for non-modal
// floating overlays (toasts, side rails, tooltips, positioned panels) that
// don't fit Modal/Drawer semantics. For dialogs, prefer Modal/Drawer.

type Props = { children: ReactNode };

export function Portal({ children }: Props) {
  return createPortal(children, document.body);
}
