// Bounded context store with leases (WB-212).
//
// Stores immutable envelopes (a ref to an external payload, never the payload
// itself). Handoff is leased: an entry lives while any lease is held and is
// reclaimed when the last lease closes. Admission enforces the byte budget and
// the secret/durable policy; acquire distinguishes wrong-workspace / stale /
// expired / schema-skew. Time is injected (nowMs) for deterministic expiry.
import { type ContextEnvelope, type Result, ok, err, fail } from '../contract';
import type { WorkspaceHandle } from './WorkspaceSession';

export type ContextHandle = {
  readonly id: string;
  readonly kind: string;
  readonly schema: string;
  readonly workspace: WorkspaceHandle;
};

export type Lease = { release: () => void };

export type PutOptions = { readonly ttlMs: number; readonly schema: string };

type Entry = {
  readonly envelope: ContextEnvelope;
  readonly workspace: WorkspaceHandle;
  readonly schema: string;
  readonly expiresAt: number;
  leases: number;
};

export class ContextStore {
  private readonly entries = new Map<string, Entry>();
  private bytes = 0;

  constructor(private readonly maxBytes: number) {}

  put(envelope: ContextEnvelope, workspace: WorkspaceHandle, options: PutOptions, nowMs: number): Result<{ handle: ContextHandle; lease: Lease }> {
    if (envelope.sensitivity === 'secret' && envelope.durability === 'durable') {
      return err(fail('durable-secret', 'secret context cannot be stored with durable durability', { path: envelope.ref }));
    }
    // A context ref is a unique immutable handle. Re-putting an already-active
    // ref is a caller error: overwriting would leak the old bytes and let a stale
    // lease decrement the new entry. Reject rather than silently replace.
    if (this.entries.has(envelope.ref)) {
      return err(fail('duplicate-registration', `context ref ${envelope.ref} is already stored`, { path: envelope.ref }));
    }
    if (this.bytes + envelope.bytes > this.maxBytes) {
      return err(fail('byte-budget', `context store byte budget exceeded`, { path: envelope.ref, detail: { have: this.bytes, add: envelope.bytes, max: this.maxBytes } }));
    }

    const entry: Entry = { envelope, workspace, schema: options.schema, expiresAt: nowMs + options.ttlMs, leases: 1 };
    this.entries.set(envelope.ref, entry);
    this.bytes += envelope.bytes;

    const handle: ContextHandle = { id: envelope.ref, kind: envelope.kind, schema: options.schema, workspace };
    return ok({ handle, lease: this.makeLease(envelope.ref) });
  }

  acquire(handle: ContextHandle, current: WorkspaceHandle, nowMs: number, expectedSchema?: string): Result<Lease> {
    const entry = this.entries.get(handle.id);
    if (entry === undefined) {
      return err(fail('lease-expired', `context ${handle.id} is no longer available`, { path: handle.id }));
    }
    if (handle.workspace.workspaceId !== current.workspaceId) {
      return err(fail('wrong-workspace', `context ${handle.id} belongs to another workspace`, { path: handle.id }));
    }
    if (
      handle.workspace.searchGeneration !== current.searchGeneration ||
      handle.workspace.factsGeneration !== current.factsGeneration
    ) {
      return err(fail('stale-handle', `context ${handle.id} handle generation is stale`, { path: handle.id }));
    }
    if (nowMs > entry.expiresAt) {
      this.evict(handle.id);
      return err(fail('lease-expired', `context ${handle.id} expired`, { path: handle.id }));
    }
    if (expectedSchema !== undefined && expectedSchema !== entry.schema) {
      return err(fail('schema-skew', `context ${handle.id} schema ${entry.schema} != expected ${expectedSchema}`, { path: handle.id }));
    }
    entry.leases += 1;
    return ok(this.makeLease(handle.id));
  }

  peek(handleId: string): ContextEnvelope | undefined {
    return this.entries.get(handleId)?.envelope;
  }

  activeEntryCount(): number {
    return this.entries.size;
  }

  totalBytes(): number {
    return this.bytes;
  }

  private makeLease(id: string): Lease {
    let released = false;
    return {
      release: (): void => {
        if (released) return; // idempotent — a lease closes at most once
        released = true;
        const entry = this.entries.get(id);
        if (entry === undefined) return;
        entry.leases -= 1;
        if (entry.leases <= 0) this.evict(id);
      },
    };
  }

  private evict(id: string): void {
    const entry = this.entries.get(id);
    if (entry === undefined) return;
    this.bytes -= entry.envelope.bytes;
    this.entries.delete(id);
  }
}
