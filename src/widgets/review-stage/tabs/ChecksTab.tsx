import {
  Check, Clock, Loader2, MinusCircle, RefreshCw, X,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { CheckStatus, PullRequest } from '@entities/pr';
import { formatDuration } from '../lib/format';

type Props = {
  pr: PullRequest;
  isDark: boolean;
};

// Tabular CI dashboard. Each row is (name · required pill · status pill ·
// duration · summary · re-run button). Re-run is a no-op for now — the
// store doesn't model in-flight check transitions yet.

export default function ChecksTab({ pr, isDark }: Props) {
  const { t } = useTranslation('review');
  const card = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-black/5';
  const muted = 'text-[color:var(--fg-subtle)]';
  const sep = isDark ? 'divide-white/5' : 'divide-black/5';
  const fg = 'text-[color:var(--fg-strong)]';
  const header = 'text-[color:var(--fg-subtle)]';

  if (pr.checks.length === 0) {
    return (
      <div className={`px-4 py-12 text-center text-[11px] ${muted}`}>
        {t('empty.noCi')}
      </div>
    );
  }

  return (
    <section className={`rounded-xl border ${card}`}>
      <div className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] ${header}`}>
        <span>{t('checks.headers.check')}</span>
        <span>{t('checks.headers.required')}</span>
        <span>{t('checks.headers.status')}</span>
        <span className="text-right">{t('checks.headers.duration')}</span>
        <span className="text-right">{t('checks.headers.action')}</span>
      </div>

      <div className={`divide-y ${sep}`}>
        {pr.checks.map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2 items-center"
          >
            <div className="min-w-0">
              <div className={`text-[12px] font-mono truncate ${fg}`}>{c.name}</div>
              {c.summary !== null && c.summary.length > 0 && (
                <div className={`text-[11px] truncate ${muted}`}>{c.summary}</div>
              )}
            </div>
            <RequiredPill required={c.required} />
            <StatusPill status={c.status} />
            <span className={`text-right text-[11px] font-mono tabular-nums ${muted}`}>
              {formatDuration(c.durationMs)}
            </span>
            <div className="text-right">
              <button
                type="button"
                onClick={() => { /* re-run is a stub */ }}
                title="Re-run check (stub)"
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  isDark
                    ? 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1]'
                    : 'bg-black/[0.05] text-black/70 hover:bg-black/[0.08]'
                }`}
              >
                <RefreshCw className="w-3 h-3" />
                Re-run
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RequiredPill({ required }: { required: boolean }) {
  if (required) {
    return (
      <span
        className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ background: '#c25a5520', color: '#c25a55' }}
      >
        Required
      </span>
    );
  }
  return (
    <span
      className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]"
      style={{ background: '#8b949e20', color: '#8b949e' }}
    >
      Optional
    </span>
  );
}

function StatusPill({ status }: { status: CheckStatus }) {
  const meta = CHECK_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]"
      style={{ background: `${meta.color}26`, color: meta.color }}
    >
      <meta.Icon className={`w-2.5 h-2.5 ${status === 'running' ? 'animate-spin' : ''}`} />
      {meta.label}
    </span>
  );
}

const CHECK_META: Record<CheckStatus, { label: string; color: string; Icon: LucideIcon }> = {
  pending:   { label: 'Pending',   color: '#8b949e', Icon: Clock },
  running:   { label: 'Running',   color: '#a8893a', Icon: Loader2 },
  success:   { label: 'Success',   color: '#5fa86c', Icon: Check },
  failure:   { label: 'Failure',   color: '#c25a55', Icon: X },
  cancelled: { label: 'Cancelled', color: '#8b949e', Icon: MinusCircle },
  skipped:   { label: 'Skipped',   color: '#8b949e', Icon: MinusCircle },
};

// formatDuration moved to ../lib/format.ts
