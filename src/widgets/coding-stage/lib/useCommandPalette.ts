import { useCallback, useState } from 'react';
import { useShortcut } from '@shared/lib';
import type { Turn } from '../parts/types';

// Command palette + per-turn context menu open state, plus the small
// stable handlers and the ⌘K capture-phase toggle. Extracted from
// CodingStage without behavioural change — the ⌘K effect keeps its
// capture-phase listener so it still wins over chat-agent's ⌘K.
//
// The palette *actions* and turn-menu *items* stay in the composition
// root because they close over task/model/navigation state; this hook
// owns only the open/close lifecycle.
export function useCommandPalette() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [turnMenu, setTurnMenu] = useState<{ x: number; y: number; turn: Turn } | null>(null);

  useShortcut(
    { id: 'coding.commandPalette.toggle', key: 'k', ctrl: true, ignoreInputs: false, priority: 10 },
    useCallback(() => { setPaletteOpen((value) => !value); }, []),
  );

  const handleOpenTurnMenu = useCallback((x: number, y: number, turn: Turn) => {
    setTurnMenu({ x, y, turn });
  }, []);
  const handlePaletteClose = useCallback(() => { setPaletteOpen(false); }, []);
  const handleTurnMenuClose = useCallback(() => { setTurnMenu(null); }, []);

  return {
    paletteOpen, setPaletteOpen,
    turnMenu, setTurnMenu,
    handleOpenTurnMenu,
    handlePaletteClose,
    handleTurnMenuClose,
  };
}
