import { useEffect } from 'react';

// Locks `document.body` scroll while `locked` is true and restores the exact
// previous `overflow` value on release/unmount. Multiple stacked locks (e.g. a
// Modal opened over a Drawer) are ref-counted: the body stays locked until the
// last lock releases, and the original overflow captured by the *first* lock is
// the one restored — so nesting never strands the page in an unscrollable state.
let lockCount = 0;
let savedOverflow = '';

export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow;
      }
    };
  }, [locked]);
}
