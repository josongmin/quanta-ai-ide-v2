import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Trans, useTranslation } from 'react-i18next';
import {
  ShieldCheck, ShieldX, ArrowRight, Search, Lock, Loader2, Building2,
  Copy, ExternalLink,
} from 'lucide-react';
import { AuthShell } from './parts/AuthShell';
import { AuthField as Field, AuthButton as Button } from '@shared/ui/forms';
import { OAuthRedirectOverlay } from './parts/OAuthRedirectOverlay';
import { lookupIdP, PROVIDER_LABEL, type IdPRecord } from './lib/idpDirectory';

type Phase = 'enter' | 'searching' | 'found' | 'not-found';

export default function SsoRedirectPage() {
  const { t } = useTranslation('auth');
  const [domain, setDomain] = useState('');
  const [phase, setPhase] = useState<Phase>('enter');
  const [idp, setIdp] = useState<IdPRecord | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const cleaned = useMemo(() => clean(domain), [domain]);

  // Live discovery: 350ms debounce after typing stops, then a "search" phase
  // for ~600ms to make the lookup visible.
  /* eslint-disable react-hooks/set-state-in-effect -- false-positive: async tick */
  useEffect(() => {
    if (cleaned.length < 3) { setPhase('enter'); setIdp(null); return; }
    setPhase('searching');
    const debounce = setTimeout(() => {
      const found = lookupIdP(cleaned);
      const settle = setTimeout(() => {
        if (found) { setIdp(found); setPhase('found'); }
        else { setIdp(null); setPhase('not-found'); }
      }, 600);
      return () => { clearTimeout(settle); };
    }, 350);
    return () => { clearTimeout(debounce); };
  }, [cleaned]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <>
      <AuthShell
        title={t('sso.title')}
        subtitle={t('sso.subtitle')}
        topRight={<span><Link to={'/auth/login' as never} style={{ color: 'var(--fg-link)' }}>{t('sso.useEmailInstead')}</Link></span>}
        footer={
          <>
            <span>{t('sso.noSsoConfigured')}</span>
            <Link to={'/support' as never} style={{ color: 'var(--fg-link)' }}>{t('sso.talkToAdmin')}</Link>
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (idp) setRedirecting(true);
          }}
        >
          <Field
            label={t('sso.domainLabel')}
            type="text"
            value={domain}
            onChange={(e) => { setDomain(e.target.value); }}
            placeholder={t('sso.domainPlaceholder')}
            autoFocus
            trailing={
              phase === 'searching' && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--fg-muted)' }} />
              )
            }
          />

          <PhasePanel phase={phase} idp={idp} domain={cleaned} />

          <Button
            type="submit"
            disabled={!idp}
            leading={<ArrowRight className="w-3.5 h-3.5" />}
          >
            {idp ? t('sso.continueTo', { provider: PROVIDER_LABEL[idp.provider] }) : t('sso.continueWithSso')}
          </Button>
        </form>

        <DemoDomainHints />
      </AuthShell>

      {redirecting && idp && (
        <OAuthRedirectOverlay
          provider="sso"
          onCancel={() => { setRedirecting(false); }}
          onComplete={() => { setRedirecting(false); }}
        />
      )}
    </>
  );
}

