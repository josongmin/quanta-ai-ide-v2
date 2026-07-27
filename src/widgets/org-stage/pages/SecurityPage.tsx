import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Plus, X, ShieldAlert, Smartphone, KeyRound, Clock } from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Section, Row, Toggle, Button, SaveBar } from '@shared/ui/forms';
import { shallowEqual } from '@shared/lib';

type Form = {
  mfaRequired: boolean;
  mfaMethod: 'any' | 'totp' | 'webauthn';
  sessionDurationHours: number;
  sessionInactivityMinutes: number;
  rememberMe: boolean;
  ssoOnly: boolean;
  ipAllowlistEnabled: boolean;
  allowlist: string[];
  passkeyOnlyAdmins: boolean;
  deviceTrust: boolean;
  oauthInstall: 'admin-only' | 'all';
};

const INITIAL: Form = {
  mfaRequired: true,
  mfaMethod: 'any',
  sessionDurationHours: 720,
  sessionInactivityMinutes: 60,
  rememberMe: true,
  ssoOnly: false,
  ipAllowlistEnabled: false,
  allowlist: ['10.0.0.0/8', '203.0.113.42/32'],
  passkeyOnlyAdmins: false,
  deviceTrust: false,
  oauthInstall: 'admin-only',
};

export default function SecurityPage() {
  const { t } = useTranslation('org');
  const [form, setForm] = useState<Form>(INITIAL);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [newCidr, setNewCidr] = useState('');
  const [cidrError, setCidrError] = useState<string | null>(null);

  const dirty = !shallowEqual(form, INITIAL);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const save = () => {
    setSaving('saving');
    setTimeout(() => {
      setSaving('saved');
      setTimeout(() => { setSaving('idle'); }, 1200);
    }, 600);
  };

  const addCidr = () => {
    const v = newCidr.trim();
    if (!/^(\d{1,3}\.){3}\d{1,3}\/(3[0-2]|[12]?\d)$/.test(v)) {
      setCidrError(t('security.ipAllowlist.errorCidr'));
      return;
    }
    if (form.allowlist.includes(v)) {
      setCidrError(t('security.ipAllowlist.errorDup'));
      return;
    }
    set('allowlist', [...form.allowlist, v]);
    setNewCidr('');
    setCidrError(null);
  };
  const removeCidr = (v: string) => {
    set('allowlist', form.allowlist.filter((x) => x !== v));
  };

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title={t('security.title')}
      subtitle={t('security.subtitle')}
    >
      <Section title={t('security.auth.title')} hint={t('security.auth.hint')}>
        <Row label={t('security.auth.mfaRequired')} sub={t('security.auth.mfaRequiredSub')}>
          <Toggle checked={form.mfaRequired} onChange={(v) => { set('mfaRequired', v); }} />
        </Row>
        <Row label={t('security.auth.mfaMethod')} sub={t('security.auth.mfaMethodSub')}>
          <select
            value={form.mfaMethod}
            onChange={(e) => { set('mfaMethod', e.target.value as Form['mfaMethod']); }}
            disabled={!form.mfaRequired}
            className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
              minWidth: 160,
              opacity: form.mfaRequired ? 1 : 0.5,
            }}
          >
            <option value="any">{t('security.auth.mfaAny')}</option>
            <option value="totp">{t('security.auth.mfaTotp')}</option>
            <option value="webauthn">{t('security.auth.mfaWebauthn')}</option>
          </select>
        </Row>
        <Row label={t('security.auth.passkeyAdmins')} sub={t('security.auth.passkeyAdminsSub')}>
          <Toggle checked={form.passkeyOnlyAdmins} onChange={(v) => { set('passkeyOnlyAdmins', v); }} />
        </Row>
        <Row label={t('security.auth.ssoOnly')} sub={t('security.auth.ssoOnlySub')}>
          <Toggle checked={form.ssoOnly} onChange={(v) => { set('ssoOnly', v); }} />
        </Row>
      </Section>

      <Section title={t('security.sessions.title')} hint={t('security.sessions.hint')}>
        <Row
          label={t('security.sessions.maxDuration')}
          sub={t('security.sessions.maxDurationSub')}
        >
          <SessionDurationSelect value={form.sessionDurationHours} onChange={(v) => { set('sessionDurationHours', v); }} />
        </Row>
        <Row
          label={t('security.sessions.inactivity')}
          sub={t('security.sessions.inactivitySub')}
        >
          <select
            value={form.sessionInactivityMinutes}
            onChange={(e) => { set('sessionInactivityMinutes', Number(e.target.value)); }}
            className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 120 }}
          >
            <option value={15}>{t('security.sessions.min15')}</option>
            <option value={30}>{t('security.sessions.min30')}</option>
            <option value={60}>{t('security.sessions.hour1')}</option>
            <option value={120}>{t('security.sessions.hours2')}</option>
            <option value={0}>{t('security.sessions.never')}</option>
          </select>
        </Row>
        <Row label={t('security.sessions.rememberMe')} sub={t('security.sessions.rememberMeSub')}>
          <Toggle checked={form.rememberMe} onChange={(v) => { set('rememberMe', v); }} />
        </Row>
        <Row label={t('security.sessions.trustDevices')} sub={t('security.sessions.trustDevicesSub')}>
          <Toggle checked={form.deviceTrust} onChange={(v) => { set('deviceTrust', v); }} />
        </Row>
      </Section>

      <Section
        title={t('security.ipAllowlist.title')}
        hint={t('security.ipAllowlist.hint')}
        right={
          <Toggle checked={form.ipAllowlistEnabled} onChange={(v) => { set('ipAllowlistEnabled', v); }} />
        }
      >
        {form.ipAllowlistEnabled ? (
          <div className="flex flex-col gap-2">
            <ul className="flex flex-col rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
              {form.allowlist.length === 0 ? (
                <li className="px-3 py-3 text-sm text-center" style={{ color: 'var(--fg-subtle)' }}>
                  {t('security.ipAllowlist.empty')}
                </li>
              ) : form.allowlist.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-3 px-3 py-2 [&:not(:first-child)]:border-t"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
                  <span className="font-mono text-base flex-1" style={{ color: 'var(--fg-strong)' }}>{c}</span>
                  <button
                    type="button"
                    onClick={() => { removeCidr(c); }}
                    className="w-7 h-7 rounded-md inline-flex items-center justify-center"
                    style={{ color: 'var(--fg-subtle)' }}
                    aria-label={t('common.remove')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2">
              <input
                value={newCidr}
                onChange={(e) => { setNewCidr(e.target.value); setCidrError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') addCidr(); }}
                placeholder={t('security.ipAllowlist.placeholder')}
                className="flex-1 h-8 px-2.5 rounded-md text-base font-mono outline-none"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: `1px solid ${cidrError ? 'var(--intent-danger-fg)' : 'var(--border-default)'}`,
                  color: 'var(--fg-strong)',
                }}
              />
              <Button leading={<Plus className="w-3 h-3" />} onClick={addCidr}>{t('security.ipAllowlist.add')}</Button>
            </div>
            {cidrError && (
              <span className="text-sm" style={{ color: 'var(--intent-danger-fg)' }}>{cidrError}</span>
            )}
            <p className="text-sm flex items-start gap-1.5" style={{ color: 'var(--intent-warn-fg)' }}>
              <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" />
              {t('security.ipAllowlist.lockoutWarn')}
            </p>
          </div>
        ) : (
          <p className="text-sm py-2" style={{ color: 'var(--fg-muted)' }}>
            {t('security.ipAllowlist.off')}
          </p>
        )}
      </Section>

      <Section title={t('security.appAccess.title')} hint={t('security.appAccess.hint')}>
        <Row label={t('security.appAccess.install')} sub={t('security.appAccess.installSub')}>
          <select
            value={form.oauthInstall}
            onChange={(e) => { set('oauthInstall', e.target.value as Form['oauthInstall']); }}
            className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 140 }}
          >
            <option value="admin-only">{t('security.appAccess.adminOnly')}</option>
            <option value="all">{t('security.appAccess.all')}</option>
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
        <Clock className="w-3 h-3 mt-0.5 shrink-0" />
        {t('security.notes.effect')}
      </p>
      <p className="text-sm mt-1 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <Smartphone className="w-3 h-3 mt-0.5 shrink-0" />
        {t('security.notes.notify')}
      </p>
      <p className="text-sm mt-1 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <KeyRound className="w-3 h-3 mt-0.5 shrink-0" />
        {t('security.notes.recovery')}
      </p>
    </OrgShell>
  );
}

function SessionDurationSelect({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  const { t } = useTranslation('org');
  return (
    <select
      value={value}
      onChange={(e) => { onChange(Number(e.target.value)); }}
      className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
      style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 140 }}
    >
      <option value={8}>{t('security.sessions.hours8')}</option>
      <option value={24}>{t('security.sessions.day1')}</option>
      <option value={168}>{t('security.sessions.week1')}</option>
      <option value={720}>{t('security.sessions.days30')}</option>
      <option value={2160}>{t('security.sessions.days90')}</option>
    </select>
  );
}
