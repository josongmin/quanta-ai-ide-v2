import { useEffect, useRef, useState } from 'react';
import { Monitor, LogOut, ShieldCheck } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Button, Divider } from '@shared/ui/forms';
import { DataTable, Badge, EmptyState, InlineError, SkeletonText, ConfirmDialog } from '@shared/ui';
import {
  useSession, listSessions, revokeSession, revokeOtherSessions,
  type ActiveSession,
} from '@entities/session';
import { TwoFactorSection } from './TwoFactorSection';

// Real security surface: two-factor enrollment (TwoFactorSection) + active
// sessions (list + revoke + sign-out-everywhere) over better-auth.

function deviceLabel(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const browser = /edg/i.test(ua) ? 'Edge'
    : /chrome/i.test(ua) ? 'Chrome'
    : /firefox/i.test(ua) ? 'Firefox'
    : /safari/i.test(ua) ? 'Safari' : 'Browser';
  const os = /mac os/i.test(ua) ? 'macOS'
    : /windows/i.test(ua) ? 'Windows'
    : /android/i.test(ua) ? 'Android'
    : /iphone|ipad|ios/i.test(ua) ? 'iOS'
    : /linux/i.test(ua) ? 'Linux' : '';
  return os ? `${browser} · ${os}` : browser;
}

function whenLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

const EMPTY_SESSIONS: ActiveSession[] = [];

export function SecurityReal() {
  const { sessionId } = useSession();
  const [sessions, setSessions] = useState<ActiveSession[]>(EMPTY_SESSIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [busyToken, setBusyToken] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  useEffect(() => {
    let active = true;
    /* eslint-disable react-hooks/set-state-in-effect -- skeleton reset before the nonce fetch */
    if (!loadedOnce.current) setLoading(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    void listSessions().then((res) => {
      if (!active) return;
      if (res.ok) setSessions(res.data);
      else setError(res.error);
    }).finally(() => { if (active) { setLoading(false); loadedOnce.current = true; } });
    return () => { active = false; };
  }, [nonce]);

  const refetch = () => { setNonce((n) => n + 1); };

  async function revokeOne(token: string) {
    setBusyToken(token);
    setActionError(null);
    const res = await revokeSession({ token });
    setBusyToken(null);
    if (!res.ok) { setActionError(res.error); return; }
    refetch();
  }

  async function revokeOthers() {
    setConfirmAll(false);
    setActionError(null);
    const res = await revokeOtherSessions();
    if (!res.ok) { setActionError(res.error); return; }
    refetch();
  }

  const otherCount = sessions.filter((s) => s.id !== sessionId).length;

  return (
    <MeShell title="Security" subtitle="Two-factor, active sessions, and sign-in.">
      <TwoFactorSection />

      <Section title="Active sessions" hint="Devices currently signed in to your account.">
        {actionError && (
          <div className="mb-3"><InlineError message={actionError} onRetry={() => { setActionError(null); }} /></div>
        )}
        {error ? (
          <InlineError message={error} onRetry={refetch} />
        ) : loading ? (
          <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
            <SkeletonText lines={4} />
          </div>
        ) : (
          <DataTable<ActiveSession>
            columns="1fr 150px 160px 44px"
            headers={[{ header: 'Device' }, { header: 'IP' }, { header: 'Signed in' }, { header: '' }]}
            rows={sessions}
            rowKey={(s) => s.token}
            empty={<EmptyState title="No active sessions" subtitle="Sessions will appear here." />}
            renderRow={(s) => {
              // Current-session detection by stable session id, never the token
              // (revoke still uses the token). Guards against revoking your own
              // session and locking yourself out.
              const isCurrent = s.id === sessionId;
              return (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Monitor className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
                    <span className="text-base truncate flex items-center gap-1.5" style={{ color: 'var(--fg-strong)' }}>
                      {deviceLabel(s.userAgent)}
                      {isCurrent && <Badge variant="success" size="sm">This device</Badge>}
                    </span>
                  </div>
                  <span className="font-mono text-sm" style={{ color: 'var(--fg-muted)' }}>{s.ipAddress ?? '—'}</span>
                  <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{whenLabel(s.createdAt)}</span>
                  {isCurrent ? (
                    <span />
                  ) : (
                    <button
                      type="button"
                      title="Revoke"
                      disabled={busyToken === s.token}
                      onClick={() => { void revokeOne(s.token); }}
                      className="w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors"
                      style={{ color: 'var(--intent-danger-fg)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--intent-danger-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              );
            }}
          />
        )}
      </Section>

      <Divider />

      <Section title="Sign out everywhere" hint="Ends every other session but this one.">
        <Row label="Other sessions" sub={`${otherCount.toString()} other ${otherCount === 1 ? 'session' : 'sessions'} signed in.`}>
          <Button
            variant="danger"
            leading={<ShieldCheck className="w-3 h-3" />}
            disabled={otherCount === 0}
            onClick={() => { setConfirmAll(true); }}
          >
            Sign out other sessions
          </Button>
        </Row>
      </Section>

      {confirmAll && (
        <ConfirmDialog
          open
          onCancel={() => { setConfirmAll(false); }}
          onConfirm={() => { void revokeOthers(); }}
          title="Sign out other sessions?"
          confirmLabel="Sign out others"
          description="Every other signed-in device will be signed out immediately. This device stays signed in."
        />
      )}
    </MeShell>
  );
}
