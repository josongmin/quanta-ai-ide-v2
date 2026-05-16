import { useMemo } from 'react';
import { useTranslation } from '@shared/i18n';
import { Activity, Cpu, Layers } from 'lucide-react';
import {
  estimateCost,
  type previewRule, type evaluateAdmission,
  type AdmissionRule, type RuleSource, type CostClass,
} from '@entities/admission';
import { SOURCE_GLYPH } from '../../../sourceStyle';
import { SEVERITY_COLOR } from '../tokens';
import { V2Card, SectionTitle, Stat } from '../primitives';

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
                <span className={`w-3 text-center ${isNative ? 'text-white/85' : 'text-white/40'}`}>
                  {SOURCE_GLYPH[s]}
                </span>
                <span className={isNative ? 'text-white/85 font-bold' : 'text-white/55'}>{s}</span>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-white/55 tabular-nums">{enabled}/{total}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 text-[10px] font-mono text-white/40 leading-relaxed">
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

function VerdictDonut({
  block, warn, pass,
}: { block: number; warn: number; pass: number }) {
  const total = block + warn + pass;
  const r = 28;
  const c = 2 * Math.PI * r;
  const seg = (n: number) => (total === 0 ? 0 : (n / total) * c);
  const offsets = {
    block: 0,
    warn: seg(block),
    pass: seg(block) + seg(warn),
  };
  return (
    <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
      <svg viewBox="0 0 80 80" width={80} height={80}>
        <defs>
          <filter id="donut-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>
        {/* track */}
        <circle cx={40} cy={40} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        {total > 0 && (
          <g transform="rotate(-90 40 40)">
            <circle
              cx={40} cy={40} r={r}
              fill="none"
              stroke={SEVERITY_COLOR.block}
              strokeWidth={6}
              strokeDasharray={`${seg(block)} ${c}`}
              strokeDashoffset={-offsets.block}
              strokeLinecap="round"
              filter="url(#donut-glow)"
            />
            <circle
              cx={40} cy={40} r={r}
              fill="none"
              stroke={SEVERITY_COLOR.warn}
              strokeWidth={6}
              strokeDasharray={`${seg(warn)} ${c}`}
              strokeDashoffset={-offsets.warn}
              strokeLinecap="round"
            />
            <circle
              cx={40} cy={40} r={r}
              fill="none"
              stroke="var(--intent-success-vivid)"
              strokeWidth={6}
              strokeDasharray={`${seg(pass)} ${c}`}
              strokeDashoffset={-offsets.pass}
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-black text-white tabular-nums leading-none">
          {total}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/40 mt-0.5">
          rules
        </span>
      </div>
    </div>
  );
}

function CostLedger({ rules }: { rules: AdmissionRule[] }) {
  const order: CostClass[] = ['instant', 'fast', 'medium', 'slow', 'background'];
  const counts = useMemo(() => {
    const out: Record<CostClass, number> = {
      instant: 0, fast: 0, medium: 0, slow: 0, background: 0,
    };
    for (const r of rules) out[estimateCost(r)]++;
    return out;
  }, [rules]);
  const total = rules.length;
  return (
    <div className="space-y-1.5">
      {order.map((c) => {
        const n = counts[c];
        if (n === 0) return null;
        const heavy = c === 'slow' || c === 'background';
        return (
          <div key={c} className="flex items-center gap-2 text-[11px] font-mono">
            <span className={heavy ? 'text-white/85 font-bold' : 'text-white/55'}>{c}</span>
            <div className="flex-1 h-px bg-white/5" />
            <div
              className="h-1.5 rounded-full relative overflow-hidden"
              style={{ width: 80, background: 'rgba(255,255,255,0.05)' }}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${(n / total) * 100}%`,
                  background: heavy ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)',
                }}
              />
            </div>
            <span className="text-white/70 tabular-nums w-6 text-right">{n}</span>
          </div>
        );
      })}
    </div>
  );
}
