// FixModePanel — the action row at the bottom of the suspect drilldown.
//
// Order is fixed by the plan's UX rule: investigate → patch → rollback →
// escalate. "Open owner" and "Assign agent" are extra handoff verbs and
// sit alongside the triage actions. Recommended action is highlighted
// with a ring (no left bar, no full-width fill).
//
// Presentational only — actual side effects flow through `onAction`.

import type { TriageAction } from '@entities/suspect';

export type FixModeAction = TriageAction | 'open_owner' | 'draft_fix' | 'assign_agent';

type Props = {
  onAction: (action: FixModeAction) => void;
  recommended?: TriageAction;
};

type ButtonSpec = {
  action: FixModeAction;
  label: string;
};

const BUTTONS: ButtonSpec[] = [
  { action: 'investigate', label: 'Investigate' },
  { action: 'open_owner', label: 'Open owner' },
  { action: 'draft_fix', label: 'Draft fix' },
  { action: 'patch', label: 'Patch' },
  { action: 'rollback', label: 'Rollback' },
  { action: 'assign_agent', label: 'Assign agent' },
  { action: 'escalate', label: 'Escalate' },
];

export default function FixModePanel({ onAction, recommended }: Props) {
  return (
    <div className="rounded-2xl px-3 py-3 bg-white dark:bg-white/[0.04] dark:backdrop-blur ring-1 ring-inset ring-black/5 dark:ring-white/5">
      <div className="flex items-center gap-2 px-1 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-300">
          Fix mode
        </span>
        {recommended && (
          <span
            style={{ color: 'var(--intent-success-fg)' }}
            className="font-mono text-[10px]"
          >
            recommended: {recommended}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {BUTTONS.map((b) => {
          const isRecommended = recommended !== undefined && b.action === recommended;
          const style: React.CSSProperties = isRecommended
            ? {
                color: 'var(--intent-success-fg)',
                boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--intent-success-vivid) 50%, transparent)',
              }
            : {};
          const text = isRecommended ? '' : 'text-zinc-700 dark:text-zinc-200';
          const ring = isRecommended ? '' : 'ring-1 ring-inset ring-black/5 dark:ring-white/10';
          return (
            <button
              key={b.action}
              type="button"
              onClick={() => { onAction(b.action); }}
              style={style}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md bg-white/30 dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${ring} ${text}`}
            >
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
