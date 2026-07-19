import { useEffect, useRef, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { KeyRound, Trash2, ShieldCheck, ShieldAlert, RefreshCw, Copy, Check } from 'lucide-react';
import { OrgShell } from '../../../parts/OrgShell';
import { Button, Field } from '@shared/ui/forms';
import { Badge, InlineError, SkeletonText, ConfirmDialog } from '@shared/ui';
import {
  useOrg, getSsoConnection, registerSso, updateSso, verifySso, deleteSso,
  type SsoConnection,
} from '@entities/org';

// Real org SSO (OIDC) connection over accounts /v1/sso/:orgId. Honest to the
// backend: register/update/delete the OIDC connection (domain, issuer, authorize
// endpoint, client id/secret) — the actual IdP redirect flow is a follow-up.
// clientSecret is write-only (never returned). House rules: no edge stripes, no
// grey selected-fills, intent tokens, named font-size classes.
export function SsoReal() {
  const { org = '' } = useParams({ strict: false });
  const { detail, error: orgError, refetch: refetchOrg } = useOrg(org);
  const orgId = detail?.org.id ?? '';

  const [conn, setConn] = useState<SsoConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // form fields (clientSecret is write-only — empty means "keep existing" on update)
  const [domain, setDomain] = useState('');
  const [issuer, setIssuer] = useState('');
  const [authEndpoint, setAuthEndpoint] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    void getSsoConnection(orgId).then((res) => {
      if (!active) return;
      if (!res.ok) { setError(res.error); return; }
      setConn(res.data); setError(null);
      if (res.data) {
        setDomain(res.data.domain); setIssuer(res.data.issuer);
        setAuthEndpoint(res.data.authorizationEndpoint); setClientId(res.data.clientId);
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orgId, nonce]);

  const refetch = () => { setNonce((n) => n + 1); };
  const configured = conn !== null;
  const valid = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain.trim())
    && /^https:\/\/.+/.test(issuer.trim()) && /^https:\/\/.+/.test(authEndpoint.trim())
    && clientId.trim().length > 0 && (configured || clientSecret.trim().length > 0);

  async function save() {
    if (busy || !valid) return;
    setBusy(true); setError(null);
    const input = {
      domain: domain.trim(), issuer: issuer.trim(),
      authorizationEndpoint: authEndpoint.trim(), clientId: clientId.trim(),
    };
    const res = configured
      ? await updateSso(orgId, { ...input, ...(clientSecret.trim() ? { clientSecret: clientSecret.trim() } : {}) })
      : await registerSso(orgId, { ...input, clientSecret: clientSecret.trim() });
    if (!mountedRef.current) return;
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setClientSecret(''); refetch();
  }
  async function doVerify() {
    if (verifying || !orgId) return;
    setVerifying(true); setVerifyMsg(null); setError(null);
    const res = await verifySso(orgId);
    if (!mountedRef.current) return;
    setVerifying(false);
    if (!res.ok) { setError(res.error); return; }
    if (res.data.verified) { setConn(res.data.record); setVerifyMsg(null); }
    else { setVerifyMsg("TXT record not found yet — DNS can take a few minutes to propagate."); }
  }
  function copyToken() {
    if (!conn) return;
    void navigator.clipboard.writeText(`p0-domain-verification=${conn.verificationToken}`).then(() => {
      if (!mountedRef.current) return;
      setCopied(true);
      setTimeout(() => { if (mountedRef.current) setCopied(false); }, 1500);
    });
  }
  async function doDelete() {
    setBusy(true); setError(null);
    const res = await deleteSso(orgId);
    if (!mountedRef.current) return;
    setBusy(false); setConfirmDelete(false);
    if (!res.ok) { setError(res.error); return; }
    setConn(null); setDomain(''); setIssuer(''); setAuthEndpoint(''); setClientId(''); setClientSecret('');
    refetch();
  }

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title="SAML / SSO"
      subtitle="Connect your OIDC identity provider. Users whose email domain matches are routed to your IdP at login. Enterprise plan."
      topRight={
        configured && !loading && !orgError ? (
          <Button variant="ghost" size="md" leading={<Trash2 className="w-3.5 h-3.5" />} disabled={busy} onClick={() => { setConfirmDelete(true); }}>
            Remove connection
          </Button>
        ) : undefined
      }
    >
      {error && <div className="mb-3"><InlineError message={error} onRetry={() => { setError(null); refetch(); }} /></div>}

      {orgError ? (
        <InlineError message={orgError} onRetry={refetchOrg} />
      ) : loading ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}><SkeletonText lines={6} /></div>
      ) : (
        <div className="flex flex-col gap-4 max-w-[560px]">
          <div className="flex items-center gap-2.5">
            <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>Status</span>
            <Badge variant={configured && conn?.enabled ? 'success' : 'neutral'} size="sm">
              {configured ? (conn?.enabled ? 'Connected' : 'Disabled') : 'Not configured'}
            </Badge>
            {configured && conn?.hasSecret && (
              <span className="inline-flex items-center gap-1 text-2xs" style={{ color: 'var(--fg-subtle)' }}>
                <ShieldCheck className="w-3 h-3" /> secret stored
              </span>
            )}
          </div>

          {configured && conn && (
            <div className="rounded-md p-3.5 flex flex-col gap-2.5" style={{ border: '1px solid var(--border-muted)' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--fg-strong)' }}>Domain ownership</span>
                <Badge variant={conn.verified ? 'success' : 'warn'} size="sm">
                  {conn.verified ? 'Verified' : 'Not verified'}
                </Badge>
              </div>
              {conn.verified ? (
                <p className="inline-flex items-center gap-1.5 text-2xs" style={{ color: 'var(--fg-subtle)' }}>
                  <ShieldCheck className="w-3 h-3" /> Ownership of {conn.domain} is proven — matching logins route to your IdP.
                </p>
              ) : (
                <>
                  <p className="inline-flex items-start gap-1.5 text-2xs" style={{ color: 'var(--fg-muted)' }}>
                    <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>Add this TXT record at the root of <strong>{conn.domain}</strong>, then verify. Logins are <strong>not</strong> routed to your IdP until the domain is verified.</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <code title={`p0-domain-verification=${conn.verificationToken}`} className="flex-1 h-9 px-3 inline-flex items-center rounded-md font-mono text-2xs truncate" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)', color: 'var(--fg-strong)' }}>
                      p0-domain-verification={conn.verificationToken}
                    </code>
                    <Button variant="ghost" size="md" leading={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} onClick={copyToken}>
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" leading={<RefreshCw className="w-3.5 h-3.5" />} disabled={verifying} onClick={() => { void doVerify(); }}>
                      {verifying ? 'Checking DNS…' : 'Verify domain'}
                    </Button>
                    {verifyMsg && <span className="text-2xs" style={{ color: 'var(--fg-subtle)' }}>{verifyMsg}</span>}
                  </div>
                </>
              )}
            </div>
          )}

          <Field label="Email domain" value={domain} onChange={(e) => { setDomain(e.target.value); }} placeholder="acme.com" />
          <Field label="OIDC issuer" value={issuer} onChange={(e) => { setIssuer(e.target.value); }} placeholder="https://acme.okta.com" />
          <Field label="Authorization endpoint" value={authEndpoint} onChange={(e) => { setAuthEndpoint(e.target.value); }} placeholder="https://acme.okta.com/oauth2/v1/authorize" />
          <Field label="Client ID" value={clientId} onChange={(e) => { setClientId(e.target.value); }} placeholder="0oa1b2c3…" />
          <Field
            label={configured ? 'Client secret (leave blank to keep)' : 'Client secret'}
            type="password"
            value={clientSecret}
            onChange={(e) => { setClientSecret(e.target.value); }}
            placeholder={configured ? '•••••••• (stored)' : 'from your IdP'}
          />

          <div className="flex items-center gap-2 pt-1">
            <Button variant="primary" size="md" leading={<KeyRound className="w-3.5 h-3.5" />} disabled={busy || !valid || !orgId} onClick={() => { void save(); }}>
              {busy ? 'Saving…' : configured ? 'Save changes' : 'Connect SSO'}
            </Button>
            <span className="text-2xs" style={{ color: 'var(--fg-subtle)' }}>Only owners/admins can change this. Every change is audited.</span>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          open
          busy={busy}
          onCancel={() => { setConfirmDelete(false); }}
          onConfirm={() => { void doDelete(); }}
          title="Remove SSO connection?"
          confirmLabel="Remove"
          description="Users on this domain will fall back to password login. The stored client secret is deleted."
        />
      )}
    </OrgShell>
  );
}
