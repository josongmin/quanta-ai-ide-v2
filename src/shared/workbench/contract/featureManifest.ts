// Feature manifest contract: parse (unknown -> typed DTO), manifest-set
// integrity (WB-103), and host compatibility (WB-106).
import type { z } from 'zod';
import {
  CURRENT_MANIFEST_SCHEMA_VERSION,
  featureManifestSchema,
  ownerOf,
  type DeepReadonly,
} from './schemas';
import { type Result, type WorkbenchError, ok, err, fail } from './errors';

export type FeatureManifest = DeepReadonly<z.infer<typeof featureManifestSchema>>;
export type ManifestSet = { readonly manifests: readonly FeatureManifest[] };

const RESERVED_NAMESPACE = 'core';

// ── parse: unknown -> typed DTO ─────────────────────────────────────────────
// Never mutates the input. Maps zod issue codes to reason codes; excess keys are
// a distinct reason from a shape error, and a future schemaVersion is rejected
// rather than permissively parsed.
export function parseFeatureManifest(input: unknown): Result<FeatureManifest> {
  const parsed = featureManifestSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues.map(issueToError));
  }
  if (parsed.data.schemaVersion > CURRENT_MANIFEST_SCHEMA_VERSION) {
    return err(
      fail('unknown-schema-version', `manifest schemaVersion ${parsed.data.schemaVersion} is newer than supported ${CURRENT_MANIFEST_SCHEMA_VERSION}`, {
        path: parsed.data.id,
        detail: { got: parsed.data.schemaVersion, supported: CURRENT_MANIFEST_SCHEMA_VERSION },
      }),
    );
  }
  return ok(parsed.data as FeatureManifest);
}

// Structural type keeps this independent of zod's internal issue type naming.
type ParseIssue = {
  readonly code: string;
  readonly message: string;
  readonly path: readonly PropertyKey[];
  readonly keys?: readonly string[];
};
function issueToError(issue: ParseIssue): WorkbenchError {
  const path = issue.path.map(String).join('.');
  if (issue.code === 'unrecognized_keys') {
    return fail('excess-payload', `unexpected key(s): ${(issue.keys ?? []).join(', ')}`, { path });
  }
  return fail('schema-invalid', issue.message, { path });
}

// ── manifest-set integrity (validate-all, order-independent) ─────────────────
// A single error yields no accepted result. Errors are sorted deterministically
// so manifest input order cannot change the verdict.
export function validateManifestSet(manifests: readonly FeatureManifest[]): Result<ManifestSet> {
  const errors: WorkbenchError[] = [];
  const seenIds = new Set<string>();
  const groupIds = new Set<string>();
  const surfaceIds = new Set<string>();
  const contextKinds = new Set<string>();

  // Pass 1: collect declared ids and flag duplicates / reserved namespaces.
  for (const manifest of manifests) {
    const declared: { id: string; register?: Set<string> }[] = [
      { id: manifest.id },
      ...manifest.contributions.groups.map((g) => ({ id: g.id, register: groupIds })),
      ...manifest.contributions.surfaces.map((s) => ({ id: s.id, register: surfaceIds })),
      ...manifest.contributions.commands.map((c) => ({ id: c.id })),
      ...manifest.contributions.settings.map((s) => ({ id: s.key })),
    ];
    for (const { id, register } of declared) {
      if (seenIds.has(id)) {
        errors.push(fail('duplicate-id', `duplicate id ${id}`, { path: id }));
      } else {
        seenIds.add(id);
      }
      register?.add(id);
      if (ownerOf(id) === RESERVED_NAMESPACE && manifest.trust !== 'core') {
        errors.push(
          fail('reserved-namespace', `namespace '${RESERVED_NAMESPACE}' is reserved for built-in owners`, {
            path: id,
            detail: { trust: manifest.trust },
          }),
        );
      }
    }
    for (const context of manifest.contributions.contexts) contextKinds.add(context.kind);
  }

  // Pass 2: resolve references now that every id is known (order-independent).
  for (const manifest of manifests) {
    for (const surface of manifest.contributions.surfaces) {
      if (!groupIds.has(surface.group)) {
        errors.push(fail('missing-reference', `surface ${surface.id} references unknown group ${surface.group}`, { path: surface.id }));
      }
      for (const kind of surface.contextKinds) {
        if (!contextKinds.has(kind)) {
          errors.push(fail('missing-reference', `surface ${surface.id} references unknown context kind ${kind}`, { path: surface.id }));
        }
      }
    }
    for (const command of manifest.contributions.commands) {
      if (command.surface !== undefined && !surfaceIds.has(command.surface)) {
        errors.push(fail('missing-reference', `command ${command.id} references unknown surface ${command.surface}`, { path: command.id }));
      }
    }
  }

  if (errors.length > 0) {
    errors.sort((a, b) => `${a.reason}:${a.path ?? ''}`.localeCompare(`${b.reason}:${b.path ?? ''}`));
    return err(errors);
  }
  return ok({ manifests });
}

// ── host compatibility (WB-106) ─────────────────────────────────────────────
export type HostCapability = {
  readonly engine: string; // host engine semver
  readonly supportedSchemaVersion: number;
};
export type InstalledOwner = { readonly ownerVersion: string };

function parseSemver(v: string): readonly [number, number, number] {
  const [major, minor, patch] = v.split('.').map(Number);
  return [major, minor, patch];
}
function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

// Deterministic across locale/time/order; the built-in and external paths call
// this same function so their verdicts are identical for the same input.
export function checkHostCompatibility(
  host: HostCapability,
  manifest: FeatureManifest,
  installed?: InstalledOwner,
): Result<FeatureManifest> {
  const errors: WorkbenchError[] = [];

  const belowMin = compareSemver(host.engine, manifest.engine.min) < 0;
  const aboveMax = manifest.engine.max !== undefined && compareSemver(host.engine, manifest.engine.max) > 0;
  if (belowMin || aboveMax) {
    errors.push(
      fail('engine-range-mismatch', `host engine ${host.engine} outside manifest range ${manifest.engine.min}..${manifest.engine.max ?? '∞'}`, {
        path: manifest.id,
        detail: { host: host.engine, min: manifest.engine.min, max: manifest.engine.max ?? null },
      }),
    );
  }

  if (manifest.schemaVersion !== host.supportedSchemaVersion) {
    errors.push(
      fail('schema-version-skew', `manifest schemaVersion ${manifest.schemaVersion} != host supported ${host.supportedSchemaVersion}`, {
        path: manifest.id,
        detail: { manifest: manifest.schemaVersion, host: host.supportedSchemaVersion },
      }),
    );
  }

  if (installed !== undefined && compareSemver(manifest.ownerVersion, installed.ownerVersion) < 0) {
    errors.push(
      fail('owner-downgrade', `manifest ownerVersion ${manifest.ownerVersion} is older than installed ${installed.ownerVersion}`, {
        path: manifest.id,
        detail: { manifest: manifest.ownerVersion, installed: installed.ownerVersion },
      }),
    );
  }

  return errors.length > 0 ? err(errors) : ok(manifest);
}
