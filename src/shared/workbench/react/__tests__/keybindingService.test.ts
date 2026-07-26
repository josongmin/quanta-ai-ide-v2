import { describe, it, expect, vi } from 'vitest';
import { KeybindingService } from '../KeybindingService';

function keydown(key: string, overrides: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, cancelable: true, ...overrides });
}

describe('KeybindingService', () => {
  it('dispatches only the highest-priority active matching keybinding', () => {
    const service = new KeybindingService();
    const global = vi.fn();
    const activeTab = vi.fn();
    const hiddenTab = vi.fn();
    service.register({ id: 'global.palette', keybinding: { key: 'k', ctrl: true }, handler: global });
    service.register({ id: 'tab.palette', keybinding: { key: 'k', ctrl: true }, priority: 100, isActive: () => true, handler: activeTab });
    service.register({ id: 'hidden.palette', keybinding: { key: 'k', ctrl: true }, priority: 200, isActive: () => false, handler: hiddenTab });

    expect(service.dispatchKeydown(keydown('k', { metaKey: true }))).toBe(true);
    expect(activeTab).toHaveBeenCalledOnce();
    expect(global).not.toHaveBeenCalled();
    expect(hiddenTab).not.toHaveBeenCalled();
  });

  it('reclaims a registration on dispose', () => {
    const service = new KeybindingService();
    const fn = vi.fn();
    const handle = service.register({ id: 'x', keybinding: { key: 'a' }, handler: fn });
    expect(service.dispatchKeydown(keydown('a'))).toBe(true);
    expect(fn).toHaveBeenCalledOnce();
    handle.dispose();
    expect(service.dispatchKeydown(keydown('a'))).toBe(false); // reclaimed
  });
});
