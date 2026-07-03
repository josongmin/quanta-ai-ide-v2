import { useMemo, useState } from 'react';
import { Hourglass, ShieldCheck, ArchiveRestore } from 'lucide-react';
import type { AdmissionRule } from '@entities/admission';
import type { RuleLifecycle, RuleLifecycleEntry } from '../../model/store';
import { useAdmissionStore } from '../../model/store';

// Rule lifecycle (Rules §H1). New rules start `experimental` (warn-only,
// noisy by design); after a probation window they promote to `enforced`
// (production gate); old rules become `deprecated` (read-only audit).
//
// The section surfaces:
//   • Rules in experimental, with their probation progress bar.
//   • Promote / deprecate actions inline.
//   • Implicit demotion warning when a rule's experimental window expired
//     but no one promoted it (signal: rule may be wrong / unowned).

const PROBATION_DAYS = 30;
const PROBATION_MS = PROBATION_DAYS * 24 * 60 * 60 * 1000;

const STAGE_META: Record<RuleLifecycle, { label: string; icon: React.ComponentType<{ className?: string }>; fg: string }> = {
  experimental: { label: 'Experimental', icon: Hourglass,    fg: 'var(--intent-warn-fg)' },
  enforced:     { label: 'Enforced',     icon: ShieldCheck,  fg: 'var(--intent-success-fg)' },
  deprecated:   { label: 'Deprecated',   icon: ArchiveRestore, fg: 'var(--fg-subtle)' },
};

export function LifecyclePill({ lifecycle }: { lifecycle: RuleLifecycle }) {
  const meta = STAGE_META[lifecycle];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-px rounded text-2xs uppercase tracking-eyebrow font-mono"
      style={{
        color: meta.fg,
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
      title={`Lifecycle: ${meta.label.toLowerCase()}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {meta.label}
    </span>
  );
}

export function LifecycleSection({
  rules,
}: {
  rules: AdmissionRule[];
}) {
  const lifecycle = useAdmissionStore((s) => s.lifecycle);
  const setLifecycle = useAdmissionStore((s) => s.setLifecycle);
  const [mountedAt] = useState(() => Date.now());

  const entries = useMemo(() => {
    const out: { rule: AdmissionRule; entry: RuleLifecycleEntry; daysIn: number; pctElapsed: number; overdue: boolean }[] = [];
    for (const r of rules) {
      const e = lifecycle[r.id];
      if (e?.lifecycle !== 'experimental') continue;
      const daysIn = Math.max(0, Math.round((mountedAt - e.since) / (24 * 60 * 60 * 1000)));
      const pct = Math.min(1, daysIn / PROBATION_DAYS);
      const overdue = (mountedAt - e.since) > PROBATION_MS;
      out.push({ rule: r, entry: e, daysIn, pctElapsed: pct, overdue });
    }
    out.sort((a, b) => b.daysIn - a.daysIn);
    return out;
  }, [rules, lifecycle, mountedAt]);

  const deprecatedCount = useMemo(
    () => Object.values(lifecycle).filter((e) => e.lifecycle === 'deprecated').length,
    [lifecycle],
  );

  if (entries.length === 0 && deprecatedCount === 0) return null;

  return (
    <section
      className="rounded-md overflow-hidden"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <header
        className="flex items-center gap-2 px-4 h-9"
        style={{
          background: 'var(--bg-surface-muted)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <Hourglass className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
        <h3
          className="text-sm uppercase tracking-eyebrow font-semibold"
          style={{ color: 'var(--fg-strong)' }}
        >
          Lifecycle
        </h3>
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
          experimental rules earning trust before promotion
        </span>
        {deprecatedCount > 0 && (
          <span
            className="ml-auto text-xs font-mono"
            style={{ color: 'var(--fg-subtle)' }}
            title="Rules kept around for audit history but no longer firing"
          >
            {deprecatedCount} deprecated
          </span>
        )}
      </header>

      {entries.length === 0 ? (
        <div className="px-4 py-4 text-sm" style={{ color: 'var(--fg-subtle)' }}>
          No rules are in probation right now.
        </div>
      ) : (
        <ul>
          {entries.map((e, i) => (
            <li
              key={e.rule.id}
              className="px-4 py-3 flex items-center gap-3"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-default)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
                    {e.rule.name}
                  </span>
                  <span className="text-xs font-mono" style={{ color: 'var(--fg-subtle)' }}>
                    day {String(e.daysIn)} of {String(PROBATION_DAYS)}
                  </span>
                  {e.overdue && (
                    <span
                      className="text-xs uppercase tracking-eyebrow font-mono px-1.5 py-px rounded"
                      style={{
                        color: 'var(--intent-warn-fg)',
                        background: 'color-mix(in oklab, var(--intent-warn-fg) 10%, transparent)',
                      }}
                    >
                      overdue
                    </span>
                  )}
                </div>
                <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-muted)' }}>
                  <div
                    className="h-full"
                    style={{
                      width: `${String(Math.min(100, e.pctElapsed * 100))}%`,
                      background: e.overdue ? 'var(--intent-warn-fg)' : 'var(--fg-strong)',
                    }}
                  />
                </div>
                {e.entry.note && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
                    {e.entry.note}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setLifecycle(e.rule.id, 'enforced'); }}
                className="h-7 px-2.5 rounded-md text-sm font-medium shrink-0"
                style={{
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-strong)',
                  background: 'var(--bg-canvas)',
                }}
              >
                Promote
              </button>
              <button
                type="button"
                onClick={() => { setLifecycle(e.rule.id, 'deprecated'); }}
                className="h-7 px-2.5 rounded-md text-sm"
                style={{
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-muted)',
                }}
              >
                Deprecate
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
