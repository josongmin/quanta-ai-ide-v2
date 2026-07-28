import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Button, Divider, SaveBar } from '@shared/ui/forms';
import { InlineError, SkeletonText } from '@shared/ui';
import { shallowEqual } from '@shared/lib';
import { getNotificationPrefs, saveNotificationPrefs, type NotificationPrefs } from '@entities/session';
import { EVENTS, type Settings } from '../pages/parts/notifications/types';
import { MuteBanner } from '../pages/parts/notifications/MuteBanner';
import { NotificationsForm } from '../pages/parts/notifications/NotificationsForm';
import type { SaveState } from '../lib/useDirtyState';

// Real-mode Notifications over accounts /v1/me/notification-preferences. Reuses the shared
// NotificationsForm; persists via backend. ★The matrix is NORMALIZED to include EVERY catalog
// event on load — the backend may return a partial matrix (catalog drift / older save), and
// Matrix.tsx indexes matrix[event.id] unguarded, so a missing key would crash the page.
const EMPTY_CHANNELS = { inApp: false, email: false, slack: false, mobile: false };

function toSettings(p: NotificationPrefs): Settings {
  const matrix = {} as Settings['matrix'];
  for (const e of EVENTS) matrix[e.id] = p.matrix[e.id] ?? { ...EMPTY_CHANNELS };
  return { ...p, matrix };
}

export function NotificationsReal() {
  const { t } = useTranslation('me');
  const [committed, setCommitted] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<SaveState>('idle');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    void getNotificationPrefs().then((res) => {
      if (!active) return;
      if (res.ok) { const s = toSettings(res.data); setCommitted(s); setDraft(s); setError(null); }
      else setError(res.error);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [nonce]);

  const dirty = committed != null && draft != null && !shallowEqual(committed, draft);

  async function save() {
    if (!draft) return;
    setSavingState('saving');
    const res = await saveNotificationPrefs(draft);
    if (!res.ok) { setSavingState('idle'); setError(res.error); return; }
    const s = toSettings(res.data);
    setCommitted(s);
    setDraft(s);
    setSavingState('saved');
    setTimeout(() => { setSavingState('idle'); }, 1400);
  }

  return (
    <MeShell
      title={t('notifications.title')}
      subtitle={t('notifications.subtitle')}
      topRight={
        draft ? (
          <Button
            leading={draft.globalMute ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            onClick={() => { setDraft({ ...draft, globalMute: !draft.globalMute }); }}
          >
            {draft.globalMute ? t('notifications.muted') : t('notifications.muteEverything')}
          </Button>
        ) : undefined
      }
    >
      {error && (
        <div className="mb-3"><InlineError message={error} onRetry={() => { setError(null); setNonce((n) => n + 1); }} /></div>
      )}
      {loading || !draft ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
          <SkeletonText lines={6} />
        </div>
      ) : (
        <>
          {draft.globalMute && <MuteBanner />}
          <NotificationsForm draft={draft} setDraft={(next) => { setDraft(next); }} />
          <Divider />
          <SaveBar visible dirty={dirty} savingState={savingState} onSave={() => { void save(); }} onDiscard={() => { setDraft(committed); }} />
        </>
      )}
    </MeShell>
  );
}
