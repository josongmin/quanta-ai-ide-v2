import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useTheme } from '@shared/theme';
import {
  ArrowRight, Terminal, Code2, GitPullRequest, Bot,
} from 'lucide-react';
import type { WizardData } from './wizard';

type Props = { data: WizardData };

// Final landing for the wizard. Streams a fake indexing log into a tiny
// terminal pane while a dot-field preview animates. Once indexing reaches
// 100% we surface a next-action checklist + a single CTA into /intelligence.
export function DonePage({ data }: Props) {
  const { isDark } = useTheme();
  const pageBg = isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)';

  return (
    <div
      className="absolute inset-0 flex flex-col items-center overflow-y-auto"
      style={{ background: pageBg }}
    >
      <div className="w-full max-w-[720px] px-6 pt-12 pb-16 flex flex-col gap-7 z-10 onb-step-in">
        <Header data={data} />

        <div className="grid grid-cols-2 gap-4">
          <DotFieldPreview />
          <IndexingTerminal repo={data.workspace.repo || 'acme/acme-monorepo'} />
        </div>

        <NextActions data={data} />

        <Summary data={data} />

        <CtaRow data={data} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Header — animated check + welcome message

function Header({ data }: Props) {
  const first = firstName(data.profile.name);
  return (
    <header className="flex flex-col items-center gap-4 text-center">
      <SuccessGlyph />
      <div className="flex flex-col gap-1.5">
        <h1
          className="text-[28px] font-semibold tracking-tight leading-tight"
          style={{ color: 'var(--fg-strong)' }}
        >
          You&apos;re all set, {first}.
        </h1>
        <p className="text-[12px] leading-snug max-w-[440px]" style={{ color: 'var(--fg-muted)' }}>
          We&apos;re indexing <span className="font-mono">{data.workspace.repo || 'your repo'}</span> right now.
          You can jump in already — signals appear on the dot field as soon as the first parse pass finishes.
        </p>
      </div>
    </header>
  );
}

function SuccessGlyph() {
  return (
    <div
      className="relative w-16 h-16 rounded-full flex items-center justify-center"
      style={{
        background: 'var(--intent-success-bg)',
        border: '1px solid var(--intent-success-vivid)',
      }}
    >
      <span className="absolute inset-0 rounded-full onb-pulse-ring" aria-hidden />
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12 l5 5 l9 -10"
          stroke="var(--intent-success-fg)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="24"
          style={{ animation: 'onb-checkmark 600ms cubic-bezier(0.2,0.7,0.2,1) 200ms both' }}
        />
      </svg>
    </div>
  );
}

function firstName(full: string) {
  const t = full.trim().split(/\s+/)[0];
  return t || 'there';
}

// ─────────────────────────────────────────────────────────────────────────
// Dot-field preview — tiny canvas-free animated SVG. Dots drift in toward
// a center. Slow bloom suggests "real-time signal arrival".

function DotFieldPreview() {
  const dots = useMemo(() => Array.from({ length: 36 }, (_, i) => {
    // Spread points around the canvas in a stable but varied pattern.
    const a = (i * 137.508) * (Math.PI / 180);
    let s = (i * 9301 + 49297) % 233280;
    s = (s * 9301 + 49297) % 233280;
    const r = 24 + (i % 6) * 12 + (s / 233280) * 6;
    const cx = 50 + Math.cos(a) * (r / 100) * 40;
    const cy = 50 + Math.sin(a) * (r / 100) * 40;
    const delay = (i * 47) % 1800;
    const size = 1.3 + ((i * 13) % 7) * 0.25;
    const palette = [
      'var(--fg-accent)',
      'var(--intent-success-vivid)',
      'var(--fg-link)',
      'var(--fg-strong)',
    ];
    return { i, cx, cy, delay, size, color: palette[i % palette.length] };
  }), []);

  return (
    <div
      className="relative aspect-square rounded-md overflow-hidden"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Grid drift */}
      <div className="absolute inset-0 admv2-grid-drift opacity-30" aria-hidden />

      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        {/* Soft halo at center */}
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="var(--fg-accent)" stopOpacity="0.25" />
            <stop offset="60%" stopColor="var(--fg-accent)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="var(--fg-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#halo)" />

        {/* Connecting strokes — randomised spider shapes */}
        {Array.from({ length: 14 }).map((_, k) => {
          const a = dots[(k * 3) % dots.length];
          const b = dots[(k * 3 + 1) % dots.length];
          return (
            <line
              key={k}
              x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
              stroke="var(--border-default)"
              strokeWidth="0.25"
              strokeDasharray="0.6 0.8"
              opacity={0.6}
            >
              <animate attributeName="stroke-dashoffset" from="0" to="6" dur={`${4 + (k % 3)}s`} repeatCount="indefinite" />
            </line>
          );
        })}

        {/* Dots */}
        {dots.map((d) => (
          <circle
            key={d.i}
            cx={d.cx} cy={d.cy} r={d.size}
            fill={d.color}
          >
            <animate
              attributeName="opacity"
              values="0;1;0.6;1"
              dur="2.6s"
              begin={`${d.delay}ms`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values={`${d.size};${d.size * 1.6};${d.size}`}
              dur="2.6s"
              begin={`${d.delay}ms`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>

      <div
        className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono tabular-nums"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>dot field · live preview</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-1 h-1 rounded-full" style={{ background: 'var(--intent-success-vivid)' }} />
          streaming
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Indexing terminal — fake but believable streaming log

const LOG_LINES = [
  { msg: '$ se-field index --repo {repo} --branch {branch}',                                    kind: 'cmd' },
  { msg: '→ resolving auth via OAuth installation 47218',                                       kind: 'info' },
  { msg: '✓ cloned in 2.3s · 482 MB · 12,478 commits',                                          kind: 'ok' },
  { msg: '→ language detection: TypeScript (62%), JavaScript (28%), Markdown (10%)',           kind: 'info' },
  { msg: '→ parsing 8,412 source files (parallelism: 12)',                                     kind: 'info' },
  { msg: '   parsed 1,200 / 8,412 · 14% · 412 ms',                                              kind: 'progress' },
  { msg: '   parsed 4,800 / 8,412 · 57% · 1.6 s',                                               kind: 'progress' },
  { msg: '   parsed 8,412 / 8,412 · 100% · 2.9 s',                                              kind: 'progress' },
  { msg: '✓ 312,884 symbols · 18,442 modules · 4,218 cross-package edges',                     kind: 'ok' },
  { msg: '→ building call graph + def-use chains',                                              kind: 'info' },
  { msg: '   ↳ resolving 38,217 unresolved imports across packages',                            kind: 'info' },
  { msg: '   ↳ folding type-equivalent declarations · 12,308 → 8,182',                          kind: 'info' },
  { msg: '✓ graph built · 8,182 nodes · 41,108 edges · 1.4 s',                                  kind: 'ok' },
  { msg: '→ priming dot field projection (Healey 4-hue palette)',                               kind: 'info' },
  { msg: '✓ first signals visible · ready for inspection',                                      kind: 'done' },
  { msg: '─ ongoing: blast-radius pass, hotspot ranking · runs in background ─',                 kind: 'note' },
];

function IndexingTerminal({ repo }: { repo: string }) {
  const [lineIndex, setLineIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lineIndex >= LOG_LINES.length) return;
    const next = LOG_LINES[lineIndex];
    const delay = next.kind === 'progress' ? 280 : next.kind === 'cmd' ? 100 : 360 + Math.random() * 240;
    const id = setTimeout(() => { setLineIndex((i) => i + 1); }, delay);
    return () => { clearTimeout(id); };
  }, [lineIndex]);

  // Auto-scroll to bottom when new lines arrive.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lineIndex]);

  return (
    <div
      className="flex flex-col rounded-md overflow-hidden aspect-square"
      style={{
        background: '#0a0d12',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 shrink-0"
        style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: '#ff5f57' }} />
        <span className="w-2 h-2 rounded-full" style={{ background: '#febc2e' }} />
        <span className="w-2 h-2 rounded-full" style={{ background: '#28c840' }} />
        <Terminal className="w-3 h-3 ml-2" style={{ color: 'rgba(255,255,255,0.6)' }} />
        <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
          se-field · indexing
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2.5 font-mono text-[10px] leading-tight scrollbar-hide"
      >
        {LOG_LINES.slice(0, lineIndex).map((l, i) => (
          <LogLine
            key={i}
            line={l.msg.replace('{repo}', repo).replace('{branch}', 'main')}
            kind={l.kind as LogKind}
          />
        ))}
        {lineIndex < LOG_LINES.length && (
          <span
            className="inline-block w-1.5 h-3 align-text-bottom"
            style={{
              background: '#9CDCFE',
              animation: 'totpShake 0s, blink 1s steps(1, end) infinite',
            }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

type LogKind = 'cmd' | 'info' | 'progress' | 'ok' | 'done' | 'note';

function LogLine({ line, kind }: { line: string; kind: LogKind }) {
  const color =
    kind === 'cmd'      ? '#9CDCFE'
    : kind === 'ok'     ? '#5fa86c'
    : kind === 'done'   ? '#5fa86c'
    : kind === 'progress' ? 'rgba(255,255,255,0.55)'
    : kind === 'note'   ? 'rgba(255,255,255,0.45)'
    : 'rgba(255,255,255,0.78)';
  return (
    <div className="onb-stagger" style={{ color }}>
      {line}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Next actions — concrete things to try in the dot field

function NextActions({ data }: Props) {
  const items = [
    {
      icon: Code2,
      title: 'Edit with AI in Coding',
      hint: 'Open any file and ask for a refactor with the AI agent.',
      to: '/coding',
    },
    {
      icon: GitPullRequest,
      title: 'Review a PR',
      hint: data.invite.entries.length > 0
        ? `${data.invite.entries.length} teammate${data.invite.entries.length === 1 ? '' : 's'} invited — they'll show up in /reviews.`
        : 'Connect a PR provider to start reviewing.',
      to: '/reviews',
    },
    {
      icon: Bot,
      title: 'Run a fix pipeline',
      hint: 'Pick a fix candidate from the dot field, run it through gating.',
      to: '/fixes',
    },
  ];
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
        What to try first
      </span>
      <ul className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <li key={it.to}>
            <Link
              to={it.to as never}
              className="group flex items-start gap-3 px-3 py-2.5 rounded-md transition-colors"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-muted)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-muted)'; }}
            >
              <span
                className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
                  border: '1px solid var(--fg-accent)',
                }}
              >
                <it.icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  {it.title}
                </span>
                <span className="text-[10px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
                  {it.hint}
                </span>
              </div>
              <ArrowRight
                className="w-3 h-3 ml-auto shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--fg-link)' }}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Summary tile

function Summary({ data }: Props) {
  return (
    <dl
      className="grid grid-cols-3 gap-x-6 gap-y-3 px-4 py-3 rounded-md text-[11px]"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <Row label="Profile"      value={data.profile.name || 'Unnamed'} />
      <Row label="Handle"       value={`@${data.profile.handle || 'me'}`} mono />
      <Row label="Time zone"    value={data.profile.timezone} mono />
      <Row label="Organization" value={data.org.name || 'New org'} />
      <Row label="Workspace"    value={data.workspace.repo || '—'} mono />
      <Row label="Branch"       value={data.workspace.branch || 'main'} mono />
      <Row label="Invitees"     value={String(data.invite.entries.length)} />
      <Row label="Plan"         value={`${cap(data.plan.id)} · ${data.plan.cycle}`} />
      <Row label="Seats"        value={String(data.plan.seats)} />
    </dl>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="text-[9px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </dt>
      <dd className={`truncate ${mono ? 'font-mono tabular-nums' : ''}`} style={{ color: 'var(--fg-default)' }}>
        {value}
      </dd>
    </div>
  );
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ─────────────────────────────────────────────────────────────────────────
// CTA row — single dominant button + secondary action

function CtaRow({ data }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
        {data.invite.entries.length > 0 && data.invite.sent
          ? 'Teammates were notified by email.'
          : 'You can invite teammates any time from Organization → Members.'}
      </span>
      <Link
        to={'/intelligence'}
        className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-md text-[12px] font-semibold transition-opacity hover:opacity-90"
        style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
      >
        Open the dot field
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
