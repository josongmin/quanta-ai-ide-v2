import { useState } from 'react';
import type { CSSProperties, JSX } from 'react';
import type { AutoDraftSuggestion } from '@entities/ownership';
import { EmptyHint, GlassCard, SectionHeader } from '@shared/ui';
import { confidenceTone } from '../lib';

export type AutoDraftSuggestionsProps = {
  suggestions: AutoDraftSuggestion[];
  onAccept?: (id: string, zoneId: string, action: AutoDraftSuggestion['proposedAction']) => void;
  onDismiss?: (id: string) => void;
}

const ACTION_RESULT_HINT: Record<AutoDraftSuggestion['proposedAction'], string> = {
  'open-stack-plan': 'opens the AI landing plan modal',
  'reroute-reviewer': 'updates suggested reviewer in routing card',
  'flag-cross-team': 'flags zone in cross-team board',
  'split-pr': 'opens split-pr planner',
};

type ActionKey = AutoDraftSuggestion['proposedAction'];

const ACTION_LABEL: Record<ActionKey, string> = {
  'open-stack-plan': 'OPEN STACK PLAN',
  'reroute-reviewer': 'REROUTE REVIEWER',
  'flag-cross-team': 'FLAG CROSS-TEAM',
  'split-pr': 'SPLIT PR',
};

function actionTone(action: ActionKey): { bg: string; fg: string } {
  switch (action) {
    case 'reroute-reviewer':
    case 'flag-cross-team':
      return {
        bg: 'rgb(from var(--intent-warn-vivid) r g b / 0.14)',
        fg: 'var(--intent-warn-fg)',
      };
    case 'split-pr':
      return {
        bg: 'rgb(from var(--fg-link) r g b / 0.14)',
        fg: 'var(--fg-link)',
      };
    case 'open-stack-plan':
    default:
      return {
        bg: 'var(--bg-surface-muted)',
        fg: 'var(--fg-default)',
      };
  }
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  const sec = Math.max(0, Math.round(diffMs / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  return `${wk}w ago`;
}

function ActionPill({ action }: { action: ActionKey }) {
  const tone = actionTone(action);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.22em]"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {ACTION_LABEL[action]}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const tone = confidenceTone(value);
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col flex-1 min-w-0 max-w-[200px]">
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-muted)' }}
        >
          Confidence
        </span>
        <span
          className="text-[9px] font-mono tabular-nums"
          style={{ color: tone.fg }}
        >
          {pct}%
        </span>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden w-full"
        style={{ background: 'var(--bg-surface-muted)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: tone.vivid }}
        />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary: boolean;
}) {
  const baseStyle: CSSProperties = {
    background: primary ? 'var(--bg-active)' : 'transparent',
    color: primary ? 'var(--fg-strong)' : 'var(--fg-default)',
    border: '1px solid var(--border-default)',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.16em] transition-colors"
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!primary) e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!primary) e.currentTarget.style.background = 'transparent';
      }}
    >
      {label}
    </button>
  );
}

function SuggestionItem({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: AutoDraftSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <GlassCard tone="inner" className="p-3 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <ActionPill action={suggestion.proposedAction} />
        <span
          className="ml-auto text-[9px] font-mono tabular-nums"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {formatRelative(suggestion.detectedAt)}
        </span>
      </div>

      <div
        className="text-[13px] font-semibold leading-snug mb-1"
        style={{ color: 'var(--fg-default)' }}
      >
        {suggestion.hook}
      </div>
      <div
        className="text-[11px] leading-snug mb-3"
        style={{ color: 'var(--fg-muted)' }}
      >
        {suggestion.why}
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <ConfidenceBar value={suggestion.confidence} />
        <div className="flex flex-col items-end gap-1 ml-auto">
          <span
            className="text-[9px] font-mono lowercase"
            style={{ color: 'var(--fg-subtle)' }}
            title={`Accept ${ACTION_RESULT_HINT[suggestion.proposedAction]}`}
          >
            accept → {ACTION_RESULT_HINT[suggestion.proposedAction]}
          </span>
          <div className="flex items-center gap-1.5">
            <ActionButton label="Dismiss" onClick={onDismiss} primary={false} />
            <ActionButton label="Accept" onClick={onAccept} primary />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export function AutoDraftSuggestions({
  suggestions,
  onAccept,
  onDismiss,
}: AutoDraftSuggestionsProps): JSX.Element {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  const visible = suggestions.filter((s) => !dismissed.has(s.id));

  const handleDismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    onDismiss?.(id);
  };

  return (
    <GlassCard className="p-3 rounded-xl">
      <SectionHeader title="AI suggestions" badge={`${visible.length} pending`} />

      {visible.length === 0 ? (
        <EmptyHint text="No active suggestions — your routing is clean." />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((s) => (
            <SuggestionItem
              key={s.id}
              suggestion={s}
              onAccept={() => onAccept?.(s.id, s.zoneId, s.proposedAction)}
              onDismiss={() => { handleDismiss(s.id); }}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}
