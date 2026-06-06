import { Link } from '@tanstack/react-router';

export function SecurityCta() {
  return (
    <div
      className="rounded-2xl p-8 flex items-center justify-between gap-6"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[18px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          Want to talk to our security team?
        </h3>
        <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
          We respond within one business day. Vendor questionnaires, architecture diagrams, customer reference calls.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={'/security' as never}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-semibold transition-colors"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
          }}
        >
          Report a vulnerability
        </Link>
        <Link
          to={'/contact-sales' as never}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-semibold transition-colors"
          style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        >
          Talk to security
        </Link>
      </div>
    </div>
  );
}
