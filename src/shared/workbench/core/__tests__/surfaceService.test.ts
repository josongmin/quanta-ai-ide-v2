import { describe, it, expect } from 'vitest';
import { SurfaceService, type ResolvedSurface, type NavigationPort } from '../SurfaceService';
import type { ContextHandle } from '../ContextStore';

function make(surfaces: Record<string, ResolvedSurface | null>): { svc: SurfaceService; opened: string[]; focused: string[] } {
  const opened: string[] = [];
  const focused: string[] = [];
  const nav: NavigationPort = {
    open: (instanceId) => opened.push(instanceId),
    focus: (instanceId) => focused.push(instanceId),
  };
  const resolver = { resolve: (id: string): ResolvedSurface | null => surfaces[id] ?? null };
  return { svc: new SurfaceService(resolver, nav), opened, focused };
}

const surface = (over: Partial<ResolvedSurface> = {}): ResolvedSurface => ({ id: 'core.editor', enabled: true, trusted: true, contextKind: 'file', ...over });
const handle = (kind: string): ContextHandle => ({ id: 'ref:1', kind, schema: 's', workspace: { workspaceId: 'ws', searchGeneration: 0, factsGeneration: 0 } });

describe('SurfaceService admission', () => {
  it('rejects unknown, disabled, and untrusted surfaces', () => {
    const { svc } = make({ 'core.a': null, 'core.b': surface({ id: 'core.b', enabled: false }), 'core.c': surface({ id: 'core.c', trusted: false }) });
    const notFound = svc.openSurface({ surfaceId: 'core.a', reuse: 'new' });
    expect(!notFound.ok && notFound.errors[0]?.reason).toBe('surface-not-found');
    const disabled = svc.openSurface({ surfaceId: 'core.b', reuse: 'new' });
    expect(!disabled.ok && disabled.errors[0]?.reason).toBe('surface-disabled');
    const untrusted = svc.openSurface({ surfaceId: 'core.c', reuse: 'new' });
    expect(!untrusted.ok && untrusted.errors[0]?.reason).toBe('capability-denied');
  });

  it('rejects a context-kind mismatch and creates no instance', () => {
    const { svc } = make({ 'core.editor': surface({ contextKind: 'file' }) });
    const r = svc.openSurface({ surfaceId: 'core.editor', reuse: 'new', contextHandle: handle('database') });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.reason).toBe('context-kind-mismatch');
    expect(svc.instanceCount()).toBe(0);
  });
});

describe('SurfaceService reuse', () => {
  it('singleton focuses the existing instance', () => {
    const { svc, opened, focused } = make({ 'core.editor': surface() });
    const first = svc.openSurface({ surfaceId: 'core.editor', reuse: 'singleton', contextHandle: handle('file') });
    const second = svc.openSurface({ surfaceId: 'core.editor', reuse: 'singleton', contextHandle: handle('file') });
    expect(first.ok && !first.value.reused).toBe(true);
    expect(second.ok && second.value.reused).toBe(true);
    expect(opened).toHaveLength(1);
    expect(focused).toHaveLength(1);
    expect(svc.instanceCount()).toBe(1);
  });

  it('active-compatible reuses a matching kind but opens new for an incompatible one', () => {
    const { svc } = make({ 'core.editor': surface({ contextKind: null }) });
    const a = svc.openSurface({ surfaceId: 'core.editor', reuse: 'active-compatible', contextHandle: handle('file') });
    const sameKind = svc.openSurface({ surfaceId: 'core.editor', reuse: 'active-compatible', contextHandle: handle('file') });
    const otherKind = svc.openSurface({ surfaceId: 'core.editor', reuse: 'active-compatible', contextHandle: handle('database') });
    expect(a.ok && !a.value.reused).toBe(true);
    expect(sameKind.ok && sameKind.value.reused).toBe(true); // same kind -> reused
    expect(otherKind.ok && !otherKind.value.reused).toBe(true); // incompatible -> new
    expect(svc.instanceCount()).toBe(2);
  });

  it('new always opens a fresh instance', () => {
    const { svc } = make({ 'core.editor': surface({ contextKind: null }) });
    svc.openSurface({ surfaceId: 'core.editor', reuse: 'new' });
    svc.openSurface({ surfaceId: 'core.editor', reuse: 'new' });
    expect(svc.instanceCount()).toBe(2);
  });

  it('does not create an instance when the open is aborted', () => {
    const { svc, opened } = make({ 'core.editor': surface({ contextKind: null }) });
    const r = svc.openSurface({ surfaceId: 'core.editor', reuse: 'new', signal: AbortSignal.abort() });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.reason).toBe('command-aborted');
    expect(svc.instanceCount()).toBe(0);
    expect(opened).toHaveLength(0);
  });
});
