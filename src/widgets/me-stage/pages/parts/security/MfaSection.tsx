import {
  Smartphone, ShieldCheck, KeyRound, Plus, Trash2, ShieldAlert,
} from 'lucide-react';
import { Section, Button } from '@shared/ui/forms';
import type { MfaKind, MfaMethod } from './types';

export function MfaSection({
  methods, onMakePrimary, onRemove, onAdd,
}: {
  methods: MfaMethod[];
  onMakePrimary: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (kind: MfaKind) => void;
}) {
  return (
    <Section
      title="Two-factor authentication"
      hint="At least one method is required. Add a backup so a lost device doesn't lock you out."
      right={
        <div className="flex items-center gap-1.5">
          <Button leading={<Plus className="w-3 h-3" />} onClick={() => { onAdd('totp'); }}>
            Authenticator
          </Button>
          <Button leading={<Plus className="w-3 h-3" />} onClick={() => { onAdd('webauthn'); }}>
            Security key
          </Button>
        </div>
      }
    >
      {methods.length === 0 && (
        <div
          className="flex items-start gap-3 px-3 py-3 rounded-md"
          style={{
            background: 'var(--intent-danger-bg)',
            border: '1px solid var(--intent-danger-fg)',
          }}
        >
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--intent-danger-fg)' }} />
          <div className="flex flex-col gap-0.5 text-sm">
            <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
              No 2FA configured — your account is at higher risk
            </span>
            <span style={{ color: 'var(--fg-muted)' }}>
              Add at least one method. We recommend an authenticator app + a security key as backup.
            </span>
          </div>
        </div>
      )}

      <div
        className="flex flex-col rounded-md overflow-hidden"
        style={{ border: '1px solid var(--border-muted)' }}
      >
        {methods.map((m, i) => (
          <MethodRow
            key={m.id}
            method={m}
            top={i === 0}
            onMakePrimary={() => { onMakePrimary(m.id); }}
            onRemove={() => { onRemove(m.id); }}
            canRemove={methods.length > 1}
          />
        ))}
      </div>
    </Section>
  );
}

function MethodRow({
  method, top, onMakePrimary, onRemove, canRemove,
}: {
  method: MfaMethod;
  top: boolean;
  onMakePrimary: () => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const Icon = method.kind === 'totp' ? Smartphone : method.kind === 'webauthn' ? ShieldCheck : KeyRound;
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{
        background: 'var(--bg-canvas)',
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <span
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{
          background: method.primary ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'var(--bg-surface-muted)',
          border: `1px solid ${method.primary ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
        }}
      >
        <Icon className="w-4 h-4" style={{ color: method.primary ? 'var(--fg-accent)' : 'var(--fg-muted)' }} />
      </span>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tabular-nums" style={{ color: 'var(--fg-strong)' }}>
            {method.label}
          </span>
          {method.primary && (
            <span
              className="text-2xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
              style={{ color: 'var(--fg-accent)', border: '1px solid var(--fg-accent)', background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' }}
            >
              Primary
            </span>
          )}
          <span
            className="text-2xs uppercase tracking-eyebrow font-semibold"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {method.kind === 'totp' ? 'TOTP' : method.kind === 'webauthn' ? 'WebAuthn' : 'SMS'}
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
          Added {method.added} · Last used {method.lastUsed}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {!method.primary && <Button onClick={onMakePrimary}>Make primary</Button>}
        <Button variant="ghost" onClick={onRemove} disabled={!canRemove}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
