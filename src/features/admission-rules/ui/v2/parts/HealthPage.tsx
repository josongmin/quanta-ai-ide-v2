import { useMemo, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, ShieldX, Activity, Zap, Cpu, Eye,
  ArrowUpRight, Layers, Plus, Filter, Sparkles, Clock,
  GitPullRequest,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { PRDiff } from '@entities/repo';
import {
  estimateCost,
  type previewRule, type evaluateAdmission,
  type AdmissionRule, type RuleSource, type CostClass,
} from '@entities/admission';
import { SOURCE_GLYPH, usesHint, describeSignal } from '../../sourceStyle';
import { SEVERITY_COLOR, useV2, type V2Theme } from './tokens';
import { V2Card, SectionTitle, Stat } from './primitives';
import { statusRank, RETRO_SEEDS } from './retrospective';
import { ConfidenceBand } from './ConfidenceBand';
import { EffectSizeBar } from './EffectSizeBar';
import { AnomalySentinel } from './AnomalySentinel';
import { RuleCalibrationCard } from './RuleCalibrationCard';
import { CounterfactualImpactCard } from './CounterfactualImpactCard';
import { SurvivalCurveCard } from './SurvivalCurveCard';
import { CusumDriftCard } from './CusumDriftCard';
import { ReliabilityDiagramCard } from './ReliabilityDiagramCard';
import { mulberry32 } from './statsKit';
import type { Confusion, SurvivalEvent } from './statsKit';

// ─────────────────────────────────────────────────────────────────────────
// HEALTH PAGE — the original v2 dashboard
// ─────────────────────────────────────────────────────────────────────────

export function HealthPage({
  decision, diff, seed, onRegenerate, rules, previews, retro,
}: {
  decision: ReturnType<typeof evaluateAdmission>;
  diff: PRDiff;
  seed: number;
  onRegenerate: () => void;
  rules: AdmissionRule[];
  previews: Map<string, ReturnType<typeof previewRule>>;
  retro: { seed: number; diff: PRDiff; decision: ReturnType<typeof evaluateAdmission> }[];
}) {
  return (
    <div className="relative min-h-full p-6 pt-10 flex flex-col gap-6">
      <div className="admv2-rise">
        <Hero
          decision={decision}
          diff={diff}
          seed={seed}
          onRegenerate={onRegenerate}
        />
      </div>

      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: '300px minmax(0,1fr) 320px' }}
      >
        <div className="admv2-rise admv2-rise-1">
          <Cockpit decision={decision} rules={rules} previews={previews} />
        </div>
        <div className="admv2-rise admv2-rise-2">
          <Constellation rules={rules} previews={previews} decision={decision} />
        </div>
        <div className="admv2-rise admv2-rise-3">
          <LiveFeed retro={retro} />
        </div>
      </div>

      <div className="admv2-rise admv2-rise-3">
        <DecisionRibbon decision={decision} diff={diff} />
      </div>

      {/* Science strip — four data-grade cards driven by the same retro
          window. Wilson CI on pass-rate, Cohen's d effect size, EWMA +
          z-score anomaly sentinel, and a per-rule precision/recall/F1
          calibration table. The numbers are derived deterministically
          from `retro` so the same PR seed always renders the same
          values; production wires this to real telemetry. */}
      <div className="admv2-rise admv2-rise-4">
        <ScienceStrip retro={retro} rules={rules} />
      </div>

      <div className="admv2-rise admv2-rise-4">
        <Retroactive retro={retro} />
      </div>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SCIENCE STRIP — data-grade panel above the retroactive heat bars
// ─────────────────────────────────────────────────────────────────────────

function ScienceStrip({
  retro, rules,
}: {
  retro: { seed: number; diff: PRDiff; decision: ReturnType<typeof evaluateAdmission> }[];
  rules: AdmissionRule[];
}) {
  const stats = useMemo(() => {
    if (retro.length === 0) {
      return {
        passes: 0,
        total: 0,
        before: [] as number[],
        after: [] as number[],
        daily: [] as number[],
        ruleRows: [] as { id: string; label: string; confusion: Confusion }[],
        treatedBefore: [] as number[],
        treatedAfter: [] as number[],
        controlBefore: [] as number[],
        controlAfter: [] as number[],
        survTreated: [] as SurvivalEvent[],
        survControl: [] as SurvivalEvent[],
        passDaily: [] as number[],
        predictions: [] as { p: number; outcome: 0 | 1 }[],
      };
    }

    // ── Wilson CI: passes vs total. "pass" = decision.outcome === 'allow'.
    const passes = retro.filter((r) => r.decision.outcome === 'allow').length;
    const total = retro.length;

    // ── Cohen's d: synthetic before/after window over blocking-rule counts.
    const mid = Math.floor(retro.length / 2);
    const before = retro.slice(0, mid).map((r) => r.decision.blockingCount);
    const after  = retro.slice(mid).map((r) => r.decision.blockingCount);

    // ── Daily series for the anomaly sentinel.
    const daily = retro.map(
      (r) => r.decision.blockingCount + r.decision.warningCount,
    );

    // ── Per-rule confusion matrix.
    const ruleConfusion = new Map<string, Confusion>();
    for (const rule of rules) {
      ruleConfusion.set(rule.id, { tp: 0, fp: 0, tn: 0, fn: 0 });
    }
    const rand = mulberry32(0x517d2 + retro.length);
    for (const slot of retro) {
      const truthPositive = slot.decision.blockingCount > 0 && rand() > 0.1;
      for (const ev of slot.decision.ruleResults) {
        const conf = ruleConfusion.get(ev.ruleId);
        if (!conf) continue;
        const fired = ev.status === 'block' || ev.status === 'warn';
        if (fired && truthPositive) conf.tp++;
        else if (fired && !truthPositive) conf.fp++;
        else if (!fired && truthPositive) conf.fn++;
        else conf.tn++;
      }
    }

    const ruleRows = rules
      .map((r) => ({
        id: r.id,
        label: r.name,
        confusion: ruleConfusion.get(r.id) ?? { tp: 0, fp: 0, tn: 0, fn: 0 },
      }))
      .filter((r) => {
        const c = r.confusion;
        return c.tp + c.fp + c.fn > 0;
      });

    // ── DiD groups for CounterfactualImpactCard. Treated = slots where
    // the first rule fired; control = slots where it didn't. This is a
    // demo proxy (production would use propensity-matched cohorts) but
    // it's enough to give the chart honest, varying numbers as the
    // rule set changes.
    const firstRuleId = rules[0]?.id;
    const treatedSlots = firstRuleId
      ? retro.filter((slot) =>
          slot.decision.ruleResults.find((r) =>
            r.ruleId === firstRuleId
            && (r.status === 'block' || r.status === 'warn')))
      : retro;
    const controlSlots = firstRuleId
      ? retro.filter((slot) =>
          !slot.decision.ruleResults.find((r) =>
            r.ruleId === firstRuleId
            && (r.status === 'block' || r.status === 'warn')))
      : [];
    const splitT = Math.floor(treatedSlots.length / 2);
    const splitC = Math.floor(controlSlots.length / 2);
    const treatedBefore = treatedSlots.slice(0, splitT)
      .map((s) => s.decision.blockingCount);
    const treatedAfter = treatedSlots.slice(splitT)
      .map((s) => s.decision.blockingCount);
    const controlBefore = controlSlots.slice(0, splitC)
      .map((s) => s.decision.blockingCount);
    const controlAfter = controlSlots.slice(splitC)
      .map((s) => s.decision.blockingCount);

    // ── Survival data — synthetic time-to-merge per retro PR. Friction
    // (warns + blocks) extends the time; ~15% are right-censored.
    const rand2 = mulberry32(0xC4F2 + retro.length);
    const survTreated: SurvivalEvent[] = [];
    const survControl: SurvivalEvent[] = [];
    for (const slot of retro) {
      const friction = slot.decision.blockingCount * 6
                     + slot.decision.warningCount * 2;
      const baseTime = 4 + rand2() * 14;
      const time = baseTime + friction + rand2() * 4;
      const censored: 0 | 1 = rand2() < 0.15 ? 0 : 1;
      const ev: SurvivalEvent = { time, event: censored };
      const isTreated = firstRuleId != null
        && slot.decision.ruleResults.find((r) =>
              r.ruleId === firstRuleId
              && (r.status === 'block' || r.status === 'warn')) != null;
      if (isTreated) survTreated.push(ev);
      else survControl.push(ev);
    }
    if (survTreated.length === 0 || survControl.length === 0) {
      // Fallback split so neither half renders blank.
      const all: SurvivalEvent[] = [...survTreated, ...survControl];
      survTreated.length = 0;
      survControl.length = 0;
      for (let i = 0; i < all.length; i++) {
        if (i % 2 === 0) survTreated.push(all[i]);
        else survControl.push(all[i]);
      }
    }

    // ── CUSUM input: daily pass-rate (1/0).
    const passDaily = retro.map((r) =>
      r.decision.outcome === 'allow' ? 1 : 0,
    );

    // ── Reliability data: predicted-pass probability vs actual outcome.
    const predictions: { p: number; outcome: 0 | 1 }[] = [];
    const totalRules = Math.max(1, rules.length);
    for (const slot of retro) {
      const fired = slot.decision.blockingCount + slot.decision.warningCount;
      const raw = 1 - fired / Math.max(1, totalRules);
      const p = Math.min(0.98, Math.max(0.02, raw));
      predictions.push({
        p,
        outcome: slot.decision.outcome === 'allow' ? 1 : 0,
      });
    }

    return {
      passes, total, before, after, daily, ruleRows,
      treatedBefore, treatedAfter, controlBefore, controlAfter,
      survTreated, survControl, passDaily, predictions,
    };
  }, [retro, rules]);

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}
    >
      <ConfidenceBand passes={stats.passes} total={stats.total} />
      <EffectSizeBar
        before={stats.before}
        after={stats.after}
        metricLabel="blocking rules / PR"
        lowerIsBetter
      />
      <AnomalySentinel daily={stats.daily} />
      <RuleCalibrationCard rows={stats.ruleRows} />

      {/* SOTA+ row — causal · survival · drift · calibration */}
      <CounterfactualImpactCard
        treatedBefore={stats.treatedBefore}
        treatedAfter={stats.treatedAfter}
        controlBefore={stats.controlBefore}
        controlAfter={stats.controlAfter}
        metricLabel="blocking rules / PR"
        lowerIsBetter
      />
      <SurvivalCurveCard
        events={stats.survTreated}
        control={stats.survControl}
        cohortLabel="rule fired"
        controlLabel="rule skipped"
      />
      <CusumDriftCard
        daily={stats.passDaily}
        lowerIsBetter={false}
        metricLabel="daily pass-rate (1 = allow)"
      />
      <ReliabilityDiagramCard predictions={stats.predictions} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// HERO — verdict aurora, ticker counters, scanning line
// ─────────────────────────────────────────────────────────────────────────

export function Hero({
  decision, diff, seed, onRegenerate,
}: {
  decision: ReturnType<typeof evaluateAdmission>;
  diff: PRDiff;
  seed: number;
  onRegenerate: () => void;
}) {
  const t = useV2();
  const outcome = decision.outcome;
  const accent = outcome === 'block' ? SEVERITY_COLOR.block
    : outcome === 'warn' ? SEVERITY_COLOR.warn
    : t.ok;
  const Icon = outcome === 'allow' ? ShieldCheck : outcome === 'warn' ? ShieldAlert : ShieldX;

  // Hero is a structural status card. Single accent stripe on the left
  // carries the verdict colour; everything else is neutral type. The
  // only motion is a fade-in on `outcome` change so the verdict swap
  // reads as deliberate rather than static.

  return (
    <V2Card className="relative">
      {/* Verdict signal carried by the icon tile + verdict pill below —
          no left-edge accent stripe. */}
      <div className="relative px-6 py-5 flex items-center gap-6">
        {/* Compact icon */}
        <div
          className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
          style={{
            background: `${accent}1a`,
            border: `1px solid ${accent}40`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>

        {/* Headline */}
        <div className="min-w-0 flex-1">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: t.textMuted }}
          >
            Admission decision · PR #{seed}
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span
              key={outcome}
              className="admv2-num-flip text-[28px] font-bold uppercase tracking-tight leading-none"
              style={{ color: accent }}
            >
              {outcome}
            </span>
            <span
              className="text-[12px]"
              style={{ color: t.textMuted }}
            >
              {diff.changes.length} files · {diff.affected.length} ripple · {decision.ruleResults.length} rules
            </span>
          </div>
        </div>

        {/* Counts — inline, neutral */}
        <div className="hidden md:flex items-center gap-5 shrink-0 pl-6 border-l" style={{ borderColor: t.borderSoft }}>
          <Count label="Block" value={decision.blockingCount} color={decision.blockingCount > 0 ? SEVERITY_COLOR.block : undefined} t={t} />
          <Count label="Warn"  value={decision.warningCount}  color={decision.warningCount > 0 ? SEVERITY_COLOR.warn : undefined} t={t} />
          <Count label="Pass"  value={decision.passingCount} t={t} />
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-2">
          <button type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-medium transition-colors"
            style={{
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.textBody,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverSubtle; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Resample
          </button>
          <button type="button"
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-medium transition-colors"
            style={{
              background: t.textHi,
              color: t.page,
            }}
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            Open PR
          </button>
        </div>
      </div>
    </V2Card>
  );
}

// Count — inline label/value pair used in the hero counter strip.
function Count({ label, value, color, t }: { label: string; value: number; color?: string; t: V2Theme }) {
  return (
    <div className="flex flex-col items-end leading-none">
      <span
        className="text-[18px] font-semibold tabular-nums"
        style={{ color: color ?? t.textBody }}
      >
        {value}
      </span>
      <span
        className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: t.textSubtle }}
      >
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// COCKPIT — left column
// ─────────────────────────────────────────────────────────────────────────

function Cockpit({
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

function VerdictDonut({
  block, warn, pass,
}: { block: number; warn: number; pass: number }) {
  const t = useV2();
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
        <circle cx={40} cy={40} r={r} fill="none" stroke={t.inset} strokeWidth={6} />
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
              stroke={t.ok}
              strokeWidth={6}
              strokeDasharray={`${seg(pass)} ${c}`}
              strokeDashoffset={-offsets.pass}
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-black tabular-nums leading-none" style={{ color: t.textHi }}>
          {total}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-[0.18em] mt-0.5" style={{ color: t.textSubtle }}>
          rules
        </span>
      </div>
    </div>
  );
}

function CostLedger({ rules }: { rules: AdmissionRule[] }) {
  const t = useV2();
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
            <span className={heavy ? 'font-bold' : ''} style={{ color: heavy ? t.textBody : t.textMuted }}>{c}</span>
            <div className="flex-1 h-px" style={{ background: t.inset }} />
            <div
              className="h-1.5 rounded-full relative overflow-hidden"
              style={{ width: 80, background: t.inset }}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${(n / total) * 100}%`,
                  background: heavy ? t.textBody : t.textSubtle,
                }}
              />
            </div>
            <span className="tabular-nums w-6 text-right" style={{ color: t.textBody }}>{n}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CONSTELLATION — centre. Rules as nodes, source families as clusters,
// dashed flow lines from a central PR core to each fired rule. SVG so we
// can stroke-dash + animate.
// ─────────────────────────────────────────────────────────────────────────

function Constellation({
  rules, previews, decision,
}: {
  rules: AdmissionRule[];
  previews: Map<string, ReturnType<typeof previewRule>>;
  decision: ReturnType<typeof evaluateAdmission>;
}) {
  const { t: tA } = useTranslation('admission');
  const t = useV2();
  const [hovered, setHovered] = useState<string | null>(null);
  const [filter, setFilter] = useState<RuleSource | 'all'>('all');

  const visible = filter === 'all' ? rules : rules.filter((r) => r.source === filter);
  const firedIds = new Set(
    decision.ruleResults
      .filter((r) => r.status === 'block' || r.status === 'warn')
      .map((r) => r.ruleId),
  );

  // Layout — group by source into vertical bands; spread rules horizontally.
  const W = 720;
  const H = 360;
  const sources: RuleSource[] = ['native', 'eslint', 'semgrep', 'codeql', 'custom'];
  const bandY = (s: RuleSource) => 50 + sources.indexOf(s) * ((H - 100) / (sources.length - 1));
  const visibleBySource = sources.map((s) => ({
    source: s,
    items: visible.filter((r) => r.source === s),
  }));

  const positioned = visibleBySource.flatMap((band) => {
    const n = band.items.length;
    return band.items.map((r, i) => {
      const x = n === 1 ? W / 2 : 80 + ((W - 160) * i) / (n - 1);
      const y = bandY(band.source);
      return { rule: r, x, y };
    });
  });

  const hoveredRule = hovered ? rules.find((r) => r.id === hovered) ?? null : null;
  const hoveredPreview = hovered ? previews.get(hovered) ?? null : null;
  const hoveredEval = hovered ? decision.ruleResults.find((r) => r.ruleId === hovered) ?? null : null;

  return (
    <V2Card className="p-5 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <SectionTitle icon={Zap}>{tA('section.ruleConstellation')}</SectionTitle>
        <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>
          {visible.length} nodes · severity = hue · matches = glow · dashed = fired
        </span>
        <div className="flex-1" />
        <FilterChips value={filter} onChange={setFilter} rules={rules} />
        <button type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
          style={{ background: t.textHi, color: t.page }}
        >
          <Plus className="w-3 h-3" />
          New rule
        </button>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[360px]">
          <defs>
            <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor={t.accent} stopOpacity="0.55" />
              <stop offset="60%" stopColor={t.accent} stopOpacity="0.10" />
              <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Source band labels */}
          {sources.map((s) => (
            <g key={s}>
              <text
                x={12}
                y={bandY(s) + 3}
                fill={t.textFaint}
                fontSize={9}
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}
              >
                {SOURCE_GLYPH[s]} {s}
              </text>
              <line
                x1={70}
                x2={W - 20}
                y1={bandY(s)}
                y2={bandY(s)}
                stroke={t.borderSoft}
                strokeDasharray="2 4"
              />
            </g>
          ))}

          {/* Core PR node — radar style: glow halo + dashed orbit + sweep
              + concentric rings + center pulse */}
          <circle cx={W - 40} cy={H / 2} r={56} fill="url(#core-glow)" />
          {/* concentric rings */}
          {[18, 28, 40].map((r) => (
            <circle
              key={r}
              cx={W - 40}
              cy={H / 2}
              r={r}
              fill="none"
              stroke={t.accent}
              strokeOpacity={0.18}
              strokeWidth={0.5}
              strokeDasharray="2 4"
            />
          ))}
          {/* radar sweep cone — rotating linear gradient triangle */}
          <defs>
            <linearGradient id="sweep-grad" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%"  stopColor={t.accent} stopOpacity="0" />
              <stop offset="80%" stopColor={t.accent} stopOpacity="0" />
              <stop offset="100%" stopColor={t.accent} stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <g
            className="admv2-sweep"
            style={{ transformOrigin: `${W - 40}px ${H / 2}px` }}
          >
            <path
              d={`M ${W - 40} ${H / 2} L ${W - 40 + 40} ${H / 2 - 16} A 42 42 0 0 1 ${W - 40 + 40} ${H / 2 + 16} Z`}
              fill="url(#sweep-grad)"
            />
          </g>
          {/* outer dashed orbit, slow rotation */}
          <g
            className="admv2-orbit"
            style={{ transformOrigin: `${W - 40}px ${H / 2}px` }}
          >
            <circle
              cx={W - 40}
              cy={H / 2}
              r={48}
              fill="none"
              stroke={t.accent}
              strokeOpacity={0.45}
              strokeWidth={0.8}
              strokeDasharray="3 6"
            />
          </g>
          {/* core pulse */}
          <circle cx={W - 40} cy={H / 2} r={10} fill={t.accent} opacity={0.95}>
            <animate attributeName="r" values="10;13;10" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.95;0.55;0.95" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx={W - 40} cy={H / 2} r={4} fill={t.accent} opacity={0.95} />
          <text
            x={W - 40}
            y={H / 2 + 64}
            textAnchor="middle"
            fill={t.textMuted}
            fontSize={9}
            fontFamily="ui-monospace, SFMono-Regular, monospace"
            style={{ letterSpacing: '0.22em', textTransform: 'uppercase' }}
          >
            PR core
          </text>

          {/* Connectors from fired rules to core */}
          {positioned.map(({ rule, x, y }) => {
            if (!firedIds.has(rule.id)) return null;
            const accent = rule.severity === 'block' ? SEVERITY_COLOR.block : SEVERITY_COLOR.warn;
            return (
              <path
                key={`line-${rule.id}`}
                d={`M ${x} ${y} Q ${(x + W - 40) / 2} ${y - 30} ${W - 40} ${H / 2}`}
                stroke={accent}
                strokeOpacity={0.55}
                strokeWidth={1.2}
                fill="none"
                strokeDasharray="4 6"
                className="admv2-dash"
              />
            );
          })}

          {/* Nodes */}
          {positioned.map(({ rule, x, y }) => {
            const matches = previews.get(rule.id)?.matches.length ?? 0;
            const fired = firedIds.has(rule.id);
            const sev = rule.severity === 'block' ? SEVERITY_COLOR.block
              : rule.severity === 'warn' ? SEVERITY_COLOR.warn
              : t.textMuted;
            const radius = 6 + Math.min(8, matches / 5);
            const isHover = hovered === rule.id;
            const opacity = !rule.enabled ? 0.25 : isHover || hovered === null ? 1 : 0.5;
            return (
              <g
                key={rule.id}
                onMouseEnter={() => { setHovered(rule.id); }}
                onMouseLeave={() => { setHovered((h) => (h === rule.id ? null : h)); }}
                style={{ cursor: 'pointer' }}
                opacity={opacity}
              >
                {fired && (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 4}
                    fill={sev}
                    opacity={0.25}
                    className="admv2-ping"
                    style={{ transformOrigin: `${x}px ${y}px` }}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={rule.enabled ? sev : t.textFaint}
                  opacity={rule.enabled ? 0.95 : 0.4}
                  style={{
                    filter: rule.enabled
                      ? `drop-shadow(0 0 ${4 + matches / 4}px ${sev})`
                      : 'none',
                  }}
                />
                {isHover && (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 6}
                    fill="none"
                    stroke={sev}
                    strokeOpacity={0.7}
                    strokeWidth={1}
                  />
                )}
                <text
                  x={x}
                  y={y - radius - 6}
                  textAnchor="middle"
                  fill={isHover ? t.textHi : t.textSubtle}
                  fontSize={9}
                  fontFamily="ui-monospace, SFMono-Regular, monospace"
                >
                  {matches}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Inspector */}
      <div className="mt-2 pt-4 border-t min-h-[88px]" style={{ borderColor: t.borderSoft }}>
        {hoveredRule ? (
          <RuleInspector rule={hoveredRule} preview={hoveredPreview} evalResult={hoveredEval} />
        ) : (
          <EmptyInspector />
        )}
      </div>
    </V2Card>
  );
}

function RuleInspector({
  rule, preview, evalResult,
}: {
  rule: AdmissionRule;
  preview: ReturnType<typeof previewRule> | null;
  evalResult: ReturnType<typeof evaluateAdmission>['ruleResults'][number] | null;
}) {
  const t = useV2();
  const cost = estimateCost(rule);
  const sevColor = rule.severity === 'block' ? SEVERITY_COLOR.block
    : rule.severity === 'warn' ? SEVERITY_COLOR.warn : t.textMuted;
  const fired = evalResult && (evalResult.status === 'block' || evalResult.status === 'warn');
  const dotColor = rule.enabled ? sevColor : t.textFaint;
  return (
    <div className="flex items-start gap-3 admv2-rise">
      <span className="relative shrink-0 mt-1 inline-flex items-center justify-center w-3 h-3">
        {rule.enabled && rule.severity !== 'info' && (
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: sevColor, opacity: 0.18, filter: 'blur(2px)' }}
          />
        )}
        <span
          className="relative w-2 h-2 rounded-full"
          style={{
            background: dotColor,
            boxShadow: rule.enabled && rule.severity === 'block' ? `0 0 0 2px ${sevColor}33` : 'none',
          }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>
            {SOURCE_GLYPH[rule.source]} {rule.source}
          </span>
          <span style={{ color: t.textFaint }}>·</span>
          <span
            className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-px rounded-md"
            style={{ color: sevColor, background: `${sevColor}1a` }}
          >
            {rule.severity}
          </span>
          <span style={{ color: t.textFaint }}>·</span>
          <span className="text-[10px] font-mono" style={{ color: t.textMuted }}>{cost}</span>
          {fired && (
            <span
              className="ml-auto text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-md"
              style={{ color: sevColor, background: `${sevColor}22`, border: `1px solid ${sevColor}55` }}
            >
              fired in PR
            </span>
          )}
        </div>
        <div className="mt-1 text-[14px] font-bold truncate" style={{ color: t.textBody }}>
          {rule.name}
        </div>
        <div className="mt-0.5 text-[11px] font-mono truncate" style={{ color: t.textSubtle }}>
          uses {usesHint(rule.signal)} · {describeSignal(rule.signal)}
        </div>
        {preview && (
          <div className="mt-2 flex items-center gap-3 text-[10px] font-mono" style={{ color: t.textMuted }}>
            <span>{preview.matches.length} repo-wide</span>
            <span style={{ color: t.textFaint }}>·</span>
            <span style={{ color: t.textBody }}>{preview.confidenceMix.exact} exact</span>
            <span>{preview.confidenceMix.overapprox} over</span>
            <span style={{ color: t.textSubtle }}>{preview.confidenceMix.unknown} unk</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyInspector() {
  const t = useV2();
  return (
    <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: t.textSubtle }}>
      <Eye className="w-3.5 h-3.5" />
      Hover a node to inspect signal, cost, and evidence.
    </div>
  );
}

function FilterChips({
  value, onChange, rules,
}: {
  value: RuleSource | 'all';
  onChange: (v: RuleSource | 'all') => void;
  rules: AdmissionRule[];
}) {
  const t = useV2();
  const opts: (RuleSource | 'all')[] = ['all', 'native', 'eslint', 'semgrep', 'codeql', 'custom'];
  return (
    <div className="flex items-center gap-px rounded-md overflow-hidden" style={{ background: t.inset }}>
      {opts.map((o) => {
        const active = value === o;
        const count = o === 'all' ? rules.length : rules.filter((r) => r.source === o).length;
        return (
          <button type="button"
            key={o}
            onClick={() => { onChange(o); }}
            className="px-2 py-1 text-[10px] font-mono transition-colors"
            style={{
              background: active ? t.hoverActive : 'transparent',
              color: active ? t.textHi : t.textSubtle,
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = t.textBody; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = t.textSubtle; }}
          >
            {o}
            <span className="ml-1 opacity-60 tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// LIVE FEED — right column, vertical streaming list with shimmer
// ─────────────────────────────────────────────────────────────────────────

function LiveFeed({
  retro,
}: {
  retro: { seed: number; diff: PRDiff; decision: ReturnType<typeof evaluateAdmission> }[];
}) {
  const { t: tA } = useTranslation('admission');
  const t = useV2();
  // Newest first — synthetic stream reads top-down.
  const ordered = useMemo(() => [...retro].reverse(), [retro]);
  return (
    <V2Card className="p-4 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <SectionTitle icon={Clock}>{tA('section.livePrFeed')}</SectionTitle>
        <span className="ml-1 inline-flex items-center gap-1 text-[9px] font-mono" style={{ color: t.textSubtle }}>
          <span className="w-1.5 h-1.5 rounded-full admv2-blink" style={{ background: t.ok }} />
          live
        </span>
      </div>
      <div className="space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: 540 }}>
        {ordered.slice(0, 12).map((r, i) => (
          <FeedRow key={r.seed} index={i} seed={r.seed} diff={r.diff} decision={r.decision} />
        ))}
      </div>
      <div className="mt-3 pt-3 border-t text-[10px] font-mono leading-relaxed" style={{ borderColor: t.borderSoft, color: t.textSubtle }}>
        Synthetic stream · current ruleset replayed against deterministic seeds.
      </div>
    </V2Card>
  );
}

function FeedRow({
  seed, diff, decision, index,
}: {
  seed: number;
  diff: PRDiff;
  decision: ReturnType<typeof evaluateAdmission>;
  index: number;
}) {
  const t = useV2();
  const accent = decision.outcome === 'block' ? SEVERITY_COLOR.block
    : decision.outcome === 'warn' ? SEVERITY_COLOR.warn
    : t.ok;

  const fired = decision.ruleResults.filter((r) => r.status === 'block' || r.status === 'warn');
  const topRule = fired.length > 0 ? fired[0].ruleName : null;

  // Real metrics for the row: counts come from the actual PR diff and
  // decision rather than placeholder copy, so each row shows the same
  // shape an engineer would see in a real review feed.
  const filesChanged = diff.changes.length;
  const rippleCount = diff.affected.length;
  // Deterministic relative time per seed — newer seeds = more recent.
  const ageMin = (RETRO_SEEDS[RETRO_SEEDS.length - 1] - seed) * 47 + index * 3;
  const ageLabel = ageMin < 60
    ? `${ageMin}m`
    : ageMin < 1440
      ? `${Math.floor(ageMin / 60)}h`
      : `${Math.floor(ageMin / 1440)}d`;

  return (
    <div
      className="px-3 py-2 rounded-lg flex items-center gap-3 group transition-all hover:translate-x-0.5"
      style={{
        border: `1px solid ${t.borderSoft}`,
        animationDelay: `${index * 35}ms`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverSubtle; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Status dot — replaces the old left strip. The outer ring is a
          soft halo (only visible for block/warn) so the severity reads at
          a glance without the heavy bar the user disliked. */}
      <span className="relative shrink-0 inline-flex items-center justify-center w-3 h-3">
        {decision.outcome !== 'allow' && (
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: accent,
              opacity: 0.18,
              filter: 'blur(2px)',
            }}
          />
        )}
        <span
          className="relative w-1.5 h-1.5 rounded-full"
          style={{
            background: accent,
            boxShadow: decision.outcome === 'block' ? `0 0 0 2px ${accent}33` : 'none',
          }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono" style={{ color: t.textBody }}>#{seed}</span>
          <span
            className="text-[9px] font-mono uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {decision.outcome}
          </span>
          <span className="ml-auto text-[9px] font-mono tabular-nums" style={{ color: t.textFaint }}>
            {ageLabel} ago
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono truncate" style={{ color: t.textMuted }}>
          <span className="tabular-nums shrink-0">
            {filesChanged} files
          </span>
          <span style={{ color: t.textFaint }}>·</span>
          <span className="tabular-nums shrink-0">
            {rippleCount} ripple
          </span>
          <span style={{ color: t.textFaint }}>·</span>
          <span className="tabular-nums shrink-0" style={{ color: fired.length > 0 ? accent : t.textFaint }}>
            {fired.length} fired
          </span>
        </div>
        {topRule && (
          <div className="mt-0.5 text-[10px] font-mono truncate" style={{ color: t.textFaint }}>
            {topRule}{fired.length > 1 ? ` +${fired.length - 1}` : ''}
          </div>
        )}
      </div>
      <ArrowUpRight className="w-3 h-3 group-hover:rotate-12 shrink-0 transition-all" style={{ color: t.textFaint }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// DECISION RIBBON — horizontal flow: PR → rule lanes → verdict
// ─────────────────────────────────────────────────────────────────────────

function DecisionRibbon({
  decision, diff,
}: {
  decision: ReturnType<typeof evaluateAdmission>;
  diff: PRDiff;
}) {
  const { t: tr } = useTranslation('app');
  const t = useV2();
  const lanes = decision.ruleResults
    .filter((r) => r.status !== 'skip')
    .sort((a, b) => statusRank(b.status) - statusRank(a.status))
    .slice(0, 14);

  const accent = decision.outcome === 'block' ? SEVERITY_COLOR.block
    : decision.outcome === 'warn' ? SEVERITY_COLOR.warn
    : t.ok;

  return (
    <V2Card className="p-5 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <SectionTitle icon={Filter}>{tr('admission.decisionFlow.title')}</SectionTitle>
        <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>
          {tr('admission.decisionFlow.subtitle', { count: lanes.length })}
        </span>
      </div>

      <div className="relative grid items-center gap-4" style={{ gridTemplateColumns: '160px minmax(0,1fr) 160px' }}>
        {/* Source pill — PR */}
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: `linear-gradient(140deg, ${t.accent}2e, ${t.accent}0a)`,
            border: `1px solid ${t.accent}73`,
            boxShadow: `0 0 24px ${t.accent}33, inset 0 0 12px ${t.accent}1a`,
          }}
        >
          <GitPullRequest className="w-5 h-5 mx-auto mb-1.5" style={{ color: t.accent }} />
          <div className="text-[20px] font-black tabular-nums leading-none" style={{ color: t.textHi }}>
            {diff.changes.length}
          </div>
          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>
            files
          </div>
        </div>

        {/* Lanes */}
        <div className="relative">
          <div className="absolute inset-0 flex flex-col justify-center pointer-events-none">
            <div className="h-px" style={{ background: `linear-gradient(to right, ${t.accent}66, ${t.border}, ${t.ok}66)` }} />
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
                : r.status === 'warn' ? SEVERITY_COLOR.warn : t.textSubtle;
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
                        : `linear-gradient(180deg, ${t.hoverActive}, ${t.inset})`,
                      boxShadow: fired ? `0 0 10px ${sev}66` : 'none',
                    }}
                  />
                  {/* tooltip-ish label, only on hover via group */}
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 -top-7 text-[9px] font-mono whitespace-nowrap px-2 py-0.5 rounded-md border z-10"
                    style={{ background: t.cardBacking, color: t.textBody, borderColor: t.border }}
                  >
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
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>
            verdict
          </div>
        </div>
      </div>
    </V2Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// RETROACTIVE — bottom bars
// ─────────────────────────────────────────────────────────────────────────

function Retroactive({
  retro,
}: {
  retro: { seed: number; diff: PRDiff; decision: ReturnType<typeof evaluateAdmission> }[];
}) {
  const { t: tA } = useTranslation('admission');
  const t = useV2();
  const [hover, setHover] = useState<number | null>(null);
  const summary = useMemo(() => {
    let block = 0, warn = 0, pass = 0;
    for (const r of retro) {
      if (r.decision.outcome === 'block') block++;
      else if (r.decision.outcome === 'warn') warn++;
      else pass++;
    }
    return { block, warn, pass, total: retro.length };
  }, [retro]);

  const hovered = hover !== null ? retro[hover] : null;

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-3">
        <SectionTitle icon={Filter}>{tA('section.retroactive')}</SectionTitle>
        <div className="flex-1" />
        <SmallStat label="block" value={summary.block} color={SEVERITY_COLOR.block} />
        <SmallStat label="warn"  value={summary.warn}  color={SEVERITY_COLOR.warn} />
        <SmallStat label="pass"  value={summary.pass}  color={t.ok} />
      </div>

      <div className="relative mt-4 flex items-end gap-px h-16">
        {retro.map((r, i) => {
          const accent = r.decision.outcome === 'block' ? SEVERITY_COLOR.block
            : r.decision.outcome === 'warn' ? SEVERITY_COLOR.warn
            : t.ok;
          const fired = r.decision.ruleResults.filter((rr) => rr.status === 'block' || rr.status === 'warn').length;
          const h = 18 + Math.min(82, fired * 12);
          const isHover = hover === i;
          return (
            <div
              key={r.seed}
              role="presentation"
              onMouseEnter={() => { setHover(i); }}
              onMouseLeave={() => { setHover((v) => (v === i ? null : v)); }}
              className="relative flex-1 rounded-t-sm transition-all cursor-pointer"
              style={{
                height: `${h}%`,
                background: `linear-gradient(to top, ${accent}cc, ${accent}33)`,
                opacity: isHover ? 1 : 0.85,
                transform: isHover ? 'scaleY(1.08)' : 'none',
                transformOrigin: 'bottom',
                boxShadow: r.decision.outcome === 'block' ? `0 -2px 10px ${accent}55` : 'none',
              }}
            >
              {isHover && (
                <div
                  className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-lg whitespace-nowrap admv2-rise"
                  style={{
                    background: t.cardBacking,
                    border: `1px solid ${accent}88`,
                    boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 16px ${accent}44`,
                  }}
                >
                  <div className="text-[10px] font-mono" style={{ color: t.textBody }}>#{r.seed}</div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: accent }}
                  >
                    {r.decision.outcome}
                  </div>
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: t.textSubtle }}>
                    {fired} rules fired
                  </div>
                  <div
                    aria-hidden
                    className="absolute left-1/2 -bottom-[5px] -translate-x-1/2 w-2 h-2 rotate-45"
                    style={{
                      background: t.cardBacking,
                      borderRight: `1px solid ${accent}88`,
                      borderBottom: `1px solid ${accent}88`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-white/30">
        <span>30d ago</span>
        <span>{hovered ? `#${hovered.seed} · ${hovered.decision.outcome.toUpperCase()}` : 'height = rules fired'}</span>
        <span>now</span>
      </div>
    </V2Card>
  );
}

function SmallStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[16px] font-black tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/40">{label}</span>
    </div>
  );
}

function Footer() {
  return (
    <div className="text-center text-[10px] font-mono text-white/30 pt-2">
      admission · v2 · all data synthetic
    </div>
  );
}
