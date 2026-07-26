import { describe, expect, it, vi } from 'vitest';
import { DialogService } from '../DialogService';
import { LayerManager } from '../LayerManager';

describe('LayerManager', () => {
  it('closes only the topmost layer and disposes every layer owned by a scope', () => {
    const manager = new LayerManager();
    const first = vi.fn();
    const second = vi.fn();
    const owner = { ownerId: 'view', scopeInstanceId: 'tab:1' };
    manager.register({ kind: 'modal', modal: true, owner, onClose: first });
    manager.register({ kind: 'modal', modal: true, owner, onClose: second });

    expect(manager.dismissTop('escape')).toBe(true);
    expect(second).toHaveBeenCalledWith('escape');
    expect(first).not.toHaveBeenCalled();
    expect(manager.disposeOwner(owner)).toBe(2);
  });

  it('uses the declared layer tier before open order', () => {
    const manager = new LayerManager();
    const modal = vi.fn();
    const laterMenu = vi.fn();
    const owner = { ownerId: 'view', scopeInstanceId: 'tab:1' };
    manager.register({ kind: 'modal', owner, onClose: modal });
    manager.register({ kind: 'menu', owner, onClose: laterMenu });
    manager.dismissTop('escape');
    expect(modal).toHaveBeenCalledOnce();
    expect(laterMenu).not.toHaveBeenCalled();
  });
});

describe('DialogService', () => {
  it('publishes typed open/close state and owner disposal', () => {
    const service = new DialogService();
    const listener = vi.fn();
    const owner = { ownerId: 'app-shell', scopeInstanceId: 'app' };
    service.subscribe('app.help', listener);

    service.open('app.help', { section: 'keyboard' }, owner);
    expect(service.getSnapshot<{ section: string }>('app.help')).toMatchObject({
      open: true,
      payload: { section: 'keyboard' },
      owner,
    });
    expect(service.disposeOwner(owner)).toBe(1);
    expect(service.getSnapshot('app.help')).toMatchObject({ open: false, closeReason: 'scope-disposed' });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
