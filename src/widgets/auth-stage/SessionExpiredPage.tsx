import { useState } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import {
  Clock, Code2, GitPullRequest, Wrench, Brain, Bot, ShieldCheck,
  ArrowRight, FileText, MessageSquare, GitBranch, AlertCircle,
} from 'lucide-react';
import { AuthShell } from './parts/AuthShell';

type LastRoute = '/intelligence' | '/coding' | '/agents' | '/reviews' | '/admission' | '/fixes';

const ROUTE_META: Record<LastRoute, {
  label: string;
  resumeCta: string;
  icon: React.ComponentType<{ className?: string }>;
  draftLabel: string;
}> = {
  '/intelligence': { label: 'Intelligence', resumeCta: 'Open dot field',     icon: Brain,           draftLabel: 'Filters & queries' },
  '/coding':       { label: 'Coding',       resumeCta: 'Resume editing',     icon: Code2,           draftLabel: 'Unsaved drafts' },
  '/agents':       { label: 'Agents',       resumeCta: 'Resume agent runs',  icon: Bot,             draftLabel: 'Active runs' },
  '/reviews':      { label: 'Reviews',      resumeCta: 'Continue reviewing', icon: GitPullRequest,  draftLabel: 'Pending comments' },
  '/admission':    { label: 'Admission',    resumeCta: 'Back to admission',  icon: ShieldCheck,     draftLabel: 'Rule edits' },
  '/fixes':        { label: 'Fixes',        resumeCta: 'Resume fix pipeline',icon: Wrench,          draftLabel: 'Active fixes' },
};

type Reason = 'idle' | 'token-expired' | 'manual' | 'admin-revoked' | 'inactive-mfa';
const REASON_LABEL: Record<Reason, { title: string; subtitle: string; tone: 'neutral' | 'warn' | 'danger' }> = {
  'idle':           { title: 'Idle timeout',          subtitle: 'You were inactive for over 8 hours.',                         tone: 'neutral' },
  'token-expired':  { title: 'Session token expired', subtitle: 'Your secure session expired naturally.',                      tone: 'neutral' },
  'manual':         { title: 'Signed out',            subtitle: 'You signed out from another device.',                         tone: 'neutral' },
  'admin-revoked':  { title: 'Revoked by admin',      subtitle: 'An administrator ended this session — usually due to a security review.', tone: 'warn' },
  'inactive-mfa':   { title: 'Re-verification needed',subtitle: 'Your trusted device window expired. We need 2FA again.',     tone: 'warn' },
};

export default function SessionExpiredPage() {
  const search = useSearch({ strict: false }) as unknown as { from?: string; reason?: Reason };
  const lastRoute = (search.from && search.from in ROUTE_META ? search.from : '/coding') as LastRoute;
  const reason: Reason = search.reason ?? 'idle';

  const meta = ROUTE_META[lastRoute];
  const reasonMeta = REASON_LABEL[reason];

  // Demo: drafts list depends on which route we came from. Each is "non-destructive
  // restoration" — these are stored locally, not sent until you resume.
  const drafts = MOCK_DRAFTS[lastRoute] ?? [];

  return (
    <AuthShell
      title="Your session has ended"
      subtitle="For your security, we sign you out after a period of inactivity. Sign in again to continue where you left off."
      topRight={<DemoStatePicker />}
      footer={<><span>Not you?</span><button type="button" className="bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>Report this session</button></>}
    >
      <div className="flex flex-col gap-4">
        <ReasonBanner reason={reason} meta={reasonMeta} />

        {drafts.length > 0 && <DraftsCard route={lastRoute} drafts={drafts} />}

        <ResumeButton route={lastRoute} icon={meta.icon} resumeCta={meta.resumeCta} />

        <div
          className="grid grid-cols-2 gap-x-6 gap-y-2 px-3 py-3 rounded-md text-[11px]"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
          }}
        >
          <Meta label="Account"     value="sora@acme.com" />
          <Meta label="Workspace"   value="acme-monorepo" />
          <Meta label="Last route"  value={lastRoute} mono />
          <Meta label="Last active" value="2h 14m ago" />
          <Meta label="IP"          value="203.0.113.42" mono />
          <Meta label="Browser"     value="Chrome 125 · macOS" />
        </div>

        <SecurityActions />

        <Link
          to={'/auth/login' as never}
          className="text-center text-[11px] underline-offset-2 hover:underline"
          style={{ color: 'var(--fg-muted)' }}
        >
          Sign in as a different user
        </Link>
      </div>
    </AuthShell>
  );
}

