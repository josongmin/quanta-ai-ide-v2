import { forwardRef, useState, type CSSProperties, type DragEvent } from 'react';
import { Pin, X } from 'lucide-react';
import { useTheme } from '@shared/theme';
import type { WorkspaceTab } from '../../model/store';
import { useWorkspaceTabsRegistry } from '../../model/RegistryContext';
import { CLOSE_WIDTH_THRESHOLD, type TabDensity } from './types';

type TabChipProps = {
  tab: WorkspaceTab;
  label: string;
  index: number;
  active: boolean;
  focused: boolean;
  hovered: boolean;
  canClose: boolean;
  density: TabDensity;
  width: number;
  showTrailingDivider: boolean;
  showCloseHint: boolean;
  carryShiftX: number;
  onFocus: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onActivate: () => void;
  onClose: () => void;
  onReorder: (id: string, toIndex: number) => void;
  onMoveFocus: (delta: number) => void;
  onMoveEdge: (edge: 'start' | 'end') => void;
};

export const TabChip = forwardRef<HTMLDivElement, TabChipProps>(function TabChip({
  tab,
  label,
  index,
  active,
  focused,
  hovered,
  canClose,
  density,
  width,
  showTrailingDivider: _showTrailingDivider,
  showCloseHint,
  carryShiftX,
  onFocus,
  onHoverStart,
  onHoverEnd,
  onActivate,
  onClose,
  onReorder,
  onMoveFocus,
  onMoveEdge,
}, ref) {
  const tabRegistry = useWorkspaceTabsRegistry();
  const Icon = tabRegistry[tab.kind].icon;
  const { isDark } = useTheme();
  const [dropSide, setDropSide] = useState<'left' | 'right' | null>(null);
  const resolvedWidth = width;
  const showLabel = true;
  const reserveCloseSlot = true;
  const showCloseButton = width >= CLOSE_WIDTH_THRESHOLD || active || showCloseHint;
  const magneticShift = showCloseHint ? carryShiftX : 0;
  // Linear pattern: floating pills inside the header, no docking, no chrome
  // baseline trick. Active = solid surface pill with hairline + subtle drop;
  // inactive = ghosted slot (hairline border at low alpha) so the user
  // perceives the click target before hovering. Hover lifts inactive to a
  // faint fill. All four corners rounded on every state.
  //
  // Light-mode active inverts to ink-black surface + white text — selection
  // is "the dark one in a sea of light", the cleanest possible emphasis.
  // Dark mode keeps the existing white-pill treatment (already inverted).
  const invertedActive = active && !isDark;
  const shellStyle: CSSProperties = active
    ? (invertedActive
        ? {
            background: 'var(--fg-strong)',
            border: '1px solid var(--fg-strong)',
            borderRadius: 8,
            boxShadow: '0 1px 2px rgba(15,23,42,0.10), 0 4px 12px -3px rgba(15,23,42,0.18)',
          }
        : {
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-sm)',
          })
    : {
        background: hovered
          ? 'color-mix(in srgb, var(--bg-hover) 80%, transparent)'
          : 'color-mix(in srgb, var(--bg-surface-muted) 55%, transparent)',
        border: '1px solid color-mix(in srgb, var(--border-muted) 75%, transparent)',
        borderRadius: 8,
      };

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/x-workspace-tab', tab.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('text/x-workspace-tab')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    setDropSide(e.clientX < rect.left + rect.width / 2 ? 'left' : 'right');
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    const sourceId = e.dataTransfer.getData('text/x-workspace-tab');
    setDropSide(null);
    if (!sourceId || sourceId === tab.id) return;
    e.preventDefault();
    onReorder(sourceId, dropSide === 'right' ? index + 1 : index);
  };

  return (
    <div
      ref={ref}
      role="tab"
      aria-selected={active}
      tabIndex={focused ? 0 : -1}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={() => { setDropSide(null); }}
      onDrop={handleDrop}
      onFocus={onFocus}
      onPointerEnter={onHoverStart}
      onPointerLeave={onHoverEnd}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          onMoveFocus(1);
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onMoveFocus(-1);
          return;
        }
        if (e.key === 'Home') {
          e.preventDefault();
          onMoveEdge('start');
          return;
        }
        if (e.key === 'End') {
          e.preventDefault();
          onMoveEdge('end');
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
        if ((e.key === 'w' || e.key === 'W') && (e.metaKey || e.ctrlKey) && canClose) {
          e.preventDefault();
          onClose();
        }
      }}
      onAuxClick={(e) => {
        if (e.button === 1 && canClose) {
          e.preventDefault();
          onClose();
        }
      }}
      className="group relative shrink-0 select-none outline-none"
      style={{
        width: resolvedWidth,
        transform: `translateX(${(dropSide === 'left' ? 6 : dropSide === 'right' ? -6 : 0) + magneticShift}px)`,
        transition: 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
        zIndex: active ? 3 : 1,
      }}
      title={label}
    >
      <div
        aria-hidden="true"
        className="absolute pointer-events-none transition-colors"
        style={{
          ...shellStyle,
          // Pills fill their row height; the row itself is centered inside
          // the GNB so the breathing room top/bottom comes from the header,
          // not from inset offsets here.
          top: 0,
          bottom: 0,
          left: 2,
          right: 2,
          transition: 'background-color 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
        }}
      />
      <div
        className="relative z-[1] flex h-8 items-center gap-1.5 px-3 transition-colors"
        style={{
          // Active in light mode = white-on-ink; everywhere else = neutral
          // ink-on-canvas with weight/tracking still doing the lifting on
          // inactive tabs.
          color: invertedActive
            ? 'var(--fg-on-accent)'
            : active
              ? 'var(--fg-strong)'
              : 'color-mix(in srgb, var(--fg-muted) 80%, transparent)',
          borderRadius: 6,
        }}
      >
        <span
          className="relative shrink-0"
          style={{ opacity: active ? 1 : 0.62 }}
        >
          <Icon className="h-[13px] w-[13px]" />
          {tab.dirty ? (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--intent-warn-fg)' }}
            />
          ) : null}
        </span>
        {showLabel ? (
          <span
            className={`min-w-0 flex-1 truncate ${
              density === 'comfortable' ? 'text-[12px]' : 'text-[11px]'
            }`}
            style={{
              fontWeight: active ? 650 : 500,
              letterSpacing: active ? '-0.008em' : '0.005em',
            }}
          >
            {label}
          </span>
        ) : null}
        {tab.pinned ? (
          <Pin
            className="h-[11px] w-[11px] shrink-0"
            style={{
              color: invertedActive
                ? 'color-mix(in srgb, var(--fg-on-accent) 70%, transparent)'
                : active ? 'var(--fg-muted)' : 'var(--fg-subtle)',
              opacity: 0.85,
            }}
          />
        ) : null}
        {reserveCloseSlot ? (
          <span className="ml-auto flex w-[18px] shrink-0 justify-center">
            {canClose && showCloseButton ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                aria-label={`Close ${label}`}
                title="Close tab"
                className={`rounded-md p-0.5 transition-all ${
                  invertedActive
                    ? 'hover:[background:rgba(255,255,255,0.12)]'
                    : 'hover:[background:color-mix(in_srgb,var(--bg-hover)_80%,transparent)]'
                } ${
                  active
                    ? 'opacity-62'
                    : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                }`}
                style={{
                  color: invertedActive
                    ? 'color-mix(in srgb, var(--fg-on-accent) 75%, transparent)'
                    : 'var(--fg-subtle)',
                  transform: showCloseHint ? 'scale(1.06)' : undefined,
                }}
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </span>
        ) : null}
      </div>

      {dropSide ? (
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 w-[2px]"
          style={{
            background: 'var(--fg-accent)',
            [dropSide === 'left' ? 'left' : 'right']: -1,
          }}
        />
      ) : null}
      {/* No inter-tab dividers in the Linear pattern — pills handle their own
          separation via the gap between them. */}
    </div>
  );
});
