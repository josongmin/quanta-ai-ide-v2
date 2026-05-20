import { useRef, useState } from 'react';
import {
  Cookie, Eye, Megaphone, Map, CheckCircle2, Sparkles, Code2,
  ShieldCheck, Accessibility as AccessIcon, Rocket, Zap, ChevronRight,
} from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { PublicShell , Eyebrow, HeadlineGradient, SectionHead, SeamDivider } from '@shared/ui/marketing';

// ─────────────────────────────────────────────────────────────────────────
// Cookie preferences (/legal/cookies)
// ─────────────────────────────────────────────────────────────────────────

type CookieToggle = { id: string; label: string; blurb: string; required?: boolean };
const COOKIE_GROUPS: CookieToggle[] = [
  { id: 'essential',   label: 'Strictly necessary', blurb: 'Authentication, session, and CSRF tokens. Always on.', required: true },
  { id: 'preferences', label: 'Preferences',        blurb: 'Theme, language, layout density.' },
  { id: 'analytics',   label: 'Analytics',          blurb: 'Anonymized usage events to find rough edges.' },
  { id: 'marketing',   label: 'Marketing',          blurb: 'Attribution + retargeting. Off by default.' },
];

export function CookiesPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    essential: true, preferences: true, analytics: false, marketing: false,
  });
  return (
    <PublicShell width="narrow" active="legal">
      <div className="flex flex-col gap-4 mb-10">
        <Eyebrow tone="info"><Cookie className="w-3 h-3" /> Cookies</Eyebrow>
        <HeadlineGradient accent="cookies">Manage your</HeadlineGradient>
        <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          We use the minimum cookies needed to keep things working. Everything beyond essentials is optional and changeable any time.
        </p>
      </div>
      <div
        className="rounded-xl overflow-hidden mb-6"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        {COOKIE_GROUPS.map((g, i) => {
          const on = enabled[g.id];
          return (
            <div
              key={g.id}
              className="flex items-start gap-4 p-5"
              style={{ borderBottom: i === COOKIE_GROUPS.length - 1 ? 'none' : '1px solid var(--border-muted)' }}
            >
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <span className="text-[13.5px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  {g.label} {g.required && (
                    <span className="text-[10px] uppercase tracking-[0.14em] font-semibold ml-1.5" style={{ color: 'var(--fg-subtle)' }}>
                      required
                    </span>
                  )}
                </span>
                <span className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{g.blurb}</span>
              </div>
              <button
                type="button"
                disabled={g.required}
                onClick={() => { if (!g.required) setEnabled((e) => ({ ...e, [g.id]: !on })); }}
                aria-pressed={on}
                className="relative w-10 h-6 rounded-full shrink-0 transition-colors"
                style={{
                  background: on ? 'var(--fg-accent)' : 'var(--bg-active)',
                  opacity: g.required ? 0.55 : 1,
                  cursor: g.required ? 'not-allowed' : 'pointer',
                }}
              >
                <span
                  aria-hidden
                  className="absolute top-0.5 w-5 h-5 rounded-full transition-[left]"
                  style={{
                    background: 'var(--bg-canvas)',
                    left: on ? 'calc(100% - 22px)' : '2px',
                    boxShadow: '0 1px 3px color-mix(in srgb, var(--fg-strong) 25%, transparent)',
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-semibold transition-colors"
          style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        >
          Save preferences
        </button>
        <button
          type="button"
          onClick={() => { setEnabled({ essential: true, preferences: false, analytics: false, marketing: false }); }}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-medium transition-colors"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-default)',
          }}
        >
          Reject all optional
        </button>
      </div>
    </PublicShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Accessibility (/accessibility)
// ─────────────────────────────────────────────────────────────────────────

const A11Y = [
  { icon: AccessIcon,  title: 'WCAG 2.2 AA',           blurb: 'We test against AA across every page in the product surface.' },
  { icon: Eye,         title: 'Reduced motion',         blurb: 'Honors prefers-reduced-motion. Toggleable per-user in /me/appearance.' },
  { icon: ShieldCheck, title: 'Screen readers',         blurb: 'Tested with VoiceOver and NVDA. ARIA landmarks on every region.' },
  { icon: Zap,         title: 'Keyboard-first',         blurb: 'Every action reachable via keyboard. ⌘K palette opens the rest.' },
];

export function AccessibilityPage() {
  return (
    <PublicShell width="narrow">
      <div className="flex flex-col gap-4 mb-10">
        <Eyebrow tone="info"><AccessIcon className="w-3 h-3" /> Accessibility</Eyebrow>
        <HeadlineGradient accent="usable by everyone">Built to be</HeadlineGradient>
        <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          Accessibility is part of the definition of done. If something blocks you, mail us at <a href="mailto:a11y@acme.dev" className="underline" style={{ color: 'var(--fg-link)' }}>a11y@acme.dev</a> — we treat it as a bug.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-10">
        {A11Y.map((a) => (
          <div
            key={a.title}
            className="rounded-xl p-5 flex flex-col gap-2"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
                color: 'var(--fg-accent)',
              }}
            >
              <a.icon className="w-4 h-4" />
            </div>
            <h3 className="text-[12px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>{a.title}</h3>
            <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{a.blurb}</p>
          </div>
        ))}
      </div>
      <SeamDivider />
      <SectionHead eyebrow="Reports" title="VPAT & conformance" align="left" />
      <div
        className="rounded-xl p-5 flex items-center gap-4"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center"
          style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-muted)' }}
        >
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>VPAT 2.5 · Q2 2026</span>
          <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>WCAG 2.2 AA · Section 508 · EN 301 549</span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-[11px] font-semibold transition-colors"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
          }}
        >
          Download PDF
        </button>
      </div>
    </PublicShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// What's new (/whats-new) — punchy short release notes
