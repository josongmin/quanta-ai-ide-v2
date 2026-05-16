import { useState } from 'react';
import {
  Smartphone, ShieldCheck, KeyRound, Plus, Trash2, RefreshCw,
  Monitor, Globe, MapPin, AlertCircle, Check, X, ShieldAlert,
} from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Button, Toggle, Divider } from '@shared/ui/forms';

type MfaKind = 'totp' | 'webauthn' | 'sms';
type MfaMethod = {
  id: string;
  kind: MfaKind;
  label: string;
  added: string;
  lastUsed: string;
  primary: boolean;
};

const INITIAL_METHODS: MfaMethod[] = [
  { id: 'm1', kind: 'totp',     label: '1Password',           added: '2025-08-14', lastUsed: '2h ago',  primary: true  },
  { id: 'm2', kind: 'webauthn', label: 'YubiKey 5C — desk',   added: '2025-09-02', lastUsed: '3d ago',  primary: false },
  { id: 'm3', kind: 'webauthn', label: 'MacBook Touch ID',    added: '2025-12-19', lastUsed: '14h ago', primary: false },
];

type Session = {
  id: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  ip: string;
  lastSeen: string;
  current: boolean;
};

const SESSIONS: Session[] = [
  { id: 's1', device: 'MacBook Pro 14"',  browser: 'Chrome 125',  os: 'macOS 15',  location: 'Seoul, KR',     ip: '203.0.113.42',  lastSeen: 'Active now',     current: true  },
  { id: 's2', device: 'iPhone 15',         browser: 'Mobile Safari', os: 'iOS 18',  location: 'Seoul, KR',    ip: '203.0.113.51',  lastSeen: '14m ago',         current: false },
  { id: 's3', device: 'Mac mini (office)', browser: 'Arc 1.42',    os: 'macOS 14',  location: 'Seoul, KR',    ip: '198.51.100.18', lastSeen: '2h ago',          current: false },
  { id: 's4', device: 'Linux laptop',      browser: 'Firefox 128',  os: 'Ubuntu 24', location: 'Berlin, DE',  ip: '198.51.100.97', lastSeen: '6d ago',          current: false },
];

type LogEvent = {
  id: string;
  type: 'success' | 'fail' | 'mfa' | 'reset' | 'logout';
  at: string;
  detail: string;
  ip: string;
  location: string;
};

const HISTORY: LogEvent[] = [
  { id: 'h1', type: 'success', at: '2026-05-10 09:14', detail: 'Signed in with password',          ip: '203.0.113.42',  location: 'Seoul, KR'   },
  { id: 'h2', type: 'mfa',     at: '2026-05-10 09:14', detail: 'MFA verified · TOTP (1Password)',  ip: '203.0.113.42',  location: 'Seoul, KR'   },
  { id: 'h3', type: 'fail',    at: '2026-05-09 23:42', detail: 'Wrong password (1 of 3 strikes)', ip: '198.51.100.97', location: 'Berlin, DE'  },
  { id: 'h4', type: 'success', at: '2026-05-08 14:01', detail: 'Signed in with GitHub OAuth',     ip: '203.0.113.51',  location: 'Seoul, KR'   },
  { id: 'h5', type: 'reset',   at: '2026-02-12 11:30', detail: 'Password reset',                  ip: '203.0.113.42',  location: 'Seoul, KR'   },
  { id: 'h6', type: 'logout',  at: '2026-02-01 18:22', detail: 'Signed out (session expired)',    ip: '203.0.113.42',  location: 'Seoul, KR'   },
];

