// Push the current location into the recents MRU list every time the
// route changes. AppShell mounts this once.

import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useControlPaletteStore } from '../model/store';
import { NAV_TABS } from './buildCommands';

export function useTrackRecents() {
  const pushRecent = useControlPaletteStore((s) => s.pushRecent);
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname;
    // Only track top-level tabs. Deep paths inside a stage shouldn't
    // bloat the MRU — the user wants to "jump back to coding", not "to
    // /coding/task/42".
    const tab = NAV_TABS.find((t) => t.path === path);
    if (tab) pushRecent(tab.path);
  }, [location.pathname, pushRecent]);
}
