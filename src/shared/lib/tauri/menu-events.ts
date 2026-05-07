// React hook that subscribes to a Rust-side menu event. The native menu
// (built in `src-tauri/src/menu.rs`) fires `menu://<id>` payloads through
// `Window::emit`; this hook exposes them to feature code without leaking the
// `@tauri-apps/api/event` import past the bridge.

import { useEffect } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

import { isTauri } from './runtime';

export type MenuEventId = 'settings';

export const useMenuEvent = (id: MenuEventId, handler: () => void): void => {
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: UnlistenFn | undefined;
    let cancelled = false;
    void listen(`menu://${id}`, () => { handler(); }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [id, handler]);
};