// ─────────────────────────────────────────────────────────────────────────

const WHATS_NEW = [
  {
    date: 'May 12, 2026',
    tag: 'new',
    title: 'Admission rule snapshots',
    body: 'Pin a rule\'s behavior at a specific revision. Useful for compliance sign-off and post-incident replay.',
    icon: ShieldCheck,
  },
  {
    date: 'May 9, 2026',
    tag: 'improved',
    title: 'Faster agent boot',
    body: 'Agent VM cold-start dropped from 2.4s → 0.7s median. Fewer paged wakeups under load spikes.',
    icon: Rocket,
  },
  {
    date: 'May 5, 2026',
    tag: 'new',
    title: 'Slack integration v2',
    body: 'Threaded acknowledgments and slash commands for the most-requested admission verdicts.',
    icon: Sparkles,
  },
  {
    date: 'May 1, 2026',
    tag: 'fix',
    title: 'Webhook signature drift',
    body: 'Patched a leap-second edge case that caused a sub-ppm rate of signature mismatches.',
    icon: Code2,
  },
];

const TAG_TONE: Record<string, { fg: string; bg: string }> = {
  new:      { fg: 'var(--intent-success-fg)', bg: 'var(--intent-success-bg)' },
  improved: { fg: 'var(--fg-accent)',          bg: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' },
  fix:      { fg: 'var(--intent-warn-fg)',    bg: 'var(--intent-warn-bg)' },
};

export function WhatsNewPage() {
  return (
    <PublicShell width="narrow" active="changelog">
      <div className="flex flex-col gap-4 mb-10">
        <Eyebrow tone="brand"><Megaphone className="w-3 h-3" /> What&apos;s new</Eyebrow>
        <HeadlineGradient accent="this week">Shipped</HeadlineGradient>
        <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
          A high-signal stream of recent ships. For the full ledger, see the <a href="/changelog" className="underline" style={{ color: 'var(--fg-link)' }}>changelog</a>.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {WHATS_NEW.map((w, i) => {
          const tone = TAG_TONE[w.tag];
          return (
            <article
              key={i}
              className="rounded-xl p-5 flex items-start gap-4"
              style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: tone.bg,
                  color: tone.fg,
                }}
              >
                <w.icon className="w-4 h-4" />
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[9px] uppercase tracking-[0.14em] font-bold px-1.5 h-5 inline-flex items-center rounded"
                    style={{ color: tone.fg, background: tone.bg }}
                  >
                    {w.tag}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{w.date}</span>
                </div>
                <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                  {w.title}
                </h3>
                <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{w.body}</p>
              </div>
            </article>
          );
        })}
      </div>
    </PublicShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Roadmap (/roadmap) — kanban-ish
// ─────────────────────────────────────────────────────────────────────────

const ROADMAP: Record<string, { title: string; votes: number; eta?: string; tag: string }[]> = {
  'Now': [
    { title: 'Agent VM cold-start < 500ms', votes: 142, tag: 'perf' },
    { title: 'Org-wide cost budgets',        votes: 98,  tag: 'billing' },
    { title: 'Per-team SLO dashboards',      votes: 64,  tag: 'analytics' },
  ],
  'Next': [
    { title: 'Customer-managed keys (BYOK)', votes: 188, eta: 'Q3', tag: 'enterprise' },
    { title: 'GraphQL endpoint stabilization', votes: 116, eta: 'Q3', tag: 'api' },
    { title: 'Linear bidirectional sync v2', votes: 72,  eta: 'Q3', tag: 'integrations' },
  ],
  'Later': [
    { title: 'BigQuery audit export',        votes: 54,  eta: 'Q4', tag: 'enterprise' },
    { title: 'Self-hosted agents',           votes: 42,  eta: 'Q4', tag: 'enterprise' },
    { title: 'Native VS Code extension',     votes: 28,  eta: 'Q4', tag: 'devtools' },
  ],
};

const COLUMN_TONE: Record<string, string> = {
  Now:   'var(--intent-success-fg)',
  Next:  'var(--fg-accent)',
  Later: 'var(--fg-link)',
};

export function RoadmapPage() {
  return (
    <PublicShell width="bleed">
      <div className="max-w-[1080px] mx-auto px-8 pt-12 pb-24">
        <div className="flex flex-col items-center text-center gap-4 mb-10">
          <Eyebrow tone="brand"><Map className="w-3 h-3" /> Roadmap</Eyebrow>
          <HeadlineGradient accent="next">What we&apos;re building</HeadlineGradient>
          <p className="text-[14.5px] leading-relaxed max-w-[600px]" style={{ color: 'var(--fg-muted)' }}>
            Honest, scoped to what&apos;s likely. Vote on what you want — votes inform priority, not promises.
          </p>
          <a
            href="/feedback"
            className="mt-2 inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-semibold transition-colors"
            style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
          >
            Vote & request features
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {Object.entries(ROADMAP).map(([col, items]) => {
            const tone = COLUMN_TONE[col];
            return (
              <div
                key={col}
                className="rounded-xl flex flex-col"
                style={{
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div
                  className="flex items-center justify-between px-4 h-10"
                  style={{ borderBottom: '1px solid var(--border-muted)' }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="w-2 h-2 rounded-full"
                      style={{ background: tone }}
                    />
                    <span className="text-[12px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                      {col}
                    </span>
                  </div>
                  <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-3">
                  {items.map((it, i) => (
                    <RoadmapItemCard key={i} tone={tone}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[12px] font-semibold leading-snug" style={{ color: 'var(--fg-strong)' }}>
                          {it.title}
                        </span>
                        {it.eta && (
                          <span
                            className="text-[9px] uppercase tracking-[0.14em] font-bold shrink-0"
                            style={{ color: tone }}
                          >
                            {it.eta}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span
                          className="text-[10px] uppercase tracking-[0.14em] font-semibold"
                          style={{ color: 'var(--fg-subtle)' }}
                        >
                          {it.tag}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums"
                          style={{ color: 'var(--fg-muted)' }}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {it.votes}
                        </span>
                      </div>
                    </RoadmapItemCard>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PublicShell>
  );
}

function RoadmapItemCard({
  tone, children,
}: { tone: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(
    ref,
    { borderColor: `color-mix(in srgb, ${tone} 60%, var(--border-default))` },
    { borderColor: 'var(--border-default)' },
  );
  return (
    <div
      ref={ref}
      className="rounded-lg p-3 flex flex-col gap-2 transition-colors"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      {children}
    </div>
  );
}
