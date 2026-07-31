import { useState } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Clock, Code2, GitPullRequest, Wrench, Brain, Bot, ShieldCheck,
  ArrowRight, FileText, MessageSquare, GitBranch, AlertCircle,
} from 'lucide-react';
import { AuthShell } from './parts/AuthShell';

type LastRoute = '/intelligence' | '/coding' | '/agents' | '/reviews' | '/admission' | '/fixes';

// Route → icon + i18n key stems (labels resolved at render via t()).
const ROUTE_META: Record<LastRoute, {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  '/intelligence': { key: 'intelligence', icon: Brain },
  '/coding':       { key: 'coding',       icon: Code2 },
  '/agents':       { key: 'agents',       icon: Bot },
  '/reviews':      { key: 'reviews',      icon: GitPullRequest },
  '/admission':    { key: 'admission',    icon: ShieldCheck },
  '/fixes':        { key: 'fixes',        icon: Wrench },
};

type Reason = 'idle' | 'token-expired' | 'manual' | 'admin-revoked' | 'inactive-mfa';
const REASON_TONE: Record<Reason, { key: string; tone: 'neutral' | 'warn' | 'danger' }> = {
  'idle':           { key: 'idle',          tone: 'neutral' },
  'token-expired':  { key: 'tokenExpired',  tone: 'neutral' },
  'manual':         { key: 'manual',        tone: 'neutral' },
  'admin-revoked':  { key: 'adminRevoked',  tone: 'warn' },
  'inactive-mfa':   { key: 'inactiveMfa',   tone: 'warn' },
};

export default function SessionExpiredPage() {
  const { t } = useTranslation('auth');
  // Search params aren't registered on this route's schema, so the loose-mode
  // result is untyped ({}); narrow it in `select` to raw string fields, then
  // validate each against its known set before use.
  const search = useSearch({
    strict: false,
    select: (s) => s as { from?: string; reason?: string },
  });
  // `from in ROUTE_META` proves `from` is a LastRoute key in this branch.
  const lastRoute: LastRoute =
    search.from && search.from in ROUTE_META ? (search.from as LastRoute) : '/coding';
  const reason: Reason =
    search.reason && search.reason in REASON_TONE ? (search.reason as Reason) : 'idle';

  const meta = ROUTE_META[lastRoute];
  const reasonMeta = REASON_TONE[reason];

  // Demo: drafts list depends on which route we came from. Each is "non-destructive
  // restoration" — these are stored locally, not sent until you resume.
  const drafts = MOCK_DRAFTS[lastRoute] ?? [];

  return (
    <AuthShell
      title={t('sessionExpired.title')}
      subtitle={t('sessionExpired.subtitle')}
      topRight={<DemoStatePicker />}
      footer={<><span>{t('sessionExpired.notYou')}</span><Link to={'/support' as never} style={{ color: 'var(--fg-link)' }}>{t('sessionExpired.reportSession')}</Link></>}
    >
      <div className="flex flex-col gap-4">
        <ReasonBanner reason={reason} meta={reasonMeta} />

        {drafts.length > 0 && <DraftsCard route={lastRoute} drafts={drafts} />}

        <ResumeButton route={lastRoute} icon={meta.icon} resumeCta={t(`sessionExpired.route.${meta.key}Resume`)} />

        <div
          className="grid grid-cols-2 gap-x-6 gap-y-2 px-3 py-3 rounded-md text-sm"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
          }}
        >
          <Meta label={t('sessionExpired.meta.account')}     value="sora@acme.com" />
          <Meta label={t('sessionExpired.meta.workspace')}   value="acme-monorepo" />
          <Meta label={t('sessionExpired.meta.lastRoute')}  value={lastRoute} mono />
          <Meta label={t('sessionExpired.meta.lastActive')} value={t('sessionExpired.meta.lastActiveValue')} />
          <Meta label={t('sessionExpired.meta.ip')}          value="203.0.113.42" mono />
          <Meta label={t('sessionExpired.meta.browser')}     value={t('sessionExpired.meta.browserValue')} />
        </div>

        <SecurityActions />

        <Link
          to={'/auth/login' as never}
          className="text-center text-sm underline-offset-2 hover:underline"
          style={{ color: 'var(--fg-muted)' }}
        >
          {t('sessionExpired.signInDifferentUser')}
        </Link>
      </div>
    </AuthShell>
  );
}

function ReasonBanner({ reason, meta }: {
  reason: Reason;
  meta: typeof REASON_TONE[Reason];
}) {
  const { t } = useTranslation('auth');
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
      <div className="flex flex-col gap-0.5 text-sm leading-snug">
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {t(`sessionExpired.reason.${meta.key}Title`)}
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>{t(`sessionExpired.reason.${meta.key}Subtitle`)}</span>
      </div>
    </div>
  );
}

function DraftsCard({
  route, drafts,
}: { route: LastRoute; drafts: typeof MOCK_DRAFTS[LastRoute] }) {
  const { t } = useTranslation('auth');
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
          <span className="text-sm font-semibold" style={{ color: 'var(--fg-strong)' }}>
            {t('sessionExpired.draftsPreserved', { count: drafts.length })}
          </span>
          <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
            {t('sessionExpired.storedLocally', { label: t(`sessionExpired.route.${ROUTE_META[route].key}Draft`) })}
          </span>
        </div>
        <span
          className="text-xs uppercase tracking-eyebrow font-semibold"
          style={{ color: 'var(--fg-accent)' }}
        >
          {showing ? t('sessionExpired.hide') : t('sessionExpired.show')}
        </span>
      </button>

      {showing && (
        <ul className="flex flex-col onb-stagger" style={{ background: 'var(--bg-canvas)' }}>
          {drafts.map((d, i) => (
            <li
              key={i}
              className="flex items-start gap-3 px-3 py-2.5 text-sm [&:not(:first-child)]:border-t"
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
                <span className="text-xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                  {t('sessionExpired.savedAgo', { min: d.savedMin, bytes: d.bytes })}
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
  const { t } = useTranslation('auth');
  return (
    <Link
      to={'/auth/login' as never}
      search={{ redirect: route } as never}
      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-base font-semibold transition-opacity hover:opacity-90"
      style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
    >
      <Icon className="w-3.5 h-3.5" />
      {t('sessionExpired.signInAndResume', { action: resumeCta.toLowerCase() })}
      <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  );
}

function SecurityActions() {
  const { t } = useTranslation('auth');
  const items = [
    { label: t('sessionExpired.reviewSessions'), href: '#' },
    { label: t('sessionExpired.resetPassword'),  href: '#' },
    { label: t('sessionExpired.manage2fa'),      href: '#' },
  ];
  return (
    <div
      className="flex items-center gap-3 text-sm"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <ShieldCheck className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
      <span>{t('sessionExpired.security')}</span>
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
        className="text-2xs uppercase tracking-eyebrow font-medium"
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
  const { t } = useTranslation('auth');
  const routes: LastRoute[] = ['/coding', '/reviews', '/agents'];
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--fg-subtle)' }}>
      {t('sessionExpired.demoFrom')}{' '}
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
