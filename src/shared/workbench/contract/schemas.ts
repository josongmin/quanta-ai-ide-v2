// Single source of truth for the workbench contract shape.
//
// TypeScript types are derived from these schemas (`z.infer`) so the runtime
// validator and the compile-time type can never diverge (see Stop/rollback:
// "schema와 TypeScript 타입이 서로 다른 source of truth가 되면 중단"). A JSON
// Schema is exported from the same objects (`z.toJSONSchema`) so external tools
// validate against the identical shape.
//
// No React/DOM/router/state/Tauri imports — `zod` only.
import { z } from 'zod';
import { type Result, ok, err, fail } from './errors';

// Deep-readonly view of an inferred DTO. Contract types are handed out through
// this so a consumer cannot mutate an admitted DTO (WB-101: DTO readonly).
export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

// ── JSON-safe primitives ──────────────────────────────────────────────────
// Rejects functions, symbols, undefined, class instances — anything that does
// not survive a JSON round-trip.
export const jsonPrimitive = z.union([
  z.string(),
  z.number().refine(Number.isFinite, 'must be a finite number'),
  z.boolean(),
  z.null(),
]);
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };
export const jsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([jsonPrimitive, z.array(jsonValue), z.record(z.string(), jsonValue)]),
);

// ── Identity ──────────────────────────────────────────────────────────────
// Owner-namespaced id: `<owner>.<name>[.<sub>...]`. Lowercase kebab segments.
const SEGMENT = '[a-z][a-z0-9-]*';
export const idSchema = z
  .string()
  .regex(new RegExp(`^${SEGMENT}(?:\\.${SEGMENT})+$`), 'id must be owner-namespaced: <owner>.<name>');
export const namespaceSchema = z.string().regex(new RegExp(`^${SEGMENT}$`), 'namespace must be a single kebab segment');

export function ownerOf(id: string): string {
  return id.slice(0, id.indexOf('.'));
}

// ── Versions / compatibility tuple ─────────────────────────────────────────
export const semverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'version must be MAJOR.MINOR.PATCH');
export const engineRangeSchema = z
  .object({ min: semverSchema, max: semverSchema.optional() })
  .strict();

// ── Sensitivity / durability / trust ───────────────────────────────────────
export const sensitivitySchema = z.enum(['public', 'internal', 'secret']);
export const durabilitySchema = z.enum(['ephemeral', 'session', 'durable']);
export const trustSchema = z.enum(['core', 'trusted', 'untrusted']);

// ── When-expression (JSON-safe boolean tree for command/surface visibility) ─
export type WhenExpr =
  | { readonly op: 'true' }
  | { readonly op: 'context'; readonly key: string }
  | { readonly op: 'not'; readonly item: WhenExpr }
  | { readonly op: 'and'; readonly items: readonly WhenExpr[] }
  | { readonly op: 'or'; readonly items: readonly WhenExpr[] };
export const whenExprSchema: z.ZodType<WhenExpr> = z.lazy(() =>
  z.discriminatedUnion('op', [
    z.object({ op: z.literal('true') }).strict(),
    z.object({ op: z.literal('context'), key: z.string().min(1) }).strict(),
    z.object({ op: z.literal('not'), item: whenExprSchema }).strict(),
    z.object({ op: z.literal('and'), items: z.array(whenExprSchema) }).strict(),
    z.object({ op: z.literal('or'), items: z.array(whenExprSchema) }).strict(),
  ]),
);

// ── Contributions ───────────────────────────────────────────────────────────
export const groupSchema = z.object({ id: idSchema, title: z.string().min(1) }).strict();

// The single Surface Descriptor authority. Owner and trust are EXPLICIT fields —
// never parsed from the id string. `icon` is a serialisable name (host maps it to
// a component). Manifests and the built-in catalog both materialise this one
// shape; there is no second surface type.
export const surfaceSchema = z
  .object({
    id: idSchema,
    owner: namespaceSchema,
    trust: trustSchema,
    title: z.string().min(1),
    group: idSchema,
    icon: z.string().min(1),
    instancing: z.enum(['singleton', 'multi']).default('singleton'),
    contextKinds: z.array(z.string().min(1)).default([]),
    when: whenExprSchema.optional(),
  })
  .strict()
  // Owner must match the id namespace — a surface cannot claim a foreign owner
  // (e.g. id 'acme.x' declaring owner 'core' to escalate to core authority).
  .refine((s) => ownerOf(s.id) === s.owner, { message: 'owner must equal the id namespace', path: ['owner'] });

export const commandSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1),
    surface: idSchema.optional(),
    when: whenExprSchema.optional(),
  })
  .strict();

export const contextKindSchema = z
  .object({
    kind: z.string().min(1),
    sensitivity: sensitivitySchema,
    durability: durabilitySchema,
  })
  .strict();

export const settingScopeSchema = z.enum(['default', 'user', 'workspace', 'folder']);
export const settingSchema = z
  .object({
    key: idSchema,
    scope: settingScopeSchema,
    type: z.enum(['string', 'number', 'boolean', 'json']),
    default: jsonValue,
    restricted: z.boolean().default(false),
    secret: z.boolean().default(false),
  })
  .strict();

// ── Feature manifest ────────────────────────────────────────────────────────
export const CURRENT_MANIFEST_SCHEMA_VERSION = 1;
export const featureManifestSchema = z
  .object({
    id: idSchema,
    schemaVersion: z.number().int().positive(),
    ownerVersion: semverSchema,
    engine: engineRangeSchema,
    trust: trustSchema,
    contributions: z
      .object({
        groups: z.array(groupSchema).default([]),
        surfaces: z.array(surfaceSchema).default([]),
        commands: z.array(commandSchema).default([]),
        contexts: z.array(contextKindSchema).default([]),
        settings: z.array(settingSchema).default([]),
      })
      .strict()
      .default({ groups: [], surfaces: [], commands: [], contexts: [], settings: [] }),
  })
  .strict();

// ── Context envelope (bounded handoff DTO, not the payload) ──────────────────
export const contextEnvelopeSchema = z
  .object({
    kind: z.string().min(1),
    sensitivity: sensitivitySchema,
    durability: durabilitySchema,
    // immutable reference to the payload owner, never the payload itself
    ref: z.string().min(1),
    bytes: z.number().int().nonnegative(),
    metadata: z.record(z.string(), jsonValue).default({}),
  })
  .strict();

// ── serialization guard (WB-102) ────────────────────────────────────────────
// Rejects any value that would not survive a JSON round-trip — functions,
// symbols, undefined, React elements, class instances with methods.
export function assertJsonSafe(value: unknown): Result<JsonValue> {
  const parsed = jsonValue.safeParse(value);
  if (!parsed.success) {
    return err(
      fail('non-json-value', 'value is not JSON-safe (functions/symbols/undefined/React values are rejected)', {
        path: parsed.error.issues[0]?.path.map(String).join('.') ?? '',
      }),
    );
  }
  return ok(parsed.data);
}

// JSON Schema export — external tooling validates against the identical shape
// that the runtime parser enforces (WB-102: same golden corpus).
export function manifestJsonSchema(): unknown {
  return z.toJSONSchema(featureManifestSchema);
}
