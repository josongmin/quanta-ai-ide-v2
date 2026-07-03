import { Check } from 'lucide-react';
import type { WizardData } from '../../wizard';
import { ACCENT_TINT } from '../../primitives/shared';
import { ADDONS, labelFor } from './data';

export function AddOns({
  plan, addons, onChange,
}: {
  plan: WizardData['plan']['id'];
  addons: WizardData['plan']['addons'];
  onChange: (v: WizardData['plan']['addons']) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs uppercase tracking-eyebrow font-medium pb-1" style={{ color: 'var(--fg-subtle)' }}>
        Add-ons
      </legend>
      <div className="flex flex-col gap-1.5">
        {ADDONS.map((a) => {
          const enabled = addons[a.id];
          const available = a.availableOn.includes(plan);
          return (
            <button
              key={a.id}
              type="button"
              disabled={!available}
              onClick={() => { onChange({ ...addons, [a.id]: !enabled }); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left"
              style={{
                background: enabled && available ? ACCENT_TINT : 'var(--bg-surface-muted)',
                border: `1px solid ${enabled && available ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
                opacity: available ? 1 : 0.5,
                cursor: available ? 'pointer' : 'not-allowed',
              }}
            >
              <span
                className="w-4 h-4 rounded shrink-0 inline-flex items-center justify-center transition-colors"
                style={{
                  background: enabled && available ? 'var(--fg-accent)' : 'transparent',
                  border: `1.5px solid ${enabled && available ? 'var(--fg-accent)' : 'var(--border-strong)'}`,
                }}
              >
                {enabled && available && <Check className="w-2.5 h-2.5" style={{ color: 'var(--bg-canvas)' }} />}
              </span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  {a.label}
                </span>
                <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
                  {a.sub}
                  {!available && ` · Not available on ${labelFor(plan)}`}
                </span>
              </div>
              <span className="text-sm font-mono tabular-nums shrink-0" style={{ color: 'var(--fg-default)' }}>
                +${a.monthlyPerSeat}/seat/mo
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
