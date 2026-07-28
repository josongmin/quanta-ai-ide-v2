import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MeShell } from '../parts/MeShell';
import { Divider, SaveBar } from '@shared/ui/forms';
import { InlineError, SkeletonText } from '@shared/ui';
import { shallowEqual } from '@shared/lib';
import { getAiPrefs, saveAiPrefs, type AiPrefs } from '@entities/session';
import { AiForm } from '../pages/parts/ai/AiForm';
import type { SaveState } from '../lib/useDirtyState';

// Real-mode AI settings over accounts /v1/me/ai-settings. Reuses the shared AiForm (same
// controls as the demo) but persists via the backend. todaySpend is null — live spend isn't
// metered yet, so the spend meter is hidden rather than showing a fabricated figure.
export function AiReal() {
  const { t } = useTranslation('me');
  const [committed, setCommitted] = useState<AiPrefs | null>(null);
  const [draft, setDraft] = useState<AiPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<SaveState>('idle');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    void getAiPrefs().then((res) => {
      if (!active) return;
      if (res.ok) { setCommitted(res.data); setDraft(res.data); setError(null); }
      else setError(res.error);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [nonce]);

  const dirty = committed != null && draft != null && !shallowEqual(committed, draft);

  async function save() {
    if (!draft) return;
    setSavingState('saving');
    const res = await saveAiPrefs(draft);
    if (!res.ok) { setSavingState('idle'); setError(res.error); return; }
    setCommitted(res.data);
    setDraft(res.data);
    setSavingState('saved');
    setTimeout(() => { setSavingState('idle'); }, 1400);
  }

  return (
    <MeShell title={t('ai.title')} subtitle={t('ai.subtitle')}>
      {error && (
        <div className="mb-3"><InlineError message={error} onRetry={() => { setError(null); setNonce((n) => n + 1); }} /></div>
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
            onDiscard={() => { setDraft(committed); }}
          />
        </>
      )}
    </MeShell>
  );
}
