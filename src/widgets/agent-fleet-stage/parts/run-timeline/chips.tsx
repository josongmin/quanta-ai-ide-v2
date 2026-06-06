import {
  AlertTriangle, CheckCircle2, ChevronRight, Eye, GitPullRequest,
  Hand, Pause, Shield, XCircle, Zap,
} from 'lucide-react';
import type { RunStatus, TranslateFn } from '../types';

export function StatusPill({ status, isDark, t }: { status: 'active' | 'paused' | 'draft'; isDark: boolean; t: TranslateFn }) {
  const tone =
    status === 'active' ? 'border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)] text-[color:var(--intent-success-fg)]'
    : status === 'paused' ? 'border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)] text-[color:var(--intent-warn-fg)]'
    : (isDark ? 'border-white/[0.10] bg-white/[0.04] text-white/55' : 'border-black/[0.10] bg-black/[0.04] text-black/55');
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[10px] font-bold uppercase tracking-[0.18em] border ${tone}`}>
      {t(`status.${status}`)}
    </span>
  );
}

export function TrustChip({ level, isDark, t }: { level: 1 | 2 | 3 | 4 | 5; isDark: boolean; t: TranslateFn }) {
  const tone = isDark ? 'bg-white/[0.04] text-white/65 border-white/[0.10]' : 'bg-black/[0.04] text-black/65 border-black/[0.10]';
  return (
    <span
      className={`flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono border ${tone}`}
      title={t('trust.tooltip')}
    >
      <Shield className="w-2.5 h-2.5" />
      {t('trust.level', { n: level })}
    </span>
  );
}

export function BlastChip({ tier, isDark, t, compact = false }: {
  tier: 'safe' | 'review' | 'blast-radius';
  isDark: boolean;
  t: TranslateFn;
  compact?: boolean;
}) {
  const tone =
    tier === 'safe' ? 'border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)] text-[color:var(--intent-success-fg)]'
    : tier === 'review' ? (isDark ? 'border-white/[0.10] bg-white/[0.04] text-white/55' : 'border-black/[0.10] bg-black/[0.04] text-black/55')
    : 'border-[color:var(--intent-danger-fg)] bg-[color:var(--intent-danger-bg)] text-[color:var(--intent-danger-fg)]';
  const Icon = tier === 'safe' ? Shield : tier === 'review' ? Eye : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono border ${tone}`}>
      <Icon className="w-2.5 h-2.5" />
      {!compact && t(`run.br.${tier}`)}
      {compact && t(`run.br.${tier}`)}
    </span>
  );
}

// Status → { tone, Icon } map. Tone strings depend on theme, so the map is
// built per-render with `isDark` rather than hoisted to module scope.
function runStatusMap(isDark: boolean): Record<RunStatus, { tone: string; Icon: typeof ChevronRight }> {
  return {
    queued:           { tone: isDark ? 'text-white/55 border-white/[0.10] bg-white/[0.04]' : 'text-black/55 border-black/[0.10] bg-black/[0.04]', Icon: ChevronRight },
    running:          { tone: 'text-[color:var(--intent-success-fg)] border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)]', Icon: Zap },
    'awaiting-human': { tone: 'text-[color:var(--intent-warn-fg)] border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)]', Icon: Hand },
    merged:           { tone: 'text-[color:var(--intent-success-fg)] border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)]', Icon: GitPullRequest },
    closed:           { tone: isDark ? 'text-white/55 border-white/[0.10] bg-white/[0.04]' : 'text-black/55 border-black/[0.10] bg-black/[0.04]', Icon: CheckCircle2 },
    failed:           { tone: 'text-[color:var(--intent-danger-fg)] border-[color:var(--intent-danger-fg)] bg-[color:var(--intent-danger-bg)]', Icon: XCircle },
    cancelled:        { tone: isDark ? 'text-white/45 border-white/[0.10] bg-white/[0.04]' : 'text-black/45 border-black/[0.10] bg-black/[0.04]', Icon: Pause },
  };
}

export function RunStatusBadge({ status, isDark, t }: { status: RunStatus; isDark: boolean; t: TranslateFn }) {
  const { tone, Icon } = runStatusMap(isDark)[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-bold uppercase tracking-[0.18em] border ${tone}`}>
      <Icon className={`w-2.5 h-2.5 ${status === 'running' ? 'animate-pulse' : ''}`} />
      {t(`runStatus.${status}`)}
    </span>
  );
}
