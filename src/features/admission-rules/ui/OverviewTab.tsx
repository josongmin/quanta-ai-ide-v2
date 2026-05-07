import { useMemo } from 'react';
import { useTheme } from '@shared/theme';
import { useFilterStore } from '@features/filter-files';
import { simulateBranchDiff } from '@entities/repo';
import {
  previewRule,
  evaluateAdmission,
  estimateCost,
  type AdmissionRule,
  type RuleSource,
  type CostClass,
  type RuleSeverity,
} from '@entities/admission';
import { useAdmissionStore } from '../model/store';
import { GlassCard } from '@shared/ui';
import {
  SOURCE_LABEL, SOURCE_GLYPH, SEVERITY_COLOR, COST_TEXT,
} from './sourceStyle';

// Overview = ruleset health KPIs + retroactive impact.
// Single colour axis (severity). Distributions render as monochrome bars
// with text labels — no per-category hue. Hero green is reserved for the
// "would pass" KPI only.

const RETRO_SEEDS = Array.from({ length: 12 }, (_, i) => 700_000 + i);

export function OverviewTab() {
  const { isDark } = useTheme();
  const rules = useAdmissionStore((s) => s.rules);
  const repo = useFilterStore((s) => s.repo);

  const previews = useMemo(() => {
    const map = new Map<string, ReturnType<typeof previewRule>>();
    for (const r of rules) map.set(r.id, previewRule(r, repo));
    return map;
  }, [rules, repo]);

  const stats = useMemo(() => buildStats(rules, previews), [rules, previews]);

  const retro = useMemo(() => {
    let block = 0, warn = 0, pass = 0;
    const blockingRules = new Map<string, number>();
    for (const seed of RETRO_SEEDS) {
      const diff = simulateBranchDiff(repo, seed);
      const decision = evaluateAdmission(rules, repo, diff);
      if (decision.outcome === 'block') block++;
      else if (decision.outcome === 'warn') warn++;
      else pass++;
      for (const rr of decision.ruleResults) {
        if (rr.status !== 'block') continue;
        blockingRules.set(rr.ruleName, (blockingRules.get(rr.ruleName) ?? 0) + 1);
      }
    }
    const top = Array.from(blockingRules.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { block, warn, pass, total: RETRO_SEEDS.length, top };
  }, [rules, repo]);

  return (
    <div className="absolute inset-0 overflow-auto">
      <div className="max-w-[960px] mx-auto px-8 py-6 space-y-6">
        {/* KPI row — restrained: one accent colour total (block-red) +
            one hero (pass-green). All other KPIs are neutral. */}
        <div className="grid grid-cols-4 gap-3">
          <Kpi
            dim={isDark}
            label="Active rules"
            value={stats.activeRules}
            sub={`${stats.totalRules} total`}
          />
          <Kpi
            dim={isDark}
            label="Files matched"
            value={stats.matchedFiles}
            sub={`${stats.matchedRules} of ${stats.activeRules} firing`}
          />
          <Kpi
            dim={isDark}
            label="Would block"
            value={retro.block}
            sub={`of ${retro.total} simulated PRs`}
            accent={retro.block > 0 ? SEVERITY_COLOR.block : undefined}
          />
          <Kpi
            dim={isDark}
            label="Would pass"
            value={retro.pass}
            sub={`avg eval ${stats.avgElapsedMs.toFixed(1)}ms`}
            accent={retro.pass > 0 ? '#5fa86c' : undefined}
          />
        </div>

        {/* Two-up: source + severity. Neutral bars except severity, where
            the bar uses the severity hue itself. */}
        <div className="grid grid-cols-2 gap-3">
          <Card dim={isDark} title="By source" hint="★ native = engine-only signals">
            <Distribution
              isDark={isDark}
              rows={(['native', 'eslint', 'semgrep', 'codeql', 'custom'] as RuleSource[])
                .map((s) => ({
                  key: s,
                  label: `${SOURCE_GLYPH[s]} ${SOURCE_LABEL[s]}`,
                  total: rules.filter((r) => r.source === s).length,
                  enabled: rules.filter((r) => r.source === s && r.enabled).length,
                  matches: rules
                    .filter((r) => r.source === s && r.enabled)
                    .reduce((acc, r) => acc + (previews.get(r.id)?.matches.length ?? 0), 0),
                  emphasis: s === 'native',
                }))}
            />
          </Card>

          <Card dim={isDark} title="By severity" hint="What gating actually does">
            <Distribution
              isDark={isDark}
              rows={(['block', 'warn', 'info'] as RuleSeverity[]).map((sev) => ({
                key: sev,
                label: sev,
                total: rules.filter((r) => r.severity === sev).length,
                enabled: rules.filter((r) => r.severity === sev && r.enabled).length,
                matches: rules
                  .filter((r) => r.severity === sev && r.enabled)
                  .reduce((acc, r) => acc + (previews.get(r.id)?.matches.length ?? 0), 0),
                color: sev === 'info' ? undefined : SEVERITY_COLOR[sev],
              }))}
            />
          </Card>
        </div>

        {/* Cost + evidence. Both monochrome — these are diagnostic, not
            verdicts, so they don't earn colour. */}
        <div className="grid grid-cols-2 gap-3">
          <Card dim={isDark} title="By cost" hint="Drives whether live preview can run inline">
            <Distribution
              isDark={isDark}
              rows={(['instant', 'fast', 'medium', 'slow', 'background'] as CostClass[]).map((c) => {
                const matching = rules.filter((r) => estimateCost(r) === c);
                return {
                  key: c,
                  label: COST_TEXT[c],
                  total: matching.length,
                  enabled: matching.filter((r) => r.enabled).length,
                  matches: matching
                    .filter((r) => r.enabled)
                    .reduce((acc, r) => acc + (previews.get(r.id)?.matches.length ?? 0), 0),
                };
              })}
            />
          </Card>

          <Card dim={isDark} title="Evidence quality" hint="Honesty layer · how precise the matches are">
            <EvidenceRow dim={isDark} mix={stats.confidenceMix} />
          </Card>
        </div>

        {/* Top blockers */}
        <Card
          dim={isDark}
          title="Top blockers across simulated PRs"
          hint={`${retro.total} synthetic PRs · last 30d · current ruleset`}
        >
          {retro.top.length === 0 ? (
            <div className={`text-[11px] font-mono ${isDark ? 'text-white/40' : 'text-black/40'}`}>
              No rule fired against any simulated PR — ruleset is permissive.
            </div>
          ) : (
            <div className="space-y-1.5">
              {retro.top.map(([name, n]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className={`text-[11px] font-mono truncate min-w-0 flex-1 ${
                    isDark ? 'text-white/85' : 'text-black/85'
                  }`}>
                    {name}
                  </span>
                  <div
                    className={`relative h-1.5 rounded-full overflow-hidden ${
                      isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]'
                    }`}
                    style={{ width: 220 }}
                  >
                    <span
                      className="absolute left-0 top-0 bottom-0"
                      style={{
                        width: `${(n / retro.total) * 100}%`,
                        backgroundColor: SEVERITY_COLOR.block,
                      }}
                    />
                  </div>
                  <span
                    className="text-[11px] font-mono tabular-nums w-12 text-right"
                    style={{ color: SEVERITY_COLOR.block }}
                  >
                    {n}/{retro.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

type Stats = {
  totalRules: number;
  activeRules: number;
  matchedRules: number;
  matchedFiles: number;
  avgElapsedMs: number;
  confidenceMix: { exact: number; overapprox: number; unknown: number };
};

function buildStats(
  rules: AdmissionRule[],
  previews: Map<string, ReturnType<typeof previewRule>>,
): Stats {
  const out: Stats = {
    totalRules: rules.length,
    activeRules: 0,
    matchedRules: 0,
    matchedFiles: 0,
    avgElapsedMs: 0,
    confidenceMix: { exact: 0, overapprox: 0, unknown: 0 },
  };
  let elapsedSum = 0;
  for (const r of rules) {
    if (r.enabled) out.activeRules++;
    const p = previews.get(r.id);
    if (!p) continue;
    if (r.enabled) elapsedSum += p.elapsedMs;
    if (!r.enabled) continue;
    if (p.matches.length > 0) {
      out.matchedRules++;
      out.matchedFiles += p.matches.length;
    }
    out.confidenceMix.exact      += p.confidenceMix.exact;
    out.confidenceMix.overapprox += p.confidenceMix.overapprox;
    out.confidenceMix.unknown    += p.confidenceMix.unknown;
  }
  out.avgElapsedMs = out.activeRules > 0 ? elapsedSum / out.activeRules : 0;
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components — neutral surfaces. Cards share a single muted tint so
// the page reads as one composition instead of N tiles competing.
// ─────────────────────────────────────────────────────────────────────────

function Card({
  dim, title, hint, children,
}: { dim: boolean; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <GlassCard className="px-5 py-4">
      <h3 className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
        dim ? 'text-white/70' : 'text-black/70'
      }`}>
        {title}
      </h3>
      {hint && (
        <p className={`mt-0.5 mb-3 text-[10px] font-mono ${
          dim ? 'text-white/40' : 'text-black/55'
        }`}>
          {hint}
        </p>
      )}
      {!hint && <div className="h-2" />}
      {children}
    </GlassCard>
  );
}

function Kpi({
  dim, label, value, sub, accent,
}: { dim: boolean; label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <GlassCard className="px-5 py-4">
      <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
        dim ? 'text-white/55' : 'text-black/55'
      }`}>
        {label}
      </div>
      <div
        className={`mt-2 text-[28px] font-bold leading-none tabular-nums ${
          dim ? 'text-white' : 'text-black'
        }`}
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {sub && (
        <div className={`mt-1.5 text-[10px] font-mono ${dim ? 'text-white/40' : 'text-black/55'}`}>
          {sub}
        </div>
      )}
    </GlassCard>
  );
}

type DistRow = {
  key: string;
  label: string;
  total: number;
  enabled: number;
  matches: number;
  /** Optional accent for the bar — used only by severity. */
  color?: string;
  /** Bold the label — used only by `★ native`. */
  emphasis?: boolean;
};

function Distribution({ isDark, rows }: { isDark: boolean; rows: DistRow[] }) {
  const visible = rows.filter((r) => r.total > 0);
  if (visible.length === 0) {
    return <div className={`text-[11px] font-mono ${isDark ? 'text-white/40' : 'text-black/40'}`}>no rules</div>;
  }
  const max = Math.max(1, ...visible.map((r) => r.matches));
  const barTrack = isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]';
  const barFillNeutral = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  return (
    <div className="space-y-1.5">
      {visible.map((r) => (
        <div key={r.key} className="flex items-center gap-3">
          <span
            className={`text-[11px] font-mono w-24 shrink-0 truncate ${
              r.emphasis
                ? (isDark ? 'text-white/85 font-bold' : 'text-black/85 font-bold')
                : (isDark ? 'text-white/70' : 'text-black/70')
            }`}
            style={r.color ? { color: r.color } : undefined}
          >
            {r.label}
          </span>
          <span className={`text-[10px] font-mono tabular-nums w-14 shrink-0 ${
            isDark ? 'text-white/40' : 'text-black/55'
          }`}>
            {r.enabled}/{r.total}
          </span>
          <div className={`relative h-1.5 rounded-full flex-1 overflow-hidden ${barTrack}`}>
            <span
              className="absolute left-0 top-0 bottom-0"
              style={{
                width: `${(r.matches / max) * 100}%`,
                backgroundColor: r.color ?? barFillNeutral,
                opacity: r.matches > 0 ? 1 : 0.2,
              }}
            />
          </div>
          <span className={`text-[11px] font-mono tabular-nums w-10 text-right ${
            isDark ? 'text-white/70' : 'text-black/70'
          }`}>
            {r.matches}
          </span>
        </div>
      ))}
    </div>
  );
}

function EvidenceRow({
  dim, mix,
}: { dim: boolean; mix: { exact: number; overapprox: number; unknown: number } }) {
  const total = mix.exact + mix.overapprox + mix.unknown;
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);
  const base = dim ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
  return (
    <div>
      <div className={`h-2 rounded-full overflow-hidden flex ${
        dim ? 'bg-white/[0.06]' : 'bg-black/[0.06]'
      }`}>
        <span style={{ width: `${pct(mix.exact)}%`,      backgroundColor: `${base}0.85)` }} />
        <span style={{ width: `${pct(mix.overapprox)}%`, backgroundColor: `${base}0.45)` }} />
        <span style={{ width: `${pct(mix.unknown)}%`,    backgroundColor: `${base}0.18)` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {([
          ['exact', mix.exact, 0.85],
          ['overapprox', mix.overapprox, 0.45],
          ['unknown', mix.unknown, 0.18],
        ] as const).map(([label, value, alpha]) => (
          <div key={label} className="flex items-baseline gap-2">
            <span
              className="text-[18px] font-bold tabular-nums"
              style={{ color: `${base}${alpha < 0.4 ? 0.4 : alpha})` }}
            >
              {value}
            </span>
            <span className={`text-[9px] font-mono uppercase tracking-[0.18em] ${
              dim ? 'text-white/40' : 'text-black/55'
            }`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
