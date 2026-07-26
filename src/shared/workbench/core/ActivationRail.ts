// Owner teardown and crash rail (WB-703).
//
// Each activation runs inside an owner ScopeNode; a failed setup rolls the scope
// back (child-first dispose) so no contribution/command/context/resource leaks
// and no partial activation is exposed. A repeatedly-crashing owner is
// quarantined (no auto-reactivation loop) with an operator-visible receipt.
import { type Result, type ScopeIdentity, ok, err, fail } from '../contract';
import type { ScopeNode } from './ScopeNode';

export type QuarantineReceipt = {
  readonly ownerId: string;
  readonly reason: string;
  readonly crashCount: number;
};

export type ActivationOutcome =
  | { readonly status: 'active'; readonly ownerId: string }
  | { readonly status: 'quarantined'; readonly ownerId: string; readonly receipt: QuarantineReceipt };

export class ActivationRail {
  private readonly owners = new Map<string, ScopeNode>();
  private readonly crashes = new Map<string, number>();
  private readonly quarantined = new Map<string, QuarantineReceipt>();

  constructor(
    private readonly parent: ScopeNode,
    private readonly maxCrashes = 3,
  ) {}

  // Activates an owner inside a fresh child scope. `setup` registers the owner's
  // resources on that scope; if it fails the scope is disposed (full rollback)
  // and no owner is registered — a partial activation never becomes visible.
  activate(ownerId: string, identity: ScopeIdentity, setup: (scope: ScopeNode) => Result<void>): Result<ScopeNode> {
    if (this.quarantined.has(ownerId)) {
      return err(fail('crash-quarantine', `owner ${ownerId} is quarantined`, { path: ownerId }));
    }
    if (this.owners.has(ownerId)) {
      return err(fail('duplicate-registration', `owner ${ownerId} is already active`, { path: ownerId }));
    }
    const child = this.parent.createChild(identity);
    if (!child.ok) return child;
    const scope = child.value;

    const result = setup(scope);
    if (!result.ok) {
      scope.dispose(); // rollback — zero leak, nothing exposed
      return result;
    }
    this.owners.set(ownerId, scope);
    return ok(scope);
  }

  // Reports a runtime crash for an owner: disposes its scope (reclaiming all
  // resources) and, past the crash ceiling, quarantines it so it cannot enter an
  // auto-reactivation loop.
  reportCrash(ownerId: string, reason: string): ActivationOutcome {
    const scope = this.owners.get(ownerId);
    if (scope !== undefined) {
      scope.dispose();
      this.owners.delete(ownerId);
    }
    const count = (this.crashes.get(ownerId) ?? 0) + 1;
    this.crashes.set(ownerId, count);

    if (count >= this.maxCrashes) {
      const receipt: QuarantineReceipt = { ownerId, reason, crashCount: count };
      this.quarantined.set(ownerId, receipt);
      return { status: 'quarantined', ownerId, receipt };
    }
    return { status: 'active', ownerId };
  }

  deactivate(ownerId: string): void {
    const scope = this.owners.get(ownerId);
    if (scope === undefined) return;
    scope.dispose();
    this.owners.delete(ownerId);
  }

  isQuarantined(ownerId: string): boolean {
    return this.quarantined.has(ownerId);
  }

  activeOwnerCount(): number {
    return this.owners.size;
  }

  quarantineReceipts(): readonly QuarantineReceipt[] {
    return [...this.quarantined.values()];
  }
}
