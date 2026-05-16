import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from 'react';
import { Pin, Plus, X } from 'lucide-react';
import { useTheme } from '@shared/theme';
import { useWorkspaceTabsStore, type WorkspaceTab } from '../model/store';
import { TAB_REGISTRY } from '@app/router/workspaceTabsRegistry';
import { useNavigateToTab } from './WorkspaceTabsHost';
import AddTabModal from './AddTabModal';

const TAB_WIDTH_FIXED = 152;
const CLOSE_WIDTH_THRESHOLD = 132;
const CLOSE_MAGNET_MAX_SHIFT = 10;
type TabDensity = 'comfortable';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function getResolvedLabel(tab: WorkspaceTab, tabs: WorkspaceTab[]): string {
  const base = tab.label ?? TAB_REGISTRY[tab.kind].label;
  if (tab.label) return base;
  const peers = tabs.filter((t) => t.kind === tab.kind);
  if (peers.length <= 1) return base;
  const ordinal = peers.findIndex((t) => t.id === tab.id) + 1;
  return `${base} ${ordinal}`;
}

function getRecentOrder(tabs: WorkspaceTab[], activeId: string): string[] {
  const ordered = [...tabs]
    .sort((a, b) => (b.lastFocusedAt ?? 0) - (a.lastFocusedAt ?? 0))
    .map((tab) => tab.id);
  return [activeId, ...ordered.filter((id) => id !== activeId)];
}

