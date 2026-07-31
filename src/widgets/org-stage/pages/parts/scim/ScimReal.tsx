import { useEffect, useRef, useState } from 'react';
import { useAsyncResource } from '@shared/lib';
import { useTranslation } from 'react-i18next';
import { useParams } from '@tanstack/react-router';
import { KeyRound, RefreshCw, Power, Copy, Check } from 'lucide-react';
import { OrgShell } from '../../../parts/OrgShell';
import { Button } from '@shared/ui/forms';
import { Badge, InlineError, SkeletonText, RevealOnceModal, ConfirmDialog } from '@shared/ui';
import {
  useOrg, getScimConfig, enableScim, rotateScimToken, disableScim,
  type ScimConfig, type ScimTokenResponse,
} from '@entities/org';

// Real org SCIM 2.0 provisioning over accounts /v1/scim/:orgId. Honest to the
// backend: enable/disable + base URL + bearer token (shown once). The mock's
// group-mapping/sync-rules/auto-toggles aren't backed, so they're not wired.
// House rules: no edge stripes, no grey selected-fills, intent tokens, named fs.
export function ScimReal() {
  const { t } = useTranslation('org');
  const { org = '' } = useParams({ strict: false });
  const { detail, error: orgError, refetch: refetchOrg } = useOrg(org);
  const orgId = detail?.org.id ?? '';

  // Fetch is owned by the hook (read-only fetch error); the mutation handlers
  // below manage their own error. Skip the fetch until orgId resolves (data
  // stays null → skeleton) instead of surfacing an error.
  const { data: config, isPending: fetchPending, error: fetchError, refetch } =
    useAsyncResource<ScimConfig | null>(
      async () => (orgId ? getScimConfig(orgId) : { ok: true, data: null }),
      [orgId],
    );
  const loading = fetchPending || !orgId;
  const [actionError, setActionError] = useState<string | null>(null);
  const error = fetchError ?? actionError;
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<ScimTokenResponse | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  async function doEnable() {
    if (busy) return;
    setBusy(true); setActionError(null);
    const res = await enableScim(orgId);
    if (!mountedRef.current) return;
    setBusy(false);
    if (!res.ok) { setActionError(res.error); return; }
    setSaved(false); setRevealed(res.data); refetch();
  }
  async function doRotate() {
    if (busy) return;
    setBusy(true); setActionError(null);
    const res = await rotateScimToken(orgId);
    if (!mountedRef.current) return;
    setBusy(false);
    if (!res.ok) { setActionError(res.error); return; }
    setSaved(false); setRevealed(res.data);
  }
  async function doDisable() {
    setBusy(true); setActionError(null);
    const res = await disableScim(orgId);
    if (!mountedRef.current) return;
    setBusy(false); setConfirmDisable(false);
    if (!res.ok) { setActionError(res.error); return; }
    refetch();
  }
  function copyUrl() {
    if (!config?.baseUrl) return;
    void navigator.clipboard.writeText(config.baseUrl).then(() => {
      if (!mountedRef.current) return;
      setCopied(true);
      setTimeout(() => { if (mountedRef.current) setCopied(false); }, 1500);
    });
  }

  const enabled = config?.enabled ?? false;

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title={t('scim.title')}
      subtitle={t('scim.subtitleReal')}
      topRight={
        !loading && !orgError ? (
          enabled ? (
            <Button variant="ghost" size="md" leading={<Power className="w-3.5 h-3.5" />} disabled={busy} onClick={() => { setConfirmDisable(true); }}>
              {t('scim.real.disableScim')}
            </Button>
          ) : (
            <Button variant="primary" size="md" leading={<KeyRound className="w-3.5 h-3.5" />} disabled={busy || !orgId} onClick={() => { void doEnable(); }}>
              {t('scim.real.enableScim')}
            </Button>
          )
        ) : undefined
      }
    >
      {error && <div className="mb-3"><InlineError message={error} onRetry={() => { setActionError(null); refetch(); }} /></div>}

      {orgError ? (
        <InlineError message={orgError} onRetry={refetchOrg} />
      ) : loading ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}><SkeletonText lines={4} /></div>
      ) : (
        <div className="flex flex-col gap-4 max-w-[720px]">
          <div className="flex items-center gap-2.5">
            <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{t('scim.real.status')}</span>
            <Badge variant={enabled ? 'success' : 'neutral'} size="sm">{enabled ? t('scim.real.enabled') : t('scim.real.notConfigured')}</Badge>
          </div>

          {enabled ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>{t('scim.real.baseUrl')}</span>
                <div className="flex items-center gap-2">
                  <code title={config?.baseUrl ?? undefined} className="flex-1 h-9 px-3 inline-flex items-center rounded-md font-mono text-sm truncate" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)', color: 'var(--fg-strong)' }}>
                    {config?.baseUrl}
                  </code>
                  <Button variant="ghost" size="md" leading={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} onClick={copyUrl}>
                    {copied ? t('common.copied') : t('common.copy')}
                  </Button>
                </div>
              </label>

              <div className="rounded-md p-3.5 flex items-start justify-between gap-3" style={{ border: '1px solid var(--border-muted)' }}>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium" style={{ color: 'var(--fg-strong)' }}>{t('scim.real.bearerToken')}</span>
                  <span className="text-2xs" style={{ color: 'var(--fg-subtle)' }}>{t('scim.real.bearerTokenSub')}</span>
                </div>
                <Button variant="ghost" size="md" leading={<RefreshCw className="w-3.5 h-3.5" />} disabled={busy} onClick={() => { void doRotate(); }}>
                  {t('scim.real.rotateToken')}
                </Button>
              </div>

              <p className="text-2xs" style={{ color: 'var(--fg-subtle)' }}>
                {t('scim.real.idpNote')}
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              {t('scim.real.enablePrompt')}
            </p>
          )}
        </div>
      )}

      {revealed && (
        <RevealOnceModal
          title={t('scim.tokenCreated')}
          value={revealed.token}
          description={t('scim.real.tokenDescription')}
          onDismiss={() => { setRevealed(null); }}
          onSaved={() => { setSaved(true); }}
          saved={saved}
          titleMono
        />
      )}
      {confirmDisable && (
        <ConfirmDialog
          open
          busy={busy}
          onCancel={() => { setConfirmDisable(false); }}
          onConfirm={() => { void doDisable(); }}
          title={t('scim.real.disableTitle')}
          confirmLabel={t('scim.real.disableConfirm')}
          description={t('scim.real.disableDescription')}
        />
      )}
    </OrgShell>
  );
}
