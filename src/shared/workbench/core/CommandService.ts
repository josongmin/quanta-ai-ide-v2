// Scoped command service (WB-203).
//
// Commands are bound to a scope identity. Execution is admitted only for an
// active scope with the required capability; abort, timeout, and handler throw
// are distinct typed results and never leak an untyped rejection. Owner dispose
// reclaims every registration.
import { type CommandResult, type JsonValue, fail } from '../contract';
import type { ScopeNode } from './ScopeNode';

export type CommandHandler = (args: JsonValue, signal: AbortSignal) => JsonValue | Promise<JsonValue>;

export type CommandRegisterOptions = { readonly capability?: string };
export type CommandExecuteOptions = {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly granted?: readonly string[];
};

type Registration = {
  readonly scope: ScopeNode;
  readonly handler: CommandHandler;
  readonly capability?: string;
  readonly seq: number;
};

function errorResult(...args: Parameters<typeof fail>): CommandResult<never> {
  return { status: 'error', error: fail(...args) };
}

export class CommandService {
  private readonly commands = new Map<string, Registration[]>();
  private seq = 0;

  // Registration is tied to the scope: disposing the scope removes it, so a
  // disposed owner's command count returns to zero.
  register(scope: ScopeNode, id: string, handler: CommandHandler, options: CommandRegisterOptions = {}): CommandResult<() => void> {
    if (!scope.isActive()) {
      return errorResult('scope-disposed', `cannot register command ${id} on a disposed scope`, { path: id });
    }
    const registration: Registration = { scope, handler, capability: options.capability, seq: (this.seq += 1) };
    const list = this.commands.get(id) ?? [];
    list.push(registration);
    this.commands.set(id, list);

    const remove = (): void => {
      const current = this.commands.get(id);
      if (current === undefined) return;
      const next = current.filter((r) => r !== registration);
      if (next.length > 0) this.commands.set(id, next);
      else this.commands.delete(id);
    };
    const registered = scope.registerDisposable(remove);
    if (!registered.ok) {
      remove();
      return { status: 'error', error: registered.errors[0] };
    }
    return { status: 'ok', value: remove };
  }

  registrationCount(id: string): number {
    return this.commands.get(id)?.length ?? 0;
  }

  // Deterministic resolution: the most-recently registered ACTIVE registration
  // wins (highest seq), independent of Map iteration.
  private resolve(id: string): Registration | null {
    const list = this.commands.get(id);
    if (list === undefined || list.length === 0) return null;
    let chosen: Registration | null = null;
    for (const r of list) {
      if (r.scope.isActive() && (chosen === null || r.seq > chosen.seq)) chosen = r;
    }
    return chosen;
  }

  async execute(id: string, args: JsonValue, options: CommandExecuteOptions = {}): Promise<CommandResult<JsonValue>> {
    if (!this.commands.has(id)) {
      return errorResult('unknown-command', `no command registered for ${id}`, { path: id });
    }
    const registration = this.resolve(id);
    if (registration === null) {
      return errorResult('scope-inactive', `command ${id} has no active scope`, { path: id });
    }
    if (registration.capability !== undefined && !(options.granted ?? []).includes(registration.capability)) {
      return errorResult('capability-denied', `command ${id} requires capability ${registration.capability}`, { path: id });
    }
    if (options.signal?.aborted === true) {
      return errorResult('command-aborted', `command ${id} aborted before start`, { path: id });
    }

    const controller = new AbortController();
    const onAbort = (): void => {
      controller.abort();
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });

    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      // The handler guard always RESOLVES to a typed result (never rejects), so a
      // handler that loses the race cannot become an unhandled rejection.
      const handlerGuard: Promise<CommandResult<JsonValue>> = Promise.resolve()
        .then(() => registration.handler(args, controller.signal))
        .then((value): CommandResult<JsonValue> => ({ status: 'ok', value }))
        .catch((): CommandResult<JsonValue> => errorResult('handler-error', `command ${id} handler threw`, { path: id }));

      const guards: Promise<CommandResult<JsonValue>>[] = [handlerGuard];
      if (options.timeoutMs !== undefined) {
        guards.push(
          new Promise<CommandResult<JsonValue>>((resolve) => {
            timer = setTimeout(() => {
              controller.abort();
              resolve(errorResult('command-timeout', `command ${id} exceeded ${String(options.timeoutMs)}ms`, { path: id }));
            }, options.timeoutMs);
          }),
        );
      }
      if (options.signal !== undefined) {
        guards.push(
          new Promise<CommandResult<JsonValue>>((resolve) => {
            options.signal?.addEventListener('abort', () => { resolve(errorResult('command-aborted', `command ${id} aborted`, { path: id })); }, { once: true });
          }),
        );
      }
      return await Promise.race(guards);
    } finally {
      if (timer !== null) clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
    }
  }
}
