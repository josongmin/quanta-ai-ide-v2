import { useMemo } from 'react';
import type { PRDiff } from '@entities/repo';
import {
  type evaluateAdmission,
  type AdmissionRule,
} from '@entities/admission';
import { ConfidenceBand } from '../ConfidenceBand';
import { EffectSizeBar } from '../EffectSizeBar';
import { AnomalySentinel } from '../AnomalySentinel';
import { RuleCalibrationCard } from '../RuleCalibrationCard';
import { CounterfactualImpactCard } from '../CounterfactualImpactCard';
import { SurvivalCurveCard } from '../SurvivalCurveCard';
import { CusumDriftCard } from '../CusumDriftCard';
import { ReliabilityDiagramCard } from '../ReliabilityDiagramCard';
import { mulberry32 } from '../statsKit';
import type { Confusion, SurvivalEvent } from '../statsKit';

// ─────────────────────────────────────────────────────────────────────────
// SCIENCE STRIP — data-grade panel above the retroactive heat bars
// ─────────────────────────────────────────────────────────────────────────

export function ScienceStrip({
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
