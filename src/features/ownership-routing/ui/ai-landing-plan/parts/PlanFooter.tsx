import type { OwnershipZone, RefactorStack } from '@entities/ownership';
import { FooterButton } from './primitives';

export function PlanFooter({
  zone,
  stack,
  onClose,
}: {
  zone: OwnershipZone;
  stack: RefactorStack;
  onClose: () => void;
}) {
  return (
    <footer
      className="px-5 py-3 border-t flex items-center justify-between gap-3 flex-wrap"
      style={{ borderColor: 'var(--border-muted)' }}
    >
      <div
        className="text-sm font-semibold"
        style={{ color: 'var(--fg-default)' }}
      >
        <span
          className="text-2xs font-black uppercase tracking-[0.22em] mr-1.5"
          style={{ color: 'var(--fg-subtle)' }}
        >
          Plan ready
        </span>
        estimated{' '}
        <span style={{ color: 'var(--fg-strong)' }}>
          {stack.totalEstimatedDays}
        </span>{' '}
        {stack.totalEstimatedDays === 1 ? 'day' : 'days'}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <FooterButton
          label="Open as draft PRs"
          onClick={() => {
            console.warn('[AILandingPlanModal] open-as-draft-prs', {
              zoneId: zone.id,
              stackId: stack.id,
            });
          }}
        />
        <FooterButton
          label="Copy as checklist"
          onClick={() => {
            console.warn('[AILandingPlanModal] copy-as-checklist', {
              zoneId: zone.id,
              stackId: stack.id,
            });
          }}
        />
        <FooterButton label="Close" onClick={onClose} primary />
      </div>
    </footer>
  );
}
