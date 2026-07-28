import { useEffect, useRef, useState } from 'react';
import { useAsyncResource } from '@shared/lib';
import { useTranslation } from 'react-i18next';
import { useParams } from '@tanstack/react-router';
import { KeyRound, Trash2, ShieldCheck, ShieldAlert, RefreshCw, Copy, Check } from 'lucide-react';
import { OrgShell } from '../../../parts/OrgShell';
import { Button, Field } from '@shared/ui/forms';
import { Badge, InlineError, SkeletonText, ConfirmDialog } from '@shared/ui';
import {
  useOrg, getSsoConnection, registerSso, updateSso, verifySso, deleteSso,
  type SsoConnection,
} from '@entities/org';

// A promise that never settles — used to hold the resource in its pending
// (skeleton) state while the org id is still resolving, matching the old
// effect's `if (!orgId) return;` early-out.
const NEVER: Promise<never> = new Promise<never>(() => undefined);

// Real org SSO (OIDC) connection over accounts /v1/sso/:orgId. Honest to the
// backend: register/update/delete the OIDC connection (domain, issuer, authorize
// endpoint, client id/secret) — the actual IdP redirect flow is a follow-up.
// clientSecret is write-only (never returned). House rules: no edge stripes, no
// grey selected-fills, intent tokens, named font-size classes.
export function SsoReal() {
  const { t } = useTranslation('org');
  const { org = '' } = useParams({ strict: false });
  const { detail, error: orgError, refetch: refetchOrg } = useOrg(org);
  const orgId = detail?.org.id ?? '';

  // Fetch is owned by the hook; `conn` is a local copy seeded from the fetch and
  // then mutated in place by verify/delete. Fetch error comes from the hook;
  // mutation errors (save/verify/delete) are local — show either.
  const { data: fetchedConn, isPending: loading, error: fetchError, refetch } =
    useAsyncResource<SsoConnection | null>(
      // Skip the fetch until the org resolves (old effect early-returned on !orgId,
      // leaving the skeleton up); a never-resolving promise keeps isPending true.
      () => (orgId ? getSsoConnection(orgId) : NEVER),
      [orgId],
      orgId,
    );
  const [conn, setConn] = useState<SsoConnection | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const error = fetchError ?? actionError;
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
  const [tokenEndpoint, setTokenEndpoint] = useState('');
  const [jwksEndpoint, setJwksEndpoint] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  // Seed the local `conn` copy + the editable form fields from each fetch/refetch
  // result. `conn` is then owned locally (verify/delete mutate it in place); the
  // form fields prime the inputs from the stored connection.
  useEffect(() => {
    if (fetchedConn === null && loading) return; // still loading — don't clobber
    /* eslint-disable react-hooks/set-state-in-effect -- syncing editable form state from the fetched resource */
    setConn(fetchedConn);
    if (fetchedConn) {
      setDomain(fetchedConn.domain); setIssuer(fetchedConn.issuer);
      setAuthEndpoint(fetchedConn.authorizationEndpoint); setClientId(fetchedConn.clientId);
      setTokenEndpoint(fetchedConn.tokenEndpoint); setJwksEndpoint(fetchedConn.jwksEndpoint);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fetchedConn, loading]);

  const configured = conn !== null;
  const httpsOk = (v: string) => /^https:\/\/.+/.test(v.trim());
  const valid = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain.trim())
    && httpsOk(issuer) && httpsOk(authEndpoint) && httpsOk(tokenEndpoint) && httpsOk(jwksEndpoint)
    && clientId.trim().length > 0 && (configured || clientSecret.trim().length > 0);

  async function save() {
    if (busy || !valid) return;
    setBusy(true); setActionError(null);
    const input = {
      domain: domain.trim(), issuer: issuer.trim(),
      authorizationEndpoint: authEndpoint.trim(),
      tokenEndpoint: tokenEndpoint.trim(), jwksEndpoint: jwksEndpoint.trim(),
      clientId: clientId.trim(),
    };
    const res = configured
      ? await updateSso(orgId, { ...input, ...(clientSecret.trim() ? { clientSecret: clientSecret.trim() } : {}) })
      : await registerSso(orgId, { ...input, clientSecret: clientSecret.trim() });
    if (!mountedRef.current) return;
    setBusy(false);
    if (!res.ok) { setActionError(res.error); return; }
    setClientSecret(''); refetch();
  }
  async function doVerify() {
    if (verifying || !orgId) return;
    setVerifying(true); setVerifyMsg(null); setActionError(null);
    const res = await verifySso(orgId);
    if (!mountedRef.current) return;
    setVerifying(false);
    if (!res.ok) { setActionError(res.error); return; }
    if (res.data.verified) { setConn(res.data.record); setVerifyMsg(null); }
    else { setVerifyMsg(t('sso.dnsNotFound')); }
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
    setBusy(true); setActionError(null);
    const res = await deleteSso(orgId);
    if (!mountedRef.current) return;
    setBusy(false); setConfirmDelete(false);
    if (!res.ok) { setActionError(res.error); return; }
    setConn(null); setDomain(''); setIssuer(''); setAuthEndpoint(''); setTokenEndpoint(''); setJwksEndpoint(''); setClientId(''); setClientSecret('');
    refetch();
  }

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title={t('sso.title')}
      subtitle={t('sso.subtitle')}
      topRight={
        configured && !loading && !orgError ? (
          <Button variant="ghost" size="md" leading={<Trash2 className="w-3.5 h-3.5" />} disabled={busy} onClick={() => { setConfirmDelete(true); }}>
            {t('sso.removeConnection')}
          </Button>
        ) : undefined
      }
    >
      {error && <div className="mb-3"><InlineError message={error} onRetry={() => { setActionError(null); refetch(); }} /></div>}

      {orgError ? (
        <InlineError message={orgError} onRetry={refetchOrg} />
      ) : loading ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}><SkeletonText lines={6} /></div>
      ) : (
        <div className="flex flex-col gap-4 max-w-[560px]">
          <div className="flex items-center gap-2.5">
            <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{t('sso.status')}</span>
            <Badge variant={configured && conn?.enabled ? 'success' : 'neutral'} size="sm">
              {configured ? (conn?.enabled ? t('sso.connected') : t('sso.disabled')) : t('sso.notConfigured')}
            </Badge>
            {configured && conn?.hasSecret && (
              <span className="inline-flex items-center gap-1 text-2xs" style={{ color: 'var(--fg-subtle)' }}>
                <ShieldCheck className="w-3 h-3" /> {t('sso.secretStored')}
              </span>
            )}
          </div>

          {configured && conn && (
            <div className="rounded-md p-3.5 flex flex-col gap-2.5" style={{ border: '1px solid var(--border-muted)' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--fg-strong)' }}>{t('sso.domainOwnership')}</span>
                <Badge variant={conn.verified ? 'success' : 'warn'} size="sm">
                  {conn.verified ? t('sso.verified') : t('sso.notVerified')}
                </Badge>
              </div>
              {conn.verified ? (
                <p className="inline-flex items-center gap-1.5 text-2xs" style={{ color: 'var(--fg-subtle)' }}>
                  <ShieldCheck className="w-3 h-3" /> {t('sso.verifiedProven', { domain: conn.domain })}
                </p>
              ) : (
                <>
                  <p className="inline-flex items-start gap-1.5 text-2xs" style={{ color: 'var(--fg-muted)' }}>
                    <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>{t('sso.verifyPrompt1')}<strong>{conn.domain}</strong>{t('sso.verifyPrompt2')}<strong>{t('sso.verifyPromptNot')}</strong>{t('sso.verifyPrompt3')}</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <code title={`p0-domain-verification=${conn.verificationToken}`} className="flex-1 h-9 px-3 inline-flex items-center rounded-md font-mono text-2xs truncate" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)', color: 'var(--fg-strong)' }}>
                      p0-domain-verification={conn.verificationToken}
                    </code>
                    <Button variant="ghost" size="md" leading={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} onClick={copyToken}>
                      {copied ? t('common.copied') : t('common.copy')}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" leading={<RefreshCw className="w-3.5 h-3.5" />} disabled={verifying} onClick={() => { void doVerify(); }}>
                      {verifying ? t('sso.checkingDns') : t('sso.verifyDomain')}
                    </Button>
                    {verifyMsg && <span className="text-2xs" style={{ color: 'var(--fg-subtle)' }}>{verifyMsg}</span>}
                  </div>
                </>
              )}
            </div>
          )}

          <Field label={t('sso.field.emailDomain')} value={domain} onChange={(e) => { setDomain(e.target.value); }} placeholder="acme.com" />
          <Field label={t('sso.field.issuer')} value={issuer} onChange={(e) => { setIssuer(e.target.value); }} placeholder="https://acme.okta.com" />
          <Field label={t('sso.field.authEndpoint')} value={authEndpoint} onChange={(e) => { setAuthEndpoint(e.target.value); }} placeholder="https://acme.okta.com/oauth2/v1/authorize" />
          <Field label={t('sso.field.tokenEndpoint')} value={tokenEndpoint} onChange={(e) => { setTokenEndpoint(e.target.value); }} placeholder="https://acme.okta.com/oauth2/v1/token" />
          <Field label={t('sso.field.jwksEndpoint')} value={jwksEndpoint} onChange={(e) => { setJwksEndpoint(e.target.value); }} placeholder="https://acme.okta.com/oauth2/v1/keys" />
          <Field label={t('sso.field.clientId')} value={clientId} onChange={(e) => { setClientId(e.target.value); }} placeholder="0oa1b2c3…" />
          <Field
            label={configured ? t('sso.field.clientSecretKeep') : t('sso.field.clientSecret')}
            type="password"
            value={clientSecret}
            onChange={(e) => { setClientSecret(e.target.value); }}
            placeholder={configured ? t('sso.field.clientSecretPlaceholderStored') : t('sso.field.clientSecretPlaceholder')}
          />

          <div className="flex items-center gap-2 pt-1">
            <Button variant="primary" size="md" leading={<KeyRound className="w-3.5 h-3.5" />} disabled={busy || !valid || !orgId} onClick={() => { void save(); }}>
              {busy ? t('sso.saving') : configured ? t('sso.saveChanges') : t('sso.connectSso')}
            </Button>
            <span className="text-2xs" style={{ color: 'var(--fg-subtle)' }}>{t('sso.auditNote')}</span>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          open
          busy={busy}
          onCancel={() => { setConfirmDelete(false); }}
          onConfirm={() => { void doDelete(); }}
          title={t('sso.deleteDialog.title')}
          confirmLabel={t('sso.deleteDialog.confirm')}
          description={t('sso.deleteDialog.description')}
        />
      )}
    </OrgShell>
  );
}
