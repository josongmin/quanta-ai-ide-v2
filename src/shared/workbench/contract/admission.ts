// Host-neutral extension admission policy (WB-702).
//
// Trust, capability and resource budgets are decided BEFORE activation. Every
// denial is a typed, auditable result (never a silent omission). Validate-all so
// an operator sees the full reason set. React/Tauri-free.
import { type Result, type WorkbenchError, ok, err, fail } from './errors';
import type { Trust } from './scope';

export type Capability = string;

export type ResourceBudget = {
  readonly maxContributions: number;
  readonly maxContextBytes: number;
  readonly maxCommandRatePerSec: number;
  readonly maxActivationMs: number;
};

export type ResourceRequest = {
  readonly contributions: number;
  readonly contextBytes: number;
  readonly commandRatePerSec: number;
  readonly activationMs: number;
};

export type AdmissionRequest = {
  readonly ownerId: string;
  readonly trust: Trust;
  readonly requestedCapabilities: readonly Capability[];
  readonly grantedCapabilities: readonly Capability[];
  readonly resources: ResourceRequest;
  // top-level / chromeless / otherwise privileged surface placement
  readonly requestsPrivilegedSurface: boolean;
};

// Auditable admission verdict — carries the reason set on denial.
export type AdmissionVerdict =
  | { readonly admitted: true; readonly ownerId: string }
  | { readonly admitted: false; readonly ownerId: string; readonly denials: readonly WorkbenchError[] };

export function admitExtension(request: AdmissionRequest, budget: ResourceBudget): AdmissionVerdict {
  const denials: WorkbenchError[] = [];

  // Trust: an untrusted owner may not take a privileged surface.
  if (request.trust === 'untrusted' && request.requestsPrivilegedSurface) {
    denials.push(fail('untrusted-contribution', `untrusted owner ${request.ownerId} cannot take a privileged surface`, { path: request.ownerId }));
  }

  // Capability: every requested capability must be granted (no escalation).
  const granted = new Set(request.grantedCapabilities);
  for (const capability of request.requestedCapabilities) {
    if (!granted.has(capability)) {
      denials.push(fail('capability-denied', `capability ${capability} requested but not granted`, { path: request.ownerId, detail: { capability } }));
    }
  }

  // Resource budget: every dimension is checked before activation.
  const r = request.resources;
  if (r.contributions > budget.maxContributions) {
    denials.push(fail('resource-overflow', `contributions ${r.contributions} exceed budget ${budget.maxContributions}`, { path: request.ownerId, detail: { kind: 'contributions' } }));
  }
  if (r.contextBytes > budget.maxContextBytes) {
    denials.push(fail('byte-budget', `context bytes ${r.contextBytes} exceed budget ${budget.maxContextBytes}`, { path: request.ownerId, detail: { kind: 'contextBytes' } }));
  }
  if (r.commandRatePerSec > budget.maxCommandRatePerSec) {
    denials.push(fail('resource-overflow', `command rate ${r.commandRatePerSec}/s exceeds budget ${budget.maxCommandRatePerSec}/s`, { path: request.ownerId, detail: { kind: 'commandRate' } }));
  }
  if (r.activationMs > budget.maxActivationMs) {
    denials.push(fail('resource-overflow', `activation ${r.activationMs}ms exceeds budget ${budget.maxActivationMs}ms`, { path: request.ownerId, detail: { kind: 'activationMs' } }));
  }

  if (denials.length > 0) return { admitted: false, ownerId: request.ownerId, denials };
  return { admitted: true, ownerId: request.ownerId };
}

// Default budgets for the three trust tiers. Owner of budget units + defaults is
// this module; hosts may override per-owner.
export const DEFAULT_BUDGETS: Readonly<Record<Trust, ResourceBudget>> = {
  core: { maxContributions: 1024, maxContextBytes: 8 << 20, maxCommandRatePerSec: 1000, maxActivationMs: 5000 },
  trusted: { maxContributions: 256, maxContextBytes: 2 << 20, maxCommandRatePerSec: 200, maxActivationMs: 2000 },
  untrusted: { maxContributions: 32, maxContextBytes: 256 << 10, maxCommandRatePerSec: 20, maxActivationMs: 500 },
};

// Convenience wrapper returning a Result for callers that compose admission with
// other validate-all steps.
export function admitExtensionResult(request: AdmissionRequest, budget: ResourceBudget): Result<AdmissionRequest> {
  const verdict = admitExtension(request, budget);
  return verdict.admitted ? ok(request) : err(verdict.denials);
}
