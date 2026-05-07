import { useEffect } from 'react';

// Cross-platform keyboard shortcut hook. The `ctrl` flag means
// "Cmd on macOS OR Ctrl elsewhere" so consumers don't have to special-case.
// We listen on `window` so the binding fires regardless of which element
// currently has focus, but skip while the user is typing in a text field.

export type Shortcut = {
  key: string;          // e.g. 'k', '/', 'a' — matched case-insensitively
  ctrl?: boolean;       // when true requires Cmd (Mac) or Ctrl (others)
  shift?: boolean;
  alt?: boolean;
  // Don't fire when typing in inputs (default true). Pass false to allow
  // shortcuts that should also work while focused on an input.
  ignoreInputs?: boolean;
};

export function useShortcut(s: Shortcut, handler: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (s.ignoreInputs !== false) {
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
      }
      const meta = s.ctrl ? (e.metaKey || e.ctrlKey) : true;
      const shift = s.shift !== undefined ? e.shiftKey === s.shift : true;
      const alt = s.alt !== undefined ? e.altKey === s.alt : true;
      if (e.key.toLowerCase() === s.key.toLowerCase() && meta && shift && alt) {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [s.key, s.ctrl, s.shift, s.alt, s.ignoreInputs, handler]);
}
