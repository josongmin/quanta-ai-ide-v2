import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MeShell } from '../parts/MeShell';
import { Divider, SaveBar } from '@shared/ui/forms';
import { InlineError, SkeletonText } from '@shared/ui';
import { shallowEqual, useAsyncResource } from '@shared/lib';
import { getAiPrefs, saveAiPrefs, type AiPrefs } from '@entities/session';
import { AiForm } from '../pages/parts/ai/AiForm';
import type { SaveState } from '../lib/useDirtyState';

// Real-mode AI settings over accounts /v1/me/ai-settings. Reuses the shared AiForm (same
// controls as the demo) but persists via the backend. todaySpend is null — live spend isn't
// metered yet, so the spend meter is hidden rather than showing a fabricated figure.
export function AiReal() {
  const { t } = useTranslation('me');
  const { data: fetched, isPending: loading, error: fetchError, refetch } = useAsyncResource<AiPrefs>(getAiPrefs, []);
  // Fetch error is owned by the hook; mutation (save) errors are local. Show either.
  const [actionError, setActionError] = useState<string | null>(null);
  const error = fetchError ?? actionError;
  const [savingState, setSavingState] = useState<SaveState>('idle');
  // `committed` is the last server-confirmed state, advanced on a successful save; before
  // any save it's null and we fall back to the freshly fetched value. `draft` is the local
  // edit buffer, rebased on `base` whenever the base identity changes (re-fetch or save).
  const [committed, setCommitted] = useState<AiPrefs | null>(null);
  const [draft, setDraft] = useState<AiPrefs | null>(null);
  const base = committed ?? fetched;
  // Rebase draft when the base identity changes (React's "adjusting state during render"
  // pattern — avoids a sync setState-in-effect and its cascading re-render).
  const [baseRef, setBaseRef] = useState<AiPrefs | null>(null);
  if (base !== baseRef) {
    setBaseRef(base);
    setDraft(base);
  }

  const dirty = base != null && draft != null && !shallowEqual(base, draft);

  async function save() {
    if (!draft) return;
    setSavingState('saving');
    const res = await saveAiPrefs(draft);
    if (!res.ok) { setSavingState('idle'); setActionError(res.error); return; }
    setCommitted(res.data);
    setDraft(res.data);
    setActionError(null);
    setSavingState('saved');
    setTimeout(() => { setSavingState('idle'); }, 1400);
  }

  return (
    <MeShell title={t('ai.title')} subtitle={t('ai.subtitle')}>
      {error && (
        <div className="mb-3"><InlineError message={error} onRetry={() => { setActionError(null); refetch(); }} /></div>
      )}
      {loading || !draft ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
          <SkeletonText lines={6} />
        </div>
      ) : (
        <>
          <AiForm draft={draft} setDraft={(next) => { setDraft(next); }} todaySpend={null} />
          <Divider />
          <SaveBar
            visible
            dirty={dirty}
            savingState={savingState}
            onSave={() => { void save(); }}
            onDiscard={() => { setDraft(base); }}
          />
        </>
      )}
    </MeShell>
  );
}
