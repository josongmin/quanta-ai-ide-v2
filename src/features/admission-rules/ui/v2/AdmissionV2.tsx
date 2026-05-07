import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, ShieldX, Activity, Zap, Cpu, Eye,
  ArrowUpRight, Layers, Plus, Filter, Sparkles, Clock,
  GitPullRequest, ListChecks, Gavel, FileText, Search,
  Trash2, Save, X as XIcon,
} from 'lucide-react';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { GlassCard, Portal, useDialogA11y } from '@shared/ui';

// TODO(i18n): AdmissionV2 is ~3200 lines and is being migrated incrementally.
// The first pass (D6) covers the most-visible labels (sidebar verdict, decision
// flow, sync status, gate verdict empty + override modal). Most other strings
// in this file (rule editor copy, ambient ticker, retroactive heat-bar legend,
// etc.) still need translation — see audit notes for follow-up.
import { useFilterStore } from '@features/filter-files';
import { simulateBranchDiff, type PRDiff } from '@entities/repo';
import {
  previewRule, evaluateAdmission, estimateCost,
  type AdmissionRule, type RuleSource, type RuleSeverity, type RuleSignal,
  type CostClass, type MetricField, type CompareOp, type GraphPattern,
  type TaintSource, type TaintSink,
} from '@entities/admission';
import { usePrPreview } from '@features/pr-preview';
import { useAdmissionStore } from '../../model/store';
import { SOURCE_GLYPH, SEVERITY_COLOR, usesHint, describeSignal } from '../sourceStyle';
import { pageBackground } from '@shared/lib';

// Admission v2 — full-dark "control room" layout. Hard-pinned to dark
// tokens; light mode is intentionally not supported here.
//
// The screen is one composition rather than a stack of widgets:
//
//   ┌── HERO BANNER (verdict aurora + ticker)─────────────────────┐
//   │                                                              │
//   ├── LEFT cockpit ─┬── CENTER constellation ─┬── RIGHT stream ─┤
//   │ live signals    │  rule constellation     │  PR live feed   │
//   │ rule sources    │  (svg + nodes + edges)  │  recent PR rows │
//   │ cost ledger     │  fired-rule inspector   │                 │
//   ├─────────────────┴──────────────────────────┴─────────────────┤
//   │  DECISION RIBBON  (this PR's flow through rules)            │
//   ├──────────────────────────────────────────────────────────────┤
//   │  RETROACTIVE 30d (heat bars + summary)                      │
//   └──────────────────────────────────────────────────────────────┘
//
// Heavy use of motion (CSS keyframes), spotlight cursor effects, and
// SVG dashed connectors so the surface feels alive rather than static.

const RETRO_SEEDS = Array.from({ length: 30 }, (_, i) => 900_000 + i);

// IA — three pages, one shell.
//   • Health  — at-a-glance dashboard (was the whole v2 surface)
//   • Rules   — author / preview / impact-simulate rules
//   • Gate    — current PR's verdict, fired rules, override workflow
//
// All three share: page background, ambient aurora, telemetry tape, and
// the left sidebar. Each page renders its own composition inside the
// scroll area.

type V2Page = 'health' | 'rules' | 'gate';

export default function AdmissionV2() {
  const { isDark } = useTheme();
  const repo = useFilterStore((s) => s.repo);
  const rules = useAdmissionStore((s) => s.rules);
  const { diff, seed, regenerate, start, active } = usePrPreview();
  const [page, setPage] = useState<V2Page>('health');

  const effectiveSeed = seed ?? 42;
  const effectiveDiff = useMemo(
    () => diff ?? simulateBranchDiff(repo, effectiveSeed),
    [diff, repo, effectiveSeed],
  );
  const decision = useMemo(
    () => evaluateAdmission(rules, repo, effectiveDiff),
    [rules, repo, effectiveDiff],
  );
  const previews = useMemo(() => {
    const out = new Map<string, ReturnType<typeof previewRule>>();
    for (const r of rules) out.set(r.id, previewRule(r, repo));
    return out;
  }, [rules, repo]);
  const retro = useMemo(
    () => RETRO_SEEDS.map((s) => {
      const d = simulateBranchDiff(repo, s);
      return { seed: s, decision: evaluateAdmission(rules, repo, d) };
    }),
    [rules, repo],
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden flex"
      data-v2-theme={isDark ? 'dark' : 'light'}
      style={pageBackground(isDark)}
    >
      <AmbientLayer isDark={isDark} />

      <Sidebar
        active={page}
        onChange={setPage}
        decision={decision}
        rules={rules}
      />

      <main className="flex-1 min-w-0 relative overflow-auto">
        {page === 'health' && (
          <HealthPage
            decision={decision}
            diff={effectiveDiff}
            seed={effectiveSeed}
            onRegenerate={active ? regenerate : start}
            rules={rules}
            previews={previews}
            retro={retro}
          />
        )}
        {page === 'rules' && <RulesPage rules={rules} previews={previews} retro={retro} />}
        {page === 'gate'  && (
          <GatePage
            decision={decision}
            diff={effectiveDiff}
            seed={effectiveSeed}
            onRegenerate={active ? regenerate : start}
          />
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SIDEBAR — vertical glass nav, 220px. Each item shows a live counter
// derived from the current ruleset / decision so the nav itself doubles
// as a status indicator.
// ─────────────────────────────────────────────────────────────────────────

function Sidebar({
  active, onChange, decision, rules,
}: {
  active: V2Page;
  onChange: (p: V2Page) => void;
  decision: ReturnType<typeof evaluateAdmission>;
  rules: AdmissionRule[];
}) {
  const t = useV2();
  const { t: tr } = useTranslation('app');
  const enabled = rules.filter((r) => r.enabled).length;
  const verdict = decision.outcome;
  const verdictColor = verdict === 'block' ? SEVERITY_COLOR.block
    : verdict === 'warn' ? SEVERITY_COLOR.warn : '#5fa86c';

  // Verdict short-form for the nav badge — full word is too long for the
  // 18px badge slot. We use a single glyph + tooltip via the page title.
  const verdictGlyph = verdict === 'block' ? '✕' : verdict === 'warn' ? '!' : '✓';

  const items: {
    id: V2Page;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    shortcut?: string;
    badge?: { text: string; color?: string };
  }[] = [
    {
      id: 'health',
      label: 'Health',
      icon: Activity,
      shortcut: '⌘1',
    },
    {
      id: 'rules',
      label: 'Rules',
      icon: ListChecks,
      badge: { text: String(enabled) },
    },
    {
      id: 'gate',
      label: 'Gate',
      icon: Gavel,
      badge: { text: verdictGlyph, color: verdictColor },
    },
  ];

  return (
    <aside
      className="shrink-0 w-[224px] flex flex-col relative z-10"
      style={{
        borderRight: `1px solid ${t.borderSoft}`,
        // Glass chrome — same recipe as the AppShell GNB so the top
        // header and the rail read as one continuous L-shape. Strong
        // blur kills any grid bleed-through behind the surface.
        backgroundColor: t.sidebar,
        backdropFilter: t.sidebarBlur,
        WebkitBackdropFilter: t.sidebarBlur,
      }}
    >
      {/* Workspace switcher — top dense row, mirrors Linear's project picker */}
      <button type="button"
        className="group flex items-center gap-2 px-3 h-12 border-b transition-colors hover:bg-white/[0.025]"
        style={{ borderColor: t.borderSoft }}
      >
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: `${t.accent}1f`,
            border: `1px solid ${t.accent}55`,
          }}
        >
          <ShieldCheck className="w-3 h-3" style={{ color: t.accent }} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[12px] font-semibold text-white/85 leading-tight truncate">
            Admission
          </div>
          <div className="text-[10px] text-white/40 leading-tight truncate">
            acme-monorepo
          </div>
        </div>
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-white/40 shrink-0">
          <path d="M3 4 L5 6 L7 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 6 L5 4 L7 6" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </svg>
      </button>

      {/* Nav body */}
      <div className="flex-1 min-h-0 overflow-y-auto py-3">
        <NavGroup label="Workspace">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = active === it.id;
            return (
              <NavItem
                key={it.id}
                icon={Icon}
                label={it.label}
                shortcut={it.shortcut}
                badge={it.badge}
                active={isActive}
                onClick={() => { onChange(it.id); }}
              />
            );
          })}
        </NavGroup>

        <NavGroup label="Status">
          <div className="px-3 py-1.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-white/55">{tr('admission.sidebar.verdict')}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: verdictColor }}
                />
                <span
                  className="text-[11px] font-mono uppercase tracking-[0.18em]"
                  style={{ color: verdictColor }}
                >
                  {verdict}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-white/55">{tr('admission.sidebar.activeRules')}</span>
              <span className="text-[11px] font-mono text-white/85 tabular-nums">
                {enabled}
                <span className="text-white/30"> / {rules.length}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/55">{tr('admission.sidebar.engine')}</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5fa86c]" />
                <span className="text-[11px] text-white/55">{tr('admission.sidebar.engineReady')}</span>
              </div>
            </div>
          </div>
        </NavGroup>
      </div>

      {/* Footer — sync status, mirrors Notion's bottom utilities row */}
      <div
        className="shrink-0 px-3 h-9 flex items-center gap-2 border-t"
        style={{ borderColor: t.borderSoft }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#5fa86c]" />
        <span className="text-[11px] text-white/55 flex-1 min-w-0 truncate">
          {tr('admission.sidebar.syncedJustNow')}
        </span>
        <span className="text-[10px] font-mono text-white/30">v2</span>
      </div>
    </aside>
  );
}

