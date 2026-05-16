import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { TAX_IDS, type TaxId } from './data';

// Tax IDs section. Sits inside the page-level Section primitive so this
// component renders only the body — header / anchor handled upstream.
export function TaxSection() {
  const [items, setItems] = useState<TaxId[]>(TAX_IDS);

  const verify = (id: string) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, verified: true } : t)));
  };
  const remove = (id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[12px] leading-relaxed max-w-[560px]" style={{ color: 'var(--fg-muted)' }}>
        Tax IDs registered here appear on every invoice and unlock reverse-charge
        / zero-rated VAT where applicable. Withholding tax must be claimed
        separately by your finance team.
      </p>

      <div className="flex flex-col">
        {items.map((t, i) => (
          <TaxRow
            key={t.id}
            tax={t}
            top={i === 0}
            onVerify={() => { verify(t.id); }}
            onRemove={() => { remove(t.id); }}
          />
        ))}
      </div>

      <button
        type="button"
        className="self-start inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors"
        style={{
          color: 'var(--fg-default)',
          background: 'transparent',
          border: '1px dashed var(--border-default)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Plus className="w-3 h-3" />
        Add tax ID
      </button>
    </div>
  );
}

function TaxRow({
  tax, top, onVerify, onRemove,
}: { tax: TaxId; top: boolean; onVerify: () => void; onRemove: () => void }) {
  return (
    <div
      className="group flex items-center gap-4 h-11 px-2 -mx-2 rounded-md transition-colors"
      style={{
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <CountryGlyph code={tax.country} />
      <span
        className="text-[12px] font-medium w-[140px] shrink-0"
        style={{ color: 'var(--fg-strong)' }}
      >
        {tax.countryName}
      </span>
      <span
        className="font-mono text-[10px] uppercase tracking-[0.08em] w-[70px] shrink-0"
        style={{ color: 'var(--fg-muted)' }}
      >
        {tax.type}
      </span>
      <span
        className="font-mono text-[11px] tabular-nums flex-1 truncate"
        style={{ color: 'var(--fg-default)' }}
      >
        {tax.value}
      </span>

      {tax.verified ? (
        <span
          className="inline-flex items-center gap-1 text-[11px]"
          style={{ color: 'var(--intent-success-fg)' }}
        >
          <Check className="w-3 h-3" />
          Verified
        </span>
      ) : (
        <button
          type="button"
          onClick={onVerify}
          className="text-[11px] font-medium transition-opacity"
          style={{ color: 'var(--brand-fg)' }}
        >
          Verify
        </button>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${tax.type} ${tax.value}`}
        className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-6 h-6 rounded"
        style={{ color: 'var(--fg-subtle)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-active)';
          e.currentTarget.style.color = 'var(--intent-danger-fg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--fg-subtle)';
        }}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// Same density / treatment as the Visa / MC monogram in PaymentList — keeps
// rows visually aligned across the whole page.
function CountryGlyph({ code }: { code: string }) {
  return (
    <span
      className="w-7 h-5 rounded text-[9px] font-mono font-bold flex items-center justify-center shrink-0"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {code}
    </span>
  );
}
