// Surface-open admission (WB-213).
//
// The kernel owner of "open a surface for a context". Surface resolution and
// navigation are INJECTED ports — core never imports the router. Admission is
// all-or-nothing: a rejected context or an unknown/disabled/untrusted surface
// creates no instance, and a cancelled open leaves no orphan.
import { type Result, ok, err, fail } from '../contract';
import type { ContextHandle, ContextStore } from './ContextStore';
import type { WorkspaceHandle } from './WorkspaceSession';

export type ResolvedSurface = {
  readonly id: string;
  readonly enabled: boolean;
  readonly trusted: boolean;
  readonly contextKind: string | null; // kind this surface accepts, or null for none
};
export type SurfaceResolverPort = { resolve(surfaceId: string): ResolvedSurface | null };
export type NavigationPort = {
  open(instanceId: string, surfaceId: string): void;
  focus(instanceId: string): void;
};

export type ReuseMode = 'new' | 'active-compatible' | 'singleton';
export type OpenRequest = {
  readonly surfaceId: string;
  readonly reuse: ReuseMode;
  readonly contextHandle?: ContextHandle;
  readonly workspace?: WorkspaceHandle;
  readonly signal?: AbortSignal;
};
export type OpenResult = { readonly instanceId: string; readonly reused: boolean };

type Instance = { readonly instanceId: string; readonly surfaceId: string; readonly contextKind: string | null };

export class SurfaceService {
  private readonly instances = new Map<string, Instance>();
  private counter = 0;

  constructor(
    private readonly resolver: SurfaceResolverPort,
    private readonly navigation: NavigationPort,
    private readonly contextStore?: ContextStore,
  ) {}

  openSurface(request: OpenRequest): Result<OpenResult> {
    const surface = this.resolver.resolve(request.surfaceId);
    if (surface === null) {
      return err(fail('surface-not-found', `no surface ${request.surfaceId}`, { path: request.surfaceId }));
    }
    if (!surface.enabled) {
      return err(fail('surface-disabled', `surface ${request.surfaceId} is disabled`, { path: request.surfaceId }));
    }
    if (!surface.trusted) {
      return err(fail('capability-denied', `surface ${request.surfaceId} is not trusted`, { path: request.surfaceId }));
    }

    // Context admission happens BEFORE any instance is created, so a rejected
    // context never leaves a partially-opened surface.
    if (request.contextHandle !== undefined) {
      if (surface.contextKind !== null && request.contextHandle.kind !== surface.contextKind) {
        return err(fail('context-kind-mismatch', `surface ${request.surfaceId} expects ${surface.contextKind} not ${request.contextHandle.kind}`, { path: request.surfaceId }));
      }
      if (this.contextStore !== undefined && request.workspace !== undefined) {
        const admitted = this.contextStore.acquire(request.contextHandle, request.workspace, 0);
        if (!admitted.ok) return admitted;
        admitted.value.release(); // admission check only; the instance re-acquires on mount
      }
    }

    // Reuse resolution.
    if (request.reuse === 'singleton' || request.reuse === 'active-compatible') {
      const existing = this.findReusable(surface, request);
      if (existing !== null) {
        if (this.aborted(request)) return err(fail('command-aborted', `open ${request.surfaceId} aborted`, { path: request.surfaceId }));
        this.navigation.focus(existing.instanceId);
        return ok({ instanceId: existing.instanceId, reused: true });
      }
    }

    // Cancellation must leave no orphan — check before we mutate any state.
    if (this.aborted(request)) {
      return err(fail('command-aborted', `open ${request.surfaceId} aborted`, { path: request.surfaceId }));
    }

    this.counter += 1;
    const instanceId = `${request.surfaceId}#${this.counter}`;
    // The instance records the context kind it was OPENED WITH (not the surface's
    // declared kind) so active-compatible reuse compares like-for-like.
    this.instances.set(instanceId, { instanceId, surfaceId: request.surfaceId, contextKind: request.contextHandle?.kind ?? null });
    this.navigation.open(instanceId, request.surfaceId);
    return ok({ instanceId, reused: false });
  }

  closeSurface(instanceId: string): void {
    this.instances.delete(instanceId);
  }

  instanceCount(): number {
    return this.instances.size;
  }

  private findReusable(surface: ResolvedSurface, request: OpenRequest): Instance | null {
    for (const instance of this.instances.values()) {
      if (instance.surfaceId !== surface.id) continue;
      if (request.reuse === 'singleton') return instance;
      // active-compatible: only reuse when the context kind matches — an
      // incompatible active instance is never wrongly reused.
      const wantKind = request.contextHandle?.kind ?? null;
      if (instance.contextKind === wantKind) return instance;
    }
    return null;
  }

  private aborted(request: OpenRequest): boolean {
    return request.signal?.aborted === true;
  }
}
