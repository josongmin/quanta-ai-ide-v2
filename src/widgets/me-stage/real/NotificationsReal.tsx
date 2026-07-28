import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Button, Divider, SaveBar } from '@shared/ui/forms';
import { InlineError, SkeletonText } from '@shared/ui';
import { shallowEqual, useAsyncResource } from '@shared/lib';
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
  // Fetch is owned by the hook; the fetched prefs seed the editable committed/draft
  // pair below. Save is a MUTATION that produces a new committed value locally (not a
  // refetch), so committed/draft stay local state.
  const { data: loaded, isPending: loading, error: fetchError, refetch } = useAsyncResource<Settings>(
    async () => {
      const res = await getNotificationPrefs();
      return res.ok ? { ok: true, data: toSettings(res.data) } : { ok: false, error: res.error };
    },
    [],
  );
  const [committed, setCommitted] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [savingState, setSavingState] = useState<SaveState>('idle');
  // Fetch error is owned by the hook; mutation (save) errors are local. Show either.
  const [actionError, setActionError] = useState<string | null>(null);
  const error = fetchError ?? actionError;

  // Seed the editable committed/draft pair from each successful (re)load. Done
  // during render (adjusting state on prop/derived change, not in an effect) so
  // the new prefs paint in the same commit as the load — a save produces its own
  // committed value locally, so this only fires on a fresh fetch identity.
  const [seeded, setSeeded] = useState<Settings | null>(null);
  if (loaded && loaded !== seeded) {
    setSeeded(loaded);
    setCommitted(loaded);
    setDraft(loaded);
  }

  const dirty = committed != null && draft != null && !shallowEqual(committed, draft);

  async function save() {
    if (!draft) return;
    setSavingState('saving');
    const res = await saveNotificationPrefs(draft);
    if (!res.ok) { setSavingState('idle'); setActionError(res.error); return; }
    setActionError(null);
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
        <div className="mb-3"><InlineError message={error} onRetry={() => { setActionError(null); refetch(); }} /></div>
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
