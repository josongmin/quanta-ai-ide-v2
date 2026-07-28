import type { GlobalTokenSections } from '@shared/tokens';
import { humanizeKey, isCssColor, isHexColor } from './colorUtils';

export function GlobalTokenGroup<S extends keyof GlobalTokenSections>({
  section,
  title,
  values,
  onChange,
}: {
  section: S;
  title: string;
  values: GlobalTokenSections[S];
  onChange: <K extends keyof GlobalTokenSections[S]>(key: K, value: GlobalTokenSections[S][K]) => void;
}) {
  // Every leaf in GlobalTokenSections is a `string | number` primitive; type the
  // Object.entries boundary to that union so the editable value flows cleanly
  // into TokenField (the precise per-key type is re-narrowed in onChange below).
  const entries = Object.entries(values) as [keyof GlobalTokenSections[S], string | number][];
  return (
    <div
      className="rounded-xl border p-3 space-y-2"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <div
        className="text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: 'var(--fg-muted)' }}
      >
        {title}
      </div>

      {entries.map(([key, value]) => (
        <div key={`${section}-${String(key)}`} className="space-y-1.5">
          <div className="text-[10px] font-mono" style={{ color: 'var(--fg-muted)' }}>
            {humanizeKey(String(key))}
          </div>
          <TokenField
            label={humanizeKey(String(key))}
            value={value}
            onChange={(next) => {
              // Every leaf in GlobalTokenSections is string | number; we mirror
              // the existing value's kind. TS can't correlate the runtime
              // typeof-check with the indexed property type, so a single cast
              // bridges the matching primitive union to the precise key type.
              const coerced = typeof value === 'number' ? Number(next) : next;
              onChange(key, coerced as GlobalTokenSections[S][typeof key]);
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function TokenField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string | number;
  onChange: (next: string) => void;
}) {
  const text = typeof value === 'number' ? String(value) : value;
  const hex = isHexColor(text);
  const colorPreview = isCssColor(text);

  return (
    <div
      className="rounded-lg border p-2"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2">
        {hex && (
          <input
            type="color"
            value={text}
            onChange={(e) => { onChange(e.target.value); }}
            className="w-7 h-7 rounded-md cursor-pointer bg-transparent shrink-0"
            aria-label={label ? `${label} color picker` : 'Token color picker'}
          />
        )}
        {!hex && colorPreview && (
          <span
            className="w-4 h-4 rounded-md border shrink-0"
            style={{
              background: text,
              borderColor: 'var(--border-default)',
            }}
            aria-hidden
          />
        )}
        <input
          type={typeof value === 'number' ? 'number' : 'text'}
          value={text}
          step={typeof value === 'number' ? '0.01' : undefined}
          onChange={(e) => { onChange(e.target.value); }}
          className="w-full rounded-md border px-2 py-1.5 text-[11px] font-mono bg-transparent outline-none"
          style={{
            borderColor: 'var(--border-muted)',
            color: 'var(--fg-default)',
          }}
          aria-label={label ? `${label} value` : 'Token value'}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
