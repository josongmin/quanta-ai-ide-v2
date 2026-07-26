import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WorkbenchRoot } from '@shared/workbench/react';
import { resolveSurfaceRoute, WorkspaceSurface, builtinAdmission, type AdmissionPolicy } from '../workspaceSurfaceRoute';
import { builtinCatalog } from '@app/workbench/builtinSurfaces';

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
});
