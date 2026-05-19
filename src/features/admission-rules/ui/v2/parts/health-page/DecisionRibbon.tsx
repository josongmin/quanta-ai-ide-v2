import { useTranslation } from '@shared/i18n';
import { Filter, GitPullRequest } from 'lucide-react';
import type { PRDiff } from '@entities/repo';
import { type evaluateAdmission } from '@entities/admission';
import { SEVERITY_COLOR } from '../tokens';
import { V2Card, SectionTitle } from '../primitives';
import { statusRank } from '../retrospective';

// ─────────────────────────────────────────────────────────────────────────
// DECISION RIBBON — horizontal flow: PR → rule lanes → verdict
// ─────────────────────────────────────────────────────────────────────────

export function DecisionRibbon({
  decision, diff,
}: {
  decision: ReturnType<typeof evaluateAdmission>;
  diff: PRDiff;
}) {
  const { t: tr } = useTranslation('app');
  const lanes = decision.ruleResults
    .filter((r) => r.status !== 'skip')
    .sort((a, b) => statusRank(b.status) - statusRank(a.status))
    .slice(0, 14);

  const accent = decision.outcome === 'block' ? SEVERITY_COLOR.block
    : decision.outcome === 'warn' ? SEVERITY_COLOR.warn
    : 'var(--intent-success-vivid)';

  return (
    <V2Card className="p-5 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <SectionTitle icon={Filter}>{tr('admission.decisionFlow.title')}</SectionTitle>
        <span className="text-[10px] font-mono text-[var(--fg-subtle)]">
          {tr('admission.decisionFlow.subtitle', { count: lanes.length })}
        </span>
      </div>

      <div className="relative grid items-center gap-4" style={{ gridTemplateColumns: '160px minmax(0,1fr) 160px' }}>
        {/* Source pill — PR */}
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: 'linear-gradient(140deg, rgba(122,167,212,0.18), rgba(122,167,212,0.04))',
            border: '1px solid rgba(122,167,212,0.45)',
            boxShadow: '0 0 24px rgba(122,167,212,0.20), inset 0 0 12px rgba(122,167,212,0.10)',
          }}
        >
          <GitPullRequest className="w-5 h-5 mx-auto mb-1.5 text-[color:var(--intent-info-fg)]" />
          <div className="text-[20px] font-black text-[var(--fg-strong)] tabular-nums leading-none">
            {diff.changes.length}
          </div>
          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)]">
            files
          </div>
        </div>

        {/* Lanes */}
        <div className="relative">
          <div className="absolute inset-0 flex flex-col justify-center pointer-events-none">
            <div className="h-px bg-gradient-to-r from-[#7aa7d466] via-[var(--border-default)] to-[#5fa86c66]" />
          </div>
          {/* Flowing particles along the central line */}
          <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-12 h-[2px] rounded-full"
                style={{
                  left: '0%',
                  background: `linear-gradient(90deg, transparent, ${accent}cc, transparent)`,
                  animation: `admv2-flow 3.6s linear infinite`,
                  animationDelay: `${i * 0.9}s`,
                  boxShadow: `0 0 8px ${accent}88`,
                }}
              />
            ))}
          </div>
          <div className="relative flex items-center gap-1.5">
            {lanes.map((r) => {
              const sev = r.status === 'block' ? SEVERITY_COLOR.block
                : r.status === 'warn' ? SEVERITY_COLOR.warn : 'var(--fg-subtle)';
              const fired = r.status === 'block' || r.status === 'warn';
              return (
                <div
                  key={r.ruleId}
                  className="group flex-1 min-w-0 relative"
                  title={`${r.ruleName} · ${r.reason}`}
                >
                  <div
                    className="h-9 rounded-md transition-all group-hover:scale-y-110"
                    style={{
                      background: fired
                        ? `linear-gradient(180deg, ${sev}, ${sev}55)`
                        : 'linear-gradient(180deg, var(--bg-active), var(--bg-hover))',
                      boxShadow: fired ? `0 0 10px ${sev}66` : 'none',
                    }}
                  />
                  {/* tooltip-ish label, only on hover via group */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 -top-7 text-[9px] font-mono whitespace-nowrap px-2 py-0.5 rounded-md bg-[var(--bg-overlay)] text-[var(--fg-default)] border border-[var(--border-default)] z-10">
                    {r.ruleName}
                  </div>
                  {fired && (
                    <div
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: sev, boxShadow: `0 0 4px ${sev}` }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sink pill — verdict */}
        <div
          className="rounded-xl p-4 text-center relative"
          style={{
            background: `linear-gradient(140deg, ${accent}33, ${accent}08)`,
            border: `1px solid ${accent}66`,
            boxShadow: `0 0 28px ${accent}33, inset 0 0 14px ${accent}22`,
          }}
        >
          <div
            className="text-[20px] font-black uppercase tracking-tight tabular-nums leading-none"
            style={{ color: accent, textShadow: `0 0 14px ${accent}88` }}
          >
            {decision.outcome}
          </div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)]">
            verdict
          </div>
        </div>
      </div>
    </V2Card>
  );
}
