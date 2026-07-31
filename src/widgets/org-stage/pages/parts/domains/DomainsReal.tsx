import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from '@tanstack/react-router';
import { AtSign, Plus, Copy, Check, ShieldCheck, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { OrgShell } from '../../../parts/OrgShell';
import { Button, Field } from '@shared/ui/forms';
import { EmptyState, InlineError, SkeletonText, ConfirmDialog, SettingsModal, Switch } from '@shared/ui';
import { useCopyToClipboard } from '@shared/lib';
import {
  useOrg,
  listDomains, addDomain, verifyDomain, removeDomain, setDomainAutoJoin, domainTxtRecord,
  type OrgDomainRecord,
} from '@entities/org';

// Real-mode org Domains over accounts /v1/orgs/:orgId/domains. Domain ownership
// (add / DNS-TXT verify / remove) + auto-join toggle. The mock's member counts, primary
// flag, and ssoRequired toggle are dropped — no backend enforcement (a toggle that does
// nothing is worse than none). autoJoin is backed end-to-end: PATCH .../:id/auto-join,
// verified-only (backend 422s otherwise → toggle only shown on verified domains), seat-
// checked at signup. Actual signup-time auto-join is platform-gated (DOMAIN_AUTO_JOIN_ENABLED)
// but the per-domain toggle is a real config knob that persists and takes effect once the
// platform enables it. TXT value comes from the backend token.
const EMPTY: OrgDomainRecord[] = [];

export function DomainsReal() {
  const { t } = useTranslation('org');
  const { org = '' } = useParams({ strict: false });
  const { detail, error: orgError, refetch: refetchOrg } = useOrg(org);
  const orgId = detail?.org.id ?? '';

  const [domains, setDomains] = useState<OrgDomainRecord[]>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<OrgDomainRecord | null>(null);
  // ★per-id busy 집합 — 카드별 in-flight를 독립 추적. 단일 busyId면 A의 액션 완료가 B의
  //   busy를 mid-flight로 클리어해 B가 이중 요청/토글 뒤집힘을 일으킬 수 있었다(헬어딧 FE-1).
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set());
  const isBusy = (id: string) => busyIds.has(id);
  const startBusy = (id: string) => { setBusyIds((s) => new Set(s).add(id)); };
  const endBusy = (id: string) => { setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; }); };

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    void listDomains(orgId).then((res) => {
      if (!active) return;
      if (res.ok) { setDomains(res.data); setError(null); }
      else setError(res.error);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orgId, nonce]);

  const refetch = () => { setNonce((n) => n + 1); };

  async function doVerify(d: OrgDomainRecord) {
    startBusy(d.id);
    const res = await verifyDomain(orgId, d.id);
    endBusy(d.id);
    if (!res.ok) { setError(res.error); return; }
    setError(null);
    refetch();
  }
  async function doRemove(d: OrgDomainRecord) {
    startBusy(d.id);
    const res = await removeDomain(orgId, d.id);
    endBusy(d.id);
    setConfirmRemove(null);
    if (!res.ok) { setError(res.error); return; }
    setError(null);
    refetch();
  }
  async function doSetAutoJoin(d: OrgDomainRecord, next: boolean) {
    startBusy(d.id);
    const res = await setDomainAutoJoin(orgId, d.id, next);
    endBusy(d.id);
    if (!res.ok) { setError(res.error); return; }
    setError(null);
    // 서버가 돌려준 레코드로 로컬 갱신(전체 리페치 없이 즉시 반영).
    setDomains((prev) => prev.map((x) => (x.id === res.data.id ? res.data : x)));
  }

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title={t('domains.title')}
      subtitle={t('domains.subtitle')}
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setAddOpen(true); }}>
          {t('domains.add')}
        </Button>
      }
    >
      {orgError ? (
        <InlineError message={orgError} onRetry={refetchOrg} />
      ) : error ? (
        <div className="mb-3"><InlineError message={error} onRetry={() => { setError(null); refetch(); }} /></div>
      ) : null}

      {loading ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}><SkeletonText lines={4} /></div>
      ) : domains.length === 0 ? (
        <EmptyState title={t('domains.real.emptyTitle')} subtitle={t('domains.real.emptySubtitle')} />
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {domains.map((d) => (
            <DomainCard
              key={d.id}
              domain={d}
              busy={isBusy(d.id)}
              onVerify={() => { void doVerify(d); }}
              onRemove={() => { setConfirmRemove(d); }}
              onToggleAutoJoin={(next) => { void doSetAutoJoin(d, next); }}
            />
          ))}
        </div>
      )}

      {addOpen && (
        <AddDomainModal
          orgId={orgId}
          onClose={() => { setAddOpen(false); }}
          onAdded={() => { setAddOpen(false); refetch(); }}
        />
      )}
      {confirmRemove && (
        <ConfirmDialog
          open
          busy={isBusy(confirmRemove.id)}
          onCancel={() => { setConfirmRemove(null); }}
          onConfirm={() => { void doRemove(confirmRemove); }}
          title={t('domains.real.removeTitle', { domain: confirmRemove.domain })}
          confirmLabel={t('domains.real.remove')}
          description={t('domains.real.removeBody')}
        />
      )}
    </OrgShell>
  );
}

