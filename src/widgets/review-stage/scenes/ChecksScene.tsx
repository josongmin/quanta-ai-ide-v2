// ─────────────────────────────────────────────────────────────────────────
// CHECKS SCENE — CI dashboard (compact rows)
// ─────────────────────────────────────────────────────────────────────────

import {
  Activity, Check, Clock, Loader2, MinusCircle, RefreshCw, X,
  type LucideIcon,
} from 'lucide-react';
import type { CheckRun, CheckStatus, PullRequest } from '@entities/pr';
import { useTranslation } from '@shared/i18n';
import { OK, SEV } from '../lib/tones';
import { formatDuration } from '../lib/format';
import V2Card from '../ui/V2Card';
import SceneHeader from '../ui/SceneHeader';

export default function ChecksScene({ pr }: { pr: PullRequest }) {
  const { t } = useTranslation('review');
  if (pr.checks.length === 0) {
    return (
      <V2Card className="p-5">
        <SceneHeader icon={Activity} title="CI checks" />
        <div className="mt-3 text-[12px] italic text-white/40">{t('empty.noCi')}</div>
      </V2Card>
    );
  }
  return (
    <V2Card className="p-5">
      <SceneHeader icon={Activity} title="CI checks" hint={`${String(pr.checks.length)} runs`} />
      <ul className="mt-3 divide-y divide-white/[0.04]">
        {pr.checks.map((c) => (
          <CheckRow key={c.id} c={c} />
        ))}
      </ul>
    </V2Card>
  );
}

function CheckRow({ c }: { c: CheckRun }) {
  const meta = CHECK_META[c.status];
  return (
    <li className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-4 py-2">
      <div className="min-w-0">
        <div className="text-[12px] font-mono truncate text-white/85">{c.name}</div>
        {c.summary !== null && c.summary.length > 0 && (
          <div className="text-[11px] truncate text-white/40">{c.summary}</div>
        )}
      </div>
      <span
        className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em]"
        style={{
          background: c.required ? `${SEV.blocker}1a` : 'rgba(255,255,255,0.06)',
          color: c.required ? SEV.blocker : 'rgba(255,255,255,0.55)',
        }}
      >
        {c.required ? 'Required' : 'Optional'}
      </span>
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ background: `${meta.color}26`, color: meta.color }}
      >
        <meta.Icon className={`w-2.5 h-2.5 ${c.status === 'running' ? 'animate-spin' : ''}`} />
        {meta.label}
      </span>
      <span className="text-right text-[11px] font-mono tabular-nums text-white/40">
        {formatDuration(c.durationMs)}
      </span>
      <button
        type="button"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/[0.06] text-white/70 hover:bg-white/[0.10]"
      >
        <RefreshCw className="w-3 h-3" />
        Re-run
      </button>
    </li>
  );
}

const CHECK_META: Record<CheckStatus, { label: string; color: string; Icon: LucideIcon }> = {
  pending:   { label: 'Pending',   color: '#8b949e', Icon: Clock },
  running:   { label: 'Running',   color: SEV.medium, Icon: Loader2 },
  success:   { label: 'Success',   color: OK,         Icon: Check },
  failure:   { label: 'Failure',   color: SEV.blocker, Icon: X },
  cancelled: { label: 'Cancelled', color: '#8b949e', Icon: MinusCircle },
  skipped:   { label: 'Skipped',   color: '#8b949e', Icon: MinusCircle },
};
