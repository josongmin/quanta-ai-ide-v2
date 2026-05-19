import type { PRDiff } from '@entities/repo';
import {
  type previewRule, type evaluateAdmission,
  type AdmissionRule,
} from '@entities/admission';
import { Hero } from './health/Hero';
import { Cockpit } from './health/Cockpit';
import { Constellation } from './health/Constellation';
import { LiveFeed } from './health/LiveFeed';
import { DecisionRibbon } from './health/DecisionRibbon';
import { ScienceStrip } from './health/ScienceStrip';
import { Retroactive } from './health/Retroactive';
import { Footer } from './health/atoms';

export { Hero } from './health/Hero';

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
