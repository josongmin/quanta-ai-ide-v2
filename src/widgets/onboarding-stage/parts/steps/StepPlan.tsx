import { useMemo } from 'react';
import { Check, Minus, Plus, Sparkles, Clock, Receipt } from 'lucide-react';
import { useTheme } from '@shared/theme';
import type { WizardData } from '../wizard';

type Plan = {
  id: WizardData['plan']['id'];
  name: string;
  monthly: number | null;
  annual: number | null;
  hint: string;
  highlights: string[];
  recommended?: boolean;
  trial?: number;            // days
  minSeats?: number;
};

const PLANS: Plan[] = [
  { id: 'free',       name: 'Free',       monthly: 0,    annual: 0,    hint: 'Solo / exploring',     highlights: ['1 workspace', 'Up to 3 seats', 'Community support'] },
  { id: 'team',       name: 'Team',       monthly: 24,   annual: 20,   hint: 'For small teams',      highlights: ['5 workspaces', 'Unlimited seats', 'Custom admission rules'], recommended: true, trial: 14, minSeats: 3 },
  { id: 'business',   name: 'Business',   monthly: 64,   annual: 54,   hint: 'For organizations',    highlights: ['Unlimited workspaces', 'SAML / SCIM', 'Priority routing'],     trial: 14, minSeats: 10 },
  { id: 'enterprise', name: 'Enterprise', monthly: null, annual: null, hint: 'Regulated, self-host', highlights: ['VPC / self-host', 'Custom SLA', 'Dedicated CSM'] },
];

type Addon = {
  id: keyof WizardData['plan']['addons'];
  label: string;
  sub: string;
  monthlyPerSeat: number;
  availableOn: WizardData['plan']['id'][];
};

const ADDONS: Addon[] = [
  { id: 'sso',       label: 'SSO & SCIM',       sub: 'SAML 2.0 + provisioning',     monthlyPerSeat: 8,  availableOn: ['team', 'business', 'enterprise'] },
  { id: 'auditPro',  label: 'Audit Pro',        sub: '1y retention + SIEM export',  monthlyPerSeat: 6,  availableOn: ['business', 'enterprise'] },
  { id: 'premium',   label: 'Premium support',  sub: '4h SLA, dedicated channel',   monthlyPerSeat: 12, availableOn: ['team', 'business', 'enterprise'] },
];

type Props = {
  value: WizardData['plan'];
  onChange: (v: WizardData['plan']) => void;
};

