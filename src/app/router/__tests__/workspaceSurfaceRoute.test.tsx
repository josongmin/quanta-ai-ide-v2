import { Suspense, useEffect } from 'react';
import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { WorkbenchRoot } from '@shared/workbench/react';
import { resolveSurfaceRoute, WorkspaceSurface, WorkspaceSurfaceGuard, builtinAdmission, type AdmissionPolicy } from '../workspaceSurfaceRoute';
import { builtinCatalog } from '@app/workbench/builtinSurfaces';
import { buildSurfaceCatalog, type SurfaceManifest } from '@app/workbench/surfaceCatalog';
import { surfaceView } from '@app/workbench/surfaceView';

describe('resolveSurfaceRoute', () => {
  it('resolves a known built-in surface and preserves workspace/surface identity', () => {
    const state = resolveSurfaceRoute(builtinCatalog, builtinAdmission, 'ws-1', 'core.coding');
    expect(state.status).toBe('ok');
    expect(state.workspaceId).toBe('ws-1');
    expect(state.surfaceId).toBe('core.coding');
  });

  it('returns a typed unknown state (no silent redirect to a default surface)', () => {
    const state = resolveSurfaceRoute(builtinCatalog, builtinAdmission, 'ws-1', 'core.does-not-exist');
    expect(state.status).toBe('unknown');
    if (state.status === 'unknown') expect(state.surfaceId).toBe('core.does-not-exist');
  });

  it('distinguishes disabled and untrusted admission verdicts', () => {
    const disable: AdmissionPolicy = (m) => (m.id === 'core.coding' ? 'disabled' : 'ok');
    expect(resolveSurfaceRoute(builtinCatalog, disable, 'ws', 'core.coding').status).toBe('disabled');
    const untrust: AdmissionPolicy = (m) => (m.id === 'core.coding' ? 'untrusted' : 'ok');
    expect(resolveSurfaceRoute(builtinCatalog, untrust, 'ws', 'core.coding').status).toBe('untrusted');
  });

  it('is deterministic for the same input', () => {
    const a = resolveSurfaceRoute(builtinCatalog, builtinAdmission, 'ws', 'core.agents');
    const b = resolveSurfaceRoute(builtinCatalog, builtinAdmission, 'ws', 'core.agents');
    expect(a).toEqual(b);
  });
});

describe('WorkspaceSurface', () => {
  it('renders a typed error surface for an unknown deep link', () => {
    const { getByRole } = render(
      <WorkbenchRoot>
        <WorkspaceSurface workspaceId="ws" surfaceId="core.ghost" />
      </WorkbenchRoot>,
    );
    const alert = getByRole('alert');
    expect(alert.getAttribute('data-surface-error')).toBe('unknown');
  });

  it('mounts a surface host for a valid surface', () => {
    const { container } = render(
      <WorkbenchRoot>
        <WorkspaceSurface workspaceId="ws" surfaceId="core.coding" />
      </WorkbenchRoot>,
    );
    expect(container.querySelector('[data-surface="core.coding@ws"]')).not.toBeNull();
  });

  it('mounts a NON-BUILTIN surface from an injected catalog (truly generic, router-owned building block)', () => {
    const descriptor: SurfaceManifest = {
      id: 'acme.custom',
      owner: 'acme',
      trust: 'untrusted',
      title: 'Custom',
      group: 'acme.group',
      icon: 'Box',
      instancing: 'singleton',
      contextKinds: [],
    };
    const built = buildSurfaceCatalog([descriptor], { 'acme.custom': () => Promise.resolve({ Component: () => null }) });
    if (!built.ok) throw new Error('catalog build failed');
    const { container } = render(
      <WorkbenchRoot>
        <WorkspaceSurface workspaceId="ws" surfaceId="acme.custom" catalog={built.value} />
      </WorkbenchRoot>,
    );
    // Resolves AND mounts via the same route — not a builtins-only map.
    expect(container.querySelector('[data-surface="acme.custom@ws"]')).not.toBeNull();
  });
});

