import type { DialogCloseReason, LayerKind, UiOwnerRef } from './types';

export type LayerRegistration = {
  kind: LayerKind;
  owner: UiOwnerRef;
  modal?: boolean;
  onClose: (reason: DialogCloseReason) => void;
  onKeyDown?: (event: KeyboardEvent) => boolean;
};

export type LayerHandle = {
  id: string;
  isTopmost: () => boolean;
  dispose: () => void;
};

type Entry = LayerRegistration & {
  id: string;
  sequence: number;
};

const LAYER_RANK: Record<LayerKind, number> = {
  tooltip: 10,
  menu: 20,
  dropdown: 30,
  drawer: 40,
  modal: 50,
  overlay: 60,
  toast: 70,
  devtools: 80,
};

function sameOwner(a: UiOwnerRef, b: UiOwnerRef): boolean {
  return a.ownerId === b.ownerId &&
    a.scopeInstanceId === b.scopeInstanceId &&
    a.workspaceId === b.workspaceId &&
    a.tabId === b.tabId;
}

export class LayerManager {
  private entries: Entry[] = [];
  private readonly listeners = new Set<() => void>();
  private nextSequence = 1;

  register(registration: LayerRegistration): LayerHandle {
    const sequence = this.nextSequence++;
    const entry: Entry = { ...registration, sequence, id: `layer-${String(sequence)}` };
    this.entries.push(entry);
    this.emit();
    return {
      id: entry.id,
      isTopmost: () => this.top()?.id === entry.id,
      dispose: () => {
        const before = this.entries.length;
        this.entries = this.entries.filter((candidate) => candidate.id !== entry.id);
        if (this.entries.length !== before) this.emit();
      },
    };
  }

  dismissTop(reason: DialogCloseReason): boolean {
    const entry = this.top();
    if (!entry) return false;
    entry.onClose(reason);
    return true;
  }

  handleKeydown(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') return this.dismissTop('escape');
    return this.top()?.onKeyDown?.(event) ?? false;
  }

  hasModalLayer(): boolean {
    return this.entries.some((entry) => entry.modal === true);
  }

  disposeOwner(owner: UiOwnerRef): number {
    const owned = this.entries.filter((entry) => sameOwner(entry.owner, owner));
    if (owned.length === 0) return 0;
    this.entries = this.entries.filter((entry) => !sameOwner(entry.owner, owner));
    for (const entry of owned) entry.onClose('scope-disposed');
    this.emit();
    return owned.length;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private top(): Entry | undefined {
    return this.entries.reduce<Entry | undefined>((top, candidate) => {
      if (!top) return candidate;
      const rankDelta = LAYER_RANK[candidate.kind] - LAYER_RANK[top.kind];
      if (rankDelta > 0 || (rankDelta === 0 && candidate.sequence > top.sequence)) return candidate;
      return top;
    }, undefined);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
