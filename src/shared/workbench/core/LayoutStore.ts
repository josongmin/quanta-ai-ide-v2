// Layout store v3 + legacy migration (WB-214, WB-215).
//
// Layout mutations are operation transactions: the whole batch validates against
// a working copy and commits atomically or not at all. Corrupt persisted state is
// quarantined (raw + reason) and replaced in-memory by a deterministic safe
// layout WITHOUT rewriting the bad blob. v2 -> v3 migration is one-time and
// idempotent; on failure the legacy blob is preserved.
import { z } from 'zod';
import { type Result, ok, err, fail } from '../contract';

export const layoutV3Schema = z
  .object({ version: z.literal(3), slots: z.record(z.string(), z.array(z.string())) })
  .strict();
export type LayoutV3 = z.infer<typeof layoutV3Schema>;

const layoutV2Schema = z
  .object({ version: z.literal(2), panels: z.record(z.string(), z.array(z.string())) })
  .strict();

export type LayoutOp =
  | { readonly op: 'add'; readonly slot: string; readonly surfaceId: string }
  | { readonly op: 'remove'; readonly slot: string; readonly surfaceId: string }
  | { readonly op: 'move'; readonly from: string; readonly to: string; readonly surfaceId: string };

export type PersistencePort = {
  load(): unknown;
  save(layout: LayoutV3): void;
  quarantine(raw: unknown, reason: string): void;
};

export type MigrationReceipt = {
  readonly sourceVersion: number | 'unknown';
  readonly targetVersion: 3;
  readonly result: 'ok' | 'failed';
  readonly reason?: string;
};

function clone(layout: LayoutV3): LayoutV3 {
  return { version: 3, slots: Object.fromEntries(Object.entries(layout.slots).map(([k, v]) => [k, [...v]])) };
}

export class LayoutStore {
  private current: LayoutV3;

  constructor(private readonly port: PersistencePort, private readonly safeLayout: LayoutV3) {
    this.current = clone(safeLayout);
  }

  snapshot(): LayoutV3 {
    return clone(this.current);
  }

  // Loads persisted state; corrupt/unparseable state is quarantined and the safe
  // layout is used in-memory. The bad blob is never rewritten.
  load(): LayoutV3 {
    const raw = this.port.load();
    const parsed = layoutV3Schema.safeParse(raw);
    if (!parsed.success) {
      this.port.quarantine(raw, parsed.error.issues[0]?.message ?? 'unparseable layout');
      this.current = clone(this.safeLayout);
      return this.snapshot();
    }
    this.current = parsed.data;
    return this.snapshot();
  }

  // Operation transaction: validate the whole batch on a working copy, then
  // commit atomically. An invalid batch leaves current state untouched.
  apply(ops: readonly LayoutOp[]): Result<LayoutV3> {
    if (ops.length === 0) return ok(this.snapshot()); // nothing to persist
    const working = clone(this.current);
    for (const op of ops) {
      const stepError = applyOp(working, op);
      if (stepError !== null) return err(stepError); // no partial commit
    }
    const validated = layoutV3Schema.safeParse(working);
    if (!validated.success) {
      return err(fail('invalid-operation', 'operation batch produced an invalid layout', {}));
    }
    this.current = validated.data;
    this.port.save(this.current);
    return ok(this.snapshot());
  }

  // v2 -> v3, one-time and idempotent. An already-v3 blob passes through
  // unchanged; an unknown version fails (no best-effort) and preserves the legacy
  // blob (no save).
  migrateFrom(raw: unknown): Result<{ layout: LayoutV3; receipt: MigrationReceipt }> {
    const asV3 = layoutV3Schema.safeParse(raw);
    if (asV3.success) {
      return ok({ layout: asV3.data, receipt: { sourceVersion: 3, targetVersion: 3, result: 'ok' } });
    }
    const asV2 = layoutV2Schema.safeParse(raw);
    if (asV2.success) {
      const layout: LayoutV3 = { version: 3, slots: { ...asV2.data.panels } };
      return ok({ layout, receipt: { sourceVersion: 2, targetVersion: 3, result: 'ok' } });
    }
    return err(fail('migration-failed', 'unknown layout version; legacy blob preserved', { detail: { result: 'failed' } }));
  }
}

// Returns an error for an invalid step, or null on success. Mutates `working`.
function applyOp(working: LayoutV3, op: LayoutOp): ReturnType<typeof fail> | null {
  const at = (slot: string): string[] => {
    working.slots[slot] ??= [];
    return working.slots[slot];
  };
  switch (op.op) {
    case 'add': {
      const slot = at(op.slot);
      if (slot.includes(op.surfaceId)) return fail('invalid-operation', `${op.surfaceId} already in ${op.slot}`, { path: op.slot });
      slot.push(op.surfaceId);
      return null;
    }
    case 'remove': {
      const slot = working.slots[op.slot] ?? [];
      if (!slot.includes(op.surfaceId)) return fail('invalid-operation', `${op.surfaceId} not in ${op.slot}`, { path: op.slot });
      working.slots[op.slot] = slot.filter((id) => id !== op.surfaceId);
      return null;
    }
    case 'move': {
      const from = working.slots[op.from] ?? [];
      if (!from.includes(op.surfaceId)) return fail('invalid-operation', `${op.surfaceId} not in ${op.from}`, { path: op.from });
      working.slots[op.from] = from.filter((id) => id !== op.surfaceId);
      const to = at(op.to);
      if (!to.includes(op.surfaceId)) to.push(op.surfaceId);
      return null;
    }
  }
}