export default function SecurityPage() {
  const [methods, setMethods] = useState<MfaMethod[]>(INITIAL_METHODS);
  const [trustDevicesEnabled, setTrustDevicesEnabled] = useState(true);
  const [showCodes, setShowCodes] = useState(false);
  const [showAdd, setShowAdd] = useState<MfaKind | null>(null);

  return (
    <MeShell
      title="Security"
      subtitle="Two-factor methods, active sessions, and your sign-in history."
    >
      <MfaSection
        methods={methods}
        onMakePrimary={(id) => { setMethods((m) => m.map((x) => ({ ...x, primary: x.id === id }))); }}
        onRemove={(id) => { setMethods((m) => m.filter((x) => x.id !== id)); }}
        onAdd={(kind) => { setShowAdd(kind); }}
      />

      <RecoverySection onShow={() => { setShowCodes(true); }} />

      <Section
        title="Trusted devices"
        hint="When enabled, devices that have completed 2FA can skip future prompts for 30 days."
      >
        <Row
          label="Trust this device after 2FA"
          sub="A signed cookie stays on the device. Removing the cookie or signing out resets it."
        >
          <Toggle checked={trustDevicesEnabled} onChange={setTrustDevicesEnabled} label="Trust device" />
        </Row>
      </Section>

      <SessionsSection />

      <HistorySection />

      <Divider />

      <SignOutEverywhere />

      {showCodes && <RecoveryCodesModal onClose={() => { setShowCodes(false); }} />}
      {showAdd && (
        <AddMfaModal
          kind={showAdd}
          onClose={() => { setShowAdd(null); }}
          onAdded={(method) => {
            setMethods((m) => [...m, method]);
            setShowAdd(null);
          }}
        />
      )}
    </MeShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MFA methods list

function MfaSection({
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
          <div className="flex flex-col gap-0.5 text-[11px]">
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
          background: method.primary ? 'var(--brand-bg)' : 'var(--bg-surface-muted)',
          border: `1px solid ${method.primary ? 'var(--brand-vivid)' : 'var(--border-muted)'}`,
        }}
      >
        <Icon className="w-4 h-4" style={{ color: method.primary ? 'var(--brand-fg)' : 'var(--fg-muted)' }} />
      </span>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--fg-strong)' }}>
            {method.label}
          </span>
          {method.primary && (
            <span
              className="text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
              style={{ color: 'var(--brand-fg)', border: '1px solid var(--brand-vivid)', background: 'var(--brand-bg)' }}
            >
              Primary
            </span>
          )}
          <span
            className="text-[9px] uppercase tracking-[0.14em] font-semibold"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {method.kind === 'totp' ? 'TOTP' : method.kind === 'webauthn' ? 'WebAuthn' : 'SMS'}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
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

// ─────────────────────────────────────────────────────────────────────────
// Recovery codes

function RecoverySection({ onShow }: { onShow: () => void }) {
  return (
    <Section
      title="Recovery codes"
      hint="Single-use codes that work if you lose access to all your 2FA methods. Store them somewhere safe."
    >
      <Row
        label="10 of 10 codes available"
        sub={<span>Last generated 2026-02-12. Each code is 12 alphanumeric characters and can be used once.</span>}
      >
        <Button leading={<RefreshCw className="w-3 h-3" />} onClick={onShow}>
          View / regenerate codes
        </Button>
      </Row>
    </Section>
  );
}

function RecoveryCodesModal({ onClose }: { onClose: () => void }) {
  const codes = useGeneratedCodes(10);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
      style={{ background: 'var(--bg-scrim)' }}
    >
      <div
        className="w-full max-w-[480px] rounded-md p-5 popover-panel-in flex flex-col gap-4"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            Save your recovery codes
          </h3>
          <p className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
            Each code can only be used once. Keep them somewhere outside this app — a password manager, printed copy, or encrypted note.
          </p>
        </div>
        <div
          className="grid grid-cols-2 gap-x-6 gap-y-1.5 p-3 rounded-md font-mono text-[12px] tabular-nums"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
            color: 'var(--fg-strong)',
          }}
        >
          {codes.map((c, i) => (
            <div key={c} className="flex items-center gap-2">
              <span className="text-[9px]" style={{ color: 'var(--fg-subtle)' }}>{String(i + 1).padStart(2, '0')}</span>
              <span>{c}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="md" onClick={() => { void navigator.clipboard?.writeText(codes.join('\n')); }}>
            Copy all
          </Button>
          <Button variant="secondary" size="md" onClick={() => { downloadCodes(codes); }}>
            Download .txt
          </Button>
          <Button variant="secondary" size="md" onClick={() => { window.print(); }}>
            Print
          </Button>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="primary" size="md" onClick={onClose}>I&apos;ve saved them</Button>
        </div>
      </div>
    </div>
  );
}

function useGeneratedCodes(n: number): string[] {
  const [codes] = useState(() => {
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: n }, () => {
      let s = '';
      for (let j = 0; j < 12; j++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
      return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
    });
  });
  return codes;
}

