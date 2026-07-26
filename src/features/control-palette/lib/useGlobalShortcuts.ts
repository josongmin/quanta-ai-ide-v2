import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useUIRuntime, useUiScope } from '@shared/ui';
import { useControlPaletteStore } from '../model/store';
import { NAV_TABS } from './buildCommands';

type Options = {
  onOpenHelp?: () => void;
};

export function useGlobalShortcuts({ onOpenHelp }: Options = {}) {
  const runtime = useUIRuntime();
  const scope = useUiScope();
  const toggle = useControlPaletteStore((state) => state.toggle);
  const navigate = useNavigate();
  const helpRef = useRef(onOpenHelp);

  useEffect(() => {
    helpRef.current = onOpenHelp;
  }, [onOpenHelp]);

  useEffect(() => {
    const handles = [
      runtime.commands.register({
        id: 'app.commandPalette.toggle',
        keybinding: { key: 'k', ctrl: true, ignoreInputs: false },
        priority: scope.commandPriority,
        isActive: () => scope.activeRef.current,
        handler: toggle,
      }),
      runtime.commands.register({
        id: 'app.help.open',
        keybinding: { key: '?', ignoreInputs: true },
        priority: scope.commandPriority,
        isActive: () => scope.activeRef.current,
        handler: () => { helpRef.current?.(); },
      }),
      ...NAV_TABS.map((tab, index) => runtime.commands.register({
        id: `app.tab.focus.${tab.id}`,
        keybinding: { key: String(index + 1), ctrl: true, ignoreInputs: false },
        priority: scope.commandPriority,
        isActive: () => scope.activeRef.current,
        handler: () => { void navigate({ to: tab.path }); },
      })),
    ];
    return () => { for (const handle of handles) handle.dispose(); };
  }, [navigate, runtime, scope, toggle]);
}
