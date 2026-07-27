import { describe, it, expect } from 'vitest';
import { StrictMode, useEffect } from 'react';
import { render } from '@testing-library/react';
import { WorkbenchRoot, useWorkbench, type WorkbenchSession } from '../WorkbenchProvider';

// Re-homed from the deleted host.test.tsx (which also tested the removed
// ScopeProvider/hooks/CrashBoundary). These two cases still guard LIVE code: the
// WorkbenchRoot lifecycle, and specifically the StrictMode scope-leak recovery
// branch in WorkbenchProvider (recreate the session if a prior cleanup disposed
// its app scope) — the trickiest invariant in the file and otherwise untested.

function Capture({ onReady }: { onReady: (s: WorkbenchSession) => void }) {
  const session = useWorkbench();
  useEffect(() => {
    onReady(session);
  }, [session, onReady]);
  return null;
}

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
