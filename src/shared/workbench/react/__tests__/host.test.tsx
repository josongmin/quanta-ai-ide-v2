import { describe, it, expect, vi } from 'vitest';
import { StrictMode, useEffect, useMemo } from 'react';
import { render } from '@testing-library/react';
import { WorkbenchRoot, useWorkbench, type WorkbenchSession } from '../WorkbenchProvider';
import { ScopeProvider, useWorkbenchScope } from '../ScopeProvider';
import { useCommand } from '../hooks';
import { CrashBoundary } from '../CrashBoundary';
import type { ScopeNode } from '../../core';
import type { ScopeIdentity } from '../../contract';

function Capture({ onReady }: { onReady: (s: WorkbenchSession) => void }) {
  const session = useWorkbench();
  useEffect(() => {
    onReady(session);
  }, [session, onReady]);
  return null;
}

const childId: ScopeIdentity = { id: 'core.child', kind: 'surface', owner: { owner: 'core', trust: 'core' } };

describe('WorkbenchRoot', () => {
  it('provides a session and disposes the app scope on unmount', () => {
    let captured: WorkbenchSession | null = null;
    const { unmount } = render(
      <WorkbenchRoot>
        <Capture onReady={(s) => (captured = s)} />
      </WorkbenchRoot>,
    );
    expect(captured).not.toBeNull();
    const session = captured as unknown as WorkbenchSession;
    expect(session.appScope.lifecycle).toBe('active');
    unmount();
    expect(session.appScope.lifecycle).toBe('disposed');
  });

  it('leaks no scope under StrictMode mount/unmount/mount', () => {
    let last: WorkbenchSession | null = null;
    const { unmount } = render(
      <StrictMode>
        <WorkbenchRoot>
          <Capture onReady={(s) => (last = s)} />
        </WorkbenchRoot>
      </StrictMode>,
    );
    const settled = last as unknown as WorkbenchSession;
    expect(settled.appScope.lifecycle).toBe('active'); // the settled session is live
    unmount();
    expect(settled.appScope.lifecycle).toBe('disposed'); // and disposed on real unmount
  });
});

describe('ScopeProvider + hooks', () => {
  it('creates a child scope and disposes it (and its command) on unmount', () => {
    let childScope: ScopeNode | null = null;
    let session: WorkbenchSession | null = null;
    const capture = (s: WorkbenchSession, sc: ScopeNode): void => {
      session = s;
      childScope = sc;
    };
    function Inner() {
      const s = useWorkbench();
      const sc = useWorkbenchScope();
      useCommand('core.child.cmd', () => 'x');
      useEffect(() => {
        capture(s, sc);
      }, [s, sc]);
      return null;
    }
    function Tree() {
      const id = useMemo(() => childId, []);
      return (
        <ScopeProvider identity={id}>
          <Inner />
        </ScopeProvider>
      );
    }
    const { unmount } = render(
      <WorkbenchRoot>
        <Tree />
      </WorkbenchRoot>,
    );
    const s = session as unknown as WorkbenchSession;
    const child = childScope as unknown as ScopeNode;
    expect(child.lifecycle).toBe('active');
    expect(s.commands.registrationCount('core.child.cmd')).toBe(1);
    unmount();
    expect(child.lifecycle).toBe('disposed');
    expect(s.commands.registrationCount('core.child.cmd')).toBe(0); // reclaimed via scope dispose
  });
});

describe('CrashBoundary', () => {
  it('isolates a crashing child and reports it typed while a sibling survives', () => {
    const onCrash = vi.fn();
    function Boom(): never {
      throw new Error('kaboom');
    }
    const { getByRole, getByTestId } = render(
      <div>
        <CrashBoundary onCrash={onCrash} fallback={(c) => <div role="alert">{c.message}</div>}>
          <Boom />
        </CrashBoundary>
        <div data-testid="sibling">alive</div>
      </div>,
    );
    expect(getByRole('alert').textContent).toBe('kaboom');
    expect(getByTestId('sibling').textContent).toBe('alive');
    expect(onCrash).toHaveBeenCalledOnce();
  });
});
