// Scope identity / lifecycle contract types.
//
// The runtime ScopeNode (chain lookup, dispose, context-key shadowing) is P2
// kernel work. This package fixes only the identity/ownership DTO the kernel and
// activation adapters agree on.
import type { z } from 'zod';
import type { trustSchema } from './schemas';

export type Trust = z.infer<typeof trustSchema>;

export type OwnerRef = {
  readonly owner: string; // namespace segment (e.g. 'core', 'acme')
  readonly trust: Trust;
};

export type ScopeKind = 'root' | 'workspace' | 'surface' | 'transient';

export type ScopeIdentity = {
  readonly id: string;
  readonly kind: ScopeKind;
  readonly owner: OwnerRef;
};

// Monotonic lifecycle: a scope never returns to an earlier state.
export type ScopeLifecycle = 'active' | 'disposing' | 'disposed';
