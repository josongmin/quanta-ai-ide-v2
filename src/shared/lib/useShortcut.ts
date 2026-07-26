import { useEffect, useId, useRef } from 'react';
import { useUiScope } from '../ui/runtime/UIRuntimeProvider';
import { useWorkbench, type Keybinding } from '../workbench/react';

export type Shortcut = Keybinding & {
  id?: string;
  priority?: number;
};

export function useShortcut(shortcut: Shortcut, handler: () => void): void {
  const { keybindings } = useWorkbench();
  const scope = useUiScope();
  const generatedId = useId();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const registration = keybindings.register({
      id: shortcut.id ?? `shortcut:${generatedId}`,
      handler: () => { handlerRef.current(); },
      keybinding: {
        key: shortcut.key,
        ctrl: shortcut.ctrl,
        shift: shortcut.shift,
        alt: shortcut.alt,
        ignoreInputs: shortcut.ignoreInputs,
      },
      priority: scope.commandPriority + (shortcut.priority ?? 0),
      isActive: () => scope.activeRef.current,
    });
    return registration.dispose;
  }, [
    generatedId,
    keybindings,
    scope,
    shortcut.id,
    shortcut.key,
    shortcut.ctrl,
    shortcut.shift,
    shortcut.alt,
    shortcut.ignoreInputs,
    shortcut.priority,
  ]);
}
