import type { Keybinding } from './types';

export type CommandHandler = () => void | Promise<void>;

export type CommandRegistration = {
  id: string;
  handler: CommandHandler;
  keybinding?: Keybinding;
  priority?: number;
  isActive?: () => boolean;
};

export type CommandRegistrationHandle = {
  dispose: () => void;
};

type Entry = CommandRegistration & {
  token: number;
  priority: number;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
}

function matches(event: KeyboardEvent, binding: Keybinding): boolean {
  if (event.key.toLowerCase() !== binding.key.toLowerCase()) return false;
  if (binding.ctrl === true && !(event.metaKey || event.ctrlKey)) return false;
  if (binding.ctrl === false && (event.metaKey || event.ctrlKey)) return false;
  if (binding.shift !== undefined && event.shiftKey !== binding.shift) return false;
  if (binding.alt !== undefined && event.altKey !== binding.alt) return false;
  if (binding.ignoreInputs !== false && isEditableTarget(event.target)) return false;
  return true;
}

export class CommandService {
  private entries: Entry[] = [];
  private nextToken = 1;

  register(registration: CommandRegistration): CommandRegistrationHandle {
    const entry: Entry = {
      ...registration,
      token: this.nextToken++,
      priority: registration.priority ?? 0,
    };
    this.entries.push(entry);
    return {
      dispose: () => {
        this.entries = this.entries.filter((candidate) => candidate.token !== entry.token);
      },
    };
  }

  dispatchKeydown(event: KeyboardEvent): boolean {
    const candidate = this.activeEntries()
      .filter((entry) => entry.keybinding && matches(event, entry.keybinding))
      .sort((a, b) => b.priority - a.priority || b.token - a.token)[0];
    if (!candidate) return false;
    void candidate.handler();
    return true;
  }

  execute(id: string): boolean {
    const candidate = this.activeEntries()
      .filter((entry) => entry.id === id)
      .sort((a, b) => b.priority - a.priority || b.token - a.token)[0];
    if (!candidate) return false;
    void candidate.handler();
    return true;
  }

  private activeEntries(): Entry[] {
    return this.entries.filter((entry) => entry.isActive?.() ?? true);
  }
}
