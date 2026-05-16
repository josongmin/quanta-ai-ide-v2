import { ShieldAlert, Mail, Key, Trophy, ScrollText, ArrowUpRight } from 'lucide-react';
import { PublicShell , Eyebrow, HeadlineGradient, SectionHead, SeamDivider } from '@shared/ui/marketing';

const SCOPE_IN = [
  'acme.dev and *.acme.dev',
  'api.acme.dev (v1)',
  'app.acme.dev (web app)',
  'agent runner subnet (BYO-permitted hosts)',
  'Marketplace integrations published by ACME',
];

const SCOPE_OUT = [
  'Third-party Marketplace integrations (report to the vendor)',
  'Denial-of-service tests',
  'Spam, social engineering, or phishing',
  'Vulnerabilities requiring physical access',
];

const REWARDS = [
  { tier: 'Critical', payout: '$5,000 – $20,000', tone: 'var(--intent-danger-fg)', bg: 'var(--intent-danger-bg)' },
  { tier: 'High',     payout: '$1,500 – $5,000',  tone: 'var(--intent-warn-fg)',   bg: 'var(--intent-warn-bg)' },
  { tier: 'Medium',   payout: '$500 – $1,500',    tone: 'var(--intent-info-fg)',   bg: 'var(--intent-info-bg)' },
  { tier: 'Low',      payout: '$100 – $500',      tone: 'var(--intent-success-fg)',bg: 'var(--intent-success-bg)' },
];

const HALL_OF_FAME = [
  { name: 'm.kim',   year: 2026, finds: 3 },
  { name: 'r.osada', year: 2026, finds: 2 },
  { name: 'a.silva', year: 2025, finds: 4 },
  { name: 'p.chen',  year: 2025, finds: 2 },
];

export default function SecurityDisclosurePage() {
  return (
    <PublicShell width="narrow">
      <div className="flex flex-col items-center text-center gap-4 mb-12">
        <Eyebrow tone="warn">
          <ShieldAlert className="w-3 h-3" />
          Vulnerability disclosure
        </Eyebrow>
        <HeadlineGradient accent="responsibly">Found a bug? Tell us</HeadlineGradient>
        <p className="text-[13.5px] leading-relaxed max-w-[560px]" style={{ color: 'var(--fg-muted)' }}>
          We treat security researchers like teammates. Send the report, get an answer in 24 hours, and a fix on a public schedule.
        </p>
      </div>

      {/* Quick contact card */}
      <div
        className="rounded-2xl p-6 flex items-center gap-5 mb-12"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--intent-warn-fg) 16%, transparent)',
            color: 'var(--intent-warn-fg)',
          }}
        >
          <Mail className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
            Encrypted disclosure
          </span>
          <a
            href="mailto:security@acme.dev"
            className="text-[18px] font-mono font-semibold"
            style={{ color: 'var(--fg-strong)' }}
          >
            security@acme.dev
          </a>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-semibold transition-colors shrink-0"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
          }}
        >
          <Key className="w-3.5 h-3.5" />
          Download PGP key
        </button>
      </div>

      {/* Scope */}
      <SectionHead eyebrow="Scope" title="In and out of scope" align="left" />
      <div className="grid grid-cols-2 gap-3 mb-12">
        <ScopeCard title="In scope" tone="success" items={SCOPE_IN} />
        <ScopeCard title="Out of scope" tone="muted" items={SCOPE_OUT} />
      </div>

      <SeamDivider />

      {/* Rewards */}
      <SectionHead
        eyebrow="Rewards"
        title="What we pay"
        lede="Pay-out scales with severity, exploitability, and impact. We pay above CVSS suggestions."
        align="left"
      />
      <div
        className="rounded-xl overflow-hidden mb-12"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        {REWARDS.map((r, i) => (
          <div
            key={r.tier}
            className="flex items-center gap-4 px-5 h-14"
            style={{
              borderBottom: i === REWARDS.length - 1 ? 'none' : '1px solid var(--border-muted)',
            }}
          >
            <span
              className="inline-flex items-center justify-center px-2.5 h-6 rounded text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: r.tone, background: r.bg, minWidth: 80 }}
            >
              {r.tier}
            </span>
            <span className="text-[14px] font-semibold tabular-nums" style={{ color: 'var(--fg-strong)' }}>
              {r.payout}
            </span>
            <span className="ml-auto text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
              CVSS {r.tier === 'Critical' ? '9.0+' : r.tier === 'High' ? '7.0–8.9' : r.tier === 'Medium' ? '4.0–6.9' : '< 4.0'}
            </span>
          </div>
        ))}
      </div>

      {/* Process */}
      <SectionHead eyebrow="Process" title="What happens after you submit" align="left" />
      <ol className="flex flex-col gap-3 mb-12">
        {[
          { t: '24 hours',   blurb: 'Acknowledgement + triage owner.' },
          { t: '5 days',     blurb: 'Severity assigned, reproduction confirmed, timeline shared.' },
          { t: '30 days',    blurb: 'Fix shipped or mitigation in place. Critical issues prioritized.' },
          { t: '90 days',    blurb: 'Public disclosure (coordinated). Hall-of-fame credit if you opt in.' },
        ].map((s, i) => (
          <li
            key={i}
            className="flex items-start gap-4 rounded-lg p-4"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
            }}
          >
            <span
              className="text-[12px] font-bold tabular-nums shrink-0"
              style={{ color: 'var(--brand-fg)', minWidth: 70 }}
            >
              {s.t}
            </span>
            <span className="text-[12px]" style={{ color: 'var(--fg-default)' }}>{s.blurb}</span>
          </li>
        ))}
      </ol>

      <SeamDivider />

      {/* Hall of fame */}
      <SectionHead
        eyebrow="Hall of fame"
        title="Thank you, researchers"
        align="left"
      />
      <div
        className="rounded-xl p-5 mb-2 flex items-center gap-5 flex-wrap"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Trophy className="w-5 h-5" style={{ color: 'var(--intent-warn-fg)' }} />
        {HALL_OF_FAME.map((h) => (
          <span
            key={h.name}
            className="inline-flex items-center gap-2 text-[12px]"
          >
            <code className="font-mono font-semibold" style={{ color: 'var(--fg-strong)' }}>{h.name}</code>
            <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{h.year} · {h.finds} finds</span>
          </span>
        ))}
        <a
          href="#"
          className="ml-auto text-[11px] font-semibold inline-flex items-center gap-1"
          style={{ color: 'var(--fg-link)' }}
        >
          <ScrollText className="w-3 h-3" />
          Full list
          <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
    </PublicShell>
  );
}

function ScopeCard({
  title, tone, items,
}: { title: string; tone: 'success' | 'muted'; items: string[] }) {
  const color = tone === 'success' ? 'var(--intent-success-fg)' : 'var(--fg-muted)';
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <h3
        className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-3"
        style={{ color }}
      >
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--fg-default)' }}>
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
              style={{ background: color }}
            />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