// ── Sidebar primitives ───────────────────────────────────────────────

function NavGroup({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className="flex flex-col">
        {children}
      </div>
    </div>
  );
}

function NavItem({
  icon: Icon, label, shortcut, badge, active, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  badge?: { text: string; color?: string };
  active: boolean;
  onClick: () => void;
}) {
  const t = useV2();
  return (
    <button type="button"
      onClick={onClick}
      className="group relative flex items-center gap-2 h-8 px-3 text-left transition-colors"
      style={{
        backgroundColor: active ? t.hoverActive : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = t.hoverSubtle;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-[2px]"
          style={{ background: t.textHi }}
        />
      )}
      <Icon
        className={`w-3.5 h-3.5 shrink-0 ${
          active ? 'text-white/85' : 'text-white/55 group-hover:text-white/70'
        }`}
      />
      <span
        className={`flex-1 text-[12px] font-medium truncate ${
          active ? 'text-white' : 'text-white/70 group-hover:text-white/85'
        }`}
      >
        {label}
      </span>
      {badge ? (
        <span
          className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[16px] px-1.5 rounded-md text-[10px] font-mono tabular-nums"
          style={{
            background: badge.color ? `${badge.color}1f` : t.badgeBg,
            color: badge.color ?? t.textMuted,
          }}
        >
          {badge.text}
        </span>
      ) : shortcut ? (
        <span
          className={`shrink-0 text-[10px] font-mono ${
            active ? 'text-white/40' : 'text-white/30 group-hover:text-white/40'
          }`}
        >
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// HEALTH PAGE — the original v2 dashboard
// ─────────────────────────────────────────────────────────────────────────

function HealthPage({
  decision, diff, seed, onRegenerate, rules, previews, retro,
}: {
  decision: ReturnType<typeof evaluateAdmission>;
  diff: PRDiff;
  seed: number;
  onRegenerate: () => void;
  rules: AdmissionRule[];
  previews: Map<string, ReturnType<typeof previewRule>>;
  retro: { seed: number; decision: ReturnType<typeof evaluateAdmission> }[];
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

      <div className="admv2-rise admv2-rise-4">
        <Retroactive retro={retro} />
      </div>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Ambient background — subtle radial gradients pinned behind everything,
// plus a slow-moving scanline. Sets the "alive" mood before any data
// even loads.
// ─────────────────────────────────────────────────────────────────────────

function AmbientLayer({ isDark }: { isDark: boolean }) {
  // Aurora alphas tuned per-mode. In light theme the canvas is bright
  // already, so we cool the gradients further and shift the scanline
  // colour to the light accent (#1f5b9c blue).
  const t = v2Tokens(isDark);
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(1400px 700px at -10% -10%, ${t.aurora1}, transparent 55%),
            radial-gradient(1100px 600px at 110% 0%, ${t.aurora2}, transparent 55%),
            radial-gradient(1200px 700px at 50% 120%, ${t.aurora3}, transparent 55%)
          `,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[1px] overflow-hidden pointer-events-none opacity-50"
      >
        <div
          className="admv2-scan h-full"
          style={{
            width: '40%',
            background: `linear-gradient(90deg, transparent, ${t.scan}, transparent)`,
            boxShadow: `0 0 16px ${t.scan}`,
          }}
        />
      </div>
    </>
  );
}

// ─── Theme tokens ─────────────────────────────────────────────────
// Single source of truth so light/dark theming threads through every
// component below. Calling `useV2()` in the body of a component gives
// you the right values for the active theme. Avoid hard-coding hexes
// outside this table; severity hues come from `SEVERITY_COLOR` and
// stay tone-locked across themes (red is red in either mode).

type V2Theme = ReturnType<typeof v2Tokens>;

function v2Tokens(isDark: boolean) {
  if (isDark) {
    return {
      isDark: true,
      // Surfaces. Sidebar matches the AppShell GNB recipe
      // (`bg-black/40 backdrop-blur-xl`) so the top header and the left
      // rail read as one continuous L-shaped chrome surface — the
      // pattern Linear / Vercel / macOS Settings all use. The strong
      // blur+saturation kills any grid bleed-through.
      page:         '#0d1117',
      sidebar:      'rgba(0, 0, 0, 0.40)',
      sidebarBlur:  'blur(24px) saturate(160%)',
      cardBacking:  'rgba(13, 17, 23, 0.78)',
      inset:        'rgba(0, 0, 0, 0.30)',
      hoverSubtle:  'rgba(255, 255, 255, 0.025)',
      hoverActive:  'rgba(255, 255, 255, 0.05)',
      // Borders
      border:       'rgba(255, 255, 255, 0.10)',
      borderSoft:   'rgba(255, 255, 255, 0.06)',
      borderHair:   'rgba(255, 255, 255, 0.05)',
      // Text — match Linear/Vercel scale
      textHi:       'rgba(255, 255, 255, 0.95)',
      textBody:     'rgba(255, 255, 255, 0.85)',
      textMuted:    'rgba(255, 255, 255, 0.55)',
      textSubtle:   'rgba(255, 255, 255, 0.40)',
      textFaint:    'rgba(255, 255, 255, 0.25)',
      // Accents
      accent:       '#7aa7d4',     // info / links / neutral indicator
      accentSoft:   '#7aa7d415',
      ok:           '#5fa86c',
      // Aurora alphas
      aurora1:      'rgba(122,167,212,0.05)',
      aurora2:      'rgba(163,113,247,0.04)',
      aurora3:      'rgba(79,154,92,0.03)',
      // Scanline
      scan:         'rgba(122,167,212,0.45)',
      // Badge bg
      badgeBg:      'rgba(255,255,255,0.06)',
    };
  }
  return {
    isDark: false,
    page:         '#f4f6f9',
    sidebar:      'rgba(255, 255, 255, 0.80)',
    sidebarBlur:  'blur(24px) saturate(160%)',
    cardBacking:  'rgba(255, 255, 255, 0.82)',
    inset:        'rgba(0, 0, 0, 0.04)',
    hoverSubtle:  'rgba(0, 0, 0, 0.03)',
    hoverActive:  'rgba(0, 0, 0, 0.06)',
    border:       'rgba(0, 0, 0, 0.10)',
    borderSoft:   'rgba(0, 0, 0, 0.07)',
    borderHair:   'rgba(0, 0, 0, 0.05)',
    textHi:       'rgba(0, 0, 0, 0.95)',
    textBody:     'rgba(0, 0, 0, 0.85)',
    textMuted:    'rgba(0, 0, 0, 0.55)',
    textSubtle:   'rgba(0, 0, 0, 0.45)',
    textFaint:    'rgba(0, 0, 0, 0.30)',
    accent:       '#1f5b9c',
    accentSoft:   '#1f5b9c18',
    ok:           '#1a7f37',
    aurora1:      'rgba(31,91,156,0.06)',
    aurora2:      'rgba(130,80,223,0.05)',
    aurora3:      'rgba(26,127,55,0.04)',
    scan:         'rgba(31,91,156,0.35)',
    badgeBg:      'rgba(0,0,0,0.06)',
  };
}

function useV2(): V2Theme {
  const { isDark } = useTheme();
  return useMemo(() => v2Tokens(isDark), [isDark]);
}

// V2Card — a GlassCard variant with an opaque inner backing so the
// page-level aurora and grid don't bleed through. Visually matches the
// intelligence-tab cards (FilterBar / FILES / STATUS), which sit on a
// dark static background and read as solid surfaces. Use everywhere in
// v2 instead of the bare GlassCard.
function V2Card({
  className = '', children, style,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const t = useV2();
  return (
    <GlassCard className={`relative overflow-hidden ${className}`} style={style}>
      {/* Inner backing — opaque page-tinted fill so the surface reads as
          a solid card on top of the aurora. Light mode flips polarity. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: t.cardBacking,
          borderRadius: 'inherit',
        }}
      />
      <div className="relative">{children}</div>
    </GlassCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// HERO — verdict aurora, ticker counters, scanning line
// ─────────────────────────────────────────────────────────────────────────

function Hero({
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
    : '#5fa86c';
  const Icon = outcome === 'allow' ? ShieldCheck : outcome === 'warn' ? ShieldAlert : ShieldX;

  // Hero is a structural status card. Single accent stripe on the left
  // carries the verdict colour; everything else is neutral type. The
  // only motion is a fade-in on `outcome` change so the verdict swap
  // reads as deliberate rather than static.

  return (
    <V2Card className="relative">
      {/* Verdict stripe — accent colour only here */}
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: accent }}
      />
      <div className="relative pl-6 pr-6 py-5 flex items-center gap-6">
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
              stroke="#5fa86c"
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
        <span className="text-[10px] font-mono text-white/40">
          {visible.length} nodes · severity = hue · matches = glow · dashed = fired
        </span>
        <div className="flex-1" />
        <FilterChips value={filter} onChange={setFilter} rules={rules} />
        <button type="button" className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] bg-white text-black hover:bg-white/90">
          <Plus className="w-3 h-3" />
          New rule
        </button>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[360px]">
          <defs>
            <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor="#7aa7d4" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#7aa7d4" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#7aa7d4" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Source band labels */}
          {sources.map((s) => (
            <g key={s}>
              <text
                x={12}
                y={bandY(s) + 3}
                fill="rgba(255,255,255,0.30)"
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
                stroke="rgba(255,255,255,0.05)"
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
              stroke="#7aa7d4"
              strokeOpacity={0.18}
              strokeWidth={0.5}
              strokeDasharray="2 4"
            />
          ))}
          {/* radar sweep cone — rotating linear gradient triangle */}
          <defs>
            <linearGradient id="sweep-grad" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%"  stopColor="#7aa7d4" stopOpacity="0" />
              <stop offset="80%" stopColor="#7aa7d4" stopOpacity="0" />
              <stop offset="100%" stopColor="#7aa7d4" stopOpacity="0.55" />
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
              stroke="#7aa7d4"
              strokeOpacity={0.45}
              strokeWidth={0.8}
              strokeDasharray="3 6"
            />
          </g>
          {/* core pulse */}
          <circle cx={W - 40} cy={H / 2} r={10} fill="#7aa7d4" opacity={0.95}>
            <animate attributeName="r" values="10;13;10" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.95;0.55;0.95" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx={W - 40} cy={H / 2} r={4} fill="#fff" opacity={0.95} />
          <text
            x={W - 40}
            y={H / 2 + 64}
            textAnchor="middle"
            fill="rgba(255,255,255,0.55)"
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
              : 'rgba(255,255,255,0.55)';
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
                  fill={rule.enabled ? sev : 'rgba(255,255,255,0.2)'}
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
                  fill={isHover ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)'}
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
      <div className="mt-2 pt-4 border-t border-white/5 min-h-[88px]">
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
    : rule.severity === 'warn' ? SEVERITY_COLOR.warn : 'rgba(255,255,255,0.55)';
  const fired = evalResult && (evalResult.status === 'block' || evalResult.status === 'warn');
  return (
    <div className="flex items-start gap-4 admv2-rise">
      <div
        className="w-1 self-stretch rounded-full"
        style={{ background: rule.enabled ? sevColor : 'rgba(255,255,255,0.12)' }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-white/40">
            {SOURCE_GLYPH[rule.source]} {rule.source}
          </span>
          <span className="text-white/30">·</span>
          <span
            className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-px rounded-md"
            style={{ color: sevColor, background: `${sevColor}1a` }}
          >
            {rule.severity}
          </span>
          <span className="text-white/30">·</span>
          <span className="text-[10px] font-mono text-white/55">{cost}</span>
          {fired && (
            <span
              className="ml-auto text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-md"
              style={{ color: sevColor, background: `${sevColor}22`, border: `1px solid ${sevColor}55` }}
            >
              fired in PR
            </span>
          )}
        </div>
        <div className="mt-1 text-[14px] font-bold text-white/85 truncate">
          {rule.name}
        </div>
        <div className="mt-0.5 text-[11px] font-mono text-white/40 truncate">
          uses {usesHint(rule.signal)} · {describeSignal(rule.signal)}
        </div>
        {preview && (
          <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-white/55">
            <span>{preview.matches.length} repo-wide</span>
            <span className="text-white/30">·</span>
            <span className="text-white/85">{preview.confidenceMix.exact} exact</span>
            <span>{preview.confidenceMix.overapprox} over</span>
            <span className="text-white/40">{preview.confidenceMix.unknown} unk</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyInspector() {
  return (
    <div className="flex items-center gap-3 text-[11px] font-mono text-white/40">
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
    <div className="flex items-center gap-px rounded-md overflow-hidden bg-white/[0.04]">
      {opts.map((o) => {
        const active = value === o;
        const count = o === 'all' ? rules.length : rules.filter((r) => r.source === o).length;
        return (
          <button type="button"
            key={o}
            onClick={() => { onChange(o); }}
            className={`px-2 py-1 text-[10px] font-mono transition-colors ${
              active ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
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

// ─────────────────────────────────────────────────────────────────────────
// LIVE FEED — right column, vertical streaming list with shimmer
// ─────────────────────────────────────────────────────────────────────────

function LiveFeed({
  retro,
}: {
  retro: { seed: number; decision: ReturnType<typeof evaluateAdmission> }[];
}) {
  const { t: tA } = useTranslation('admission');
  return (
    <V2Card className="p-4 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <SectionTitle icon={Clock}>{tA('section.livePrFeed')}</SectionTitle>
        <span className="ml-1 inline-flex items-center gap-1 text-[9px] font-mono text-white/40">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5fa86c] admv2-blink" />
          live
        </span>
      </div>
      <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 540 }}>
        {retro.slice(0, 12).map((r, i) => (
          <FeedRow key={r.seed} index={i} seed={r.seed} decision={r.decision} />
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-white/5 text-[10px] font-mono text-white/40 leading-relaxed">
        Synthetic stream · current ruleset replayed against deterministic seeds.
      </div>
    </V2Card>
  );
}

function FeedRow({
  seed, decision, index,
}: {
  seed: number;
  decision: ReturnType<typeof evaluateAdmission>;
  index: number;
}) {
  const accent = decision.outcome === 'block' ? SEVERITY_COLOR.block
    : decision.outcome === 'warn' ? SEVERITY_COLOR.warn
    : '#5fa86c';
  const fired = decision.ruleResults.filter((r) => r.status === 'block' || r.status === 'warn');
  return (
    <div
      className="px-3 py-2 rounded-lg flex items-center gap-3 group transition-all hover:bg-white/[0.04] hover:translate-x-0.5"
      style={{
        border: '1px solid rgba(255,255,255,0.05)',
        animationDelay: `${index * 35}ms`,
      }}
    >
      <span
        className="w-1 self-stretch rounded-full shrink-0"
        style={{
          background: accent,
          boxShadow: decision.outcome === 'block' ? `0 0 6px ${accent}` : 'none',
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-white/85">#{seed}</span>
          <span
            className="text-[9px] font-mono uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {decision.outcome}
          </span>
          {fired.length > 0 && (
            <span className="ml-auto text-[9px] font-mono text-white/40">
              {fired.length} fired
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[10px] font-mono text-white/40 truncate">
          {fired.length === 0
            ? 'clean'
            : fired.slice(0, 2).map((r) => r.ruleName).join(' · ')
              + (fired.length > 2 ? ` +${fired.length - 2}` : '')}
        </div>
      </div>
      <ArrowUpRight className="w-3 h-3 text-white/30 group-hover:text-white/85 group-hover:rotate-12 shrink-0 transition-all" />
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
  const lanes = decision.ruleResults
    .filter((r) => r.status !== 'skip')
    .sort((a, b) => statusRank(b.status) - statusRank(a.status))
    .slice(0, 14);

  const accent = decision.outcome === 'block' ? SEVERITY_COLOR.block
    : decision.outcome === 'warn' ? SEVERITY_COLOR.warn
    : '#5fa86c';

  return (
    <V2Card className="p-5 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <SectionTitle icon={Filter}>{tr('admission.decisionFlow.title')}</SectionTitle>
        <span className="text-[10px] font-mono text-white/40">
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
          <GitPullRequest className="w-5 h-5 mx-auto mb-1.5 text-[#7aa7d4]" />
          <div className="text-[20px] font-black text-white tabular-nums leading-none">
            {diff.changes.length}
          </div>
          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/55">
            files
          </div>
        </div>

        {/* Lanes */}
        <div className="relative">
          <div className="absolute inset-0 flex flex-col justify-center pointer-events-none">
            <div className="h-px bg-gradient-to-r from-[#7aa7d466] via-white/[0.10] to-[#5fa86c66]" />
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
                : r.status === 'warn' ? SEVERITY_COLOR.warn : 'rgba(255,255,255,0.45)';
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
                        : 'linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))',
                      boxShadow: fired ? `0 0 10px ${sev}66` : 'none',
                    }}
                  />
                  {/* tooltip-ish label, only on hover via group */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 -top-7 text-[9px] font-mono whitespace-nowrap px-2 py-0.5 rounded-md bg-black/90 text-white/85 border border-white/10 z-10">
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
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/55">
            verdict
          </div>
        </div>
      </div>
    </V2Card>
  );
}

function statusRank(s: string): number {
  return s === 'block' ? 4 : s === 'warn' ? 3 : s === 'pass' ? 2 : 1;
}

// ─────────────────────────────────────────────────────────────────────────
// RETROACTIVE — bottom bars
// ─────────────────────────────────────────────────────────────────────────

function Retroactive({
  retro,
}: {
  retro: { seed: number; decision: ReturnType<typeof evaluateAdmission> }[];
}) {
  const { t: tA } = useTranslation('admission');
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
        <SmallStat label="pass"  value={summary.pass}  color="#5fa86c" />
      </div>

      <div className="relative mt-4 flex items-end gap-px h-16">
        {retro.map((r, i) => {
          const accent = r.decision.outcome === 'block' ? SEVERITY_COLOR.block
            : r.decision.outcome === 'warn' ? SEVERITY_COLOR.warn
            : '#5fa86c';
          const fired = r.decision.ruleResults.filter((rr) => rr.status === 'block' || rr.status === 'warn').length;
          const h = 18 + Math.min(82, fired * 12);
          const isHover = hover === i;
          return (
            <div
              key={r.seed}
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
                    background: 'rgba(13,17,23,0.95)',
                    border: `1px solid ${accent}88`,
                    boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 16px ${accent}44`,
                  }}
                >
                  <div className="text-[10px] font-mono text-white/85">#{r.seed}</div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: accent }}
                  >
                    {r.decision.outcome}
                  </div>
                  <div className="text-[9px] font-mono text-white/40 mt-0.5">
                    {fired} rules fired
                  </div>
                  <div
                    aria-hidden
                    className="absolute left-1/2 -bottom-[5px] -translate-x-1/2 w-2 h-2 rotate-45"
                    style={{
                      background: 'rgba(13,17,23,0.95)',
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

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function SectionTitle({
  icon: Icon, children,
}: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-white/55" />
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
        {children}
      </h3>
    </div>
  );
}

function Stat({
  label, value, tone = 'mute',
}: {
  label: string;
  value: number | string;
  tone?: 'mute' | 'critical' | 'warn';
}) {
  const color = tone === 'critical' ? SEVERITY_COLOR.block
    : tone === 'warn' ? SEVERITY_COLOR.warn
    : 'rgba(255,255,255,0.85)';
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] font-mono text-white/40">{label}</span>
      <span
        className="text-[18px] font-bold tabular-nums leading-none"
        style={{
          color,
          textShadow: tone !== 'mute' ? `0 0 14px ${color}55` : 'none',
        }}
      >
        {value}
      </span>
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

// ═════════════════════════════════════════════════════════════════════════
// RULES PAGE — full management surface
// Features: list (with bulk select), live preview editor, packs, rollouts,
// versioning, import/export.
// ═════════════════════════════════════════════════════════════════════════

function RulesPage({
  rules, previews, retro,
}: {
  rules: AdmissionRule[];
  previews: Map<string, ReturnType<typeof previewRule>>;
  retro: { seed: number; decision: ReturnType<typeof evaluateAdmission> }[];
}) {
  const repo = useFilterStore((s) => s.repo);
  const [section, setSection] = useState<'list' | 'packs' | 'audit' | 'io'>('list');
  const editingId = useAdmissionStore((s) => s.editingId);
  const draft = useAdmissionStore((s) => s.draft);
  const closeEditor = useAdmissionStore((s) => s.closeEditor);

  return (
    <div className="relative min-h-full p-6 pt-10 flex flex-col gap-5">
      {/* Page heading */}
      <div className="flex items-center gap-3 admv2-rise">
        <ListChecks className="w-4 h-4 text-white/55" />
        <h1 className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/85">
          Rule management
        </h1>
        <span className="text-[10px] font-mono text-white/40">
          author · simulate · roll out
        </span>
        <div className="flex-1" />
        <SectionTabs section={section} onChange={setSection} />
      </div>

      {section === 'list' && (
        <RuleListSection rules={rules} previews={previews} retro={retro} repo={repo} />
      )}
      {section === 'packs' && <RulePacksSection />}
      {section === 'audit' && <AuditSection />}
      {section === 'io' && <ImportExportSection />}

      {/* Floating editor drawer */}
      {draft !== null && (
        <RuleEditorDrawer
          editingId={editingId}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}

function SectionTabs({
  section, onChange,
}: {
  section: 'list' | 'packs' | 'audit' | 'io';
  onChange: (s: 'list' | 'packs' | 'audit' | 'io') => void;
}) {
  const opts: { id: 'list' | 'packs' | 'audit' | 'io'; label: string }[] = [
    { id: 'list',  label: 'Rules' },
    { id: 'packs', label: 'Packs' },
    { id: 'audit', label: 'Audit' },
    { id: 'io',    label: 'Import / Export' },
  ];
  return (
    <div className="flex items-center gap-px rounded-md overflow-hidden bg-white/[0.04] border border-white/5">
      {opts.map((o) => {
        const active = section === o.id;
        return (
          <button type="button"
            key={o.id}
            onClick={() => { onChange(o.id); }}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${
              active ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/85'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Rule list (with bulk + filter) ───────────────────────────────────

function RuleListSection({
  rules, previews, retro,
}: {
  rules: AdmissionRule[];
  previews: Map<string, ReturnType<typeof previewRule>>;
  retro: { seed: number; decision: ReturnType<typeof evaluateAdmission> }[];
  repo: ReturnType<typeof useFilterStore.getState>['repo'];
}) {
  const { t: tA } = useTranslation('admission');
  const openEditor = useAdmissionStore((s) => s.openEditor);
  const toggle = useAdmissionStore((s) => s.toggle);
  const selection = useAdmissionStore((s) => s.selection);
  const selectToggle = useAdmissionStore((s) => s.selectToggle);
  const selectClear = useAdmissionStore((s) => s.selectClear);
  const selectAll = useAdmissionStore((s) => s.selectAll);
  const bulkSetSeverity = useAdmissionStore((s) => s.bulkSetSeverity);
  const bulkSetEnabled = useAdmissionStore((s) => s.bulkSetEnabled);
  const bulkRemove = useAdmissionStore((s) => s.bulkRemove);
  const startRollout = useAdmissionStore((s) => s.startRollout);
  const rollouts = useAdmissionStore((s) => s.rollouts);

  const [filter, setFilter] = useState<RuleSource | 'all'>('all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'matches' | 'severity'>('matches');

  const visible = useMemo(() => {
    let out = rules;
    if (filter !== 'all') out = out.filter((r) => r.source === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((r) =>
        r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
      );
    }
    out = out.slice().sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'severity') {
        const rank = (s: RuleSeverity) => s === 'block' ? 3 : s === 'warn' ? 2 : 1;
        return rank(b.severity) - rank(a.severity);
      }
      return (previews.get(b.id)?.matches.length ?? 0) - (previews.get(a.id)?.matches.length ?? 0);
    });
    return out;
  }, [rules, filter, query, sortKey, previews]);

  const allChecked = visible.length > 0 && visible.every((r) => selection.has(r.id));
  const someChecked = selection.size > 0;

  return (
    <>
      {/* Toolbar */}
      <V2Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md flex-1 min-w-[200px]"
            style={{
              background: 'rgba(0,0,0,0.22)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Search className="w-3 h-3 text-white/40" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); }}
              placeholder={tA('search.rulesPlaceholder')}
              className="flex-1 bg-transparent text-[11px] text-white/85 placeholder:text-white/30 outline-none"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); }} className="text-white/40 hover:text-white/70">
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          <SourceFilterChips value={filter} onChange={setFilter} rules={rules} />

          <select
            value={sortKey}
            onChange={(e) => { setSortKey(e.target.value as 'name' | 'matches' | 'severity'); }}
            className="text-[10px] font-mono px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-white/70"
          >
            <option value="matches">sort: matches</option>
            <option value="severity">sort: severity</option>
            <option value="name">sort: name</option>
          </select>

          <button type="button"
            onClick={() => { openEditor(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] bg-white text-black hover:bg-white/90"
          >
            <Plus className="w-3 h-3" />
            New rule
          </button>
        </div>

        {/* Bulk action bar */}
        {someChecked && (
          <div
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md admv2-rise"
            style={{
              background: 'linear-gradient(140deg, rgba(122,167,212,0.12), rgba(122,167,212,0.03))',
              border: '1px solid rgba(122,167,212,0.35)',
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
              {selection.size} selected
            </span>
            <div className="w-px h-4 bg-white/10" />
            <button type="button"
              onClick={() => { bulkSetEnabled(true); }}
              className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/70 hover:text-white px-2 py-0.5 rounded-md hover:bg-white/5"
            >
              enable
            </button>
            <button type="button"
              onClick={() => { bulkSetEnabled(false); }}
              className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/70 hover:text-white px-2 py-0.5 rounded-md hover:bg-white/5"
            >
              disable
            </button>
            <div className="w-px h-4 bg-white/10" />
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/40">severity →</span>
            {(['block', 'warn', 'info'] as RuleSeverity[]).map((sev) => (
              <button type="button"
                key={sev}
                onClick={() => { bulkSetSeverity(sev); }}
                className="text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-md hover:bg-white/5"
                style={{
                  color: sev === 'block' ? SEVERITY_COLOR.block
                    : sev === 'warn' ? SEVERITY_COLOR.warn : 'rgba(255,255,255,0.65)',
                }}
              >
                {sev}
              </button>
            ))}
            <div className="flex-1" />
            <button type="button"
              onClick={() => {
                if (confirm(`Delete ${selection.size} rules?`)) bulkRemove();
              }}
              className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-md hover:bg-[#c25a55]/15 text-[#c25a55]"
            >
              <Trash2 className="w-3 h-3" />
              delete
            </button>
            <button type="button"
              onClick={selectClear}
              className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/55 hover:text-white px-2 py-0.5 rounded-md"
            >
              clear
            </button>
          </div>
        )}
      </V2Card>

      {/* Table */}
      <V2Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-[28px_minmax(0,1fr)_80px_70px_60px_70px_24px] gap-2 px-4 py-2 border-b border-white/5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
          <button type="button"
            onClick={() => { allChecked ? selectClear() : selectAll(visible.map((r) => r.id)); }}
            className="text-white/40 hover:text-white"
            aria-label={allChecked ? 'unselect all' : 'select all'}
          >
            <Checkbox checked={allChecked} indeterminate={someChecked && !allChecked} />
          </button>
          <span>{tA('table.rule')}</span>
          <span>{tA('table.source')}</span>
          <span>{tA('table.severity')}</span>
          <span className="text-right">{tA('table.matches')}</span>
          <span>{tA('table.cost')}</span>
          <span />
        </div>
        <div className="max-h-[calc(100vh-360px)] overflow-y-auto">
          {visible.length === 0 ? (
            <div className="px-4 py-8 text-center text-[11px] font-mono text-white/40">
              No rules match.
            </div>
          ) : visible.map((r) => {
            const checked = selection.has(r.id);
            const matches = previews.get(r.id)?.matches.length ?? 0;
            const sevColor = r.severity === 'block' ? SEVERITY_COLOR.block
              : r.severity === 'warn' ? SEVERITY_COLOR.warn : 'rgba(255,255,255,0.55)';
            const cost = estimateCost(r);
            const inRollout = rollouts.find((ro) => ro.ruleId === r.id);
            return (
              <div
                key={r.id}
                className={`grid grid-cols-[28px_minmax(0,1fr)_80px_70px_60px_70px_24px] gap-2 px-4 py-2.5 items-center border-b border-white/[0.04] cursor-pointer transition-colors ${
                  checked ? 'bg-[#7aa7d4]/[0.06]' : 'hover:bg-white/[0.025]'
                } ${!r.enabled ? 'opacity-50' : ''}`}
                onClick={() => { openEditor(r.id); }}
              >
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); selectToggle(r.id); }}
                  className="text-white/55 hover:text-white"
                >
                  <Checkbox checked={checked} />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); toggle(r.id); }}
                      className="shrink-0 w-7 h-3.5 rounded-full relative transition-colors"
                      style={{ background: r.enabled ? '#5fa86c66' : 'rgba(255,255,255,0.10)' }}
                      aria-label={r.enabled ? 'disable' : 'enable'}
                    >
                      <span
                        className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all"
                        style={{
                          left: r.enabled ? '14px' : '2px',
                          background: r.enabled ? '#5fa86c' : '#fff',
                        }}
                      />
                    </button>
                    <span className="text-[12px] font-bold text-white/85 truncate">
                      {r.name}
                    </span>
                    {inRollout && (
                      <span
                        className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-px rounded-md"
                        style={{
                          color: '#7aa7d4',
                          background: '#7aa7d415',
                          border: '1px solid #7aa7d444',
                        }}
                        title={`Rolling out — warn → block over ${inRollout.durationDays}d`}
                      >
                        rollout
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[10px] font-mono text-white/40 truncate">
                    {usesHint(r.signal)} · {describeSignal(r.signal)}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-white/55">
                  {SOURCE_GLYPH[r.source]} {r.source}
                </span>
                <span
                  className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-md inline-block"
                  style={{ color: sevColor, background: `${sevColor}1a` }}
                >
                  {r.severity}
                </span>
                <span
                  className="text-[12px] font-mono tabular-nums text-right"
                  style={{
                    color: matches === 0 ? 'rgba(255,255,255,0.30)'
                      : r.severity === 'block' ? sevColor
                      : 'rgba(255,255,255,0.85)',
                  }}
                >
                  {matches}
                </span>
                <span className="text-[9px] font-mono text-white/55 uppercase tracking-[0.18em]">
                  {cost}
                </span>
                <button type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (inRollout) {
                      useAdmissionStore.getState().cancelRollout(r.id);
                    } else {
                      startRollout(r.id, 7);
                    }
                  }}
                  className="text-white/40 hover:text-white/85 text-[9px]"
                  title={inRollout ? 'Cancel rollout' : 'Start 7d rollout'}
                >
                  {inRollout ? '▸stop' : '▸7d'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer: total info + retro cue */}
        <div className="px-4 py-2 border-t border-white/5 flex items-center text-[10px] font-mono text-white/40">
          <span>{visible.length} of {rules.length} rules</span>
          <span className="ml-auto">
            edit / delete / start rollout · click row to edit
          </span>
        </div>
      </V2Card>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <V2Card className="p-4">
          <SectionTitle icon={Layers}>{tA('section.activeVsTotal')}</SectionTitle>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-[28px] font-black tabular-nums text-white leading-none">
              {rules.filter((r) => r.enabled).length}
            </span>
            <span className="text-[14px] font-mono text-white/40 leading-none">
              / {rules.length}
            </span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${(rules.filter((r) => r.enabled).length / Math.max(1, rules.length)) * 100}%`,
                background: 'linear-gradient(90deg, #7aa7d4, #5fa86c)',
              }}
            />
          </div>
        </V2Card>

        <V2Card className="p-4">
          <SectionTitle icon={Zap}>{tA('section.ifTodayRan')}</SectionTitle>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-[28px] font-black tabular-nums text-[#c25a55] leading-none"
              style={{ textShadow: '0 0 12px #c25a5555' }}
            >
              {retro.filter((r) => r.decision.outcome === 'block').length}
            </span>
            <span className="text-[14px] font-mono text-white/40 leading-none">
              / {retro.length}
            </span>
          </div>
          <div className="mt-2 text-[10px] font-mono text-white/40">
            simulated PRs would block under current ruleset
          </div>
        </V2Card>

        <V2Card className="p-4">
          <SectionTitle icon={Cpu}>{tA('section.rolloutsInProgress')}</SectionTitle>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-[28px] font-black tabular-nums text-[#7aa7d4] leading-none"
              style={{ textShadow: '0 0 12px #7aa7d455' }}
            >
              {rollouts.length}
            </span>
            <span className="text-[14px] font-mono text-white/40 leading-none">
              warn → block
            </span>
          </div>
          <div className="mt-2 text-[10px] font-mono text-white/40">
            scheduled rule promotions
          </div>
        </V2Card>
      </div>
    </>
  );
}

function Checkbox({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <span
      className="inline-flex w-3.5 h-3.5 items-center justify-center rounded-md transition-colors"
      style={{
        background: checked || indeterminate ? '#7aa7d4' : 'transparent',
        border: `1px solid ${checked || indeterminate ? '#7aa7d4' : 'rgba(255,255,255,0.30)'}`,
      }}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="#0d1117" strokeWidth={2.4}>
          <path d="M2 6.5 L5 9.5 L10 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {indeterminate && !checked && (
        <span className="block w-2 h-[2px] bg-[#0d1117]" />
      )}
    </span>
  );
}

function SourceFilterChips({
  value, onChange, rules,
}: {
  value: RuleSource | 'all';
  onChange: (v: RuleSource | 'all') => void;
  rules: AdmissionRule[];
}) {
  const opts: (RuleSource | 'all')[] = ['all', 'native', 'eslint', 'semgrep', 'codeql', 'custom'];
  return (
    <div className="flex items-center gap-px rounded-md overflow-hidden bg-white/[0.04] border border-white/5">
      {opts.map((o) => {
        const active = value === o;
        const count = o === 'all' ? rules.length : rules.filter((r) => r.source === o).length;
        return (
          <button type="button"
            key={o}
            onClick={() => { onChange(o); }}
            className={`px-2 py-1 text-[10px] font-mono transition-colors ${
              active ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
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

// ── Rule packs ───────────────────────────────────────────────────────

function RulePacksSection() {
  const packs = useAdmissionStore((s) => s.packs);
  const rules = useAdmissionStore((s) => s.rules);
  const togglePack = useAdmissionStore((s) => s.togglePack);
  const packIsActive = useAdmissionStore((s) => s.packIsActive);

  return (
    <div className="grid grid-cols-2 gap-4">
      {packs.map((pack) => {
        const active = packIsActive(pack.id);
        const memberRules = rules.filter((r) => pack.ruleIds.includes(r.id));
        const enabledMembers = memberRules.filter((r) => r.enabled).length;
        return (
          <V2Card
            key={pack.id}
            className="p-5 cursor-pointer transition-all hover:scale-[1.005]"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: active
                    ? 'linear-gradient(140deg, rgba(122,167,212,0.30), rgba(122,167,212,0.05))'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? 'rgba(122,167,212,0.55)' : 'rgba(255,255,255,0.10)'}`,
                  boxShadow: active ? '0 0 16px rgba(122,167,212,0.25)' : 'none',
                }}
              >
                <Layers className={`w-4 h-4 ${active ? 'text-[#7aa7d4]' : 'text-white/55'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-white">
                    {pack.name}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/40 px-1.5 py-px rounded-md bg-white/[0.04]">
                    {pack.source}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] font-mono text-white/55">
                  {pack.description}
                </div>
              </div>
              <button type="button"
                onClick={() => { togglePack(pack.id); }}
                className="shrink-0 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
                style={{
                  background: active ? '#7aa7d4' : 'rgba(255,255,255,0.05)',
                  color: active ? '#0d1117' : 'rgba(255,255,255,0.85)',
                  border: `1px solid ${active ? '#7aa7d4' : 'rgba(255,255,255,0.10)'}`,
                }}
              >
                {active ? 'Activated' : 'Activate'}
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
                  {enabledMembers} / {memberRules.length} active
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="space-y-1">
                {memberRules.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-[11px] font-mono">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: r.enabled ? '#5fa86c' : 'rgba(255,255,255,0.18)' }}
                    />
                    <span className={r.enabled ? 'text-white/85' : 'text-white/40'}>
                      {SOURCE_GLYPH[r.source]} {r.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </V2Card>
        );
      })}
    </div>
  );
}

// ── Audit (overrides + version log) ──────────────────────────────────

function AuditSection() {
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
          <span className="text-[10px] font-mono text-white/40">
            who bypassed what · when · why
          </span>
        </div>
        {overrides.length === 0 ? (
          <div className="text-[11px] font-mono text-white/40">{tA('empty.noOverrides')}</div>
        ) : (
          <div className="space-y-2">
            {overrides.map((o) => (
              <div
                key={o.id}
                className="px-3 py-2 rounded-md"
                style={{
                  background: 'rgba(0,0,0,0.20)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="w-1 h-3 rounded-full shrink-0"
                    style={{
                      background: o.severity === 'block' ? SEVERITY_COLOR.block
                        : o.severity === 'warn' ? SEVERITY_COLOR.warn : 'rgba(255,255,255,0.45)',
                    }}
                  />
                  <span className="text-[11px] font-bold text-white/85">{o.ruleName}</span>
                  <span className="text-[10px] font-mono text-white/40">PR #{o.prSeed}</span>
                  <span className="ml-auto text-[10px] font-mono text-white/40">
                    @{o.actor} · {timeAgo(o.at)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-mono text-white/55">
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
          <span className="text-[10px] font-mono text-white/40">
            edits to ruleset · most recent
          </span>
        </div>
        {versionLog.length === 0 ? (
          <div className="text-[11px] font-mono text-white/40">
            No edits yet — saving any rule will record a version here.
          </div>
        ) : (
          <div className="space-y-2">
            {versionLog.map((v) => (
              <div
                key={`${v.ruleId}-${v.v}`}
                className="px-3 py-2 rounded-md"
                style={{
                  background: 'rgba(0,0,0,0.20)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-mono px-1.5 py-px rounded-md text-[#7aa7d4]"
                    style={{ background: '#7aa7d415', border: '1px solid #7aa7d433' }}
                  >
                    v{v.v}
                  </span>
                  <span className="text-[11px] font-bold text-white/85 truncate">
                    {v.ruleName}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-white/40">
                    {timeAgo(v.at)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-mono text-white/55">
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

function timeAgo(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000) return 'just now';
  if (d < 3600_000) return `${Math.round(d / 60_000)}m ago`;
  if (d < 86400_000) return `${Math.round(d / 3600_000)}h ago`;
  return `${Math.round(d / 86400_000)}d ago`;
}

// ── Import / export ──────────────────────────────────────────────────

function ImportExportSection() {
  const { t: tA } = useTranslation('admission');
  const exportRules = useAdmissionStore((s) => s.exportRules);
  const importRules = useAdmissionStore((s) => s.importRules);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<string | null>(null);

  const exported = useMemo(() => exportRules(), [exportRules]);

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
      <V2Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <SectionTitle icon={FileText}>{tA('section.export')}</SectionTitle>
          <span className="text-[10px] font-mono text-white/40">
            current ruleset as JSON
          </span>
          <div className="flex-1" />
          <button type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(exported);
            }}
            className="text-[10px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.10] text-white/85 border border-white/10"
          >
            Copy
          </button>
        </div>
        <pre
          className="text-[10px] font-mono text-white/70 overflow-auto p-3 rounded-md leading-relaxed"
          style={{
            background: 'rgba(0,0,0,0.40)',
            border: '1px solid rgba(255,255,255,0.06)',
            maxHeight: 360,
          }}
        >
          {exported}
        </pre>
      </V2Card>

      <V2Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <SectionTitle icon={FileText}>{tA('section.import')}</SectionTitle>
          <span className="text-[10px] font-mono text-white/40">
            paste JSON · merges by id
          </span>
        </div>
        <textarea
          value={importText}
          onChange={(e) => { setImportText(e.target.value); setImportResult(null); }}
          placeholder='{"version": 1, "rules": [ ... ]}'
          className="w-full text-[10px] font-mono p-3 rounded-md leading-relaxed text-white/85 placeholder-white/25 outline-none"
          style={{
            background: 'rgba(0,0,0,0.40)',
            border: '1px solid rgba(255,255,255,0.06)',
            minHeight: 200,
          }}
        />
        <div className="mt-3 flex items-center gap-2">
          <button type="button"
            onClick={() => {
              const r = importRules(importText);
              if (r.ok) setImportResult(`Imported ${r.count} rules.`);
              else setImportResult(`Error: ${r.error}`);
            }}
            disabled={!importText.trim()}
            className="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] bg-white text-black hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import
          </button>
          <button type="button"
            onClick={() => { setImportText(''); setImportResult(null); }}
            className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40 hover:text-white/85 px-2"
          >
            clear
          </button>
          <div className="flex-1" />
          {importResult && (
            <span
              className="text-[10px] font-mono"
              style={{
                color: importResult.startsWith('Error') ? SEVERITY_COLOR.block : '#5fa86c',
              }}
            >
              {importResult}
            </span>
          )}
        </div>
        <div className="mt-4 text-[10px] font-mono text-white/40 leading-relaxed">
          Tip — drop in your <span className="text-white/55">.eslintrc</span> rules,
          a <span className="text-white/55">semgrep.yml</span> excerpt, or a CodeQL
          query pack manifest. The importer normalises into the unified rule shape;
          unknown fields are preserved as <span className="text-white/55">external</span> signals.
        </div>
      </V2Card>
    </div>
  );
}

// ── Rule editor (drawer) ─────────────────────────────────────────────

function RuleEditorDrawer({
  editingId, onClose,
}: {
  editingId: string | null;
  onClose: () => void;
}) {
  const { t: tA } = useTranslation('admission');
  const draft = useAdmissionStore((s) => s.draft);
  const updateDraft = useAdmissionStore((s) => s.updateDraft);
  const saveDraft = useAdmissionStore((s) => s.saveDraft);
  const repo = useFilterStore((s) => s.repo);
  const versions = useAdmissionStore((s) => editingId ? s.versions[editingId] : undefined);
  const dialogRef = useRef<HTMLElement>(null);
  // ESC closes, Tab cycles within the drawer, autofocus first input on open,
  // restore focus to the opener when the drawer unmounts.
  useDialogA11y(dialogRef, draft !== null, onClose);

  // Hooks must run unconditionally; the early return for "no draft" is moved
  // below the hooks block. When `draft` is null we feed safe defaults into
  // the preview rule so the hooks still have valid input.
  const previewRuleObj = useMemo<AdmissionRule>(() => ({
    id: draft?.ruleId ?? '_draft',
    name: draft?.name ?? '',
    description: draft?.description ?? '',
    source: draft?.source ?? 'native',
    severity: draft?.severity ?? 'warn',
    enabled: true,
    signal: draft?.signal ?? { kind: 'metric', field: 'blastRadius', op: '>', value: 25 },
    scope: {
      pathIncludes: (draft?.pathIncludes ?? '').split(',').map((p) => p.trim()).filter(Boolean),
      pathExcludes: (draft?.pathExcludes ?? '').split(',').map((p) => p.trim()).filter(Boolean),
      labels: [],
    },
    override: { allowAuthor: false, requiresApproverRole: null },
    evidence: 'exact',
  }), [draft]);

  const [debounced, setDebounced] = useState(previewRuleObj);
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(previewRuleObj); }, 200);
    return () => { clearTimeout(t); };
  }, [previewRuleObj]);

  const cost = estimateCost(previewRuleObj);
  const preview = useMemo(() => previewRule(debounced, repo), [debounced, repo]);
  const retroDiffs = useMemo(
    () => Array.from({ length: 12 }, (_, i) => simulateBranchDiff(repo, 700_000 + i)),
    [repo],
  );
  const retroImpact = useMemo(() => {
    let block = 0, warn = 0, pass = 0;
    for (const d of retroDiffs) {
      const dec = evaluateAdmission([previewRuleObj], repo, d);
      if (dec.blockingCount > 0) block++;
      else if (dec.warningCount > 0) warn++;
      else pass++;
    }
    return { block, warn, pass, total: retroDiffs.length };
  }, [retroDiffs, repo, previewRuleObj]);

  if (!draft) return null;

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200]"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      {/* Drawer */}
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={editingId === null ? 'New rule' : 'Edit rule'}
        tabIndex={-1}
        className="fixed right-0 top-0 bottom-0 z-[201] flex flex-col overflow-hidden admv2-rise outline-none"
        style={{
          width: 520,
          background: '#0d1117',
          borderLeft: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '-24px 0 60px rgba(0,0,0,0.6)',
        }}
      >
        <div className="shrink-0 px-5 py-4 flex items-center gap-2 border-b border-white/5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            {editingId === null ? 'New rule' : 'Edit rule'}
          </h2>
          <span
            className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-px rounded-md"
            style={{
              color: 'rgba(255,255,255,0.65)',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            {cost}
          </span>
          {versions && versions.length > 0 && (
            <span
              className="text-[9px] font-mono px-1.5 py-px rounded-md"
              style={{
                color: '#7aa7d4',
                background: '#7aa7d415',
                border: '1px solid #7aa7d433',
              }}
            >
              v{versions.length}
            </span>
          )}
          <div className="flex-1" />
          <button type="button"
            onClick={() => saveDraft()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] bg-white text-black hover:bg-white/90"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded-md text-white/55 hover:text-white hover:bg-white/5"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-5 space-y-5">
          {/* Identity */}
          <Field label="Name">
            <DrawerInput
              value={draft.name}
              onChange={(v) => { updateDraft({ name: v }); }}
              placeholder="Public-API touched without test"
            />
          </Field>
          <Field label="Description">
            <DrawerInput
              value={draft.description}
              onChange={(v) => { updateDraft({ description: v }); }}
              placeholder={tA('rule.whyExistsPlaceholder')}
              multiline
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Source">
              <DrawerSelect
                value={draft.source}
                onChange={(v) => { updateDraft({ source: v as RuleSource }); }}
                options={['native', 'eslint', 'semgrep', 'codeql', 'custom']}
              />
            </Field>
            <Field label="Severity">
              <DrawerSelect
                value={draft.severity}
                onChange={(v) => { updateDraft({ severity: v as RuleSeverity }); }}
                options={['block', 'warn', 'info']}
                accent={draft.severity === 'block' ? SEVERITY_COLOR.block
                  : draft.severity === 'warn' ? SEVERITY_COLOR.warn : undefined}
              />
            </Field>
          </div>

          {/* Signal */}
          <Field label="Signal">
            <div className="flex items-center gap-px rounded-md overflow-hidden bg-white/[0.04] border border-white/5">
              {(['metric', 'graph', 'taint', 'dsl', 'external'] as const).map((k) => {
                const active = draft.signal.kind === k;
                return (
                  <button type="button"
                    key={k}
                    onClick={() => { updateDraft({ signal: defaultSignalFor(k) }); }}
                    className={`flex-1 px-2 py-1 text-[10px] font-mono transition-colors ${
                      active ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/85'
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
            <div className="mt-2">
              <SignalEditor
                signal={draft.signal}
                onChange={(s) => { updateDraft({ signal: s }); }}
              />
            </div>
            <div className="mt-2 text-[10px] font-mono text-white/40">
              uses {usesHint(draft.signal)}
            </div>
          </Field>

          <Field label="Scope">
            <div className="grid grid-cols-2 gap-3">
              <DrawerInput
                value={draft.pathIncludes}
                onChange={(v) => { updateDraft({ pathIncludes: v }); }}
                placeholder="includes (csv)"
                mono
              />
              <DrawerInput
                value={draft.pathExcludes}
                onChange={(v) => { updateDraft({ pathExcludes: v }); }}
                placeholder="excludes (csv)"
                mono
              />
            </div>
          </Field>

          {/* Live preview */}
          <V2Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-3 h-3 text-white/55" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                live preview
              </span>
              <span className="ml-auto text-[9px] font-mono text-white/40">
                {preview.elapsedMs.toFixed(1)}ms · {preview.cost}
              </span>
            </div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-[24px] font-black tabular-nums text-white leading-none">
                {preview.matches.length}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                matches{preview.truncated ? ' (capped)' : ''}
              </span>
            </div>
            <div className="text-[10px] font-mono text-white/40 mb-2">
              exact {preview.confidenceMix.exact} · over {preview.confidenceMix.overapprox} · unk {preview.confidenceMix.unknown}
            </div>
            {preview.matches.length === 0 ? (
              <div className="text-[11px] font-mono text-white/40">
                No files match. Rule is ready to enable.
              </div>
            ) : (
              <ul className="space-y-px">
                {preview.matches.slice(0, 6).map((m) => {
                  const f = repo.files[m.fileId];
                  return (
                    <li
                      key={m.fileId}
                      className="flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded-md bg-white/[0.025]"
                    >
                      <span className="w-1 h-1 rounded-full bg-white/55" />
                      <span className="truncate flex-1 text-white/85">
                        {f ? `${f.folderPath}.${f.name}` : `#${m.fileId}`}
                      </span>
                      <span className="text-white/40 truncate max-w-[10rem]">
                        {m.evidenceText}
                      </span>
                    </li>
                  );
                })}
                {preview.matches.length > 6 && (
                  <li className="text-[10px] font-mono text-white/40 px-2">
                    … {preview.matches.length - 6} more
                  </li>
                )}
              </ul>
            )}
          </V2Card>

          {/* Retroactive impact */}
          <V2Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-3 h-3 text-white/55" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                if enabled (last 30d sim)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <RetroBadge label="block" value={retroImpact.block} color={SEVERITY_COLOR.block} />
              <RetroBadge label="warn"  value={retroImpact.warn}  color={SEVERITY_COLOR.warn} />
              <RetroBadge label="pass"  value={retroImpact.pass}  color="#5fa86c" />
            </div>
          </V2Card>

          {/* Version history */}
          {versions && versions.length > 0 && (
            <V2Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3 h-3 text-white/55" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                  history
                </span>
                <span className="ml-auto text-[9px] font-mono text-white/40">
                  {versions.length} revision{versions.length === 1 ? '' : 's'}
                </span>
              </div>
              <ul className="space-y-1.5">
                {versions.slice().reverse().slice(0, 6).map((v) => (
                  <li key={v.version} className="flex items-center gap-2 text-[10px] font-mono">
                    <span
                      className="px-1.5 py-px rounded-md text-[#7aa7d4]"
                      style={{ background: '#7aa7d415', border: '1px solid #7aa7d433' }}
                    >
                      v{v.version}
                    </span>
                    <span className="text-white/55 truncate flex-1">{v.summary}</span>
                    <span className="text-white/30">{timeAgo(v.changedAt)}</span>
                  </li>
                ))}
              </ul>
            </V2Card>
          )}
        </div>
      </aside>
    </Portal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      {children}
    </div>
  );
}

function DrawerInput({
  value, onChange, placeholder, multiline, mono, numeric,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  mono?: boolean;
  numeric?: boolean;
}) {
  const cls = `w-full px-3 py-2 rounded-md text-[11px] outline-none transition-colors ${mono ? 'font-mono' : ''} text-white/85 placeholder:text-white/30`;
  const style: React.CSSProperties = {
    background: 'rgba(0,0,0,0.30)',
    border: '1px solid rgba(255,255,255,0.08)',
  };
  if (multiline) {
    return (
      <textarea
        rows={2}
        className={cls}
        style={style}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.currentTarget.value); }}
      />
    );
  }
  return (
    <input
      type={numeric ? 'number' : 'text'}
      className={cls}
      style={style}
      value={value}
      placeholder={placeholder}
      onChange={(e) => { onChange(e.currentTarget.value); }}
    />
  );
}

function DrawerSelect({
  value, onChange, options, accent,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  accent?: string;
}) {
  return (
    <select
      className="w-full px-3 py-2 rounded-md text-[11px] font-mono outline-none text-white/85"
      style={{
        background: 'rgba(0,0,0,0.30)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: accent,
      }}
      value={value}
      onChange={(e) => { onChange(e.currentTarget.value); }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SignalEditor({
  signal, onChange,
}: { signal: RuleSignal; onChange: (s: RuleSignal) => void }) {
  if (signal.kind === 'metric') {
    return (
      <div className="grid grid-cols-3 gap-2">
        <DrawerSelect
          value={signal.field}
          onChange={(v) => { onChange({ ...signal, field: v as MetricField }); }}
          options={['blastRadius', 'editSafety', 'sastFindings', 'cognitive', 'cyclomatic',
            'loc', 'fanIn', 'fanOut', 'churn', 'lineCoverage', 'maintainability',
            'eslintErrors', 'todoCount']}
        />
        <DrawerSelect
          value={signal.op}
          onChange={(v) => { onChange({ ...signal, op: v as CompareOp }); }}
          options={['>', '>=', '<', '<=', '=', '!=']}
        />
        <DrawerInput
          value={String(signal.value)}
          onChange={(v) => { onChange({ ...signal, value: Number(v) || 0 }); }}
          numeric
        />
      </div>
    );
  }
  if (signal.kind === 'graph') {
    return (
      <DrawerSelect
        value={signal.pattern}
        onChange={(v) => { onChange({ kind: 'graph', pattern: v as GraphPattern }); }}
        options={['import-cycle', 'public-api-touched', 'public-api-without-test',
          'orphan-edit', 'blast-radius-spike', 'unknown-region-creep', 'layer-violation']}
      />
    );
  }
  if (signal.kind === 'taint') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <DrawerSelect
          value={signal.source}
          onChange={(v) => { onChange({ ...signal, source: v as TaintSource }); }}
          options={['env', 'http', 'user-input', 'config', 'secret']}
        />
        <DrawerSelect
          value={signal.sink}
          onChange={(v) => { onChange({ ...signal, sink: v as TaintSink }); }}
          options={['fs.write', 'exec', 'sql', 'network', 'log']}
        />
      </div>
    );
  }
  if (signal.kind === 'dsl') {
    return (
      <DrawerInput
        value={signal.expr}
        onChange={(v) => { onChange({ kind: 'dsl', expr: v }); }}
        placeholder="safety:<40 +publicApi !test"
        mono
      />
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <DrawerSelect
        value={signal.tool}
        onChange={(v) => { onChange({ ...signal, tool: v as 'eslint' | 'semgrep' | 'codeql' | 'bandit' | 'ruff' }); }}
        options={['eslint', 'semgrep', 'codeql', 'bandit', 'ruff']}
      />
      <DrawerInput
        value={signal.ruleId}
        onChange={(v) => { onChange({ ...signal, ruleId: v }); }}
        placeholder="rule id"
        mono
      />
    </div>
  );
}

function defaultSignalFor(kind: RuleSignal['kind']): RuleSignal {
  switch (kind) {
    case 'metric':   return { kind: 'metric', field: 'blastRadius', op: '>', value: 25 };
    case 'graph':    return { kind: 'graph', pattern: 'public-api-without-test' };
    case 'taint':    return { kind: 'taint', source: 'env', sink: 'fs.write', requireSanitizer: true };
    case 'dsl':      return { kind: 'dsl', expr: 'safety:<40 +publicApi' };
    case 'external': return { kind: 'external', tool: 'eslint', ruleId: 'no-eval' };
  }
}

function RetroBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="px-3 py-2 rounded-md"
      style={{
        background: `${color}11`,
        border: `1px solid ${color}33`,
      }}
    >
      <div className="text-[20px] font-black tabular-nums leading-none" style={{ color }}>
        {value}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40 mt-1">
        {label}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// GATE PAGE — current PR's verdict, fired-rule details, override workflow
// ═════════════════════════════════════════════════════════════════════════

function GatePage({
  decision, diff, seed, onRegenerate,
}: {
  decision: ReturnType<typeof evaluateAdmission>;
  diff: PRDiff;
  seed: number;
  onRegenerate: () => void;
}) {
  const repo = useFilterStore((s) => s.repo);
  const overrides = useAdmissionStore((s) => s.overrides);
  const recordOverride = useAdmissionStore((s) => s.recordOverride);
  const rules = useAdmissionStore((s) => s.rules);
  const { t: tr } = useTranslation('app');
  const { t: tA } = useTranslation('admission');

  const [overrideTarget, setOverrideTarget] = useState<{ ruleId: string; ruleName: string; severity: RuleSeverity } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const fired = decision.ruleResults.filter((r) => r.status === 'block' || r.status === 'warn');
  const passed = decision.ruleResults.filter((r) => r.status === 'pass');

  const accent = decision.outcome === 'block' ? SEVERITY_COLOR.block
    : decision.outcome === 'warn' ? SEVERITY_COLOR.warn : '#5fa86c';
  const Icon = decision.outcome === 'allow' ? ShieldCheck
    : decision.outcome === 'warn' ? ShieldAlert : ShieldX;

  // Per-PR override count
  const prOverrides = useMemo(
    () => overrides.filter((o) => o.prSeed === seed),
    [overrides, seed],
  );

  return (
    <div className="relative min-h-full p-6 pt-10 flex flex-col gap-5">
      <div className="admv2-rise">
        <Hero
          decision={decision}
          diff={diff}
          seed={seed}
          onRegenerate={onRegenerate}
        />
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: 'minmax(0,360px) minmax(0,1fr)' }}>
        {/* Left — files */}
        <V2Card className="p-0 admv2-rise admv2-rise-1 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <SectionTitle icon={FileText}>{tA('section.filesInPr')}</SectionTitle>
            <div className="mt-1 text-[10px] font-mono text-white/40">
              {diff.changes.length} files · {diff.affected.length} ripple
            </div>
          </div>
          <div className="max-h-[600px] overflow-auto divide-y divide-white/5">
            {diff.changes.map((c) => {
              const f = repo.files[c.id];
              if (!f) return null;
              const fileFired = decision.ruleResults
                .filter((rr) => rr.hits.some((h) => h.fileId === c.id));
              const worst = fileFired.find((r) => r.status === 'block')
                ?? fileFired.find((r) => r.status === 'warn');
              const stripeColor = worst?.status === 'block' ? SEVERITY_COLOR.block
                : worst?.status === 'warn' ? SEVERITY_COLOR.warn : null;
              return (
                <div key={c.id} className="px-5 py-2.5 flex items-start gap-2">
                  {stripeColor && (
                    <span
                      className="w-1 self-stretch rounded-full"
                      style={{ background: stripeColor, boxShadow: `0 0 6px ${stripeColor}` }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-white/85 truncate">
                        {f.folderPath}.{f.name}
                      </span>
                      <span className="ml-auto text-[9px] font-mono uppercase tracking-[0.18em] text-white/40">
                        {c.kind}
                      </span>
                    </div>
                    {fileFired.length > 0 && (
                      <div className="mt-1 text-[10px] font-mono text-white/40 truncate">
                        {fileFired.map((r) => r.ruleName).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </V2Card>

        {/* Right — fired-rule cards with override */}
        <div className="flex flex-col gap-4 admv2-rise admv2-rise-2">
          {fired.length === 0 ? (
            <V2Card className="p-8 text-center">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3" style={{ color: '#5fa86c' }} />
              <div className="text-[14px] font-bold text-white/85">{tr('admission.gate.allChecksPassed')}</div>
              <div className="mt-1 text-[11px] font-mono text-white/40">
                {passed.length} rules evaluated · 0 blocking · 0 warning
              </div>
            </V2Card>
          ) : (
            <>
              <V2Card className="p-4">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                    {fired.length} rule{fired.length === 1 ? '' : 's'} fired
                  </span>
                  <div className="flex-1" />
                  {prOverrides.length > 0 && (
                    <span className="text-[10px] font-mono text-white/40">
                      {prOverrides.length} override{prOverrides.length === 1 ? '' : 's'} on this PR
                    </span>
                  )}
                </div>
              </V2Card>

              {fired.map((r) => {
                const sevColor = r.status === 'block' ? SEVERITY_COLOR.block : SEVERITY_COLOR.warn;
                const rule = rules.find((x) => x.id === r.ruleId);
                const overridden = prOverrides.some((o) => o.ruleId === r.ruleId);
                return (
                  <V2Card key={r.ruleId} className="p-5">
                    <div className="flex items-start gap-3">
                      <span
                        className="w-1 self-stretch rounded-full"
                        style={{ background: sevColor, boxShadow: `0 0 6px ${sevColor}` }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-white/40">
                            {SOURCE_GLYPH[r.source]} {r.source}
                          </span>
                          <span className="text-white/30">·</span>
                          <span
                            className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-px rounded-md"
                            style={{ color: sevColor, background: `${sevColor}1a` }}
                          >
                            {r.severity}
                          </span>
                          {overridden && (
                            <span
                              className="ml-auto text-[9px] font-mono uppercase tracking-[0.18em] px-2 py-px rounded-md"
                              style={{
                                color: '#7aa7d4',
                                background: '#7aa7d415',
                                border: '1px solid #7aa7d444',
                              }}
                            >
                              overridden
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[14px] font-bold text-white/85">
                          {r.ruleName}
                        </div>
                        {rule && (
                          <div className="mt-0.5 text-[11px] font-mono text-white/40">
                            uses {usesHint(rule.signal)} · {describeSignal(rule.signal)}
                          </div>
                        )}
                        <div className="mt-2 text-[11px] font-mono text-white/55">
                          {r.reason}
                        </div>

                        {r.hits.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {r.hits.slice(0, 5).map((h) => {
                              const f = repo.files[h.fileId];
                              return (
                                <div key={h.fileId} className="flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded-md bg-white/[0.03]">
                                  <span className="w-1 h-1 rounded-full bg-white/45" />
                                  <span className="text-white/85 truncate flex-1">
                                    {f ? `${f.folderPath}.${f.name}` : `#${h.fileId}`}
                                  </span>
                                  <span className="text-white/40 truncate max-w-[14rem]">
                                    {h.evidenceText}
                                  </span>
                                </div>
                              );
                            })}
                            {r.hits.length > 5 && (
                              <div className="text-[10px] font-mono text-white/40 px-2">
                                … {r.hits.length - 5} more
                              </div>
                            )}
                          </div>
                        )}

                        {!overridden && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => { setOverrideTarget({ ruleId: r.ruleId, ruleName: r.ruleName, severity: r.severity }); }}
                              className="text-[10px] font-mono uppercase tracking-[0.18em] px-3 py-1 rounded-md hover:bg-white/5 text-white/55 hover:text-white border border-white/10"
                            >
                              override with reason
                            </button>
                            <button className="text-[10px] font-mono uppercase tracking-[0.18em] px-3 py-1 rounded-md hover:bg-white/5 text-white/55 hover:text-white border border-white/10">
                              request escalation
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </V2Card>
                );
              })}
            </>
          )}

          {/* Passed summary */}
          {passed.length > 0 && (
            <V2Card className="p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5fa86c]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                  {passed.length} rule{passed.length === 1 ? '' : 's'} passed
                </span>
                <div className="flex-1" />
                <span className="text-[10px] font-mono text-white/40">
                  {passed.map((r) => r.ruleName).slice(0, 4).join(' · ')}
                  {passed.length > 4 && ` +${passed.length - 4}`}
                </span>
              </div>
            </V2Card>
          )}
        </div>
      </div>

      {/* Override modal */}
      {overrideTarget && (
        <Portal>
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => { setOverrideTarget(null); setOverrideReason(''); }}
        >
          <V2Card className="p-6 w-[480px] admv2-rise" >
            <div onClick={(e) => { e.stopPropagation(); }}>
              <div className="flex items-center gap-2 mb-4">
                <Gavel className="w-4 h-4 text-white/55" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                  {tr('admission.override.title')}
                </h3>
              </div>
              <div className="text-[12px] font-bold text-white/85 mb-1">
                {overrideTarget.ruleName}
              </div>
              <div className="text-[11px] font-mono text-white/55 mb-4">
                {tr('admission.override.notice')}
              </div>
              <Field label="Reason (required)">
                <DrawerInput
                  value={overrideReason}
                  onChange={setOverrideReason}
                  placeholder={tA('override.whyPlaceholder')}
                  multiline
                />
              </Field>
              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => { setOverrideTarget(null); setOverrideReason(''); }}
                  className="text-[10px] font-mono uppercase tracking-[0.18em] px-3 py-1.5 rounded-md text-white/55 hover:text-white border border-white/10 hover:bg-white/5"
                >
                  cancel
                </button>
                <div className="flex-1" />
                <button
                  disabled={!overrideReason.trim()}
                  onClick={() => {
                    recordOverride({
                      prSeed: seed,
                      ruleId: overrideTarget.ruleId,
                      ruleName: overrideTarget.ruleName,
                      actor: 'sondoo',
                      severity: overrideTarget.severity,
                      reason: overrideReason.trim(),
                    });
                    setOverrideTarget(null);
                    setOverrideReason('');
                  }}
                  className="px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  record override
                </button>
              </div>
            </div>
          </V2Card>
        </div>
        </Portal>
      )}
    </div>
  );
}
