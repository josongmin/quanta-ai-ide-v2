import type { DialogCloseReason, UiOwnerRef } from './types';

export type DialogSnapshot<TPayload = unknown> = {
  open: boolean;
  payload?: TPayload;
  owner?: UiOwnerRef;
  closeReason?: DialogCloseReason;
};

const CLOSED_SNAPSHOT: DialogSnapshot = { open: false };

function sameOwner(a: UiOwnerRef | undefined, b: UiOwnerRef): boolean {
  return Boolean(a) && a?.ownerId === b.ownerId &&
    a.scopeInstanceId === b.scopeInstanceId &&
    a.workspaceId === b.workspaceId &&
    a.tabId === b.tabId;
}

export class DialogService {
  private readonly snapshots = new Map<string, DialogSnapshot>();
  private readonly listeners = new Map<string, Set<() => void>>();

  open(id: string, payload?: unknown, owner?: UiOwnerRef): void {
    this.snapshots.set(id, { open: true, payload, owner });
    this.emit(id);
  }

  close(id: string, reason: DialogCloseReason = 'action'): void {
    const current = this.snapshots.get(id);
    if (!current?.open) return;
    this.snapshots.set(id, { open: false, closeReason: reason });
    this.emit(id);
  }

  getSnapshot<TPayload>(id: string): DialogSnapshot<TPayload> {
    return (this.snapshots.get(id) ?? CLOSED_SNAPSHOT) as DialogSnapshot<TPayload>;
  }

  subscribe(id: string, listener: () => void): () => void {
    const listeners = this.listeners.get(id) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(id, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(id);
    };
  }

  disposeOwner(owner: UiOwnerRef): number {
    const ids = [...this.snapshots.entries()]
      .filter(([, snapshot]) => snapshot.open && sameOwner(snapshot.owner, owner))
      .map(([id]) => id);
    for (const id of ids) this.close(id, 'scope-disposed');
    return ids.length;
  }

  private emit(id: string): void {
    for (const listener of this.listeners.get(id) ?? []) listener();
  }
}
