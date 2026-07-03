import { ChevronRight, type LucideIcon } from 'lucide-react';
import { ACCENT_TINT_BG, ACCENT_TEXT, ACCENT_TINT_RING } from './shared';
import { useOverlayKeyboardNav } from './useOverlayKeyboardNav';
import { ROW_ORDER, type RailRowData, type RowId } from './types';

// Master-detail left rail with roving-tablist arrow-key navigation.
export function Rail({
  rows, selected, onSelect,
}: {
  rows: RailRowData[];
  selected: RowId;
  onSelect: (id: RowId) => void;
}) {
  const { railRef, onKeyDown } = useOverlayKeyboardNav({
    order: ROW_ORDER,
    selected,
    onSelect,
  });

  return (
    <div
      ref={railRef}
      onKeyDown={onKeyDown}
      className="shrink-0 w-[220px] py-1.5 border-r border-[var(--border-default)]"
      role="tablist"
      aria-orientation="vertical"
    >
      {rows.map((row) => (
        <RailRow
          key={row.id}
          rowId={row.id}
          icon={row.icon}
          iconColor={row.iconColor}
          label={row.label}
          value={row.value}
          on={row.on}
          selected={selected === row.id}
          onSelect={() => { onSelect(row.id); }}
        />
      ))}
    </div>
  );
}

function RailRow({
  rowId, icon: Icon, iconColor, label, value, on, selected, onSelect,
}: {
  rowId: RowId;
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: string;
  on: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  // Selection takes precedence over on-state for the surface — that way the
  // user always sees which row drives the right-pane content. The on-state
  // carries through the icon tint and the "ON" pill (no left-edge stripe
  // per project convention).
  const surface = selected
    ? 'bg-[var(--bg-active)]'
    : 'hover:bg-[var(--bg-hover)]';
  const labelColor = selected || on
    ? 'text-[var(--fg-strong)]'
    : 'text-[var(--fg-default)]';
  const valueColor = on
    ? 'text-[var(--fg-default)]'
    : 'text-[var(--fg-subtle)]';

  return (
    <button
      type="button"
      role="tab"
      data-row-id={rowId}
      tabIndex={selected ? 0 : -1}
      aria-selected={selected}
      onClick={onSelect}
      className={`relative w-full text-left px-3 py-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--fg-accent)] ${surface}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: on ? iconColor : undefined }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-black uppercase tracking-eyebrow leading-tight ${labelColor}`}>
              {label}
            </span>
            {on && <OnPill />}
          </div>
          <div className={`mt-0.5 text-xs truncate ${valueColor}`}>{value}</div>
        </div>
        <ChevronRight className={`w-3 h-3 shrink-0 ${
          selected ? 'text-[var(--fg-default)]' : 'text-[var(--fg-subtle)]'
        }`} />
      </div>
    </button>
  );
}

function OnPill() {
  return (
    <span
      className="text-2xs font-black uppercase tracking-eyebrow px-1 py-px rounded leading-none"
      style={{
        background: ACCENT_TINT_BG,
        color: ACCENT_TEXT,
        boxShadow: `inset 0 0 0 1px ${ACCENT_TINT_RING}`,
      }}
    >
      on
    </span>
  );
}
