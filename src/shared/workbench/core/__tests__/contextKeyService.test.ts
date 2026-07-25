import { describe, it, expect } from 'vitest';
import { ContextKeyService } from '../ContextKeyService';
import { ScopeNode } from '../ScopeNode';
import type { ScopeIdentity, WhenExpr } from '../../contract';

const identity = (name: string): ScopeIdentity => ({ id: `core.${name}`, kind: 'surface', owner: { owner: 'core', trust: 'core' } });

function tree(): { root: ScopeNode; child: ScopeNode } {
  const root = new ScopeNode(identity('root'));
  const childR = root.createChild(identity('child'));
  if (!childR.ok) throw new Error('unreachable');
  return { root, child: childR.value };
}

describe('ContextKeyService projection', () => {
  it('merges parent keys and shadows them from a child', () => {
    const svc = new ContextKeyService();
    const { root, child } = tree();
    svc.set(root, 'editorFocused', true);
    svc.set(root, 'panel', 'explorer');
    svc.set(child, 'panel', 'search'); // child shadows parent

    expect(svc.lookup(child, 'editorFocused')).toBe(true); // inherited
    expect(svc.lookup(child, 'panel')).toBe('search'); // shadowed
    expect(svc.lookup(root, 'panel')).toBe('explorer'); // parent unaffected
  });

  it('restores the parent projection after the child disposes', () => {
    const svc = new ContextKeyService();
    const { root, child } = tree();
    svc.set(root, 'panel', 'explorer');
    svc.set(child, 'panel', 'search');
    expect(svc.lookup(child, 'panel')).toBe('search');
    child.dispose();
    expect(svc.lookup(root, 'panel')).toBe('explorer');
  });

  it('fails closed on an unknown key and on a type mismatch', () => {
    const svc = new ContextKeyService();
    const { root } = tree();
    const unknown = svc.evaluate(root, { op: 'context', key: 'nope' });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.errors[0]?.reason).toBe('unknown-context-key');

    svc.set(root, 'count', 3); // not boolean
    const mismatch = svc.evaluate(root, { op: 'context', key: 'count' });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.errors[0]?.reason).toBe('context-type-mismatch');
  });

  it('evaluates when-expressions independent of registration order', () => {
    const svc = new ContextKeyService();
    const { root } = tree();
    const expr: WhenExpr = { op: 'and', items: [{ op: 'context', key: 'a' }, { op: 'not', item: { op: 'context', key: 'b' } }] };
    svc.set(root, 'b', false);
    svc.set(root, 'a', true);
    const first = svc.evaluate(root, expr);
    // set in the opposite order in a fresh tree — same verdict
    const svc2 = new ContextKeyService();
    const t2 = tree();
    svc2.set(t2.root, 'a', true);
    svc2.set(t2.root, 'b', false);
    const second = svc2.evaluate(t2.root, expr);
    expect(first).toEqual(second);
    expect(first).toEqual({ ok: true, value: true });
  });
});
