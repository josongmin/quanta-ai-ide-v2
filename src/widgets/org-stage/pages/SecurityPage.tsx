import { useState } from 'react';
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
      setCidrError('Use CIDR notation, e.g. 10.0.0.0/8 or 203.0.113.42/32');
      return;
    }
    if (form.allowlist.includes(v)) {
      setCidrError('Already in the list');
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
      title="Security"
      subtitle="Org-wide controls. Stricter settings here override per-user choices."
    >
      <Section title="Authentication" hint="How people prove who they are when signing in.">
        <Row label="Require multi-factor auth" sub="All members must enroll a second factor before they can access the org.">
          <Toggle checked={form.mfaRequired} onChange={(v) => { set('mfaRequired', v); }} />
        </Row>
        <Row label="MFA method" sub="Restrict to a specific factor type, or accept any enrolled factor.">
          <select
            value={form.mfaMethod}
            onChange={(e) => { set('mfaMethod', e.target.value as Form['mfaMethod']); }}
            disabled={!form.mfaRequired}
            className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
              minWidth: 160,
              opacity: form.mfaRequired ? 1 : 0.5,
            }}
          >
            <option value="any">Any (TOTP, WebAuthn, backup)</option>
            <option value="totp">TOTP only</option>
            <option value="webauthn">WebAuthn / passkey only</option>
          </select>
        </Row>
        <Row label="Passkey-only for admins" sub="Owners and Admins must use a phishing-resistant factor (WebAuthn).">
          <Toggle checked={form.passkeyOnlyAdmins} onChange={(v) => { set('passkeyOnlyAdmins', v); }} />
        </Row>
        <Row label="Single sign-on only" sub="Block password & social login. Members must use the org IdP.">
          <Toggle checked={form.ssoOnly} onChange={(v) => { set('ssoOnly', v); }} />
        </Row>
      </Section>

      <Section title="Sessions" hint="How long an authenticated browser stays signed in.">
        <Row
          label="Maximum session duration"
          sub={<>Hard cap. After this, the user is logged out and must re-authenticate.</>}
        >
          <SessionDurationSelect value={form.sessionDurationHours} onChange={(v) => { set('sessionDurationHours', v); }} />
        </Row>
        <Row
          label="Inactivity timeout"
          sub="Sign out after this many minutes of no activity."
        >
          <select
            value={form.sessionInactivityMinutes}
            onChange={(e) => { set('sessionInactivityMinutes', Number(e.target.value)); }}
            className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 120 }}
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
            <option value={0}>Never</option>
          </select>
        </Row>
        <Row label="Allow “Remember me”" sub="Lets users skip MFA on trusted browsers for up to 30 days.">
          <Toggle checked={form.rememberMe} onChange={(v) => { set('rememberMe', v); }} />
        </Row>
        <Row label="Trust devices" sub="Treat enrolled devices as a second factor on subsequent sign-ins.">
          <Toggle checked={form.deviceTrust} onChange={(v) => { set('deviceTrust', v); }} />
        </Row>
      </Section>

      <Section
        title="IP allowlist"
        hint="Restrict org access to a specific set of CIDR blocks. Empty list = allow all."
        right={
          <Toggle checked={form.ipAllowlistEnabled} onChange={(v) => { set('ipAllowlistEnabled', v); }} />
        }
      >
        {form.ipAllowlistEnabled ? (
          <div className="flex flex-col gap-2">
            <ul className="flex flex-col rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
              {form.allowlist.length === 0 ? (
                <li className="px-3 py-3 text-[11px] text-center" style={{ color: 'var(--fg-subtle)' }}>
                  No CIDRs yet. Add one to start enforcing.
                </li>
              ) : form.allowlist.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-3 px-3 py-2 [&:not(:first-child)]:border-t"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
                  <span className="font-mono text-[12px] flex-1" style={{ color: 'var(--fg-strong)' }}>{c}</span>
                  <button
                    type="button"
                    onClick={() => { removeCidr(c); }}
                    className="w-7 h-7 rounded-md inline-flex items-center justify-center"
                    style={{ color: 'var(--fg-subtle)' }}
                    aria-label="Remove"
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
                placeholder="10.0.0.0/8"
                className="flex-1 h-8 px-2.5 rounded-md text-[12px] font-mono outline-none"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: `1px solid ${cidrError ? 'var(--intent-danger-fg)' : 'var(--border-default)'}`,
                  color: 'var(--fg-strong)',
                }}
              />
              <Button leading={<Plus className="w-3 h-3" />} onClick={addCidr}>Add CIDR</Button>
            </div>
            {cidrError && (
              <span className="text-[11px]" style={{ color: 'var(--intent-danger-fg)' }}>{cidrError}</span>
            )}
            <p className="text-[11px] flex items-start gap-1.5" style={{ color: 'var(--intent-warn-fg)' }}>
              <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0" />
              Make sure your current IP is included before saving — otherwise you&apos;ll lock yourself out.
            </p>
          </div>
        ) : (
          <p className="text-[11px] py-2" style={{ color: 'var(--fg-muted)' }}>
            IP allowlisting is off. Members can sign in from any network.
          </p>
        )}
      </Section>

      <Section title="App access" hint="Who can connect third-party OAuth apps to the org.">
        <Row label="Install third-party apps" sub="Members can browse the directory but only allowed roles can install.">
          <select
            value={form.oauthInstall}
            onChange={(e) => { set('oauthInstall', e.target.value as Form['oauthInstall']); }}
            className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 140 }}
          >
            <option value="admin-only">Admins only</option>
            <option value="all">All members</option>
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

      <p className="text-[11px] mt-6 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <Clock className="w-3 h-3 mt-0.5 shrink-0" />
        Changes take effect immediately for new sign-ins. Existing sessions live until next refresh.
      </p>
      <p className="text-[11px] mt-1 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <Smartphone className="w-3 h-3 mt-0.5 shrink-0" />
        Members are notified by email when MFA, SSO-only, or passkey requirements change.
      </p>
      <p className="text-[11px] mt-1 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <KeyRound className="w-3 h-3 mt-0.5 shrink-0" />
        Recovery codes are reissued whenever the MFA method changes.
      </p>
    </OrgShell>
  );
}

function SessionDurationSelect({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => { onChange(Number(e.target.value)); }}
      className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
      style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)', minWidth: 140 }}
    >
      <option value={8}>8 hours</option>
      <option value={24}>1 day</option>
      <option value={168}>1 week</option>
      <option value={720}>30 days</option>
      <option value={2160}>90 days</option>
    </select>
  );
}