// The route wired at `/w/$ws/$surfaceId` is the GUARD, not the mounter. The
// keep-mounted WorkspaceTabsHost is the single mount authority; the guard must
// add ZERO mounts for a valid surface (else the surface mounts twice — once here,
// once in the host). This is the P0 double-mount regression lock.
describe('WorkspaceSurfaceGuard (the wired route form)', () => {
  it('renders a typed error surface for an unknown deep link', () => {
    const { getByRole } = render(
      <WorkbenchRoot>
        <WorkspaceSurfaceGuard workspaceId="ws" surfaceId="core.ghost" />
      </WorkbenchRoot>,
    );
    expect(getByRole('alert').getAttribute('data-surface-error')).toBe('unknown');
  });

  it('mounts NOTHING for a valid surface — the host owns the single mount', () => {
    let mounts = 0;
    const descriptor: SurfaceManifest = {
      id: 'acme.counted',
      owner: 'acme',
      trust: 'untrusted',
      title: 'Counted',
      group: 'acme.group',
      icon: 'Box',
      instancing: 'singleton',
      contextKinds: [],
    };
    const Counting = () => { mounts += 1; return null; };
    const built = buildSurfaceCatalog([descriptor], { 'acme.counted': () => Promise.resolve({ Component: Counting }) });
    if (!built.ok) throw new Error('catalog build failed');

    const admitAll: AdmissionPolicy = () => 'ok';
    const { container } = render(
      <WorkbenchRoot>
        <WorkspaceSurfaceGuard workspaceId="ws" surfaceId="acme.counted" admit={admitAll} catalog={built.value} />
      </WorkbenchRoot>,
    );

    // Guard resolved OK but mounted no surface host and never invoked the view.
    expect(container.querySelector('[data-surface="acme.counted@ws"]')).toBeNull();
    expect(mounts).toBe(0);
  });
});

// The P0 defect was a surface mounting TWICE — once via the keep-mounted host
// (which mounts through surfaceView) and once via the canonical route. This is
// the integration lock: the two code paths that could each mount the surface,
// rendered TOGETHER for the same surfaceId, must produce EXACTLY ONE mount.
describe('P0 double-mount lock: host mounter + route guard together', () => {
  it('mounts a surface exactly once when both the surfaceView mounter and the route guard are present', async () => {
    let mounts = 0;
    const descriptor: SurfaceManifest = {
      id: 'acme.once', owner: 'acme', trust: 'untrusted', title: 'Once',
      group: 'acme.group', icon: 'Box', instancing: 'singleton', contextKinds: [],
    };
    const Counting = () => {
      useEffect(() => { mounts += 1; }, []);
      return <div data-counted />;
    };
    const built = buildSurfaceCatalog([descriptor], { 'acme.once': () => Promise.resolve({ Component: Counting }) });
    if (!built.ok) throw new Error('catalog build failed');
    const entry = built.value.resolve('acme.once');
    if (entry === undefined) throw new Error('entry missing');
    // surfaceView IS the exact mechanism the keep-mounted host mounts through.
    const HostMount = surfaceView(entry);
    const admitAll: AdmissionPolicy = () => 'ok';

    render(
      <WorkbenchRoot>
        {/* route path: the wired guard renders null for a valid surface */}
        <WorkspaceSurfaceGuard workspaceId="ws" surfaceId="acme.once" admit={admitAll} catalog={built.value} />
        {/* host path: the keep-mounted host mounts via surfaceView */}
        <Suspense fallback={null}><HostMount /></Suspense>
      </WorkbenchRoot>,
    );

    await waitFor(() => { expect(mounts).toBe(1); });
    // Let any erroneous second mount (the P0 regression) surface before asserting.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mounts).toBe(1);
  });
});

// Malformed / non-canonical surface ids must degrade to a typed `unknown` state
// (a typed error surface), never throw or partially resolve.
describe('resolveSurfaceRoute rejects malformed surface ids gracefully', () => {
  it.each(['CORE.coding', 'coding', 'core..name', 'core.', '', 'core.<script>'])(
    'resolves %o to unknown',
    (bad) => {
      const state = resolveSurfaceRoute(builtinCatalog, builtinAdmission, 'ws', bad);
      expect(state.status).toBe('unknown');
    },
  );
});
