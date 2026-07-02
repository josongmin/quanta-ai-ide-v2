import {
  Activity, Check, Clock, Loader2, MinusCircle, RefreshCw, X,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import {
  type CheckRun,
  type CheckStatus,
  type PullRequest,
} from '@entities/pr';
import { formatDuration } from '../../lib/reviewStageFormatting';
import { SceneHeader, V2Card } from '../ReviewSurface';

export function ChecksScene({
  pr,
  blockerColor,
}: {
  pr: PullRequest;
  blockerColor: string;
}) {
  const { t } = useTranslation('review');
  if (pr.checks.length === 0) {
    return (
      <V2Card className="p-5">
        <SceneHeader icon={Activity} title="CI checks" />
        <div className="mt-3 text-[12px] italic text-[var(--fg-subtle)]">{t('empty.noCi')}</div>
      </V2Card>
    );
  }

  return (
    <V2Card className="p-5">
      <SceneHeader icon={Activity} title="CI checks" hint={`${String(pr.checks.length)} runs`} />
      <ul className="mt-3 divide-y divide-[var(--border-muted)]">
        {pr.checks.map((c) => (
          <CheckRow key={c.id} c={c} blockerColor={blockerColor} />
        ))}
      </ul>
    </V2Card>
  );
}

function CheckRow({
  c,
  blockerColor,
}: {
  c: CheckRun;
  blockerColor: string;
}) {
  const meta = CHECK_META[c.status];
  return (
    <li className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-4 py-2">
      <div className="min-w-0">
        <div className="text-[12px] font-mono truncate text-[var(--fg-strong)]">{c.name}</div>
        {c.summary !== null && c.summary.length > 0 && (
          <div className="text-[11px] truncate text-[var(--fg-subtle)]">{c.summary}</div>
        )}
      </div>
      <span
        className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)]"
        style={{
          background: c.required ? `color-mix(in srgb, ${blockerColor} 10%, transparent)` : 'var(--bg-active)',
          color: c.required ? blockerColor : 'var(--fg-muted)',
        }}
      >
        {c.required ? 'Required' : 'Optional'}
      </span>
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)]"
        style={{ background: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }}
      >
        <meta.Icon className={`w-2.5 h-2.5 ${c.status === 'running' ? 'animate-spin' : ''}`} />
        {meta.label}
      </span>
      <span className="text-right text-[11px] font-mono tabular-nums text-[var(--fg-subtle)]">
        {formatDuration(c.durationMs)}
      </span>
      <button
        type="button"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[var(--bg-elevated)] text-[var(--fg-default)] hover:bg-[var(--bg-active)]"
      >
        <RefreshCw className="w-3 h-3" />
        Re-run
      </button>
    </li>
  );
}

const CHECK_META: Record<CheckStatus, { label: string; color: string; Icon: LucideIcon }> = {
  pending: { label: 'Pending', color: 'var(--fg-muted)', Icon: Clock },
  running: { label: 'Running', color: 'var(--intent-warn-fg)', Icon: Loader2 },
  success: { label: 'Success', color: 'var(--intent-success-fg)', Icon: Check },
  failure: { label: 'Failure', color: 'var(--intent-danger-fg)', Icon: X },
  cancelled: { label: 'Cancelled', color: 'var(--fg-muted)', Icon: MinusCircle },
  skipped: { label: 'Skipped', color: 'var(--fg-muted)', Icon: MinusCircle },
};