function ReasonBanner({ reason, meta }: {
  reason: Reason;
  meta: typeof REASON_LABEL[Reason];
}) {
  const Icon = reason === 'admin-revoked' ? AlertCircle : reason === 'inactive-mfa' ? ShieldCheck : Clock;
  const bg =
    meta.tone === 'warn' ? 'var(--intent-warn-bg)'
    : meta.tone === 'danger' ? 'var(--intent-danger-bg)'
    : 'var(--bg-surface-muted)';
  const border =
    meta.tone === 'warn' ? 'var(--intent-warn-fg)'
    : meta.tone === 'danger' ? 'var(--intent-danger-fg)'
    : 'var(--border-default)';
  const fg =
    meta.tone === 'warn' ? 'var(--intent-warn-fg)'
    : meta.tone === 'danger' ? 'var(--intent-danger-fg)'
    : 'var(--fg-muted)';
  return (
    <div
      className="flex items-start gap-3 px-3 py-3 rounded-md"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: fg }} />
      <div className="flex flex-col gap-0.5 text-[11px] leading-snug">
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {meta.title}
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>{meta.subtitle}</span>
      </div>
    </div>
  );
}

function DraftsCard({
  route, drafts,
}: { route: LastRoute; drafts: typeof MOCK_DRAFTS[LastRoute] }) {
  const [showing, setShowing] = useState(false);
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-default)' }}
    >
      <button
        type="button"
        onClick={() => { setShowing((v) => !v); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors"
        style={{ background: 'var(--bg-surface-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-muted)'; }}
      >
        <span
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
            border: '1px solid var(--fg-accent)',
          }}
        >
          <FileText className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
        </span>
        <div className="flex flex-col flex-1 min-w-0 text-left">
          <span className="text-[11px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
            {drafts.length} draft{drafts.length === 1 ? '' : 's'} preserved
          </span>
          <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
            {ROUTE_META[route].draftLabel} · stored locally on this device
          </span>
        </div>
        <span
          className="text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{ color: 'var(--fg-accent)' }}
        >
          {showing ? 'Hide' : 'Show'}
        </span>
      </button>

      {showing && (
        <ul className="flex flex-col onb-stagger" style={{ background: 'var(--bg-canvas)' }}>
          {drafts.map((d, i) => (
            <li
              key={i}
              className="flex items-start gap-3 px-3 py-2.5 text-[11px] [&:not(:first-child)]:border-t"
              style={{ borderColor: 'var(--border-muted)' }}
            >
              <DraftIcon kind={d.kind} />
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="font-mono tabular-nums truncate" style={{ color: 'var(--fg-strong)' }}>
                  {d.title}
                </span>
                <span className="truncate" style={{ color: 'var(--fg-muted)' }}>
                  {d.preview}
                </span>
                <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                  saved {d.savedMin}m ago · {d.bytes} bytes
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DraftIcon({ kind }: { kind: 'file' | 'comment' | 'branch' }) {
  const Icon =
    kind === 'comment' ? MessageSquare
    : kind === 'branch' ? GitBranch
    : FileText;
  return (
    <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
  );
}

function ResumeButton({
  route, icon: Icon, resumeCta,
}: {
  route: LastRoute;
  icon: React.ComponentType<{ className?: string }>;
  resumeCta: string;
}) {
  return (
    <Link
      to={'/auth/login' as never}
      search={{ next: route } as never}
      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-[12px] font-semibold transition-opacity hover:opacity-90"
      style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
    >
      <Icon className="w-3.5 h-3.5" />
      Sign in &amp; {resumeCta.toLowerCase()}
      <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  );
}

function SecurityActions() {
  const items = [
    { label: 'Review active sessions', href: '#' },
    { label: 'Reset password',          href: '#' },
    { label: 'Manage 2FA methods',      href: '#' },
  ];
  return (
    <div
      className="flex items-center gap-3 text-[11px]"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <ShieldCheck className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
      <span>Security:</span>
      {items.map((it, i) => (
        <span key={it.label}>
          <a href={it.href} style={{ color: 'var(--fg-link)' }}>{it.label}</a>
          {i < items.length - 1 && <span className="ml-3" style={{ color: 'var(--border-default)' }}>·</span>}
        </span>
      ))}
    </div>
  );
}

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt
        className="text-[9px] uppercase tracking-[0.14em] font-medium"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {label}
      </dt>
      <dd className={mono ? 'font-mono tabular-nums' : ''} style={{ color: 'var(--fg-default)' }}>
        {value}
      </dd>
    </div>
  );
}

function DemoStatePicker() {
  // Demo helper: link to variants of this page so reviewers can see how the
  // banner / drafts / cta change with the route the user came from.
  const routes: LastRoute[] = ['/coding', '/reviews', '/agents'];
  return (
    <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
      Demo from:{' '}
      {routes.map((r, i) => (
        <span key={r}>
          <a
            href={`/auth/session-expired?from=${encodeURIComponent(r)}`}
            className="font-mono"
            style={{ color: 'var(--fg-link)' }}
          >
            {r}
          </a>
          {i < routes.length - 1 && <span style={{ color: 'var(--border-default)' }}>·</span>}
        </span>
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Mock drafts per route. Tied to ROUTE_META so the labels match the icons.

type Draft = { kind: 'file' | 'comment' | 'branch'; title: string; preview: string; savedMin: number; bytes: number };

const MOCK_DRAFTS: Record<LastRoute, Draft[]> = {
  '/intelligence': [],
  '/coding': [
    { kind: 'file',    title: 'src/billing/InvoicesList.tsx',           preview: '+ 24 / − 7 in 3 hunks',                                       savedMin: 2,  bytes: 1840 },
    { kind: 'file',    title: 'src/widgets/auth-stage/SignInPage.tsx',  preview: '+ 8 / − 2 unsaved changes',                                  savedMin: 12, bytes: 980  },
    { kind: 'comment', title: 'TODO: split breach-check into hook',     preview: 'Need to memoize the breach-check fetch…',                    savedMin: 22, bytes: 220  },
  ],
  '/agents': [
    { kind: 'branch',  title: 'agent/sora-fix-flake-test',              preview: 'In-progress run · step 4/6',                                 savedMin: 1, bytes: 0 },
  ],
  '/reviews': [
    { kind: 'comment', title: 'PR #4821 · review comment',              preview: 'Could we defer this serialize until after gating?',          savedMin: 6, bytes: 184 },
    { kind: 'comment', title: 'PR #4818 · review comment',              preview: 'nit: rename to handleAuthError for symmetry with…',          savedMin: 18, bytes: 156 },
  ],
  '/admission': [
    { kind: 'file', title: 'admission/rules/sso-only-prod.yml',         preview: 'Pending: enforce flag flip',                                 savedMin: 30, bytes: 720 },
  ],
  '/fixes': [
    { kind: 'branch', title: 'fix/INV-2025-0012-double-charge',         preview: 'Verification pending · 2 obligations open',                  savedMin: 8, bytes: 0 },
  ],
};
