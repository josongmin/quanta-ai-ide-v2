// Surface / group / layout-preset contract types (derived from schemas).
import type { z } from 'zod';
import type { groupSchema, surfaceSchema, DeepReadonly } from './schemas';

export type Group = z.infer<typeof groupSchema>;

// The single Surface Descriptor authority (owner/trust/icon/instancing explicit).
export type SurfaceDescriptor = DeepReadonly<z.infer<typeof surfaceSchema>>;
// Back-compat alias — same type, no second shape.
export type Surface = SurfaceDescriptor;

// A host-composed arrangement of surfaces into named slots. JSON-safe: slot ->
// ordered surface ids. Layout *runtime* state (v3 LayoutStore) lives in the
// kernel; this is only the declarative preset a manifest/host can ship.
export type LayoutPreset = {
  readonly id: string;
  readonly title: string;
  readonly slots: Readonly<Record<string, readonly string[]>>;
};
