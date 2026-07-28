import { useTranslation } from 'react-i18next';
import { MeShell } from '../parts/MeShell';
import { Divider, SaveBar } from '@shared/ui/forms';
import { useDirtyState } from '../lib/useDirtyState';
import { INITIAL } from './parts/ai/types';
import { AiForm } from './parts/ai/AiForm';

export default function AiPage() {
  const { t } = useTranslation('me');
  const { draft, setDraft, dirty, savingState, save, discard } = useDirtyState(INITIAL);

  return (
    <MeShell
      title={t('ai.title')}
      subtitle={t('ai.subtitle')}
    >
      <AiForm draft={draft} setDraft={setDraft} todaySpend={5.42} />

      <Divider />

      <SaveBar visible={true} dirty={dirty} savingState={savingState} onSave={save} onDiscard={discard} />
    </MeShell>
  );
}
