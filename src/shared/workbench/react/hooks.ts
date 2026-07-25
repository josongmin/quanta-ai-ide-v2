// Workbench React hooks (WB-301/303).
//
// Bind kernel services (command, context-key) to the current scope with
// automatic teardown on unmount. Registrations use the canonical owner — there is
// no parallel command/scope tree.
import { useEffect } from 'react';
import type { CommandHandler, CommandRegisterOptions, ContextValue } from '../core';
import { useWorkbench } from './WorkbenchProvider';
import { useWorkbenchScope } from './ScopeProvider';

// Register a command on the current scope for the lifetime of the component.
export function useCommand(id: string, handler: CommandHandler, options?: CommandRegisterOptions): void {
  const { commands } = useWorkbench();
  const scope = useWorkbenchScope();
  useEffect(() => {
    const registered = commands.register(scope, id, handler, options);
    if (registered.status !== 'ok') return;
    return registered.value; // dispose the registration on unmount
    // handler/options intentionally excluded — re-register only on id/scope change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commands, scope, id]);
}

// Set a context key on the current scope while the component is mounted.
export function useContextKey(key: string, value: ContextValue): void {
  const { contextKeys } = useWorkbench();
  const scope = useWorkbenchScope();
  useEffect(() => {
    contextKeys.set(scope, key, value);
  }, [contextKeys, scope, key, value]);
}
