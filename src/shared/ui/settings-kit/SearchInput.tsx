import { Search, X } from 'lucide-react';

// Search box used 7+ times across settings/admin pages: a muted-surface pill
// with a leading magnifier, a transparent input, and a trailing clear-X that
// appears once there's a value.
//
// Defaults reproduce the LabelsPage / MembersPage toolbar search (h-8,
// minWidth 240). `height` + `minWidth` are tunable for the few sites that use
// a roomier h-9 full-width variant (e.g. SecretsPage). No business logic — the
// caller owns the filtering.

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Called on clear-X click. Defaults to `onChange('')`. */
  onClear?: () => void;
  /** Pill height in px. Defaults to 32 (h-8). */
  height?: number;
  /** Min width in px. Defaults to 240. */
  minWidth?: number;
  /** Stretch to fill the parent instead of using minWidth. */
  fullWidth?: boolean;
  ariaLabel?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  onClear,
  height = 32,
  minWidth = 240,
  fullWidth = false,
  ariaLabel = 'Clear search',
}: Props) {
  return (
    <div
      className="flex items-center gap-2 px-2.5 rounded-md"
      style={{
        height,
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
        ...(fullWidth ? { width: '100%' } : { minWidth }),
      }}
    >
      <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-[12px] min-w-0"
        style={{ color: 'var(--fg-strong)' }}
      />
      {value && (
        <button
          type="button"
          onClick={() => { (onClear ?? (() => { onChange(''); }))(); }}
          className="shrink-0"
          style={{ color: 'var(--fg-subtle)' }}
          aria-label={ariaLabel}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
