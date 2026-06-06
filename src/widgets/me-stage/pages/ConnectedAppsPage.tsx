import { useState } from 'react';
import { MeShell } from '../parts/MeShell';
import { Section } from '@shared/ui/forms';
import { INITIAL_CONNECTIONS, AVAILABLE_INTEGRATIONS } from './parts/connected-apps/types';
import type { Connection } from './parts/connected-apps/types';
import { ConnectionList } from './parts/connected-apps/ConnectionList';
import { AvailableRow } from './parts/connected-apps/AvailableRow';
import { RemoveModal } from './parts/connected-apps/RemoveModal';

export default function ConnectedAppsPage() {
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Connection | null>(null);

  const identity    = connections.filter((c) => c.category === 'identity');
  const integrations = connections.filter((c) => c.category === 'integration');

  return (
    <MeShell
      title="Connected apps"
      subtitle="Sign-in providers and third-party integrations linked to your account."
    >
      <Section
        title="Sign-in providers"
        hint="Use any of these to sign in. Your primary provider is what we'll surface first on the login screen."
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
        title="Integrations"
        hint="Third-party tools that act on your behalf. Removing one stops all related notifications and actions."
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
        title="Available to add"
        hint="Connect another app. You'll be redirected to authorize the scopes — we never see your password."
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
