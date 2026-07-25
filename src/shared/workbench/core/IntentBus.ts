// Bounded intent bus (WB-205).
//
// Intents are delivered addressed (to one scope) or bubbled (target -> ancestors).
// The pending queue is bounded by count, bytes, and TTL; overflow and expiry are
// reason-coded, never silently dropped. Coalescing is per (owner, key) so one
// owner's events never merge into another's. Time is injected (nowMs) so delivery
// is deterministic.
import { type Result, type WorkbenchError, type JsonValue, ok, err, fail } from '../contract';
import type { ScopeNode } from './ScopeNode';

export type Intent = {
  readonly type: string;
  readonly owner: string;
  readonly payload: JsonValue;
  readonly bytes?: number;
  readonly coalesceKey?: string;
};
export type DeliveryMode = 'addressed' | 'bubble';
export type BusLimits = { readonly maxCount: number; readonly maxBytes: number; readonly ttlMs: number };
export type IntentHandler = (intent: Intent) => void;
export type FlushResult = { readonly delivered: number; readonly expired: readonly WorkbenchError[] };

type Pending = { readonly target: ScopeNode; readonly intent: Intent; readonly mode: DeliveryMode; readonly at: number; readonly bytes: number };

export class IntentBus {
  private readonly listeners = new Map<ScopeNode, Map<string, Set<IntentHandler>>>();
  private queue: Pending[] = [];
  private queuedBytes = 0;

  constructor(private readonly limits: BusLimits) {}

  subscribe(scope: ScopeNode, type: string, handler: IntentHandler): Result<() => void> {
    if (!scope.isActive()) {
      return err(fail('scope-disposed', `cannot subscribe on a disposed scope`, { path: type }));
    }
    let byType = this.listeners.get(scope);
    if (byType === undefined) {
      byType = new Map<string, Set<IntentHandler>>();
      this.listeners.set(scope, byType);
      scope.registerDisposable(() => this.listeners.delete(scope));
    }
    let handlers = byType.get(type);
    if (handlers === undefined) {
      handlers = new Set<IntentHandler>();
      byType.set(type, handlers);
    }
    handlers.add(handler);
    return ok(() => handlers.delete(handler));
  }

  enqueue(target: ScopeNode, intent: Intent, mode: DeliveryMode, nowMs: number): Result<void> {
    if (!target.isActive()) {
      return err(fail('scope-disposed', `cannot deliver to a disposed scope`, { path: intent.type }));
    }
    const bytes = intent.bytes ?? 0;

    // Coalesce within the same owner + key only.
    if (intent.coalesceKey !== undefined) {
      const index = this.queue.findIndex(
        (p) => p.intent.owner === intent.owner && p.intent.coalesceKey === intent.coalesceKey,
      );
      if (index >= 0) {
        // Coalescing must still respect the byte budget — a replacement that grows
        // the queue past maxBytes is rejected, not silently admitted.
        const projected = this.queuedBytes - this.queue[index].bytes + bytes;
        if (projected > this.limits.maxBytes) {
          return err(fail('queue-overflow', `intent queue byte budget exceeded`, { path: intent.type, detail: { kind: 'bytes' } }));
        }
        this.queuedBytes = projected;
        this.queue[index] = { target, intent, mode, at: nowMs, bytes };
        return ok(undefined);
      }
    }

    if (this.queue.length >= this.limits.maxCount) {
      return err(fail('queue-overflow', `intent queue is at capacity ${String(this.limits.maxCount)}`, { path: intent.type, detail: { kind: 'count' } }));
    }
    if (this.queuedBytes + bytes > this.limits.maxBytes) {
      return err(fail('queue-overflow', `intent queue byte budget exceeded`, { path: intent.type, detail: { kind: 'bytes' } }));
    }

    this.queue.push({ target, intent, mode, at: nowMs, bytes });
    this.queuedBytes += bytes;
    return ok(undefined);
  }

  // Delivers every non-expired pending intent; expired ones are returned as
  // reason-coded errors (not silently dropped).
  flush(nowMs: number): FlushResult {
    const expired: WorkbenchError[] = [];
    let delivered = 0;
    for (const pending of this.queue) {
      // Closed interval: an intent lives for its full ttlMs window (age == ttlMs
      // is still deliverable); it expires only once age exceeds ttlMs.
      if (nowMs - pending.at > this.limits.ttlMs) {
        expired.push(fail('ttl-expired', `intent ${pending.intent.type} expired in queue`, { path: pending.intent.type }));
        continue;
      }
      delivered += this.deliver(pending);
    }
    this.queue = [];
    this.queuedBytes = 0;
    return { delivered, expired };
  }

  private deliver(pending: Pending): number {
    let count = 0;
    const scopes: ScopeNode[] = [];
    if (pending.mode === 'addressed') {
      scopes.push(pending.target);
    } else {
      let node: ScopeNode | null = pending.target;
      while (node !== null) {
        scopes.push(node);
        node = node.parent;
      }
    }
    for (const scope of scopes) {
      const handlers = this.listeners.get(scope)?.get(pending.intent.type);
      if (handlers === undefined) continue;
      for (const handler of handlers) {
        handler(pending.intent);
        count += 1;
      }
    }
    return count;
  }

  // Cancels an owner's pending intents (teardown). Returns how many were removed.
  cancelOwner(owner: string): number {
    const before = this.queue.length;
    const kept = this.queue.filter((p) => p.intent.owner !== owner);
    this.queuedBytes = kept.reduce((sum, p) => sum + p.bytes, 0);
    this.queue = kept;
    return before - kept.length;
  }

  pendingCount(): number {
    return this.queue.length;
  }
}
