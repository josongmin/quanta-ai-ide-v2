// Workspace session identity (WB-211).
//
// A workspace has a stable id, an immutable content revision, and independent
// search/Facts generations. Rolling a generation invalidates outstanding
// handles/requests. Dirty state is tracked separately from the immutable
// revision — they are never conflated.
import { type Result, ok, err, fail } from '../contract';

export type Generation = number;

export type WorkspaceIdentity = {
  readonly workspaceId: string;
  readonly revision: string;
  readonly searchGeneration: Generation;
  readonly factsGeneration: Generation;
};

// A snapshot captured by a request/handle at issue time.
export type WorkspaceHandle = {
  readonly workspaceId: string;
  readonly searchGeneration: Generation;
  readonly factsGeneration: Generation;
};

export class WorkspaceSession {
  private current: WorkspaceIdentity;
  private dirtyFlag = false;

  constructor(workspaceId: string, revision: string) {
    this.current = { workspaceId, revision, searchGeneration: 0, factsGeneration: 0 };
  }

  get identity(): WorkspaceIdentity {
    return this.current;
  }

  isDirty(): boolean {
    return this.dirtyFlag;
  }

  // Dirty is mutable and orthogonal to the immutable revision identity.
  markDirty(): void {
    this.dirtyFlag = true;
  }

  clearDirty(): void {
    this.dirtyFlag = false;
  }

  captureHandle(): WorkspaceHandle {
    return {
      workspaceId: this.current.workspaceId,
      searchGeneration: this.current.searchGeneration,
      factsGeneration: this.current.factsGeneration,
    };
  }

  rollSearchGeneration(): WorkspaceIdentity {
    this.current = { ...this.current, searchGeneration: this.current.searchGeneration + 1 };
    return this.current;
  }

  rollFactsGeneration(): WorkspaceIdentity {
    this.current = { ...this.current, factsGeneration: this.current.factsGeneration + 1 };
    return this.current;
  }

  // Two workspaces with the same revision string are NOT the same identity.
  sameIdentity(other: WorkspaceIdentity): boolean {
    return (
      this.current.workspaceId === other.workspaceId &&
      this.current.revision === other.revision &&
      this.current.searchGeneration === other.searchGeneration &&
      this.current.factsGeneration === other.factsGeneration
    );
  }

  // A handle is stale if it belongs to a different workspace or an older
  // generation — either way its request must be rejected, not silently coerced.
  validateHandle(handle: WorkspaceHandle): Result<void> {
    if (handle.workspaceId !== this.current.workspaceId) {
      return err(fail('wrong-workspace', `handle workspace ${handle.workspaceId} != current ${this.current.workspaceId}`, { path: handle.workspaceId }));
    }
    if (handle.searchGeneration !== this.current.searchGeneration || handle.factsGeneration !== this.current.factsGeneration) {
      return err(fail('stale-handle', `handle generation is stale for workspace ${this.current.workspaceId}`, { path: this.current.workspaceId }));
    }
    return ok(undefined);
  }
}
