import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getTabMeta } from '@shared/config/workspaceTabs';
import { useWorkspaceTabsStore, type WorkspaceTab } from '../model/store';
import { useNavigateToTab } from './WorkspaceTabsHost';
import AddTabModal from './AddTabModal';
import { TabChip } from './parts/TabChip';
import { EdgeFades } from './parts/EdgeFades';
import { NewTabButton } from './parts/NewTabButton';
import {
  TAB_WIDTH_FIXED,
  CLOSE_MAGNET_MAX_SHIFT,
  type TabDensity,
  clamp,
  isEditableTarget,
  getResolvedLabel,
  getRecentOrder,
} from './parts/types';

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
        <div className="relative flex min-w-0 max-w-full shrink">
          <div
            ref={scrollRef}
            className="flex min-w-0 w-full overflow-x-auto scrollbar-hide"
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
          <div ref={rowRef} className="relative flex min-w-max items-stretch gap-0.5 pl-2 pr-1">
            {tabs.map((tab, i) => (
              <TabChip
                key={tab.id}
                ref={(el) => { itemRefs.current[tab.id] = el; }}
                tab={tab}
                label={labelMap.get(tab.id) ?? getTabMeta(tab.kind).label}
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
          {tabsOverflow ? (
            <EdgeFades canScrollLeft={canScrollLeft} canScrollRight={canScrollRight} />
          ) : null}
        </div>

        <NewTabButton onClick={() => { setPickerOpen(true); }} />
      </div>

      <AddTabModal open={pickerOpen} onClose={() => { setPickerOpen(false); }} />
    </>
  );
}