function downloadCodes(codes: string[]) {
  const blob = new Blob(
    [`# se · field recovery codes\n# Generated ${new Date().toISOString()}\n\n${codes.join('\n')}\n`],
    { type: 'text/plain' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sefield-recovery-codes.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────
// Add MFA modal — placeholder since real flow needs scanning a QR

function AddMfaModal({
  kind, onClose, onAdded,
}: {
  kind: MfaKind;
  onClose: () => void;
  onAdded: (m: MfaMethod) => void;
}) {
  const [label, setLabel] = useState(kind === 'totp' ? '1Password' : 'YubiKey');
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
      style={{ background: 'var(--bg-scrim)' }}
    >
      <div
        className="w-full max-w-[400px] rounded-md p-5 popover-panel-in flex flex-col gap-4"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          Add {kind === 'totp' ? 'authenticator app' : 'security key'}
        </h3>

        {kind === 'totp' ? (
          <div className="flex flex-col gap-3">
            <div
              className="aspect-square w-32 mx-auto p-2 rounded"
              style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
            >
              <QrPlaceholder />
            </div>
            <p className="text-[11px] leading-snug text-center" style={{ color: 'var(--fg-muted)' }}>
              Scan with 1Password, Authy, Google Authenticator, or similar.
              Then enter the 6-digit code it generates.
            </p>
            <input
              placeholder="6-digit code"
              maxLength={6}
              inputMode="numeric"
              className="h-10 px-3 rounded-md text-[15px] font-mono tabular-nums tracking-wider text-center outline-none"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'var(--brand-bg)',
                border: '1.5px solid var(--brand-vivid)',
              }}
            >
              <span className="absolute rounded-full onb-pulse-ring" style={{ width: 56, height: 56 }} aria-hidden />
              <ShieldCheck className="w-6 h-6" style={{ color: 'var(--brand-fg)' }} />
            </div>
            <p className="text-[11px] leading-snug text-center" style={{ color: 'var(--fg-muted)' }}>
              Touch your security key or use Touch ID / Windows Hello to register.
            </p>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
            Label
          </span>
          <input
            value={label}
            onChange={(e) => { setLabel(e.target.value); }}
            placeholder="e.g. 1Password"
            className="h-9 px-3 rounded-md text-[12px] outline-none"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          />
        </label>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              const newMethod: MfaMethod = {
                id: `m_${Date.now()}`,
                kind,
                label: label.trim() || (kind === 'totp' ? 'Authenticator' : 'Security key'),
                added: new Date().toISOString().slice(0, 10),
                lastUsed: 'just now',
                primary: false,
              };
              onAdded(newMethod);
            }}
          >
            Add method
          </Button>
        </div>
      </div>
    </div>
  );
}

