// Surface/view lifecycle state machine (WB-301).
//
// register -> activate -> mount -> (hide <-> show)* -> dispose.
// The machine is pure (no React) so the transition contract is unit-testable.
// An invalid transition is a typed reject, never a silent no-op. `hide` keeps the
// view MOUNTED (no unmount) so `show` reveals it without a remount; only `dispose`
// tears the view down.
import { type Result, ok, err, fail } from '../contract';

export type SurfaceState = 'registered' | 'active' | 'mounted' | 'hidden' | 'disposed';
export type SurfaceEvent = 'activate' | 'mount' | 'hide' | 'show' | 'dispose';

const TRANSITIONS: Readonly<Record<SurfaceState, Partial<Record<SurfaceEvent, SurfaceState>>>> = {
  registered: { activate: 'active', dispose: 'disposed' },
  active: { mount: 'mounted', dispose: 'disposed' },
  mounted: { hide: 'hidden', dispose: 'disposed' },
  hidden: { show: 'mounted', dispose: 'disposed' },
  disposed: {},
};

// True when the view element should be present in the tree. `hidden` stays
// mounted (kept-alive) — the host toggles visibility, not mounting.
export function isMounted(state: SurfaceState): boolean {
  return state === 'mounted' || state === 'hidden';
}
export function isVisible(state: SurfaceState): boolean {
  return state === 'mounted';
}

export class SurfaceLifecycle {
  private state: SurfaceState = 'registered';

  get current(): SurfaceState {
    return this.state;
  }

  transition(event: SurfaceEvent): Result<SurfaceState> {
    const next = TRANSITIONS[this.state][event];
    if (next === undefined) {
      return err(fail('invalid-transition', `cannot ${event} from ${this.state}`, { detail: { from: this.state, event } }));
    }
    this.state = next;
    return ok(next);
  }
}
