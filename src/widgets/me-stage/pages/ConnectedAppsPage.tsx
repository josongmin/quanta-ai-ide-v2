import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MeShell } from '../parts/MeShell';
import { Section } from '@shared/ui/forms';
import { INITIAL_CONNECTIONS, AVAILABLE_INTEGRATIONS } from './parts/connected-apps/types';
import type { Connection } from './parts/connected-apps/types';
import { ConnectionList } from './parts/connected-apps/ConnectionList';
import { AvailableRow } from './parts/connected-apps/AvailableRow';
import { RemoveModal } from './parts/connected-apps/RemoveModal';

export default function ConnectedAppsPage() {
  const { t } = useTranslation('me');
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Connection | null>(null);

  const identity    = connections.filter((c) => c.category === 'identity');
  const integrations = connections.filter((c) => c.category === 'integration');

  return (
    <MeShell
      title={t('connectedApps.title')}
      subtitle={t('connectedApps.subtitle')}
    >
      <Section
        title={t('connectedApps.providers.title')}
        hint={t('connectedApps.providers.hint')}
      >
        <ConnectionList
          items={identity}
          expanded={expanded}
          onToggle={(id) => { setExpanded(expanded === id ? null : id); }}
          onMakePrimary={(id) => { setConnections((c) => c.map((x) => ({ ...x, primary: x.id === id || (x.category === 'integration' ? x.primary : false) }))); }}
          onRemove={(c) => { setConfirmRemove(c); }}
        />
      </Section>

      <Section
        title={t('connectedApps.integrations.title')}
        hint={t('connectedApps.integrations.hint')}
      >
        <ConnectionList
          items={integrations}
          expanded={expanded}
          onToggle={(id) => { setExpanded(expanded === id ? null : id); }}
          onMakePrimary={null}
          onRemove={(c) => { setConfirmRemove(c); }}
        />
      </Section>

      <Section
        title={t('connectedApps.available.title')}
        hint={t('connectedApps.available.hint')}
      >
        <div className="grid grid-cols-1 gap-1.5">
          {AVAILABLE_INTEGRATIONS.map((it) => (
            <AvailableRow key={it.id} item={it} />
          ))}
        </div>
      </Section>

      {confirmRemove && (
        <RemoveModal
          connection={confirmRemove}
          onClose={() => { setConfirmRemove(null); }}
          onConfirm={() => {
            setConnections((c) => c.filter((x) => x.id !== confirmRemove.id));
            setConfirmRemove(null);
          }}
        />
      )}
    </MeShell>
  );
}
