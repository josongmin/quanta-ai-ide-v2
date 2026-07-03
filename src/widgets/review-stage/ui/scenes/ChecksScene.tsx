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
import { Badge, type BadgeVariant } from '@shared/ui/Badge';
import { formatDuration } from '../../lib/reviewStageFormatting';
import { SceneHeader, V2Card } from '../ReviewSurface';

export function ChecksScene({
  pr,
}: {
  pr: PullRequest;
}) {
  const { t } = useTranslation('review');
  if (pr.checks.length === 0) {
    return (
      <V2Card className="p-5">
        <SceneHeader icon={Activity} title="CI checks" />
        <div className="mt-3 text-base italic text-[var(--fg-subtle)]">{t('empty.noCi')}</div>
      </V2Card>
    );
  }

  return (
    <V2Card className="p-5">
      <SceneHeader icon={Activity} title="CI checks" hint={`${String(pr.checks.length)} runs`} />
      <ul className="mt-3 divide-y divide-[var(--border-muted)]">
        {pr.checks.map((c) => (
          <CheckRow key={c.id} c={c} />
        ))}
      </ul>
    </V2Card>
  );
}

function CheckRow({
  c,
}: {
  c: CheckRun;
}) {
  const meta = CHECK_META[c.status];
  return (
    <li className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-4 py-2">
      <div className="min-w-0">
        <div className="text-base font-mono truncate text-[var(--fg-strong)]">{c.name}</div>
        {c.summary !== null && c.summary.length > 0 && (
          <div className="text-sm truncate text-[var(--fg-subtle)]">{c.summary}</div>
        )}
      </div>
      <Badge variant={c.required ? 'danger' : 'neutral'} fill="soft">
        {c.required ? 'Required' : 'Optional'}
      </Badge>
      <Badge variant={meta.variant} fill="soft" className="gap-1">
        <meta.Icon className={`w-2.5 h-2.5 ${c.status === 'running' ? 'animate-spin' : ''}`} />
        {meta.label}
      </Badge>
      <span className="text-right text-sm font-mono tabular-nums text-[var(--fg-subtle)]">
        {formatDuration(c.durationMs)}
      </span>
      <button
        type="button"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-bold bg-[var(--bg-elevated)] text-[var(--fg-default)] hover:bg-[var(--bg-active)]"
      >
        <RefreshCw className="w-3 h-3" />
        Re-run
      </button>
    </li>
  );
}

const CHECK_META: Record<CheckStatus, { label: string; variant: BadgeVariant; Icon: LucideIcon }> = {
  pending: { label: 'Pending', variant: 'neutral', Icon: Clock },
  running: { label: 'Running', variant: 'warn', Icon: Loader2 },
  success: { label: 'Success', variant: 'success', Icon: Check },
  failure: { label: 'Failure', variant: 'danger', Icon: X },
  cancelled: { label: 'Cancelled', variant: 'neutral', Icon: MinusCircle },
  skipped: { label: 'Skipped', variant: 'neutral', Icon: MinusCircle },
};
