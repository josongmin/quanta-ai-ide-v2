import { describe, it, expect } from 'vitest';
import { ScopeNode } from '../ScopeNode';
import type { ScopeIdentity, ScopeKind } from '../../contract';

function id(name: string, kind: ScopeKind = 'transient'): ScopeIdentity {
  return { id: `core.${name}`, kind, owner: { owner: 'core', trust: 'core' } };
}

describe('ScopeNode lifecycle', () => {
  it('disposes children before the parent and reclaims counts', () => {
    const order: string[] = [];
    const root = new ScopeNode(id('root', 'root'));
    root.registerDisposable(() => order.push('root'));
    const childR = root.createChild(id('child'));
    expect(childR.ok).toBe(true);
    if (!childR.ok) return;
    const child = childR.value;
    child.registerDisposable(() => order.push('child'));

    expect(root.childCount()).toBe(1);
    root.dispose();

    expect(order).toEqual(['child', 'root']); // child-first, deterministic
    expect(root.childCount()).toBe(0);
    expect(root.resourceCount()).toBe(0);
    expect(root.lifecycle).toBe('disposed');
    expect(child.lifecycle).toBe('disposed');
  });

  it('is idempotent — repeat dispose has no side effect', () => {
    let count = 0;
    const scope = new ScopeNode(id('s'));
    scope.registerDisposable(() => (count += 1));
    scope.dispose();
    scope.dispose();
    expect(count).toBe(1);
  });

  it('rejects register/createChild on a disposed scope with a typed error', () => {
    const scope = new ScopeNode(id('s'));
    scope.dispose();
    const reg = scope.registerDisposable(() => undefined);
    expect(reg.ok).toBe(false);
    if (!reg.ok) expect(reg.errors[0]?.reason).toBe('scope-disposed');
    const child = scope.createChild(id('c'));
    expect(child.ok).toBe(false);
    if (!child.ok) expect(child.errors[0]?.reason).toBe('scope-disposed');
  });

  it('completes teardown even if a disposable throws (isolation)', () => {
    const order: string[] = [];
    const scope = new ScopeNode(id('s'));
    scope.registerDisposable(() => {
      order.push('a');
    });
    scope.registerDisposable(() => {
      throw new Error('boom');
    });
    scope.registerDisposable(() => {
      order.push('c');
    });
    expect(() => {
      scope.dispose();
    }).not.toThrow();
    // LIFO: c (top), then the throwing one (isolated), then a — all reached.
    expect(order).toEqual(['c', 'a']);
    expect(scope.lifecycle).toBe('disposed');
    expect(scope.resourceCount()).toBe(0);
  });

  it('exposes no re-parent API (parent is readonly and fixed at construction)', () => {
    const root = new ScopeNode(id('root', 'root'));
    const childR = root.createChild(id('child'));
    if (!childR.ok) throw new Error('unreachable');
    expect(childR.value.parent).toBe(root);
    expect('setParent' in childR.value).toBe(false);
    expect('reparent' in childR.value).toBe(false);
  });
});
