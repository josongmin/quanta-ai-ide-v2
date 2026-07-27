import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2, AlertTriangle, Circle, Upload, Copy, Check, RefreshCcw,
  ShieldCheck, KeyRound,
} from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Section, Row, Field, Toggle, Button, SaveBar } from '@shared/ui/forms';
import { shallowEqual, useCopyToClipboard } from '@shared/lib';

type Status = 'connected' | 'not-configured' | 'error';

type AttrKey = 'email' | 'firstName' | 'lastName' | 'groups';

type Form = {
  status: Status;
  lastTested: string;
  entityId: string;
  ssoUrl: string;
  cert: string;
  mapping: Record<AttrKey, string>;
  requireSso: boolean;
  jit: boolean;
  defaultRole: 'member' | 'viewer' | 'admin';
};

const INITIAL: Form = {
  status: 'connected',
  lastTested: '2026-05-11 09:42 UTC',
  entityId: 'https://idp.acme.okta.com/exk5x2acme',
  ssoUrl: 'https://idp.acme.okta.com/app/acme_se/exk5x2acme/sso/saml',
  cert:
    '-----BEGIN CERTIFICATE-----\nMIIDpDCCAoygAwIBAgIGAYjCv7hRMA0GCSqGSIb3DQEBCwUAMIGSMQswCQYDVQQG\nEwJVUzELMAkGA1UECAwCQ0ExFjAUBgNVBAcMDVNhbiBGcmFuY2lzY28xDTALBgNV\nBAoMBE9rdGExFDASBgNVBAsMC1NTT1Byb3ZpZGVyMRUwEwYDVQQDDAxhY21lLW9r\ndGEtaWRwMRwwGgYJKoZIhvcNAQkBFg1pbmZvQG9rdGEuY29tMB4XDTI2MDEwOTE2\n…(truncated)…\n-----END CERTIFICATE-----',
  mapping: {
    email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
    lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
    groups: 'groups',
  },
  requireSso: false,
  jit: true,
  defaultRole: 'member',
};

const SP = {
  acsUrl: 'https://app.se-field.com/auth/saml/acme/acs',
  spEntityId: 'https://app.se-field.com/auth/saml/acme/metadata',
  nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
};

