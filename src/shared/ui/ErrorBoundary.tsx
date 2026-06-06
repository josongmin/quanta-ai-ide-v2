// Class-based React error boundary. Hook-only error boundaries don't exist
// in React 18, so this stays a class component — kept tiny so it can wrap
// both the root layout and individual heavy lazy routes (Three.js stage,
// review surface) with negligible cost.
//
// The fallback intentionally consumes only design-token colors via CSS
// custom properties so it renders correctly in either theme without
// pulling in `useTheme` (which would itself sit inside the boundary).

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  /** Children to protect. */
  children: ReactNode;
  /** Optional fallback override. Receives the error + a reset() callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Short label shown in the default fallback (e.g. "Stage", "App"). */
  label?: string;
  /** Notified on capture; primarily a hook for telemetry. */
  onError?: (error: Error, info: ErrorInfo) => void;
};

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface to the console even in production builds — silent boundaries
    // are an anti-pattern for diagnosing issues from user reports.

    console.error('[ErrorBoundary]', this.props.label ?? '', error, info);
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <DefaultFallback error={error} label={this.props.label} onReset={this.reset} />;
  }
}

function DefaultFallback({
  error, label, onReset,
}: {
  error: Error;
  label?: string;
  onReset: () => void;
}) {
  return (
    <div
      role="alert"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--bg-canvas)',
        color: 'var(--fg-default)',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          padding: '20px 22px',
          borderRadius: 12,
          border: '1px solid var(--fg-default)',
          background: 'transparent',
        }}
      >
        <div style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          opacity: 0.55,
          marginBottom: 8,
        }}>
          {label ? `${label} — Error` : 'Something went wrong'}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, marginBottom: 8 }}>
          {error.name}: {error.message}
        </div>
        <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 14 }}>
          The component above crashed. You can keep using the rest of the app
          and try again once the underlying data settles.
        </div>
        <button
          type="button"
          onClick={onReset}
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid currentColor',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
