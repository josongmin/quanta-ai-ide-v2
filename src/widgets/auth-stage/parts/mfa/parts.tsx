import { useTranslation } from 'react-i18next';
import {
  Smartphone, KeyRound, ShieldCheck,
  Check, AlertTriangle, RefreshCw,
} from 'lucide-react';
import type { Method } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Method tabs

export function MethodTabs({
  current, onChange,
}: { current: Method; onChange: (m: Method) => void }) {
  const { t } = useTranslation('auth');
  const tabs: { id: Method; label: string; icon: React.ReactNode; sub: string }[] = [
    { id: 'totp',     label: t('mfa.tabs.authenticator'), icon: <Smartphone className="w-3.5 h-3.5" />, sub: t('mfa.tabs.authenticatorSub') },
    { id: 'webauthn', label: t('mfa.tabs.securityKey'),  icon: <ShieldCheck className="w-3.5 h-3.5" />, sub: t('mfa.tabs.securityKeySub') },
    { id: 'backup',   label: t('mfa.tabs.backupCode'),   icon: <KeyRound className="w-3.5 h-3.5" />, sub: t('mfa.tabs.backupCodeSub') },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 p-0.5 rounded-md"
      style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
    >
      {tabs.map((t) => {
        const active = t.id === current;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => { onChange(t.id); }}
            className="flex flex-col items-center justify-center gap-0.5 h-12 rounded transition-colors"
            style={{
              background: active ? 'var(--bg-canvas)' : 'transparent',
              color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {t.icon}
              {t.label}
            </span>
            <span className="text-2xs" style={{ color: 'var(--fg-subtle)' }}>{t.sub}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Trust this device + low-backup banner + fallback hint

export function TrustDevice({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { t } = useTranslation('auth');
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <span
        className="relative w-4 h-4 rounded shrink-0 mt-0.5 transition-colors"
        style={{
          background: checked ? 'var(--fg-accent)' : 'transparent',
          border: `1.5px solid ${checked ? 'var(--fg-accent)' : 'var(--border-strong)'}`,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => { onChange(e.target.checked); }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {checked && (
          <Check className="w-full h-full p-0.5" style={{ color: 'var(--bg-canvas)' }} />
        )}
      </span>
      <span className="text-sm leading-snug" style={{ color: 'var(--fg-muted)' }}>
        {t('mfa.trustDevice')}{' '}
        <span style={{ color: 'var(--fg-subtle)' }}>
          {t('mfa.trustDeviceNote')}
        </span>
      </span>
    </label>
  );
}

export function LowBackupBanner({ onRegenerate }: { onRegenerate: () => void }) {
  const { t } = useTranslation('auth');
  return (
    <div
      className="flex items-start gap-3 px-3 py-3 rounded-md onb-stagger"
      style={{
        background: 'var(--intent-warn-bg)',
        border: '1px solid var(--intent-warn-fg)',
      }}
      role="status"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
      <div className="flex flex-col gap-1.5 flex-1 text-sm">
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {t('mfa.lowBackup.title')}
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          {t('mfa.lowBackup.body')}
        </span>
        <button
          type="button"
          onClick={onRegenerate}
          className="self-start inline-flex items-center gap-1 text-sm font-medium px-2 py-1 rounded"
          style={{
            background: 'var(--bg-canvas)',
            color: 'var(--fg-strong)',
            border: '1px solid var(--border-default)',
          }}
        >
          <RefreshCw className="w-3 h-3" />
          {t('mfa.lowBackup.regenerate')}
        </button>
      </div>
    </div>
  );
}

export function FallbackHint({ method, onSwitch }: { method: Method; onSwitch: (m: Method) => void }) {
  const { t } = useTranslation('auth');
  const others: { id: Method; label: string }[] =
    method === 'totp'     ? [{ id: 'webauthn', label: t('mfa.fallback.securityKeyMethod') }, { id: 'backup', label: t('mfa.fallback.backupCode') }]
    : method === 'webauthn' ? [{ id: 'totp', label: t('mfa.fallback.authenticatorApp') }, { id: 'backup', label: t('mfa.fallback.backupCode') }]
    : [{ id: 'totp', label: t('mfa.fallback.authenticatorApp') }, { id: 'webauthn', label: t('mfa.fallback.securityKeyMethod') }];

  const item = method === 'totp' ? t('mfa.fallback.phone') : method === 'webauthn' ? t('mfa.fallback.securityKey') : t('mfa.fallback.backupCodes');

  return (
    <div className="text-sm flex items-center gap-1 flex-wrap" style={{ color: 'var(--fg-subtle)' }}>
      <span>{t('mfa.fallback.dontHave', { item })}</span>
      {others.map((o, i) => (
        <span key={o.id}>
          <button
            type="button"
            onClick={() => { onSwitch(o.id); }}
            style={{ color: 'var(--fg-link)' }}
          >
            {t('mfa.fallback.use', { method: o.label })}
          </button>
          {i < others.length - 1 && <span style={{ color: 'var(--border-default)' }}> · </span>}
        </span>
      ))}
    </div>
  );
}