function QrPlaceholder() {
  // Tiny pseudo-QR using SVG noise. Not a real QR; visual stand-in only.
  const cells = Array.from({ length: 25 * 25 }, (_, i) => ((i * 37 + (i >> 5) * 13) % 7 < 3));
  return (
    <svg viewBox="0 0 25 25" className="w-full h-full">
      {cells.map((on, i) => (
        on ? (
          <rect
            key={i}
            x={i % 25} y={Math.floor(i / 25)} width="1" height="1"
            fill="var(--fg-strong)"
          />
        ) : null
      ))}
      {/* Finder squares */}
      {[[0, 0], [18, 0], [0, 18]].map(([x, y], k) => (
        <g key={k}>
          <rect x={x} y={y} width="7" height="7" fill="var(--fg-strong)" />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="var(--bg-canvas)" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill="var(--fg-strong)" />
        </g>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Active sessions

function SessionsSection() {
  const [sessions, setSessions] = useState(SESSIONS);
  const revoke = (id: string) => {
    setSessions((s) => s.filter((x) => x.id !== id));
  };

  return (
    <Section
      title="Active sessions"
      hint={`${sessions.length} sessions across your devices. Revoke any you don't recognize.`}
    >
      <div
        className="flex flex-col rounded-md overflow-hidden"
        style={{ border: '1px solid var(--border-muted)' }}
      >
        {sessions.map((s, i) => (
          <SessionRow
            key={s.id}
            session={s}
            top={i === 0}
            onRevoke={s.current ? null : () => { revoke(s.id); }}
          />
        ))}
      </div>
    </Section>
  );
}

function SessionRow({
  session, top, onRevoke,
}: { session: Session; top: boolean; onRevoke: (() => void) | null }) {
  return (
    <div
      className="flex items-start gap-3 px-3 py-3"
      style={{
        background: 'var(--bg-canvas)',
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <span
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{
          background: session.current ? 'var(--brand-bg)' : 'var(--bg-surface-muted)',
          border: `1px solid ${session.current ? 'var(--brand-vivid)' : 'var(--border-muted)'}`,
        }}
      >
        <Monitor className="w-4 h-4" style={{ color: session.current ? 'var(--brand-fg)' : 'var(--fg-muted)' }} />
      </span>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
            {session.device}
          </span>
          {session.current && (
            <span
              className="text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
              style={{ color: 'var(--brand-fg)', border: '1px solid var(--brand-vivid)', background: 'var(--brand-bg)' }}
            >
              This device
            </span>
          )}
        </div>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          {session.browser} · {session.os}
        </span>
        <div className="flex items-center gap-3 text-[10px] mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
          <span className="inline-flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{session.location}</span>
          <span className="inline-flex items-center gap-0.5 font-mono"><Globe className="w-2.5 h-2.5" />{session.ip}</span>
          <span>· {session.lastSeen}</span>
        </div>
      </div>
      {onRevoke && (
        <Button variant="ghost" onClick={onRevoke}>
          <X className="w-3 h-3" /> Revoke
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sign-in history

function HistorySection() {
  return (
    <Section
      title="Sign-in history"
      hint="The last 90 days of authentication events on your account. Failed attempts and unusual locations are highlighted."
    >
      <div className="flex flex-col">
        {HISTORY.map((h, i) => <HistoryRow key={h.id} event={h} top={i === 0} />)}
      </div>
    </Section>
  );
}

function HistoryRow({ event, top }: { event: LogEvent; top: boolean }) {
  const meta = (() => {
    switch (event.type) {
      case 'success': return { icon: Check,        fg: 'var(--intent-success-fg)' };
      case 'fail':    return { icon: AlertCircle,  fg: 'var(--intent-danger-fg)'  };
      case 'mfa':     return { icon: ShieldCheck,  fg: 'var(--brand-fg)'          };
      case 'reset':   return { icon: RefreshCw,    fg: 'var(--intent-warn-fg)'    };
      case 'logout':  return { icon: X,            fg: 'var(--fg-subtle)'         };
    }
  })();
  const Icon = meta.icon;
  return (
    <div
      className="grid grid-cols-[16px_1fr_140px_120px] items-center gap-3 px-2 py-2.5 text-[11px]"
      style={{ borderTop: top ? 'none' : '1px solid var(--border-muted)' }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: meta.fg }} />
      <span style={{ color: 'var(--fg-default)' }}>{event.detail}</span>
      <span className="font-mono tabular-nums" style={{ color: 'var(--fg-muted)' }}>{event.at}</span>
      <span className="font-mono tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
        {event.ip} · {event.location}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sign out everywhere — destructive

function SignOutEverywhere() {
  const [confirming, setConfirming] = useState(false);
  return (
    <Section title="Sign out everywhere" hint="Ends all active sessions across all devices except this one.">
      <Row
        label="Sign out of all other devices"
        sub="Other devices will need to sign in and complete 2FA again. Useful if you suspect a compromise."
      >
        {confirming ? (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" onClick={() => { setConfirming(false); }}>Cancel</Button>
            <Button variant="danger" onClick={() => { setConfirming(false); }}>
              Yes, sign out everywhere
            </Button>
          </div>
        ) : (
          <Button onClick={() => { setConfirming(true); }}>
            Sign out other devices
          </Button>
        )}
      </Row>
    </Section>
  );
}