function DomainCard({
  domain, busy, onVerify, onRemove, onToggleAutoJoin,
}: {
  domain: OrgDomainRecord;
  busy: boolean;
  onVerify: () => void;
  onRemove: () => void;
  onToggleAutoJoin: (next: boolean) => void;
}) {
  const { t } = useTranslation('org');
  const { copied, copy } = useCopyToClipboard(1200);
  const txt = domainTxtRecord(domain.verificationToken);

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-start justify-between gap-4">
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
          <code className="text-[15px] font-mono font-semibold" style={{ color: 'var(--fg-strong)' }}>{domain.domain}</code>
        </div>
        <div className="flex items-center gap-2">
          {domain.verified ? (
            <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-xs font-semibold" style={{ color: 'var(--intent-success-fg)', background: 'var(--intent-success-bg)' }}>
              <ShieldCheck className="w-3 h-3" />{t('domains.verified')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-xs font-semibold" style={{ color: 'var(--intent-warn-fg)', background: 'var(--intent-warn-bg)' }}>
              <AlertTriangle className="w-3 h-3" />{t('domains.unverified')}
            </span>
          )}
          <button type="button" onClick={onRemove} aria-label={t('domains.real.remove')} className="w-8 h-8 inline-flex items-center justify-center rounded-md" style={{ color: 'var(--fg-muted)' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {domain.verified && (
        <div className="mt-4 rounded-lg p-4 flex items-center justify-between gap-4" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--fg-strong)' }}>{t('domains.autoJoin')}</p>
            <p className="text-xs leading-snug mt-0.5" style={{ color: 'var(--fg-subtle)' }}>{t('domains.autoJoinSub')}</p>
          </div>
          <Switch
            checked={domain.autoJoin}
            disabled={busy}
            onChange={onToggleAutoJoin}
            ariaLabel={t('domains.autoJoin')}
          />
        </div>
      )}

      {!domain.verified && (
        <div className="mt-4 rounded-lg p-4" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}>
          <p className="text-sm leading-snug mb-3" style={{ color: 'var(--fg-default)' }}>{t('domains.verify.body')}</p>
          <div className="grid grid-cols-[70px_1fr_auto] gap-2 items-center mb-3">
            <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>{t('domains.verify.type')}</span>
            <code className="font-mono text-sm px-2.5 py-1.5 rounded" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}>TXT</code>
            <span />
            <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>{t('domains.verify.value')}</span>
            <code className="font-mono text-sm px-2.5 py-1.5 rounded truncate" style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}>{txt}</code>
            <button type="button" onClick={() => { copy(txt); }} aria-label={copied ? t('common.copied') : t('common.copy')} className="inline-flex items-center justify-center w-8 h-8 rounded-md" style={{ color: 'var(--fg-muted)', background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}>
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <Button variant="secondary" size="md" disabled={busy} leading={<RefreshCw className="w-3.5 h-3.5" />} onClick={onVerify}>
            {busy ? t('domains.real.checking') : t('domains.verify.check')}
          </Button>
        </div>
      )}
    </div>
  );
}

function AddDomainModal({ orgId, onClose, onAdded }: { orgId: string; onClose: () => void; onAdded: () => void }) {
  const { t } = useTranslation('org');
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!domain.trim()) return;
    setBusy(true);
    setError(null);
    const res = await addDomain(orgId, domain.trim().toLowerCase());
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onAdded();
  }

  return (
    <SettingsModal
      open
      onClose={onClose}
      size="sm"
      icon={<AtSign className="w-4 h-4" style={{ color: 'var(--fg-default)' }} />}
      title={t('domains.real.addTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="md" disabled={!domain.trim() || busy} onClick={() => { void submit(); }}>
            {busy ? t('domains.real.adding') : t('domains.add')}
          </Button>
        </>
      }
    >
      {error && <InlineError message={error} onRetry={() => { setError(null); }} />}
      <Field label={t('domains.real.domainLabel')} value={domain} onChange={(e) => { setDomain(e.target.value.slice(0, 253)); }} placeholder="acme.com" autoFocus />
    </SettingsModal>
  );
}
