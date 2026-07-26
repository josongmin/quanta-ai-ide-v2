import { useEffect, useId, useRef } from 'react';
import { useUIRuntime, useUiScope } from '../ui/runtime/UIRuntimeProvider';
import type { Keybinding } from '../ui/runtime/types';

export type Shortcut = Keybinding & {
  id?: string;
  priority?: number;
};

export function useShortcut(shortcut: Shortcut, handler: () => void): void {
  const runtime = useUIRuntime();
  const scope = useUiScope();
  const generatedId = useId();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const registration = runtime.commands.register({
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
    runtime,
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
