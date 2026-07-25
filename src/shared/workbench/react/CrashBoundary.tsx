// View crash boundary (WB-301/305).
//
// Isolates a view crash to its own subtree so sibling surfaces survive, and
// surfaces the failure as a typed state (not a blank screen or an untyped console
// error). The owning scope's cleanup still runs on unmount.
import { Component, type ErrorInfo, type ReactNode } from 'react';

export type CrashState = { readonly crashed: true; readonly message: string } | { readonly crashed: false };

type Props = {
  readonly children: ReactNode;
  readonly fallback: (state: Extract<CrashState, { crashed: true }>) => ReactNode;
  readonly onCrash?: (message: string, info: ErrorInfo) => void;
};

export class CrashBoundary extends Component<Props, CrashState> {
  override state: CrashState = { crashed: false };

  static getDerivedStateFromError(error: unknown): CrashState {
    return { crashed: true, message: error instanceof Error ? error.message : String(error) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    const message = error instanceof Error ? error.message : String(error);
    this.props.onCrash?.(message, info);
  }

  override render(): ReactNode {
    if (this.state.crashed) return this.props.fallback(this.state);
    return this.props.children;
  }
}