export default function WorkspaceTabsStrip() {
  const tabs = useWorkspaceTabsStore((s) => s.tabs);
  const activeId = useWorkspaceTabsStore((s) => s.activeId);
  const setActive = useWorkspaceTabsStore((s) => s.setActive);
  const close = useWorkspaceTabsStore((s) => s.close);
  const reorder = useWorkspaceTabsStore((s) => s.reorder);
  const focusRelative = useWorkspaceTabsStore((s) => s.focusRelative);
  const navigateToTab = useNavigateToTab();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [focusId, setFocusId] = useState(activeId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [closeCarry, setCloseCarry] = useState<{ id: string; shiftX: number } | null>(null);
  const [viewport, setViewport] = useState({ width: 0, scrollLeft: 0, scrollWidth: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const recentCycleRef = useRef<{ order: string[]; index: number; modifier: 'meta' | 'ctrl' } | null>(null);
  const pointerRef = useRef<{ inside: boolean; clientX: number; clientY: number }>({
    inside: false,
    clientX: 0,
    clientY: 0,
  });

  const visibleTabs = tabs;
  const labelMap = useMemo(
    () => new Map(tabs.map((tab) => [tab.id, getResolvedLabel(tab, tabs)])),
    [tabs],
  );

  const scrollTabIntoView = useCallback((id: string, behavior: ScrollBehavior = 'smooth') => {
    const tabEl = itemRefs.current[id];
    const scrollEl = scrollRef.current;
    if (!tabEl || !scrollEl) return;

    // Left/right fade gradients overlay the strip when it's scrollable
    // (see fade <div>s below — both w-8 = 32px). `scrollIntoView` with
    // `inline: 'nearest'` only checks raw visibility, so it leaves the
    // active tab tucked underneath a fade where its label is hidden.
    // Hand-roll the math so the active tab is fully clear of both fades.
    const FADE = 32;
    const tabLeft = tabEl.offsetLeft;
    const tabRight = tabLeft + tabEl.offsetWidth;
    const viewLeft = scrollEl.scrollLeft;
    const viewRight = viewLeft + scrollEl.clientWidth;

    let nextLeft = viewLeft;
    if (tabLeft < viewLeft + FADE) {
      nextLeft = Math.max(0, tabLeft - FADE);
    } else if (tabRight > viewRight - FADE) {
      nextLeft = tabRight - scrollEl.clientWidth + FADE;
    } else {
      return;
    }
    scrollEl.scrollTo({ left: nextLeft, behavior });
  }, []);

  const activate = useCallback((tab: WorkspaceTab, behavior: ScrollBehavior = 'smooth') => {
    setActive(tab.id);
    setFocusId(tab.id);
    navigateToTab(tab.kind, tab.id);
    requestAnimationFrame(() => {
      itemRefs.current[tab.id]?.focus();
      scrollTabIntoView(tab.id, behavior);
    });
  }, [navigateToTab, scrollTabIntoView, setActive]);

  const updateViewport = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewport({
      width: el.clientWidth,
      scrollLeft: el.scrollLeft,
      scrollWidth: el.scrollWidth,
    });
  }, []);

  const resolveTabUnderPointer = useCallback((): string | null => {
    if (!pointerRef.current.inside) return null;
    const { clientX, clientY } = pointerRef.current;
    for (const tab of useWorkspaceTabsStore.getState().tabs) {
      const el = itemRefs.current[tab.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return tab.id;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    updateViewport();
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => { updateViewport(); };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });
    const ro = new ResizeObserver(() => { updateViewport(); });
    ro.observe(el);
    if (rowRef.current) ro.observe(rowRef.current);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('wheel', onWheel);
      ro.disconnect();
    };
  }, [tabs.length, updateViewport]);

  if (!tabs.some((tab) => tab.id === focusId) && focusId !== activeId) {
    setFocusId(activeId);
  }

  useEffect(() => {
    scrollTabIntoView(activeId);
  }, [activeId, scrollTabIntoView]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (isEditableTarget(e.target)) return;

      // Cmd/Ctrl + Shift + Arrow → move the active tab left/right.
      // Keyboard counterpart to drag-drop reorder; without this, users
      // who can't use a mouse have no way to reorganise their strip.
      if (
        e.shiftKey &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
        visibleTabs.length > 1
      ) {
        e.preventDefault();
        const latest = useWorkspaceTabsStore.getState();
        const idx = latest.tabs.findIndex((t) => t.id === latest.activeId);
        if (idx === -1) return;
        const dir = e.key === 'ArrowLeft' ? -1 : 1;
        const target = idx + dir;
        if (target < 0 || target >= latest.tabs.length) return;
        // Respect the pinned/unpinned partition — Linear keeps pinned
        // tabs anchored on the left, so a reorder across the boundary
        // would silently rearrange the user's pin order. Refuse to
        // cross until they explicitly pin/unpin.
        const moving = latest.tabs[idx];
        const swapWith = latest.tabs[target];
        if (Boolean(moving.pinned) !== Boolean(swapWith.pinned)) return;
        reorder(moving.id, target);
        requestAnimationFrame(() => {
          itemRefs.current[moving.id]?.focus();
          scrollTabIntoView(moving.id);
        });
        return;
      }

      if (e.key !== 'Tab' || visibleTabs.length <= 1) return;
      e.preventDefault();
      const modifier: 'meta' | 'ctrl' = e.metaKey ? 'meta' : 'ctrl';
      let cycle = recentCycleRef.current;
      if (cycle?.modifier !== modifier) {
        cycle = { order: getRecentOrder(visibleTabs, activeId), index: 0, modifier };
      }
      cycle.index = (cycle.index + (e.shiftKey ? -1 : 1) + cycle.order.length) % cycle.order.length;
      recentCycleRef.current = cycle;
      const latest = useWorkspaceTabsStore.getState();
      const next = latest.tabs.find((tab) => tab.id === cycle.order[cycle.index]);
      if (!next) {
        focusRelative(e.shiftKey ? -1 : 1);
        return;
      }
      activate(next, 'auto');
      setFocusId(next.id);
      requestAnimationFrame(() => {
        itemRefs.current[next.id]?.focus();
        scrollTabIntoView(next.id);
      });
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') recentCycleRef.current = null;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [activate, activeId, focusRelative, reorder, scrollTabIntoView, visibleTabs]);

  const tabWidth = TAB_WIDTH_FIXED;
  const density: TabDensity = 'comfortable';
  const tabsOverflow = viewport.scrollWidth > viewport.width + 2;
  const canScrollLeft = viewport.scrollLeft > 1;
  const canScrollRight = viewport.scrollLeft + viewport.width < viewport.scrollWidth - 1;

  const requestClose = useCallback((tabId: string) => {
    const idx = tabs.findIndex((tab) => tab.id === tabId);
    const fallback = tabs[idx + 1]?.id ?? tabs[idx - 1]?.id ?? activeId;
    const pointerWasInside = pointerRef.current.inside;
    close(tabId);
    const latest = useWorkspaceTabsStore.getState();
    const nextFocus = latest.activeId || fallback;
    if (focusId === tabId && nextFocus) {
      setFocusId(nextFocus);
      requestAnimationFrame(() => { itemRefs.current[nextFocus]?.focus(); });
    }
    if (pointerWasInside) {
      requestAnimationFrame(() => {
        const underPointer = resolveTabUnderPointer();
        if (!underPointer) {
          setCloseCarry(null);
          return;
        }
        const el = itemRefs.current[underPointer];
        const rect = el?.getBoundingClientRect();
        const closeCenter = rect ? rect.right - 18 : pointerRef.current.clientX;
        setCloseCarry({
          id: underPointer,
          shiftX: clamp(pointerRef.current.clientX - closeCenter, -CLOSE_MAGNET_MAX_SHIFT, CLOSE_MAGNET_MAX_SHIFT),
        });
        setHoveredId(underPointer);
      });
    }
  }, [activeId, close, focusId, resolveTabUnderPointer, tabs]);

  const moveFocus = useCallback((tab: WorkspaceTab | undefined) => {
    if (!tab) return;
    activate(tab);
  }, [activate]);

  return (
    <>
      <div
        data-tauri-drag-region="false"
        className="flex min-w-0 flex-1 items-center gap-1"
        role="tablist"
        aria-label="Workspace tabs"
      >
        <div
          ref={scrollRef}
          className="relative flex min-w-0 max-w-full shrink overflow-x-auto scrollbar-hide"
          onPointerMove={(e) => {
            pointerRef.current = { inside: true, clientX: e.clientX, clientY: e.clientY };
            if (closeCarry) setCloseCarry(null);
          }}
          onPointerLeave={() => {
            pointerRef.current.inside = false;
            setHoveredId(null);
            setCloseCarry(null);
          }}
        >
          {tabsOverflow ? (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 z-[3] w-8 transition-opacity"
                style={{
                  opacity: canScrollLeft ? 1 : 0,
                  background: 'linear-gradient(to right, color-mix(in srgb, var(--bg-overlay) 92%, transparent), transparent)',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 z-[3] w-8 transition-opacity"
                style={{
                  opacity: canScrollRight ? 1 : 0,
                  background: 'linear-gradient(to left, color-mix(in srgb, var(--bg-overlay) 92%, transparent), transparent)',
                }}
              />
            </>
          ) : null}
          <div ref={rowRef} className="relative flex min-w-max items-stretch gap-0.5 pl-2 pr-1">
            {tabs.map((tab, i) => (
              <TabChip
                key={tab.id}
                ref={(el) => { itemRefs.current[tab.id] = el; }}
                tab={tab}
                label={labelMap.get(tab.id) ?? TAB_REGISTRY[tab.kind].label}
                index={i}
                active={tab.id === activeId}
                focused={tab.id === focusId}
                canClose={tabs.length > 1}
                density={density}
                width={tabWidth}
                showTrailingDivider={i < tabs.length - 1 && tab.id !== activeId && tabs[i + 1]?.id !== activeId}
                showCloseHint={hoveredId === tab.id || closeCarry?.id === tab.id}
                carryShiftX={closeCarry?.id === tab.id ? closeCarry.shiftX : 0}
                hovered={hoveredId === tab.id}
                onFocus={() => { setFocusId(tab.id); }}
                onHoverStart={() => { setHoveredId(tab.id); }}
                onHoverEnd={() => { setHoveredId((prev) => (prev === tab.id ? null : prev)); }}
                onActivate={() => { activate(tab); }}
                onClose={() => { requestClose(tab.id); }}
                onReorder={reorder}
                onMoveFocus={(delta) => {
                  const nextIndex = (i + delta + tabs.length) % tabs.length;
                  moveFocus(tabs[nextIndex]);
                }}
                onMoveEdge={(edge) => {
                  moveFocus(edge === 'start' ? tabs[0] : tabs[tabs.length - 1]);
                }}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setPickerOpen(true); }}
          aria-label="Open new tab"
          title="New tab"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:[background:var(--bg-hover)]"
          style={{ color: 'var(--fg-subtle)', opacity: 0.82 }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <AddTabModal open={pickerOpen} onClose={() => { setPickerOpen(false); }} />
    </>
  );
}

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

const TabChip = forwardRef<HTMLDivElement, TabChipProps>(function TabChip({
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
  const Icon = TAB_REGISTRY[tab.kind].icon;
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
            background: 'var(--brand-vivid)',
            [dropSide === 'left' ? 'left' : 'right']: -1,
          }}
        />
      ) : null}
      {/* No inter-tab dividers in the Linear pattern — pills handle their own
          separation via the gap between them. */}
    </div>
  );
});
