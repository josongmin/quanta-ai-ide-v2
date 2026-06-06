import { useMemo } from 'react';
import { Gavel, Clock } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { useAdmissionStore } from '../../../../model/store';
import { SEVERITY_COLOR, useV2 } from '../tokens';
import { V2Card, SectionTitle } from '../primitives';
import { timeAgo } from '../retrospective';

// ── Audit (overrides + version log) ──────────────────────────────────

export function AuditSection() {
  const t = useV2();
  const { t: tA } = useTranslation('admission');
  const overrides = useAdmissionStore((s) => s.overrides);
  const versions = useAdmissionStore((s) => s.versions);
  const rules = useAdmissionStore((s) => s.rules);

  const versionLog = useMemo(() => {
    const flat: { ruleId: string; ruleName: string; v: number; at: number; summary: string }[] = [];
    for (const [ruleId, list] of Object.entries(versions)) {
      const rule = rules.find((r) => r.id === ruleId);
      for (const v of list) {
        flat.push({
          ruleId,
          ruleName: rule?.name ?? v.snapshot.name,
          v: v.version,
          at: v.changedAt,
          summary: v.summary,
        });
      }
    }
    return flat.sort((a, b) => b.at - a.at).slice(0, 20);
  }, [versions, rules]);

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
      <V2Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <SectionTitle icon={Gavel}>{tA('section.overrideAudit')}</SectionTitle>
          <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>
            who bypassed what · when · why
          </span>
        </div>
        {overrides.length === 0 ? (
          <div className="text-[11px] font-mono" style={{ color: t.textSubtle }}>{tA('empty.noOverrides')}</div>
        ) : (
          <div className="space-y-2">
            {overrides.map((o) => (
              <div
                key={o.id}
                className="px-3 py-2 rounded-md"
                style={{
                  background: t.inset,
                  border: `1px solid ${t.borderSoft}`,
                }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="w-1 h-3 rounded-full shrink-0"
                    style={{
                      background: o.severity === 'block' ? SEVERITY_COLOR.block
                        : o.severity === 'warn' ? SEVERITY_COLOR.warn : t.textSubtle,
                    }}
                  />
                  <span className="text-[11px] font-bold" style={{ color: t.textBody }}>{o.ruleName}</span>
                  <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>PR #{o.prSeed}</span>
                  <span className="ml-auto text-[10px] font-mono" style={{ color: t.textSubtle }}>
                    @{o.actor} · {timeAgo(o.at)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-mono" style={{ color: t.textMuted }}>
                  {o.reason}
                </div>
              </div>
            ))}
          </div>
        )}
      </V2Card>

      <V2Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <SectionTitle icon={Clock}>{tA('section.versionLog')}</SectionTitle>
          <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>
            edits to ruleset · most recent
          </span>
        </div>
        {versionLog.length === 0 ? (
          <div className="text-[11px] font-mono" style={{ color: t.textSubtle }}>
            No edits yet — saving any rule will record a version here.
          </div>
        ) : (
          <div className="space-y-2">
            {versionLog.map((v) => (
              <div
                key={`${v.ruleId}-${v.v}`}
                className="px-3 py-2 rounded-md"
                style={{
                  background: t.inset,
                  border: `1px solid ${t.borderSoft}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-mono px-1.5 py-px rounded-md"
                    style={{ color: t.accent, background: `${t.accent}15`, border: `1px solid ${t.accent}33` }}
                  >
                    v{v.v}
                  </span>
                  <span className="text-[11px] font-bold truncate" style={{ color: t.textBody }}>
                    {v.ruleName}
                  </span>
                  <span className="ml-auto text-[10px] font-mono" style={{ color: t.textSubtle }}>
                    {timeAgo(v.at)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-mono" style={{ color: t.textMuted }}>
                  {v.summary}
                </div>
              </div>
            ))}
          </div>
        )}
      </V2Card>
    </div>
  );
}
