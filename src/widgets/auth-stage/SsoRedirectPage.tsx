import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ShieldCheck, ShieldX, ArrowRight, Search, Lock, Loader2, Building2,
  Copy, ExternalLink,
} from 'lucide-react';
import { AuthShell } from './parts/AuthShell';
import { Field, Button } from './parts/AuthForm';
import { OAuthRedirectOverlay } from './parts/OAuthRedirectOverlay';
import { lookupIdP, PROVIDER_LABEL, type IdPRecord } from './lib/idpDirectory';

type Phase = 'enter' | 'searching' | 'found' | 'not-found';

export default function SsoRedirectPage() {
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
        title="Single sign-on"
        subtitle="We'll route you to your organization's identity provider."
        topRight={<span><Link to={'/auth/login' as never} style={{ color: 'var(--fg-link)' }}>Use email instead</Link></span>}
        footer={
          <>
            <span>Don&apos;t have SSO configured?</span>
            <button type="button" className="bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>Talk to your admin</button>
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
            label="Organization domain or work email"
            type="text"
            value={domain}
            onChange={(e) => { setDomain(e.target.value); }}
            placeholder="acme.com  or  alice@acme.com"
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
            {idp ? `Continue to ${PROVIDER_LABEL[idp.provider]}` : 'Continue with SSO'}
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
          We&apos;ll discover your identity provider once you start typing your domain.
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
            Looking up <span className="font-mono">{domain}</span>…
          </span>
          <span style={{ color: 'var(--fg-subtle)' }}>
            Querying SAML / OIDC discovery endpoints.
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
              Protocol: {idp.protocol}
              {idp.enforced && ' · Password sign-in disabled for this domain'}
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
              aria-label="Copy metadata URL"
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
            <span className="font-mono">{domain}</span> isn&apos;t configured for SSO yet
          </span>
          <span style={{ color: 'var(--fg-muted)' }}>
            Either it&apos;s a different domain, or your admin hasn&apos;t set up an identity provider.
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
          Use email & password
        </Link>
        <button
          type="button"
          className="inline-flex items-center gap-1 underline-offset-2 bg-transparent border-0 p-0 cursor-pointer"
          style={{ color: 'var(--fg-link)', font: 'inherit' }}
        >
          Set up SSO for your org
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

function DemoDomainHints() {
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
        Demo · try these domains
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
