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
  const tabs: { id: Method; label: string; icon: React.ReactNode; sub: string }[] = [
    { id: 'totp',     label: 'Authenticator', icon: <Smartphone className="w-3.5 h-3.5" />, sub: '6-digit code' },
    { id: 'webauthn', label: 'Security key',  icon: <ShieldCheck className="w-3.5 h-3.5" />, sub: 'Touch ID, key' },
    { id: 'backup',   label: 'Backup code',   icon: <KeyRound className="w-3.5 h-3.5" />, sub: 'One-time only' },
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
        Trust this device for 30 days.{' '}
        <span style={{ color: 'var(--fg-subtle)' }}>
          We&apos;ll skip 2FA on this browser. Don&apos;t enable on shared computers.
        </span>
      </span>
    </label>
  );
}

export function LowBackupBanner({ onRegenerate }: { onRegenerate: () => void }) {
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
          Code accepted — 2 backup codes remaining
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          You&apos;re running low. Generate a fresh set now and store them somewhere safe.
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
          Generate new backup codes
        </button>
      </div>
    </div>
  );
}

export function FallbackHint({ method, onSwitch }: { method: Method; onSwitch: (m: Method) => void }) {
  const others: { id: Method; label: string }[] =
    method === 'totp'     ? [{ id: 'webauthn', label: 'security key' }, { id: 'backup', label: 'backup code' }]
    : method === 'webauthn' ? [{ id: 'totp', label: 'authenticator app' }, { id: 'backup', label: 'backup code' }]
    : [{ id: 'totp', label: 'authenticator app' }, { id: 'webauthn', label: 'security key' }];

  return (
    <div className="text-sm flex items-center gap-1 flex-wrap" style={{ color: 'var(--fg-subtle)' }}>
      <span>Don&apos;t have your{' '}
        {method === 'totp' ? 'phone' : method === 'webauthn' ? 'security key' : 'backup codes'}?
      </span>
      {others.map((o, i) => (
        <span key={o.id}>
          <button
            type="button"
            onClick={() => { onSwitch(o.id); }}
            style={{ color: 'var(--fg-link)' }}
          >
            Use {o.label}
          </button>
          {i < others.length - 1 && <span style={{ color: 'var(--border-default)' }}> · </span>}
        </span>
      ))}
    </div>
  );
}
