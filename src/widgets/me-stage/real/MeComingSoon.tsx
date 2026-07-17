import { MeShell } from '../parts/MeShell';
import { EmptyState } from '@shared/ui';

// Real-mode placeholder for me-stage pages whose backend isn't built yet
// (connected apps / notifications / inbox / AI spend / personal API tokens —
// Phase 2-3). Keeps the demo's mock out of a signed-in account's view.
export function MeComingSoon({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <MeShell title={title} {...(subtitle ? { subtitle } : {})}>
      <EmptyState
        title="Available soon"
        subtitle={`${title} isn't connected to your account yet — it's coming in a later release.`}
      />
    </MeShell>
  );
}
