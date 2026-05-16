// Single chokepoint for IPC into the Rust shell. Higher layers (entities,
// features) call typed wrappers in `commands.ts` — never `@tauri-apps/api`
// directly — so the surface area to audit stays small.

import { invoke as tauriInvoke } from '@tauri-apps/api/core';

import { isTauri } from './runtime';

export class TauriUnavailableError extends Error {
  constructor(command: string) {
    super(`Tauri command "${command}" called outside the desktop runtime`);
    this.name = 'TauriUnavailableError';
  }
}

export const invoke = async <T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> => {
  if (!isTauri()) throw new TauriUnavailableError(command);
  return tauriInvoke<T>(command, args);
};
