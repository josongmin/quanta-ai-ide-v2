// Global keyboard plumbing for the control palette + tab shortcuts.
// Runs once at the AppShell level; never inside list items.
//
// Bindings:
//   - Cmd/Ctrl + K        → toggle the palette
//   - Cmd/Ctrl + 1..7     → jump to a top-level tab
//   - Esc inside palette  → handled by the palette itself
//   - ?                   → open help (when no input is focused)
//
// We deliberately don't use the `keydown` capture phase: we check
// `isEditableTarget` ourselves so that text inputs across the app
// (chat composer, notebook, etc.) keep accepting raw "1" / "k" / "?"
// without us intercepting. The Cmd-K path bypasses that check because
// "Cmd-K" is universally a palette gesture, even from inside an input.

import { useEffect } from 'react';
import { isEditableTarget as isEditable } from '@shared/lib';
import { useNavigate } from '@tanstack/react-router';
import { useControlPaletteStore } from '../model/store';
import { NAV_TABS } from './buildCommands';

type Options = {
  onOpenHelp?: () => void;
}

export function useGlobalShortcuts({ onOpenHelp }: Options = {}) {
  const toggle = useControlPaletteStore((s) => s.toggle);
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl-K: works even inside inputs. The palette IS the
      // contextual escape hatch; an input that swallows it would be
      // hostile.
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggle();
        return;
      }

      // Cmd/Ctrl-1..7: jump to a tab. Number keys overlap with
      // editor input, so we keep the meta requirement.
      if (meta && /^[1-7]$/.test(e.key)) {
        const tab = NAV_TABS[Number(e.key) - 1];
        if (tab) {
          e.preventDefault();
          void navigate({ to: tab.path });
        }
        return;
      }

      // Bare "?" → help. Skip when the user is typing.
      if (e.key === '?' && !meta && !isEditable(e.target)) {
        if (onOpenHelp) {
          e.preventDefault();
          onOpenHelp();
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); };
  }, [toggle, navigate, onOpenHelp]);
}