function clean(input: string) {
  const t = input.trim().toLowerCase();
  if (t.includes('@')) return t.split('@')[1] ?? '';
  return t.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function PhasePanel({ phase, idp, domain }: { phase: Phase; idp: IdPRecord | null; domain: string }) {
  const { t } = useTranslation('auth');
  if (phase === 'enter') {
    return (
      <div
        className="flex items-start gap-3 px-3 py-3 rounded-md"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px dashed var(--border-default)',
        }}
      >
        <Search className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
        <span className="text-sm leading-snug" style={{ color: 'var(--fg-muted)' }}>
          {t('sso.enterHint')}
        </span>
      </div>
    );
  }

  if (phase === 'searching') {
    return (
      <div
        className="flex items-start gap-3 px-3 py-3 rounded-md onb-stagger"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" style={{ color: 'var(--fg-muted)' }} />
        <div className="flex flex-col gap-0.5 text-sm leading-snug">
          <span style={{ color: 'var(--fg-strong)' }}>
            <Trans
              i18nKey="sso.lookingUp"
              t={t}
              values={{ domain }}
              components={[<span key="0" className="font-mono" />]}
            />
          </span>
          <span style={{ color: 'var(--fg-subtle)' }}>
            {t('sso.queryingEndpoints')}
          </span>
        </div>
      </div>
    );
  }

  if (phase === 'found' && idp) {
    // Capture once so the truthy narrowing flows into the onClick closure below.
    const metadataUrl = idp.metadataUrl;
    return (
      <div
        className="flex flex-col gap-3 px-3 py-3 rounded-md onb-stagger"
        style={{
          background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
          border: '1px solid var(--fg-accent)',
        }}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-accent)' }} />
          <div className="flex flex-col gap-0.5 text-sm leading-snug flex-1">
            <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
              {idp.org} · {PROVIDER_LABEL[idp.provider]}
            </span>
            <span style={{ color: 'var(--fg-muted)' }}>
              {t('sso.protocol', { protocol: idp.protocol })}
              {idp.enforced && t('sso.passwordDisabled')}
            </span>
          </div>
        </div>

        {metadataUrl && (
          <div
            className="flex items-center gap-2 px-2 py-1 rounded text-xs font-mono tabular-nums"
            style={{ background: 'var(--bg-canvas)', color: 'var(--fg-muted)' }}
          >
            <Lock className="w-2.5 h-2.5" style={{ color: 'var(--fg-subtle)' }} />
            <span className="flex-1 truncate">{metadataUrl}</span>
            <button
              type="button"
              onClick={() => { void navigator.clipboard?.writeText(metadataUrl); }}
              className="p-0.5 rounded transition-colors"
              style={{ color: 'var(--fg-subtle)' }}
              aria-label={t('sso.copyMetadataUrl')}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Copy className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // not-found
  return (
    <div
      className="flex flex-col gap-3 px-3 py-3 rounded-md onb-stagger"
      style={{
        background: 'var(--intent-warn-bg)',
        border: '1px solid var(--intent-warn-fg)',
      }}
    >
      <div className="flex items-start gap-3">
        <ShieldX className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
        <div className="flex flex-col gap-0.5 text-sm leading-snug">
          <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
            <Trans
              i18nKey="sso.notConfigured"
              t={t}
              values={{ domain }}
              components={[<span key="0" className="font-mono" />]}
            />
          </span>
          <span style={{ color: 'var(--fg-muted)' }}>
            {t('sso.notConfiguredBody')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Link
          to={'/auth/login' as never}
          className="inline-flex items-center gap-1 px-2 py-1 rounded transition-colors"
          style={{
            background: 'var(--bg-canvas)',
            color: 'var(--fg-default)',
            border: '1px solid var(--border-default)',
          }}
        >
          {t('sso.useEmailPassword')}
        </Link>
        <button
          type="button"
          className="inline-flex items-center gap-1 underline-offset-2 bg-transparent border-0 p-0 cursor-pointer"
          style={{ color: 'var(--fg-link)', font: 'inherit' }}
        >
          {t('sso.setUpSso')}
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

function DemoDomainHints() {
  const { t } = useTranslation('auth');
  const examples = [
    { domain: 'acme.com',         note: 'Okta · enforced' },
    { domain: 'globex.io',        note: 'Azure AD · enforced' },
    { domain: 'initech.com',      note: 'Google Workspace · optional' },
    { domain: 'pied-piper.com',   note: 'Auth0 · optional' },
    { domain: 'unknown-corp.com', note: 'Not configured' },
  ];
  return (
    <div
      className="text-xs flex flex-col gap-1.5 px-3 py-2 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px dashed var(--border-default)',
      }}
    >
      <span className="font-semibold uppercase tracking-eyebrow" style={{ color: 'var(--fg-subtle)' }}>
        {t('sso.demoTitle')}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {examples.map((e) => (
          <span
            key={e.domain}
            className="font-mono inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--bg-canvas)',
              color: 'var(--fg-muted)',
              border: '1px solid var(--border-muted)',
            }}
          >
            <Building2 className="w-2 h-2" />
            {e.domain}
            <span style={{ color: 'var(--fg-subtle)' }}>· {e.note}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