export default function SamlSsoPage() {
  const { t } = useTranslation('org');
  const [form, setForm] = useState<Form>(INITIAL);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');

  const dirty = !shallowEqual(form, INITIAL);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };
  const setMap = (k: AttrKey, v: string) => {
    setForm((f) => ({ ...f, mapping: { ...f.mapping, [k]: v } }));
  };

  const save = () => {
    setSaving('saving');
    setTimeout(() => {
      setSaving('saved');
      setTimeout(() => { setSaving('idle'); }, 1200);
    }, 600);
  };

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title={t('samlSso.title')}
      subtitle={t('samlSso.subtitle')}
    >
      <StatusBand
        status={form.status}
        lastTested={form.lastTested}
        onTest={() => { set('lastTested', new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'); }}
      />

      <Section
        title={t('samlSso.idp.title')}
        hint={t('samlSso.idp.hint')}
        right={
          <Button leading={<Upload className="w-3 h-3" />}>{t('samlSso.idp.upload')}</Button>
        }
      >
        <div className="flex flex-col gap-3">
          <Field
            label={t('samlSso.idp.entityId')}
            value={form.entityId}
            onChange={(e) => { set('entityId', e.target.value); }}
          />
          <Field
            label={t('samlSso.idp.ssoUrl')}
            value={form.ssoUrl}
            onChange={(e) => { set('ssoUrl', e.target.value); }}
          />
          <label className="flex flex-col gap-1.5">
            <span
              className="text-xs uppercase tracking-eyebrow font-medium"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {t('samlSso.idp.cert')}
            </span>
            <textarea
              value={form.cert}
              onChange={(e) => { set('cert', e.target.value); }}
              rows={6}
              spellCheck={false}
              className="w-full rounded-md p-2.5 text-sm outline-none resize-none font-mono"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
                whiteSpace: 'pre',
              }}
            />
          </label>
        </div>
      </Section>

      <Section
        title={t('samlSso.sp.title')}
        hint={t('samlSso.sp.hint')}
      >
        <CopyRow label={t('samlSso.sp.acsUrl')} value={SP.acsUrl} />
        <CopyRow label={t('samlSso.sp.spEntityId')} value={SP.spEntityId} />
        <CopyRow label={t('samlSso.sp.nameIdFormat')} value={SP.nameIdFormat} />
      </Section>

      <Section
        title={t('samlSso.mapping.title')}
        hint={t('samlSso.mapping.hint')}
      >
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
          <div
            className="grid items-center px-3 h-9 text-xs uppercase tracking-eyebrow font-semibold"
            style={{
              gridTemplateColumns: '180px 1fr',
              gap: 12,
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span>{t('samlSso.mapping.profileField')}</span>
            <span>{t('samlSso.mapping.idpClaim')}</span>
          </div>
          {(['email', 'firstName', 'lastName', 'groups'] as AttrKey[]).map((k) => (
            <div
              key={k}
              className="grid items-center px-3 h-12 text-base"
              style={{
                gridTemplateColumns: '180px 1fr',
                gap: 12,
                borderTop: '1px solid var(--border-muted)',
              }}
            >
              <span className="font-mono text-sm" style={{ color: 'var(--fg-strong)' }}>{k}</span>
              <input
                value={form.mapping[k]}
                onChange={(e) => { setMap(k, e.target.value); }}
                className="h-8 px-2.5 rounded-md text-sm font-mono outline-none"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-default)',
                }}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('samlSso.enforcement.title')} hint={t('samlSso.enforcement.hint')}>
        <Row label={t('samlSso.enforcement.requireSso')} sub={t('samlSso.enforcement.requireSsoSub')}>
          <Toggle checked={form.requireSso} onChange={(v) => { set('requireSso', v); }} />
        </Row>
        <Row label={t('samlSso.enforcement.jit')} sub={t('samlSso.enforcement.jitSub')}>
          <Toggle checked={form.jit} onChange={(v) => { set('jit', v); }} />
        </Row>
        <Row label={t('samlSso.enforcement.defaultRole')} sub={t('samlSso.enforcement.defaultRoleSub')}>
          <select
            value={form.defaultRole}
            onChange={(e) => { set('defaultRole', e.target.value as Form['defaultRole']); }}
            className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
              minWidth: 140,
            }}
          >
            <option value="viewer">{t('common.role.viewer')}</option>
            <option value="member">{t('common.role.member')}</option>
            <option value="admin">{t('common.role.admin')}</option>
          </select>
        </Row>
      </Section>

      <SaveBar
        visible={dirty || saving !== 'idle'}
        dirty={dirty}
        savingState={saving}
        onSave={save}
        onDiscard={() => { setForm(INITIAL); }}
      />

      <p className="text-sm mt-6 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0" />
        {t('samlSso.notes.test')}
      </p>
      <p className="text-sm mt-1 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <KeyRound className="w-3 h-3 mt-0.5 shrink-0" />
        {t('samlSso.notes.recovery')}
      </p>
    </OrgShell>
  );
}

function StatusBand({
  status, lastTested, onTest,
}: { status: Status; lastTested: string; onTest: () => void }) {
  const { t } = useTranslation('org');
  const meta: { Icon: React.ComponentType<{ className?: string; style?: CSSProperties }>; label: string; sub: string; fg: string } =
    status === 'connected'
      ? { Icon: CheckCircle2, label: t('samlSso.status.connected'),      sub: t('samlSso.status.connectedSub'),           fg: 'var(--intent-success-fg)' }
      : status === 'error'
        ? { Icon: AlertTriangle, label: t('samlSso.status.error'),         sub: t('samlSso.status.errorSub'),       fg: 'var(--intent-danger-fg)' }
        : { Icon: Circle,        label: t('samlSso.status.notConfigured'),sub: t('samlSso.status.notConfiguredSub'), fg: 'var(--fg-muted)' };
  const { Icon } = meta;

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-lg mb-4"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
        style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
      >
        <Icon className="w-5 h-5" style={{ color: meta.fg }} />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-lg font-semibold" style={{ color: 'var(--fg-strong)' }}>{meta.label}</span>
        <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{meta.sub}</span>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
          {t('samlSso.status.lastTested')}
        </span>
        <span className="font-mono text-sm" style={{ color: 'var(--fg-default)' }}>{lastTested}</span>
      </div>
      <Button leading={<RefreshCcw className="w-3 h-3" />} onClick={onTest}>{t('samlSso.status.testConnection')}</Button>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation('org');
  const { copied, copy } = useCopyToClipboard(1200);
  return (
    <div className="flex items-center justify-between gap-3 py-3" style={{ borderTop: '1px solid var(--border-muted)' }}>
      <div className="flex flex-col min-w-0 flex-1 gap-1">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
          {label}
        </span>
        <code className="font-mono text-sm truncate" style={{ color: 'var(--fg-strong)' }}>{value}</code>
      </div>
      <Button leading={copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} onClick={() => { copy(value); }}>
        {copied ? t('common.copied') : t('common.copy')}
      </Button>
    </div>
  );
}
