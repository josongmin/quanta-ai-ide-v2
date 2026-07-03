import { AlertTriangle } from 'lucide-react';

// Inline error state for a failed data load — the convention paired with an
// optional retry. Distinct from ErrorBoundary (which catches render throws):
// this is for a caught async failure a component renders itself.

type Props = {
  message?: string;
  onRetry?: () => void;
  className?: string;
};

export function InlineError({
  message = 'Something went wrong loading this.', onRetry, className = '',
}: Props) {
  return (
    <div
      role="alert"
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${className}`}
      style={{
        background: 'var(--intent-danger-bg)',
        color: 'var(--intent-danger-fg)',
        border: '1px solid var(--border-default)',
      }}
    >
      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-0">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 font-semibold underline underline-offset-2"
        >
          Retry
        </button>
      )}
    </div>
  );
}
