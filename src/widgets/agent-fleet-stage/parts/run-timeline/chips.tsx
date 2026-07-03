import {
  AlertTriangle, CheckCircle2, ChevronRight, Eye, GitPullRequest,
  Hand, Pause, Shield, XCircle, Zap,
} from 'lucide-react';
import type { RunStatus, TranslateFn } from '../types';

export function StatusPill({ status, t }: { status: 'active' | 'paused' | 'draft'; t: TranslateFn }) {
  const tone =
    status === 'active' ? 'border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)] text-[color:var(--intent-success-fg)]'
    : status === 'paused' ? 'border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)] text-[color:var(--intent-warn-fg)]'
    : 'border-[var(--border-strong)] bg-[var(--bg-hover)] text-[var(--fg-muted)]';
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-xs font-bold uppercase tracking-eyebrow border ${tone}`}>
      {t(`status.${status}`)}
    </span>
  );
}

export function TrustChip({ level, t }: { level: 1 | 2 | 3 | 4 | 5; t: TranslateFn }) {
  const tone = 'bg-[var(--bg-hover)] text-[var(--fg-muted)] border-[var(--border-strong)]';
  return (
    <span
      className={`flex items-center gap-1 px-1.5 py-px rounded-md text-2xs font-mono border ${tone}`}
      title={t('trust.tooltip')}
    >
      <Shield className="w-2.5 h-2.5" />
      {t('trust.level', { n: level })}
    </span>
  );
}

export function BlastChip({ tier, t, compact = false }: {
  tier: 'safe' | 'review' | 'blast-radius';
  t: TranslateFn;
  compact?: boolean;
}) {
  const tone =
    tier === 'safe' ? 'border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)] text-[color:var(--intent-success-fg)]'
    : tier === 'review' ? 'border-[var(--border-strong)] bg-[var(--bg-hover)] text-[var(--fg-muted)]'
    : 'border-[color:var(--intent-danger-fg)] bg-[color:var(--intent-danger-bg)] text-[color:var(--intent-danger-fg)]';
  const Icon = tier === 'safe' ? Shield : tier === 'review' ? Eye : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-md text-2xs font-mono border ${tone}`}>
      <Icon className="w-2.5 h-2.5" />
      {!compact && t(`run.br.${tier}`)}
      {compact && t(`run.br.${tier}`)}
    </span>
  );
}

// Status → { tone, Icon } map. Intent tones + neutral DS tokens now cover
// both themes, so the map no longer depends on `isDark`.
function runStatusMap(): Record<RunStatus, { tone: string; Icon: typeof ChevronRight }> {
  return {
    queued:           { tone: 'text-[var(--fg-muted)] border-[var(--border-strong)] bg-[var(--bg-hover)]', Icon: ChevronRight },
    running:          { tone: 'text-[color:var(--intent-success-fg)] border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)]', Icon: Zap },
    'awaiting-human': { tone: 'text-[color:var(--intent-warn-fg)] border-[color:var(--intent-warn-fg)] bg-[color:var(--intent-warn-bg)]', Icon: Hand },
    merged:           { tone: 'text-[color:var(--intent-success-fg)] border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)]', Icon: GitPullRequest },
    closed:           { tone: 'text-[var(--fg-muted)] border-[var(--border-strong)] bg-[var(--bg-hover)]', Icon: CheckCircle2 },
    failed:           { tone: 'text-[color:var(--intent-danger-fg)] border-[color:var(--intent-danger-fg)] bg-[color:var(--intent-danger-bg)]', Icon: XCircle },
    cancelled:        { tone: 'text-[var(--fg-subtle)] border-[var(--border-strong)] bg-[var(--bg-hover)]', Icon: Pause },
  };
}

export function RunStatusBadge({ status, t }: { status: RunStatus; t: TranslateFn }) {
  const { tone, Icon } = runStatusMap()[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-2xs font-bold uppercase tracking-eyebrow border ${tone}`}>
      <Icon className={`w-2.5 h-2.5 ${status === 'running' ? 'animate-pulse' : ''}`} />
      {t(`runStatus.${status}`)}
    </span>
  );
}
