import { describe, it, expect } from 'vitest';
import { ActivationRail } from '../ActivationRail';
import { ScopeNode } from '../ScopeNode';
import { ok, err, fail, type ScopeIdentity } from '../../contract';

const root = (): ScopeNode => new ScopeNode({ id: 'core.app', kind: 'root', owner: { owner: 'core', trust: 'core' } });
const identity = (owner: string): ScopeIdentity => ({ id: `${owner}.surface`, kind: 'surface', owner: { owner, trust: 'untrusted' } });

describe('ActivationRail', () => {
  it('rolls back a failed activation with zero leak (no owner exposed)', () => {
    const rail = new ActivationRail(root());
    let disposed = false;
    const r = rail.activate('acme', identity('acme'), (scope) => {
      scope.registerDisposable(() => { disposed = true; });
      return err(fail('schema-invalid', 'bad manifest'));
    });
    expect(r.ok).toBe(false);
    expect(disposed).toBe(true); // scope disposed on rollback
    expect(rail.activeOwnerCount()).toBe(0); // no partial activation visible
  });

  it('rolls back (zero leak) when setup THROWS, not just returns err', () => {
    const rail = new ActivationRail(root());
    let disposed = false;
    const r = rail.activate('acme', identity('acme'), (scope) => {
      scope.registerDisposable(() => { disposed = true; });
      throw new Error('setup exploded');
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.reason).toBe('handler-error');
    expect(disposed).toBe(true); // scope disposed despite the throw
    expect(rail.activeOwnerCount()).toBe(0);
  });

  it('activates and reclaims all resources on deactivate', () => {
    const rail = new ActivationRail(root());
    let disposed = false;
    const r = rail.activate('acme', identity('acme'), (scope) => {
      scope.registerDisposable(() => { disposed = true; });
      return ok(undefined);
    });
    expect(r.ok).toBe(true);
    expect(rail.activeOwnerCount()).toBe(1);
    rail.deactivate('acme');
    expect(disposed).toBe(true);
    expect(rail.activeOwnerCount()).toBe(0);
  });

  it('quarantines a repeatedly-crashing owner instead of re-activation looping', () => {
    const rail = new ActivationRail(root(), 3);
    const setup = () => ok(undefined);
    for (let i = 0; i < 3; i += 1) {
      const a = rail.activate('acme', identity('acme'), setup);
      expect(a.ok).toBe(true);
      rail.reportCrash('acme', 'boom');
    }
    expect(rail.isQuarantined('acme')).toBe(true);
    // further activation is refused (no auto-reactivation loop)
    const blocked = rail.activate('acme', identity('acme'), setup);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.errors[0]?.reason).toBe('crash-quarantine');
    // operator-visible receipt
    expect(rail.quarantineReceipts()[0]).toMatchObject({ ownerId: 'acme', crashCount: 3 });
  });

  it('rejects a duplicate active owner', () => {
    const rail = new ActivationRail(root());
    rail.activate('acme', identity('acme'), () => ok(undefined));
    const dup = rail.activate('acme', identity('acme'), () => ok(undefined));
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.errors[0]?.reason).toBe('duplicate-registration');
  });
});
