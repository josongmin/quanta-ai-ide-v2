// Fixture: kernel registry. Imports only the contract via relative path — no
// React/DOM/router/state/Tauri, no cross-family, no deep alias imports.
import { CONTRACT_VERSION } from '../contract/index';

export class Registry {
  readonly version = CONTRACT_VERSION;
  private readonly entries = new Map<string, unknown>();
  register(id: string, value: unknown): void {
    this.entries.set(id, value);
  }
}
