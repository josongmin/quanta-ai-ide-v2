import { useState } from 'react';
import { useTranslation } from '@shared/i18n';
import { Eye, Plus, Zap } from 'lucide-react';
import {
  estimateCost,
  type previewRule, type evaluateAdmission,
  type AdmissionRule, type RuleSource,
} from '@entities/admission';
import { SOURCE_GLYPH, usesHint, describeSignal } from '../../../sourceStyle';
import { SEVERITY_COLOR } from '../tokens';
import { V2Card, SectionTitle } from '../primitives';

// ─────────────────────────────────────────────────────────────────────────
// CONSTELLATION — centre. Rules as nodes, source families as clusters,
// dashed flow lines from a central PR core to each fired rule. SVG so we
// can stroke-dash + animate.
// ─────────────────────────────────────────────────────────────────────────

export function Constellation({
  rules, previews, decision,
}: {
  rules: AdmissionRule[];
  previews: Map<string, ReturnType<typeof previewRule>>;
  decision: ReturnType<typeof evaluateAdmission>;
}) {
  const { t: tA } = useTranslation('admission');
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
        <span className="text-[10px] font-mono text-[var(--fg-subtle)]">
          {visible.length} nodes · severity = hue · matches = glow · dashed = fired
        </span>
        <div className="flex-1" />
        <FilterChips value={filter} onChange={setFilter} rules={rules} />
        <button type="button" className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] bg-[var(--fg-strong)] text-[var(--bg-surface)] hover:opacity-90">
          <Plus className="w-3 h-3" />
          New rule
        </button>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[360px]">
          <defs>
            <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor="var(--intent-info-fg)" stopOpacity="0.55" />
              <stop offset="60%" stopColor="var(--intent-info-fg)" stopOpacity="0.10" />
              <stop offset="100%" stopColor="var(--intent-info-fg)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Source band labels */}
          {sources.map((s) => (
            <g key={s}>
              <text
                x={12}
                y={bandY(s) + 3}
                fill="var(--fg-subtle)"
                fontSize={9}
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                style={{ letterSpacing: 'var(--track-eyebrow)', textTransform: 'uppercase' }}
              >
                {SOURCE_GLYPH[s]} {s}
              </text>
              <line
                x1={70}
                x2={W - 20}
                y1={bandY(s)}
                y2={bandY(s)}
                stroke="var(--border-muted)"
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
              stroke="var(--intent-info-fg)"
              strokeOpacity={0.18}
              strokeWidth={0.5}
              strokeDasharray="2 4"
            />
          ))}
          {/* radar sweep cone — rotating linear gradient triangle */}
          <defs>
            <linearGradient id="sweep-grad" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%"  stopColor="var(--intent-info-fg)" stopOpacity="0" />
              <stop offset="80%" stopColor="var(--intent-info-fg)" stopOpacity="0" />
              <stop offset="100%" stopColor="var(--intent-info-fg)" stopOpacity="0.55" />
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
              stroke="var(--intent-info-fg)"
              strokeOpacity={0.45}
              strokeWidth={0.8}
              strokeDasharray="3 6"
            />
          </g>
          {/* core pulse */}
          <circle cx={W - 40} cy={H / 2} r={10} fill="var(--intent-info-fg)" opacity={0.95}>
            <animate attributeName="r" values="10;13;10" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.95;0.55;0.95" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx={W - 40} cy={H / 2} r={4} fill="var(--fg-strong)" opacity={0.95} />
          <text
            x={W - 40}
            y={H / 2 + 64}
            textAnchor="middle"
            fill="var(--fg-muted)"
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
              : 'var(--fg-muted)';
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
                  fill={rule.enabled ? sev : 'var(--fg-subtle)'}
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
                  fill={isHover ? 'var(--fg-strong)' : 'var(--fg-subtle)'}
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
      <div className="mt-2 pt-4 border-t border-[var(--border-muted)] min-h-[88px]">
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
  const cost = estimateCost(rule);
  const sevColor = rule.severity === 'block' ? SEVERITY_COLOR.block
    : rule.severity === 'warn' ? SEVERITY_COLOR.warn : 'var(--fg-muted)';
  const fired = evalResult && (evalResult.status === 'block' || evalResult.status === 'warn');
  const dotColor = rule.enabled ? sevColor : 'var(--fg-subtle)';
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
          <span className="text-[10px] font-mono text-[var(--fg-subtle)]">
            {SOURCE_GLYPH[rule.source]} {rule.source}
          </span>
          <span className="text-[var(--fg-subtle)]">·</span>
          <span
            className="text-[9px] font-mono uppercase tracking-[var(--track-eyebrow)] px-1.5 py-px rounded-md"
            style={{ color: sevColor, background: `${sevColor}1a` }}
          >
            {rule.severity}
          </span>
          <span className="text-[var(--fg-subtle)]">·</span>
          <span className="text-[10px] font-mono text-[var(--fg-muted)]">{cost}</span>
          {fired && (
            <span
              className="ml-auto text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] px-2 py-0.5 rounded-md"
              style={{ color: sevColor, background: `${sevColor}22`, border: `1px solid ${sevColor}55` }}
            >
              fired in PR
            </span>
          )}
        </div>
        <div className="mt-1 text-[14px] font-bold text-[var(--fg-default)] truncate">
          {rule.name}
        </div>
        <div className="mt-0.5 text-[11px] font-mono text-[var(--fg-subtle)] truncate">
          uses {usesHint(rule.signal)} · {describeSignal(rule.signal)}
        </div>
        {preview && (
          <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-[var(--fg-muted)]">
            <span>{preview.matches.length} repo-wide</span>
            <span className="text-[var(--fg-subtle)]">·</span>
            <span className="text-[var(--fg-default)]">{preview.confidenceMix.exact} exact</span>
            <span>{preview.confidenceMix.overapprox} over</span>
            <span className="text-[var(--fg-subtle)]">{preview.confidenceMix.unknown} unk</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyInspector() {
  return (
    <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--fg-subtle)]">
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
  const opts: (RuleSource | 'all')[] = ['all', 'native', 'eslint', 'semgrep', 'codeql', 'custom'];
  return (
    <div className="flex items-center gap-px rounded-md overflow-hidden bg-[var(--bg-hover)]">
      {opts.map((o) => {
        const active = value === o;
        const count = o === 'all' ? rules.length : rules.filter((r) => r.source === o).length;
        return (
          <button type="button"
            key={o}
            onClick={() => { onChange(o); }}
            className={`px-2 py-1 text-[10px] font-mono transition-colors ${
              active ? 'bg-[var(--bg-active)] text-[var(--fg-strong)]' : 'text-[var(--fg-subtle)] hover:text-[var(--fg-default)]'
            }`}
          >
            {o}
            <span className="ml-1 opacity-60 tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
