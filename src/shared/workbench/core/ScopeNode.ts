// Scope lifecycle authority (WB-201).
//
// A single immutable-parent tree (app -> workspace -> tab -> surface -> view).
// Parent is fixed at construction; there is no re-parent API. Dispose is
// child-first, idempotent, and reclaims every owned resource.
//
// React-free: no imports outside the contract.
import { type Result, type ScopeIdentity, type ScopeLifecycle, ok, err, fail } from '../contract';

export type Disposable = () => void;

export class ScopeNode {
  readonly identity: ScopeIdentity;
  readonly parent: ScopeNode | null;
  private readonly children = new Set<ScopeNode>();
  private readonly disposables: Disposable[] = [];
  private state: ScopeLifecycle = 'active';

  constructor(identity: ScopeIdentity, parent: ScopeNode | null = null) {
    this.identity = identity;
    this.parent = parent;
    parent?.children.add(this);
  }

  get lifecycle(): ScopeLifecycle {
    return this.state;
  }

  isActive(): boolean {
    return this.state === 'active';
  }

  // Children can only be created from their parent — parent is captured here and
  // never reassigned.
  createChild(identity: ScopeIdentity): Result<ScopeNode> {
    if (this.state !== 'active') {
      return err(fail('scope-disposed', `cannot create child under ${this.state} scope ${this.identity.id}`, { path: this.identity.id }));
    }
    return ok(new ScopeNode(identity, this));
  }

  // Register an owned teardown. Rejected once the scope is no longer active so a
  // late registration cannot leak past dispose.
  registerDisposable(disposable: Disposable): Result<void> {
    if (this.state !== 'active') {
      return err(fail('scope-disposed', `cannot register on ${this.state} scope ${this.identity.id}`, { path: this.identity.id }));
    }
    this.disposables.push(disposable);
    return ok(undefined);
  }

  childCount(): number {
    return this.children.size;
  }

  resourceCount(): number {
    return this.disposables.length;
  }

  // Idempotent, child-first teardown. Re-entrancy (a disposable disposing this
  // scope) and repeat calls are no-ops.
  dispose(): void {
    if (this.state !== 'active') return;
    this.state = 'disposing';

    // Each child/resource teardown is isolated: one throwing disposable must not
    // strand the rest or leave the scope stuck in `disposing` (standard
    // DisposableStore semantics).
    for (const child of [...this.children]) {
      try {
        child.dispose();
      } catch {
        /* isolate — teardown must complete */
      }
    }
    this.children.clear();

    // LIFO so teardown unwinds in reverse registration order.
    for (let i = this.disposables.length - 1; i >= 0; i -= 1) {
      try {
        this.disposables[i]();
      } catch {
        /* isolate — teardown must complete */
      }
    }
    this.disposables.length = 0;

    this.parent?.children.delete(this);
    this.state = 'disposed';
  }
}
