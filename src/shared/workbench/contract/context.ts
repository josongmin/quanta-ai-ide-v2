// Context handoff contract + compatibility admission.
//
// A context handle points at an immutable envelope/ref, never a mutable payload.
// This module fixes the JSON-safe envelope DTO and the deterministic policy that
// decides whether a producer envelope may be handed to a receiver.
import type { z } from 'zod';
import type { contextKindSchema, contextEnvelopeSchema } from './schemas';
import type { Trust } from './scope';
import { type Result, type WorkbenchError, ok, err, fail } from './errors';

export type ContextKind = z.infer<typeof contextKindSchema>;
export type ContextEnvelope = z.infer<typeof contextEnvelopeSchema>;

export type Sensitivity = ContextEnvelope['sensitivity'];
export type Durability = ContextEnvelope['durability'];

// A receiver's declared appetite for a context handoff.
export type ContextReceiver = {
  readonly kind: string;
  readonly sensitivity: Sensitivity; // the level the receiver claims to handle
  readonly durability: Durability; // how long the receiver intends to retain it
  readonly trust: Trust;
};

const SENSITIVITY_ORDER: Readonly<Record<Sensitivity, number>> = {
  public: 0,
  internal: 1,
  secret: 2,
};
const DURABILITY_ORDER: Readonly<Record<Durability, number>> = {
  ephemeral: 0,
  session: 1,
  durable: 2,
};

// Deterministic: depends only on the two inputs, not on locale/time/order.
// Collects every violation (validate-all) so callers see the full reason set.
export function checkContextCompatibility(
  producer: ContextEnvelope,
  receiver: ContextReceiver,
): Result<ContextEnvelope> {
  const errors: WorkbenchError[] = [];

  if (producer.kind !== receiver.kind) {
    errors.push(
      fail('context-kind-mismatch', `context kind ${producer.kind} cannot satisfy receiver kind ${receiver.kind}`, {
        path: producer.ref,
        detail: { producer: producer.kind, receiver: receiver.kind },
      }),
    );
  }

  // A receiver may not relabel producer data at a LOWER sensitivity.
  if (SENSITIVITY_ORDER[receiver.sensitivity] < SENSITIVITY_ORDER[producer.sensitivity]) {
    errors.push(
      fail('sensitivity-downgrade', `receiver sensitivity ${receiver.sensitivity} is below producer ${producer.sensitivity}`, {
        path: producer.ref,
        detail: { producer: producer.sensitivity, receiver: receiver.sensitivity },
      }),
    );
  }

  // Secrets must not be retained durably — only via a SecretStoragePort ref.
  if (producer.sensitivity === 'secret' && DURABILITY_ORDER[receiver.durability] >= DURABILITY_ORDER.durable) {
    errors.push(
      fail('durable-secret', 'secret context cannot be retained with durable durability', {
        path: producer.ref,
        detail: { durability: receiver.durability },
      }),
    );
  }

  // Untrusted receivers cannot obtain internal/secret context.
  if (receiver.trust === 'untrusted' && SENSITIVITY_ORDER[producer.sensitivity] >= SENSITIVITY_ORDER.internal) {
    errors.push(
      fail('capability-escalation', `untrusted receiver cannot obtain ${producer.sensitivity} context`, {
        path: producer.ref,
        detail: { trust: receiver.trust, sensitivity: producer.sensitivity },
      }),
    );
  }

  return errors.length > 0 ? err(errors) : ok(producer);
}
