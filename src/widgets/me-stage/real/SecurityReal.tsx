import { useState } from 'react';
import { useAsyncResource } from '@shared/lib';
import { useTranslation } from 'react-i18next';
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

function deviceLabel(ua: string | null, unknownLabel: string): string {
  if (!ua) return unknownLabel;
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
  const { t } = useTranslation('me');
  const { sessionId } = useSession();
  const { data, isPending: loading, error, refetch } = useAsyncResource<ActiveSession[]>(listSessions, []);
  const sessions = data ?? EMPTY_SESSIONS;
  const [busyToken, setBusyToken] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
    <MeShell title={t('real.security.title')} subtitle={t('real.security.subtitle')}>
      <TwoFactorSection />

      <Section title={t('real.security.sessions.title')} hint={t('real.security.sessions.hint')}>
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
            headers={[{ header: t('real.security.sessions.colDevice') }, { header: t('real.security.sessions.colIp') }, { header: t('real.security.sessions.colSignedIn') }, { header: '' }]}
            rows={sessions}
            rowKey={(s) => s.token}
            empty={<EmptyState title={t('real.security.sessions.emptyTitle')} subtitle={t('real.security.sessions.emptySubtitle')} />}
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
                      {deviceLabel(s.userAgent, t('real.security.unknownDevice'))}
                      {isCurrent && <Badge variant="success" size="sm">{t('real.security.sessions.thisDevice')}</Badge>}
                    </span>
                  </div>
                  <span className="font-mono text-sm" style={{ color: 'var(--fg-muted)' }}>{s.ipAddress ?? '—'}</span>
                  <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{whenLabel(s.createdAt)}</span>
                  {isCurrent ? (
                    <span />
                  ) : (
                    <button
                      type="button"
                      title={t('real.security.sessions.revoke')}
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

      <Section title={t('real.security.signOut.title')} hint={t('real.security.signOut.hint')}>
        <Row label={t('real.security.signOut.label')} sub={t('real.security.signOut.sub', { count: otherCount })}>
          <Button
            variant="danger"
            leading={<ShieldCheck className="w-3 h-3" />}
            disabled={otherCount === 0}
            onClick={() => { setConfirmAll(true); }}
          >
            {t('real.security.signOut.button')}
          </Button>
        </Row>
      </Section>

      {confirmAll && (
        <ConfirmDialog
          open
          onCancel={() => { setConfirmAll(false); }}
          onConfirm={() => { void revokeOthers(); }}
          title={t('real.security.signOut.confirmTitle')}
          confirmLabel={t('real.security.signOut.confirmLabel')}
          description={t('real.security.signOut.confirmDescription')}
        />
      )}
    </MeShell>
  );
}
