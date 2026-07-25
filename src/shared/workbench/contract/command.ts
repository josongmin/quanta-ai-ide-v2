// Command contribution contract + result/error input types (derived from schemas).
//
// Command *handlers* are native and owned by the P4 activation adapter, not this
// package. Here we only fix the declarative contribution DTO and the JSON-safe
// result envelope the kernel admits.
import type { z } from 'zod';
import type { commandSchema, WhenExpr } from './schemas';
import type { WorkbenchError } from './errors';

export type { WhenExpr };
export type CommandContribution = z.infer<typeof commandSchema>;

// Result of a command dispatch as seen at the contract boundary. Success carries
// a JSON-safe value; failure is reason-coded (never a bare string/boolean).
export type CommandResult<T> =
  | { readonly status: 'ok'; readonly value: T }
  | { readonly status: 'error'; readonly error: WorkbenchError };
