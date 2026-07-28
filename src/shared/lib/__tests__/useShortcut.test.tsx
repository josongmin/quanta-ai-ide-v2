import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { WorkbenchRoot, createWorkbenchSession } from '@shared/workbench/react';
import { UIRuntimeProvider } from '@shared/ui/runtime/UIRuntimeProvider';
import { useShortcut, type Shortcut } from '../useShortcut';

// Integration coverage for the shared keybinding-ingress hook that P0-2 migrated
// SearchBar / FocusScanStack / HunkNavigator / CodingStage onto. Exercises the
// FULL path a real key press takes — useShortcut registers into the workbench
// KeybindingService, and the UIRuntimeProvider's capture-phase window listener
// drains it — rather than poking the service directly (that is covered in
// keybindingService.test.ts). What the four migrations rely on and this locks:
// a real keydown fires the handler, the ignoreInputs policy gates editable
// targets, and unmount disposes the registration.

afterEach(cleanup);

function Probe({ shortcut, onFire }: { shortcut: Shortcut; onFire: () => void }) {
  useShortcut(shortcut, onFire);
  return null;
}

function mountShortcut(shortcut: Shortcut, onFire: () => void) {
  const session = createWorkbenchSession();
  return render(
    <WorkbenchRoot session={session}>
      <UIRuntimeProvider>
        <Probe shortcut={shortcut} onFire={onFire} />
      </UIRuntimeProvider>
    </WorkbenchRoot>,
  );
}

function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
  });
}

describe('useShortcut (ingress integration)', () => {
  it('fires the handler on a real window keydown that matches key + modifier', () => {
    const onFire = vi.fn();
    mountShortcut({ key: 'n', ctrl: true }, onFire);
    press(window, 'n', { metaKey: true }); // ctrl:true matches metaKey OR ctrlKey
    expect(onFire).toHaveBeenCalledOnce();
    press(window, 'n'); // no modifier — must not match a ctrl-bound shortcut
    expect(onFire).toHaveBeenCalledOnce();
  });

  it('ignoreInputs:true suppresses the shortcut when the event target is editable', () => {
    const onFire = vi.fn();
    mountShortcut({ key: '/', ignoreInputs: true }, onFire);
    const input = document.createElement('input');
    document.body.appendChild(input);
    press(input, '/'); // target is an <input> → editable guard suppresses
    expect(onFire).not.toHaveBeenCalled();
    press(window, '/'); // target is the document/window → fires
    expect(onFire).toHaveBeenCalledOnce();
    input.remove();
  });

  it('ignoreInputs:false still fires while an input is focused (e.g. ⌘N)', () => {
    const onFire = vi.fn();
    mountShortcut({ key: 'n', ctrl: true, ignoreInputs: false }, onFire);
    const input = document.createElement('input');
    document.body.appendChild(input);
    press(input, 'n', { ctrlKey: true });
    expect(onFire).toHaveBeenCalledOnce();
    input.remove();
  });

  it('disposes the registration on unmount', () => {
    const onFire = vi.fn();
    const { unmount } = mountShortcut({ key: 'j' }, onFire);
    press(window, 'j');
    expect(onFire).toHaveBeenCalledOnce();
    unmount();
    press(window, 'j');
    expect(onFire).toHaveBeenCalledOnce(); // no further calls after dispose
  });
});
