import { Link } from '@tanstack/react-router';
import {
  Compass, AlertOctagon, Wrench, WifiOff, Home, ArrowLeft, Activity,
} from 'lucide-react';
import { useTheme } from '@shared/theme';

// Shared chromeless error layout. Centers a brand mark + headline + actions
// over a soft mesh gradient. No PublicShell — these pages should feel like
// their own moment, not a marketing page.
function ErrorScene({
  code, eyebrow, title, body, accent, icon: Icon, actions, extra,
}: {
  code?: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: string;          // CSS color
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  actions?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  const { isDark } = useTheme();
  return (
    <div
      className="absolute inset-0 overflow-hidden flex items-center justify-center"
      style={{ background: isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)' }}
    >
      {/* Mesh backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 30% 30%, color-mix(in srgb, ${accent} 32%, transparent), transparent 60%),
            radial-gradient(ellipse 55% 45% at 75% 70%, color-mix(in srgb, var(--fg-accent) 18%, transparent), transparent 65%)
          `,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle, color-mix(in srgb, var(--fg-strong) 10%, transparent) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent 75%)',
        }}
      />

      {/* Top-left brand */}
      <Link
        to={'/intelligence'}
        className="absolute top-6 left-6 flex items-center gap-2 font-semibold tracking-tight z-10"
        style={{ color: 'var(--fg-strong)' }}
      >
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-black"
          style={{
            backgroundImage: 'linear-gradient(135deg, var(--fg-accent), var(--fg-link))',
            color: 'var(--bg-canvas)',
          }}
        >
          SE
        </div>
        <span className="text-[14px]">se.field</span>
      </Link>

      {/* Center */}
      <div className="relative z-10 max-w-[560px] mx-auto px-8 text-center flex flex-col items-center gap-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            color: accent,
            boxShadow: `0 12px 30px -10px color-mix(in srgb, ${accent} 36%, transparent)`,
          }}
        >
          <Icon className="w-7 h-7" />
        </div>

        {code && (
          <code
            className="text-[11px] uppercase tracking-[0.18em] font-bold tabular-nums"
            style={{ color: accent }}
          >
            {code} · {eyebrow}
          </code>
        )}
        {!code && (
          <span
            className="text-[10px] uppercase tracking-[0.18em] font-bold"
            style={{ color: accent }}
          >
            {eyebrow}
          </span>
        )}

        <h1
          className="text-[34px] sm:text-[40px] leading-[1.05] font-semibold tracking-[-0.022em]"
          style={{ color: 'var(--fg-strong)' }}
        >
          {title}
        </h1>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          {body}
        </p>

        {actions && (
          <div className="flex items-center gap-2 mt-2">{actions}</div>
        )}

        {extra && (
          <div className="mt-6 w-full">{extra}</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 404
// ─────────────────────────────────────────────────────────────────────────

export function NotFoundPage() {
  return (
    <ErrorScene
      code="404"
      eyebrow="Not found"
      title="That page doesn't exist."
      body="The URL might be mistyped, the page might have moved, or you might not have access. Try one of these starting points."
      accent="var(--intent-info-fg)"
      icon={Compass}
      actions={
        <>
          <Link
            to={'/intelligence'}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-[12px] font-semibold transition-colors"
            style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </Link>
          <Link
            to={'/help' as never}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-[12px] font-semibold transition-colors"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          >
            Help center
          </Link>
        </>
      }
      extra={
        <div className="grid grid-cols-3 gap-2">
          {[
            { to: '/intelligence', label: 'Dot field' },
            { to: '/integrations', label: 'Marketplace' },
            { to: '/developers',   label: 'Developers' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to as never}
              className="rounded-lg p-3 text-[11px] font-medium transition-colors"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-default)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-canvas)'; }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 500
// ─────────────────────────────────────────────────────────────────────────

export function ServerErrorPage() {
  return (
    <ErrorScene
      code="500"
      eyebrow="Something went wrong"
      title="That's on us."
      body="We've already been paged and we're looking into it. Try again in a moment — if it persists, send us the request ID below."
      accent="var(--intent-danger-fg)"
      icon={AlertOctagon}
      actions={
        <>
          <button
            type="button"
            onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-[12px] font-semibold transition-colors"
            style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Try again
          </button>
          <Link
            to={'/status' as never}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-[12px] font-semibold transition-colors"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          >
            <Activity className="w-3.5 h-3.5" />
            System status
          </Link>
        </>
      }
      extra={
        <div
          className="rounded-lg p-3 inline-flex items-center gap-3 text-[11px]"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-muted)',
          }}
        >
          <span className="uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
            Request ID
          </span>
          <code className="font-mono" style={{ color: 'var(--fg-strong)' }}>req_4a2b…71f</code>
        </div>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Maintenance
// ─────────────────────────────────────────────────────────────────────────

export function MaintenancePage() {
  return (
    <ErrorScene
      eyebrow="Scheduled maintenance"
      title="We'll be right back."
      body="We're shipping a planned upgrade. Estimated downtime is short — check status for the live ETA."
      accent="var(--intent-warn-fg)"
      icon={Wrench}
      actions={
        <Link
          to={'/status' as never}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-[12px] font-semibold transition-colors"
          style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        >
          <Activity className="w-3.5 h-3.5" />
          Live status
        </Link>
      }
      extra={
        <div
          className="rounded-lg p-4 inline-flex items-center gap-4 text-[12px]"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
              Started
            </span>
            <code className="font-mono tabular-nums text-[12px]" style={{ color: 'var(--fg-strong)' }}>
              2026-05-13 03:00 UTC
            </code>
          </div>
          <div className="w-px h-8" style={{ background: 'var(--border-muted)' }} />
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
              Back by
            </span>
            <code className="font-mono tabular-nums text-[12px]" style={{ color: 'var(--fg-strong)' }}>
              ~ 03:45 UTC
            </code>
          </div>
        </div>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Offline
// ─────────────────────────────────────────────────────────────────────────

export function OfflinePage() {
  return (
    <ErrorScene
      eyebrow="You're offline"
      title="No connection."
      body="Looks like your network dropped out. We'll auto-reconnect — or try a refresh."
      accent="var(--fg-muted)"
      icon={WifiOff}
      actions={
        <button
          type="button"
          onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-[12px] font-semibold transition-colors"
          style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        >
          Retry
        </button>
      }
    />
  );
}
