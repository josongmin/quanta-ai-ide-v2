import { useTheme } from '@shared/theme';
import type { WizardData } from '../wizard';
import { PLANS } from './plan/data';
import { CycleToggle } from './plan/CycleToggle';
import { PlanCard } from './plan/PlanCard';
import { SeatPicker } from './plan/SeatPicker';
import { AddOns } from './plan/AddOns';
import { Summary } from './plan/Summary';

type Props = {
  value: WizardData['plan'];
  onChange: (v: WizardData['plan']) => void;
};

export function StepPlan({ value, onChange }: Props) {
  const { isDark } = useTheme();
  const pageBg = isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)';
  const plan = PLANS.find((p) => p.id === value.id)!;

  return (
    <div className="flex flex-col gap-5">
      <CycleToggle
        cycle={value.cycle}
        onChange={(cycle) => { onChange({ ...value, cycle }); }}
      />

      <div
        className="grid grid-cols-2 gap-px rounded-md overflow-hidden"
        style={{ background: 'var(--border-muted)' }}
      >
        {PLANS.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            cycle={value.cycle}
            selected={value.id === p.id}
            pageBg={pageBg}
            onSelect={() => {
              const minSeats = p.minSeats ?? 1;
              onChange({ ...value, id: p.id, seats: Math.max(value.seats, minSeats) });
            }}
          />
        ))}
      </div>

      {plan.id !== 'free' && plan.id !== 'enterprise' && (
        <SeatPicker
          value={value.seats}
          minSeats={plan.minSeats ?? 1}
          onChange={(seats) => { onChange({ ...value, seats }); }}
        />
      )}

      {plan.id !== 'free' && plan.id !== 'enterprise' && (
        <AddOns
          plan={plan.id}
          addons={value.addons}
          onChange={(addons) => { onChange({ ...value, addons }); }}
        />
      )}

      <Summary value={value} plan={plan} />
    </div>
  );
}
