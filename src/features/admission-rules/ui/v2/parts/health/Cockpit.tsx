import { useMemo } from 'react';
import { Activity, Cpu, Layers } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import {
  type previewRule, type evaluateAdmission,
  type AdmissionRule, type RuleSource,
} from '@entities/admission';
import { SOURCE_GLYPH } from '../../../sourceStyle';
import { useV2 } from '../tokens';
import { V2Card, SectionTitle, Stat } from '../primitives';
import { VerdictDonut } from './VerdictDonut';
import { CostLedger } from './CostLedger';

// ─────────────────────────────────────────────────────────────────────────
// COCKPIT — left column
// ─────────────────────────────────────────────────────────────────────────

export function Cockpit({
  decision, rules, previews,
}: {
  decision: ReturnType<typeof evaluateAdmission>;
  rules: AdmissionRule[];
  previews: Map<string, ReturnType<typeof previewRule>>;
}) {
  const { t: tA } = useTranslation('admission');
  const t = useV2();
  const fired = decision.ruleResults.filter((r) => r.status === 'block' || r.status === 'warn');
  const totalMatched = useMemo(() => {
    let n = 0;
    for (const r of rules) {
      if (!r.enabled) continue;
      n += previews.get(r.id)?.matches.length ?? 0;
    }
    return n;
  }, [rules, previews]);

  const sourceCounts = useMemo(() => {
    const out: Record<RuleSource, { enabled: number; total: number }> = {
      native: { enabled: 0, total: 0 }, eslint: { enabled: 0, total: 0 },
      semgrep: { enabled: 0, total: 0 }, codeql: { enabled: 0, total: 0 },
      custom: { enabled: 0, total: 0 },
    };
    for (const r of rules) {
      out[r.source].total++;
      if (r.enabled) out[r.source].enabled++;
    }
    return out;
  }, [rules]);

  return (
    <div className="flex flex-col gap-4">
      <V2Card className="p-4 relative overflow-hidden">
        <SectionTitle icon={Activity}>{tA('section.liveSignal')}</SectionTitle>
        <div className="mt-3 flex items-center gap-4">
          <VerdictDonut
            block={decision.blockingCount}
            warn={decision.warningCount}
            pass={decision.passingCount}
          />
          <div className="flex-1 min-w-0 space-y-2">
            <Stat label="Matched" value={totalMatched} tone={totalMatched > 0 ? 'warn' : 'mute'} />
            <Stat label="Active" value={`${rules.filter((r) => r.enabled).length} / ${rules.length}`} />
            <Stat label="Fired" value={fired.length} tone={fired.length > 0 ? 'critical' : 'mute'} />
          </div>
        </div>
      </V2Card>

      <V2Card className="p-4">
        <SectionTitle icon={Layers}>{tA('section.ruleSources')}</SectionTitle>
        <div className="mt-3 space-y-1.5">
          {(Object.keys(sourceCounts) as RuleSource[]).map((s) => {
            const { enabled, total } = sourceCounts[s];
            if (total === 0) return null;
            const isNative = s === 'native';
            return (
              <div key={s} className="flex items-center gap-2 text-[11px] font-mono">
                <span className="w-3 text-center" style={{ color: isNative ? t.textBody : t.textSubtle }}>
                  {SOURCE_GLYPH[s]}
                </span>
                <span className={isNative ? 'font-bold' : ''} style={{ color: isNative ? t.textBody : t.textMuted }}>{s}</span>
                <div className="flex-1 h-px" style={{ background: t.inset }} />
                <span className="tabular-nums" style={{ color: t.textMuted }}>{enabled}/{total}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t text-[10px] font-mono leading-relaxed" style={{ borderColor: t.borderSoft, color: t.textSubtle }}>
          ★ native = engine-only signals. lint/semgrep can&apos;t see graph,
          taint, or PR-shape predicates.
        </div>
      </V2Card>

      <V2Card className="p-4">
        <SectionTitle icon={Cpu}>{tA('section.costLedger')}</SectionTitle>
        <div className="mt-3">
          <CostLedger rules={rules.filter((r) => r.enabled)} />
        </div>
      </V2Card>
    </div>
  );
}
