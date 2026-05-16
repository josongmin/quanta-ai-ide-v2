import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import type { PaymentMethod } from './data';

type Props = { methods: PaymentMethod[] };

const BRAND: Record<PaymentMethod['brand'], string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
};

export function PaymentList({ methods }: Props) {
  const [items, setItems] = useState(methods);
  const setDefault = (id: string) => {
    setItems((prev) => prev.map((m) => ({ ...m, default: m.id === id })));
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col">
        {items.map((m, i) => (
          <PaymentRow
            key={m.id}
            method={m}
            top={i === 0}
            onMakeDefault={() => { setDefault(m.id); }}
          />
        ))}
      </div>

      <button
        type="button"
        className="mt-3 self-start inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors"
        style={{
          color: 'var(--fg-default)',
          background: 'transparent',
          border: '1px dashed var(--border-default)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Plus className="w-3 h-3" />
        Add payment method
      </button>
    </div>
  );
}

function PaymentRow({
  method, top, onMakeDefault,
}: { method: PaymentMethod; top: boolean; onMakeDefault: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="group flex items-center gap-4 h-11 px-2 -mx-2 rounded-md transition-colors"
      style={{
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <BrandGlyph brand={method.brand} />
      <span
        className="text-[12px] font-medium tabular-nums"
        style={{ color: 'var(--fg-strong)' }}
      >
        {BRAND[method.brand]} ···· {method.last4}
      </span>
      <span className="text-[11px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
        Exp {method.exp}
      </span>
      <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
        {method.holder}
      </span>
      {method.default && (
        <span
          className="text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{ color: 'var(--brand-fg)' }}
        >
          Default
        </span>
      )}
      <span className="flex-1" />
      {!method.default && (
        <button
          type="button"
          onClick={onMakeDefault}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-medium"
          style={{ color: 'var(--fg-link)' }}
        >
          Make default
        </button>
      )}
    </div>
  );
}

// Tiny brand mark — text only, monospace caps. Lighter than a fake logo and
// reads at the same density as the rest of the row.
function BrandGlyph({ brand }: { brand: PaymentMethod['brand'] }) {
  const label = brand === 'amex' ? 'AX' : brand === 'mastercard' ? 'MC' : 'VS';
  return (
    <span
      className="w-7 h-5 rounded text-[9px] font-mono font-bold flex items-center justify-center shrink-0"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {label}
    </span>
  );
}
