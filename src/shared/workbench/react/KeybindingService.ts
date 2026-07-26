// Keybinding ingress + dispatch (P1-6).
//
// The single command-execution authority for keyboard shortcuts, owned by the
// WorkbenchRoot. Registration binds a keybinding to a handler with priority /
// isActive / input-field policy; dispatchKeydown resolves the highest-priority
// active match. This absorbs the former parallel UI-runtime CommandService.
export type Keybinding = {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
  readonly ignoreInputs?: boolean;
};

export type KeybindingRegistration = {
  readonly id: string;
  readonly keybinding: Keybinding;
  readonly handler: () => void | Promise<void>;
  readonly priority?: number;
  readonly isActive?: () => boolean;
};

type Entry = KeybindingRegistration & { readonly token: number; readonly priority: number };

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

export class KeybindingService {
  private entries: Entry[] = [];
  private nextToken = 1;

  register(registration: KeybindingRegistration): { dispose: () => void } {
    const entry: Entry = { ...registration, token: this.nextToken++, priority: registration.priority ?? 0 };
    this.entries.push(entry);
    return {
      dispose: () => {
        this.entries = this.entries.filter((candidate) => candidate.token !== entry.token);
      },
    };
  }

  dispatchKeydown(event: KeyboardEvent): boolean {
    const candidate = this.activeEntries()
      .filter((entry) => matches(event, entry.keybinding))
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
