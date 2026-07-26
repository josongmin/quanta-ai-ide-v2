import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useUiScope } from '@shared/ui';
import { useWorkbench } from '@shared/workbench/react';
import { useControlPaletteStore } from '../model/store';
import { NAV_TABS } from './buildCommands';

type Options = {
  onOpenHelp?: () => void;
};

export function useGlobalShortcuts({ onOpenHelp }: Options = {}) {
  const { keybindings } = useWorkbench();
  const scope = useUiScope();
  const toggle = useControlPaletteStore((state) => state.toggle);
  const navigate = useNavigate();
  const helpRef = useRef(onOpenHelp);

  useEffect(() => {
    helpRef.current = onOpenHelp;
  }, [onOpenHelp]);

  useEffect(() => {
    const handles = [
      keybindings.register({
        id: 'app.commandPalette.toggle',
        keybinding: { key: 'k', ctrl: true, ignoreInputs: false },
        priority: scope.commandPriority,
        isActive: () => scope.activeRef.current,
        handler: toggle,
      }),
      keybindings.register({
        id: 'app.help.open',
        keybinding: { key: '?', ignoreInputs: true },
        priority: scope.commandPriority,
        isActive: () => scope.activeRef.current,
        handler: () => { helpRef.current?.(); },
      }),
      ...NAV_TABS.map((tab, index) => keybindings.register({
        id: `app.tab.focus.${tab.id}`,
        keybinding: { key: String(index + 1), ctrl: true, ignoreInputs: false },
        priority: scope.commandPriority,
        isActive: () => scope.activeRef.current,
        handler: () => { void navigate({ to: tab.path }); },
      })),
    ];
    return () => { for (const handle of handles) handle.dispose(); };
  }, [navigate, keybindings, scope, toggle]);
}
