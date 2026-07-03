import { useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { AtSign, Plus, Copy, Check, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';

type Domain = {
  domain: string;
  verified: boolean;
  primary?: boolean;
  members: number;
  ssoRequired: boolean;
  autoJoin: boolean;
};

const DOMAINS: Domain[] = [
  { domain: 'acme.com',    verified: true,  primary: true, members: 184, ssoRequired: true,  autoJoin: true  },
  { domain: 'acme.dev',    verified: true,                 members: 18,  ssoRequired: true,  autoJoin: false },
  { domain: 'staging.acme.com', verified: false,           members: 0,   ssoRequired: false, autoJoin: false },
];

export default function DomainsPage() {
  // Route is always /org/$org/* so `org` is present; default keeps the type `string`.
  const { org = '' } = useParams({ strict: false });
  return (
    <OrgShell
      orgName={org}
      orgSlug={org}
      title="Domains"
      subtitle="Claim email domains for auto-join, SSO enforcement, and identity-verified invites."
      topRight={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-base font-semibold transition-colors"
          style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add domain
        </button>
      }
    >
      <div className="flex flex-col gap-3 mb-10">
        {DOMAINS.map((d) => (
          <DomainCard key={d.domain} domain={d} />
        ))}
      </div>

      {/* Verification helper */}
      <UnverifiedHelper />
    </OrgShell>
  );
}

function DomainCard({ domain }: { domain: Domain }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: domain.verified
                ? 'color-mix(in srgb, var(--intent-success-fg) 14%, transparent)'
                : 'color-mix(in srgb, var(--intent-warn-fg) 14%, transparent)',
              color: domain.verified ? 'var(--intent-success-fg)' : 'var(--intent-warn-fg)',
            }}
          >
            <AtSign className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <code className="text-[15px] font-mono font-semibold" style={{ color: 'var(--fg-strong)' }}>
                {domain.domain}
              </code>
              {domain.primary && (
                <span
                  className="text-2xs uppercase tracking-eyebrow font-bold px-1.5 h-4.5 inline-flex items-center rounded"
                  style={{ color: 'var(--fg-accent)', background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' }}
                >
                  Primary
                </span>
              )}
            </div>
            <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
              {domain.members} {domain.members === 1 ? 'member' : 'members'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {domain.verified ? (
            <span
              className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-xs font-semibold"
              style={{ color: 'var(--intent-success-fg)', background: 'var(--intent-success-bg)' }}
            >
              <ShieldCheck className="w-3 h-3" />
              Verified
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-xs font-semibold"
              style={{ color: 'var(--intent-warn-fg)', background: 'var(--intent-warn-bg)' }}
            >
              <AlertTriangle className="w-3 h-3" />
              Unverified
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Toggle
          label="SSO required"
          sub="Force SAML/OIDC for accounts on this domain"
          on={domain.ssoRequired}
          disabled={!domain.verified}
        />
        <Toggle
          label="Auto-join"
          sub="New verified users on this domain join automatically"
          on={domain.autoJoin}
          disabled={!domain.verified}
        />
      </div>
    </div>
  );
}

function Toggle({ label, sub, on, disabled }: { label: string; sub: string; on: boolean; disabled?: boolean }) {
  const [v, setV] = useState(on);
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>{label}</span>
        <span className="text-xs leading-snug" style={{ color: 'var(--fg-subtle)' }}>{sub}</span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setV((x) => !x); }}
        aria-pressed={v}
        className="relative w-9 h-5 rounded-full shrink-0 ml-3 transition-colors"
        style={{
          background: v ? 'var(--fg-accent)' : 'var(--bg-active)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span
          aria-hidden
          className="absolute top-0.5 w-4 h-4 rounded-full transition-[left]"
          style={{
            background: 'var(--bg-canvas)',
            left: v ? 'calc(100% - 18px)' : '2px',
            boxShadow: '0 1px 2px color-mix(in srgb, var(--fg-strong) 25%, transparent)',
          }}
        />
      </button>
    </div>
  );
}

function UnverifiedHelper() {
  const [copied, setCopied] = useState(false);
  const txt = 'acme-domain-verify=ab12cd34ef56gh78';
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'color-mix(in srgb, var(--intent-warn-fg) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--intent-warn-fg) 35%, transparent)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-warn-fg)' }} />
        <h2 className="text-base font-semibold tracking-tight" style={{ color: 'var(--intent-warn-fg)' }}>
          Verify staging.acme.com
        </h2>
      </div>
      <p className="text-base leading-snug mb-3" style={{ color: 'var(--fg-default)' }}>
        Add the TXT record below to your DNS, then click verify. Propagation usually takes under 5 minutes.
      </p>
      <div className="grid grid-cols-[80px_1fr_auto] gap-2 mb-3 items-center">
        <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>Type</span>
        <code className="font-mono text-base px-3 py-2 rounded" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}>TXT</code>
        <span />
        <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>Host</span>
        <code className="font-mono text-base px-3 py-2 rounded" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}>@</code>
        <span />
        <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>Value</span>
        <code className="font-mono text-base px-3 py-2 rounded truncate" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}>{txt}</code>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              void navigator.clipboard.writeText(txt);
              setCopied(true);
              window.setTimeout(() => { setCopied(false); }, 1200);
            }
          }}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors"
          style={{ color: 'var(--fg-muted)', background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-semibold transition-colors"
        style={{ background: 'var(--intent-warn-fg)', color: '#fff' }}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Check DNS now
      </button>
    </div>
  );
}
