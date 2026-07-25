// Atomic contribution registry (WB-202).
//
// A batch is validated in full (validate-all) and then committed atomically or
// not at all — there is no partial commit. Snapshots are deterministic (sorted +
// content hash) so any input permutation yields the same committed state. Owners
// are indexed so unregister reclaims everything they contributed.
import { type Result, type WorkbenchError, ownerOf, ok, err, fail } from '../contract';

export type RegistryEntry = {
  readonly id: string;
  readonly kind: string;
  readonly owner: string;
};

export type RegistrySnapshot = {
  readonly version: number;
  readonly entries: readonly RegistryEntry[];
  readonly hash: string;
};

export type RegistryObserver = (snapshot: RegistrySnapshot) => void;

function hashEntries(sorted: readonly RegistryEntry[]): string {
  // FNV-1a over the canonical serialization — stable across input order.
  let h = 0x811c9dc5;
  const text = sorted.map((e) => `${e.id}|${e.kind}|${e.owner}`).join('\n');
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export class ContributionRegistry {
  private readonly entries = new Map<string, RegistryEntry>();
  private readonly byOwner = new Map<string, Set<string>>();
  private readonly observers = new Set<RegistryObserver>();
  private version = 0;

  // Atomic: validate the whole batch, then commit or reject. Foreign namespace
  // (id owner != registering owner) and duplicate ids are contract-reason-coded.
  register(owner: string, batch: readonly RegistryEntry[]): Result<RegistrySnapshot> {
    const errors: WorkbenchError[] = [];
    const seenInBatch = new Set<string>();

    for (const entry of batch) {
      if (ownerOf(entry.id) !== owner) {
        errors.push(fail('reserved-namespace', `owner ${owner} cannot contribute foreign id ${entry.id}`, { path: entry.id }));
      }
      if (entry.owner !== owner) {
        errors.push(fail('reserved-namespace', `entry ${entry.id} owner ${entry.owner} != registering owner ${owner}`, { path: entry.id }));
      }
      if (this.entries.has(entry.id) || seenInBatch.has(entry.id)) {
        errors.push(fail('duplicate-registration', `duplicate contribution id ${entry.id}`, { path: entry.id }));
      }
      seenInBatch.add(entry.id);
    }

    if (errors.length > 0) return err(errors); // no partial commit

    for (const entry of batch) {
      this.entries.set(entry.id, entry);
      let owned = this.byOwner.get(owner);
      if (owned === undefined) {
        owned = new Set<string>();
        this.byOwner.set(owner, owned);
      }
      owned.add(entry.id);
    }
    return ok(this.commit());
  }

  unregister(owner: string): void {
    const owned = this.byOwner.get(owner);
    if (owned === undefined) return;
    for (const id of owned) this.entries.delete(id);
    this.byOwner.delete(owner);
    this.commit();
  }

  ownerContributionCount(owner: string): number {
    return this.byOwner.get(owner)?.size ?? 0;
  }

  snapshot(): RegistrySnapshot {
    const sorted = [...this.entries.values()].sort((a, b) => a.id.localeCompare(b.id));
    return { version: this.version, entries: sorted, hash: hashEntries(sorted) };
  }

  observe(observer: RegistryObserver): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  private commit(): RegistrySnapshot {
    this.version += 1;
    const snapshot = this.snapshot();
    // Observers only ever see committed state (register/unregister mutate the map
    // fully before this fires).
    for (const observer of this.observers) observer(snapshot);
    return snapshot;
  }
}
