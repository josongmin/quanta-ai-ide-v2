import type { FixSeed } from '../model';

export type SeedValidationError =
  | { kind: 'missing-evidence'; seedId: string }
  | { kind: 'empty-symptom'; seedId: string };

// Front-of-pipeline gate. Without `evidenceRefs` the candidate generator
// degenerates into a chat-completion guess — the entire proof story
// downstream is built on top of these refs, so we refuse the seed early
// rather than silently lower the bar.
export function validateSeed(seed: FixSeed): SeedValidationError | null {
  if (seed.evidenceRefs.length === 0) {
    return { kind: 'missing-evidence', seedId: seed.id };
  }
  if (seed.symptom.trim().length === 0) {
    return { kind: 'empty-symptom', seedId: seed.id };
  }
  return null;
}

export function describeError(err: SeedValidationError): string {
  switch (err.kind) {
    case 'missing-evidence':
      return `seed ${err.seedId}: evidence_refs 비어있음 — generator 거부`;
    case 'empty-symptom':
      return `seed ${err.seedId}: symptom 누락`;
  }
}
