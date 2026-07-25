import { describe, it, expect } from 'vitest';
import { WorkspaceSession } from '../WorkspaceSession';

describe('WorkspaceSession identity', () => {
  it('stales a captured handle after a generation rollover', () => {
    const session = new WorkspaceSession('ws-1', 'rev-a');
    const handle = session.captureHandle();
    expect(session.validateHandle(handle).ok).toBe(true);
    session.rollSearchGeneration();
    const after = session.validateHandle(handle);
    expect(after.ok).toBe(false);
    if (!after.ok) expect(after.errors[0]?.reason).toBe('stale-handle');
  });

  it('does not treat a different workspace with the same revision as equal', () => {
    const a = new WorkspaceSession('ws-1', 'rev-x');
    const b = new WorkspaceSession('ws-2', 'rev-x');
    expect(a.sameIdentity(b.identity)).toBe(false);
    const handleB = b.captureHandle();
    const cross = a.validateHandle(handleB);
    expect(cross.ok).toBe(false);
    if (!cross.ok) expect(cross.errors[0]?.reason).toBe('wrong-workspace');
  });

  it('keeps dirty state separate from the immutable revision identity', () => {
    const session = new WorkspaceSession('ws-1', 'rev-a');
    const before = session.identity;
    session.markDirty();
    expect(session.isDirty()).toBe(true);
    expect(session.identity).toEqual(before); // dirty did not change identity
    session.clearDirty();
    expect(session.isDirty()).toBe(false);
  });
});
