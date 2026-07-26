// Reason-coded admission errors for the workbench contract layer.
//
// Every rejection path returns a machine-readable `reason` (never a bare boolean
// or a substring-matched string). Consumers switch on `reason`; the union is
// exhaustive so adding a reason forces every handler to acknowledge it.

export type WorkbenchErrorReason =
  // schema / serialization
  | 'schema-invalid'
  | 'unknown-schema-version'
  | 'excess-payload'
  | 'non-json-value'
  // manifest set integrity
  | 'duplicate-id'
  | 'missing-reference'
  | 'reserved-namespace'
  // context handoff policy
  | 'sensitivity-downgrade'
  | 'durable-secret'
  | 'capability-escalation'
  | 'context-kind-mismatch'
  // host compatibility
  | 'engine-range-mismatch'
  | 'schema-version-skew'
  | 'owner-downgrade'
  // configuration / secrets
  | 'untrusted-contribution'
  | 'secret-plaintext'
  | 'unknown-setting'
  | 'scope-not-allowed'
  // kernel runtime (WBT-02) — one taxonomy for the whole workbench
  | 'scope-disposed'
  | 'scope-inactive'
  | 'duplicate-registration'
  | 'unknown-command'
  | 'capability-denied'
  | 'command-aborted'
  | 'command-timeout'
  | 'handler-error'
  | 'unknown-context-key'
  | 'context-type-mismatch'
  | 'wrong-scope'
  | 'queue-overflow'
  | 'ttl-expired'
  // workspace / context store / surface / layout (WBT-03)
  | 'stale-handle'
  | 'wrong-workspace'
  | 'lease-expired'
  | 'byte-budget'
  | 'schema-skew'
  | 'surface-not-found'
  | 'surface-disabled'
  | 'reuse-conflict'
  | 'layout-corrupt'
  | 'invalid-operation'
  | 'migration-failed'
  // React host lifecycle (WBT-04)
  | 'invalid-transition'
  // extension admission (WBT-08)
  | 'resource-overflow'
  | 'crash-quarantine';

// One rejection. `path` locates the offending node (e.g. a manifest id or a
// JSON pointer); `detail` carries structured, JSON-safe context for diagnostics.
export type WorkbenchError = {
  readonly reason: WorkbenchErrorReason;
  readonly message: string;
  readonly path?: string;
  readonly detail?: Readonly<Record<string, string | number | boolean | null>>;
};

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err = { readonly ok: false; readonly errors: readonly WorkbenchError[] };

// A validation result. Failures carry ALL errors (validate-all semantics), never
// a truncated first-failure — callers that need atomic admission check `ok`.
export type Result<T> = Ok<T> | Err;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err(errors: WorkbenchError | readonly WorkbenchError[]): Err {
  return { ok: false, errors: Array.isArray(errors) ? errors : [errors] };
}

export function fail(
  reason: WorkbenchErrorReason,
  message: string,
  extra?: Pick<WorkbenchError, 'path' | 'detail'>,
): WorkbenchError {
  return { reason, message, ...extra };
}
