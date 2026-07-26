// Portable schema artifact (WB-701).
//
// Exports the workbench manifest schema as a versioned, browser/Node-independent
// JSON Schema artifact with a content digest, plus a golden corpus (valid /
// invalid inputs + expected reason codes). The runtime validator and this
// artifact derive from the SAME zod schema, so their verdicts cannot diverge.
// No React/Tauri import.
import { manifestJsonSchema, CURRENT_MANIFEST_SCHEMA_VERSION } from './schemas';
import type { WorkbenchErrorReason } from './errors';

export const SCHEMA_ARTIFACT_VERSION = `manifest-v${CURRENT_MANIFEST_SCHEMA_VERSION}`;

function digest(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export type SchemaArtifact = {
  readonly version: string;
  readonly sourceSchemaVersion: number;
  readonly jsonSchema: unknown;
  readonly digest: string;
};

// Deterministic — same contract revision yields the same digest.
export function schemaArtifact(): SchemaArtifact {
  const jsonSchema = manifestJsonSchema();
  return {
    version: SCHEMA_ARTIFACT_VERSION,
    sourceSchemaVersion: CURRENT_MANIFEST_SCHEMA_VERSION,
    jsonSchema,
    digest: digest(JSON.stringify(jsonSchema)),
  };
}

// Golden corpus: each case is an input plus the reason code(s) a conformant
// validator must produce (empty for valid inputs). Shared by the runtime parser
// tests and any host-neutral validator.
export type GoldenCase = { readonly name: string; readonly input: unknown; readonly expect: readonly WorkbenchErrorReason[] };

const validManifest = {
  id: 'acme.feature',
  schemaVersion: CURRENT_MANIFEST_SCHEMA_VERSION,
  ownerVersion: '1.0.0',
  engine: { min: '1.0.0' },
  trust: 'trusted',
  contributions: {},
};

export const GOLDEN_CORPUS: readonly GoldenCase[] = [
  { name: 'valid', input: validManifest, expect: [] },
  { name: 'excess-payload', input: { ...validManifest, rogue: true }, expect: ['excess-payload'] },
  { name: 'schema-invalid', input: { ...validManifest, id: 'no-namespace' }, expect: ['schema-invalid'] },
  { name: 'unknown-schema-version', input: { ...validManifest, schemaVersion: 999 }, expect: ['unknown-schema-version'] },
];
