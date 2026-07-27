import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MeShell } from '../parts/MeShell';
import { Section, Field, SaveBar } from '@shared/ui/forms';
import { InlineError } from '@shared/ui';
import { useSession, updateProfile } from '@entities/session';

// Real profile — better-auth's user record backs only `name` (and `image`, which
// needs object storage → deferred). The mock's pronouns/handle/bio/social/
// visibility fields aren't backend-modelled, so they're dropped rather than
// faked; they'd return as better-auth additionalFields in a later pass.
export function ProfileReal() {
  const { t } = useTranslation('me');
  const { user } = useSession();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Seed the field ONCE per user — not on every `user` identity change (better-
  // auth re-emits on refetch/focus), so unsaved typing isn't clobbered.
  const seededUserId = useRef<string | null>(null);
  useEffect(() => {
    if (!user || seededUserId.current === user.id) return;
    seededUserId.current = user.id;
    setName(user.name);
  }, [user]);

  const dirty = Boolean(user) && name.trim().length > 0 && name !== user?.name;

  async function save() {
    setSaving('saving');
    setError(null);
    const res = await updateProfile({ name: name.trim() });
    if (!res.ok) { setSaving('idle'); setError(res.error); return; }
    setSaving('saved');
    setTimeout(() => { setSaving('idle'); }, 1200);
  }

  return (
    <MeShell title={t('real.profile.title')} subtitle={t('real.profile.subtitle')}>
      {error && (
        <div className="mb-3">
          <InlineError message={error} onRetry={() => { setError(null); }} />
        </div>
      )}
      <Section title={t('real.profile.identity')} hint={t('real.profile.identityHint')}>
        <Field
          label={t('real.profile.fullName')}
          value={name}
          onChange={(e) => { setName(e.target.value); }}
          placeholder={t('real.profile.namePlaceholder')}
        />
      </Section>
      <SaveBar
        visible={dirty || saving !== 'idle'}
        dirty={dirty}
        savingState={saving}
        onSave={() => { void save(); }}
        onDiscard={() => { if (user) setName(user.name); }}
      />
    </MeShell>
  );
}
