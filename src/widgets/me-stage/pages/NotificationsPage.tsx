import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Button, Divider, SaveBar } from '@shared/ui/forms';
import { useDirtyState } from '../lib/useDirtyState';
import { INITIAL } from './parts/notifications/types';
import { MuteBanner } from './parts/notifications/MuteBanner';
import { NotificationsForm } from './parts/notifications/NotificationsForm';

export default function NotificationsPage() {
  const { t } = useTranslation('me');
  const { draft, setDraft, dirty, savingState, save, discard } = useDirtyState(INITIAL);

  return (
    <MeShell
      title={t('notifications.title')}
      subtitle={t('notifications.subtitle')}
      topRight={
        <Button
          leading={draft.globalMute ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          onClick={() => { setDraft({ ...draft, globalMute: !draft.globalMute }); }}
        >
          {draft.globalMute ? t('notifications.muted') : t('notifications.muteEverything')}
        </Button>
      }
    >
      {draft.globalMute && <MuteBanner />}
      <NotificationsForm draft={draft} setDraft={setDraft} />
      <Divider />
      <SaveBar visible={true} dirty={dirty} savingState={savingState} onSave={save} onDiscard={discard} />
    </MeShell>
  );
}