export function StepPlan({ value, onChange }: Props) {
  const { isDark } = useTheme();
  const pageBg = isDark ? 'var(--bg-canvas)' : '#ffffff';
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

// ─────────────────────────────────────────────────────────────────────────
// Cycle toggle

function CycleToggle({
  cycle, onChange,
}: { cycle: 'monthly' | 'annual'; onChange: (c: 'monthly' | 'annual') => void }) {
  return (
    <div
      className="inline-flex items-center self-start p-0.5 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {(['monthly', 'annual'] as const).map((c) => {
        const active = c === cycle;
        return (
          <button
            key={c}
            type="button"
            onClick={() => { onChange(c); }}
            className="px-3 h-7 rounded text-[11px] font-medium transition-colors"
            style={{
              background: active ? 'var(--bg-canvas)' : 'transparent',
              color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {c === 'annual' ? (
              <span className="flex items-center gap-1.5">
                Annual
                <span
                  className="text-[8px] uppercase tracking-[0.14em] font-semibold px-1 py-0.5 rounded"
                  style={{ background: 'var(--brand-vivid)', color: 'var(--bg-canvas)' }}
                >
                  −17%
                </span>
              </span>
            ) : 'Monthly'}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Plan card — same geometry as before, but with trial badge + min-seats

function PlanCard({
  plan, cycle, selected, pageBg, onSelect,
}: {
  plan: Plan;
  cycle: 'monthly' | 'annual';
  selected: boolean;
  pageBg: string;
  onSelect: () => void;
}) {
  const price = cycle === 'annual' ? plan.annual : plan.monthly;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative flex flex-col gap-3 p-5 transition-colors text-left"
      style={{
        background: selected ? 'var(--accent-selected-bg)' : pageBg,
        color: selected ? 'var(--accent-selected-fg)' : undefined,
        boxShadow: selected ? 'inset 0 0 0 1px var(--accent-selected-fg)' : undefined,
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = pageBg; }}
    >
      {plan.recommended && !selected && (
        <span
          className="absolute top-3 right-3 text-[8px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
          style={{ background: 'var(--brand-vivid)', color: 'var(--bg-canvas)' }}
        >
          Recommended
        </span>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {plan.name}
        </span>
        {selected && (
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full onb-tick"
            style={{ background: 'var(--brand-vivid)', color: 'var(--bg-canvas)' }}
          >
            <Check className="w-2.5 h-2.5" />
          </span>
        )}
        {plan.trial && (
          <span
            className="ml-auto text-[9px] uppercase tracking-[0.14em] font-semibold inline-flex items-center gap-1"
            style={{ color: 'var(--brand-fg)' }}
          >
            <Clock className="w-2.5 h-2.5" />
            {plan.trial}d trial
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1 min-h-[32px]">
        {price == null ? (
          <span className="text-[18px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            Custom
          </span>
        ) : (
          <>
            <span className="text-[24px] font-semibold tracking-tight tabular-nums leading-none"
              style={{ color: 'var(--fg-strong)' }}>
              ${price}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
              /seat/mo
            </span>
          </>
        )}
      </div>

      <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
        {plan.hint}
        {plan.minSeats && plan.minSeats > 1 && (
          <span> · Min {plan.minSeats} seats</span>
        )}
      </span>

      <ul className="flex flex-col gap-1.5 mt-1">
        {plan.highlights.map((h) => (
          <li key={h} className="flex items-start gap-1.5 text-[11px] leading-snug" style={{ color: 'var(--fg-default)' }}>
            <Check className="w-3 h-3 shrink-0 mt-[2px]" style={{ color: 'var(--fg-muted)' }} />
            <span>{h}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Seat picker — slider + step buttons

function SeatPicker({
  value, minSeats, onChange,
}: { value: number; minSeats: number; onChange: (v: number) => void }) {
  const max = 100;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
          Seats
        </span>
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => { onChange(Math.max(minSeats, value - 1)); }}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
            }}
            aria-label="Decrease seats"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            min={minSeats}
            max={max}
            value={value}
            onChange={(e) => {
              const n = Math.max(minSeats, Math.min(max, Number(e.target.value) || minSeats));
              onChange(n);
            }}
            className="w-16 h-6 text-center text-[12px] font-mono tabular-nums rounded-md outline-none"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-strong)',
              border: '1px solid var(--border-default)',
            }}
          />
          <button
            type="button"
            onClick={() => { onChange(Math.min(max, value + 1)); }}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
            }}
            aria-label="Increase seats"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      <input
        type="range"
        min={minSeats}
        max={max}
        value={value}
        onChange={(e) => { onChange(Number(e.target.value)); }}
        className="onb-seat-range"
        style={{
          accentColor: 'var(--brand-vivid)',
          width: '100%',
        }}
        aria-label="Seats"
      />

      <div className="flex justify-between text-[9px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
        <span>{minSeats}</span>
        <span>{Math.floor(max / 2)}</span>
        <span>{max}+</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Add-ons

function AddOns({
  plan, addons, onChange,
}: {
  plan: WizardData['plan']['id'];
  addons: WizardData['plan']['addons'];
  onChange: (v: WizardData['plan']['addons']) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[10px] uppercase tracking-[0.14em] font-medium pb-1" style={{ color: 'var(--fg-subtle)' }}>
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
                background: enabled && available ? 'var(--brand-bg)' : 'var(--bg-surface-muted)',
                border: `1px solid ${enabled && available ? 'var(--brand-vivid)' : 'var(--border-muted)'}`,
                opacity: available ? 1 : 0.5,
                cursor: available ? 'pointer' : 'not-allowed',
              }}
            >
              <span
                className="w-4 h-4 rounded shrink-0 inline-flex items-center justify-center transition-colors"
                style={{
                  background: enabled && available ? 'var(--brand-vivid)' : 'transparent',
                  border: `1.5px solid ${enabled && available ? 'var(--brand-vivid)' : 'var(--border-strong)'}`,
                }}
              >
                {enabled && available && <Check className="w-2.5 h-2.5" style={{ color: 'var(--bg-canvas)' }} />}
              </span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  {a.label}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                  {a.sub}
                  {!available && ` · Not available on ${labelFor(plan)}`}
                </span>
              </div>
              <span className="text-[11px] font-mono tabular-nums shrink-0" style={{ color: 'var(--fg-default)' }}>
                +${a.monthlyPerSeat}/seat/mo
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function labelFor(p: WizardData['plan']['id']) {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────
// Summary — calculates monthly total, annual savings, trial info

function Summary({
  value, plan,
}: { value: WizardData['plan']; plan: Plan }) {
  const calc = useMemo(() => {
    const seatPrice = (value.cycle === 'annual' ? plan.annual : plan.monthly) ?? 0;
    const baseMonthly = seatPrice * value.seats;
    let addonMonthly = 0;
    for (const a of ADDONS) {
      if (value.addons[a.id] && a.availableOn.includes(plan.id)) {
        addonMonthly += a.monthlyPerSeat * value.seats;
      }
    }
    const totalMonthly = baseMonthly + addonMonthly;
    const annualEquiv = totalMonthly * 12;
    const monthlyEquivIfPaidMonthly =
      ((plan.monthly ?? 0) * value.seats
       + ADDONS.reduce((s, a) => s + (value.addons[a.id] ? a.monthlyPerSeat : 0), 0) * value.seats);
    const savedAnnual = value.cycle === 'annual'
      ? Math.max(0, monthlyEquivIfPaidMonthly * 12 - annualEquiv)
      : 0;
    return { baseMonthly, addonMonthly, totalMonthly, annualEquiv, savedAnnual };
  }, [value, plan]);

  if (plan.id === 'enterprise') {
    return (
      <div
        className="flex items-start gap-3 px-3 py-3 rounded-md"
        style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-vivid)' }}
      >
        <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--brand-fg)' }} />
        <div className="flex flex-col gap-0.5 text-[11px] leading-snug">
          <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
            Enterprise — let&apos;s talk
          </span>
          <span style={{ color: 'var(--fg-muted)' }}>
            We&apos;ll route you to a sales engineer for procurement, custom contracts, and self-host options.
            Free until your contract starts.
          </span>
        </div>
      </div>
    );
  }

  if (plan.id === 'free') {
    return (
      <div
        className="flex items-start gap-3 px-3 py-3 rounded-md"
        style={{ background: 'var(--intent-success-bg)', border: '1px solid var(--intent-success-fg)' }}
      >
        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--intent-success-fg)' }} />
        <div className="flex flex-col gap-0.5 text-[11px] leading-snug">
          <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
            Free forever
          </span>
          <span style={{ color: 'var(--fg-muted)' }}>
            No payment needed. Upgrade any time from <span className="font-mono">Organization → Billing</span>.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2.5 px-3 py-3 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-center gap-2">
        <Receipt className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
        <span className="text-[11px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {value.cycle === 'annual' ? 'Annual subscription' : 'Monthly subscription'}
        </span>
        {plan.trial && (
          <span
            className="ml-auto text-[9px] uppercase tracking-[0.14em] font-semibold inline-flex items-center gap-1"
            style={{ color: 'var(--brand-fg)' }}
          >
            <Clock className="w-2.5 h-2.5" />
            {plan.trial}-day free trial · charge starts on day {plan.trial + 1}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-1 text-[11px] tabular-nums">
        <SummaryRow
          label={`${plan.name} · ${value.seats} seats × $${value.cycle === 'annual' ? plan.annual : plan.monthly}/mo`}
          value={`$${calc.baseMonthly.toFixed(0)}`}
        />
        {ADDONS.map((a) => value.addons[a.id] && a.availableOn.includes(plan.id) && (
          <SummaryRow
            key={a.id}
            label={`+ ${a.label} · ${value.seats} seats × $${a.monthlyPerSeat}/mo`}
            value={`$${(a.monthlyPerSeat * value.seats).toFixed(0)}`}
          />
        ))}
        <div className="h-px my-1" style={{ background: 'var(--border-muted)' }} />
        <SummaryRow label="Monthly" value={`$${calc.totalMonthly.toFixed(0)}/mo`} bold />
        {value.cycle === 'annual' && (
          <>
            <SummaryRow label="Billed annually" value={`$${calc.annualEquiv.toFixed(0)} now`} />
            {calc.savedAnnual > 0 && (
              <SummaryRow
                label="Saved vs. monthly"
                value={`−$${calc.savedAnnual.toFixed(0)}/yr`}
                savings
              />
            )}
          </>
        )}
      </dl>

      <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
        Pro-rated when you change plans or seat count. Taxes calculated at checkout.
      </span>
    </div>
  );
}

function SummaryRow({
  label, value, bold = false, savings = false,
}: { label: string; value: string; bold?: boolean; savings?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{
        color: bold ? 'var(--fg-strong)' : 'var(--fg-muted)',
        fontWeight: bold ? 600 : 400,
      }}>
        {label}
      </span>
      <span
        className="font-mono"
        style={{
          color: savings ? 'var(--intent-success-fg)' : bold ? 'var(--fg-strong)' : 'var(--fg-default)',
          fontWeight: bold ? 600 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}
