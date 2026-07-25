// Surface / group / layout-preset contract types (derived from schemas).
import type { z } from 'zod';
import type { groupSchema, surfaceSchema } from './schemas';

export type Group = z.infer<typeof groupSchema>;
export type Surface = z.infer<typeof surfaceSchema>;

// A host-composed arrangement of surfaces into named slots. JSON-safe: slot ->
// ordered surface ids. Layout *runtime* state (v3 LayoutStore) lives in the
// kernel; this is only the declarative preset a manifest/host can ship.
export type LayoutPreset = {
  readonly id: string;
  readonly title: string;
  readonly slots: Readonly<Record<string, readonly string[]>>;
};
