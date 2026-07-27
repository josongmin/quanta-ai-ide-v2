import type { WorkspaceTab } from '../../model/store';

export const TAB_WIDTH_FIXED = 152;
export const CLOSE_WIDTH_THRESHOLD = 132;
export const CLOSE_MAGNET_MAX_SHIFT = 10;
export type TabDensity = 'comfortable';

export { clamp, isEditableTarget } from '@shared/lib';

// `titleFor` resolves a surfaceId to its (localized) display title — injected so
// this stays a pure function while the caller owns the i18n lookup.
export function getResolvedLabel(
  tab: WorkspaceTab,
  tabs: WorkspaceTab[],
  titleFor: (surfaceId: string) => string,
): string {
  const base = tab.label ?? titleFor(tab.surfaceId);
  if (tab.label) return base;
  const peers = tabs.filter((t) => t.surfaceId === tab.surfaceId);
  if (peers.length <= 1) return base;
  const ordinal = peers.findIndex((t) => t.id === tab.id) + 1;
  return `${base} ${ordinal}`;
}

export function getRecentOrder(tabs: WorkspaceTab[], activeId: string): string[] {
  const ordered = [...tabs]
    .sort((a, b) => (b.lastFocusedAt ?? 0) - (a.lastFocusedAt ?? 0))
    .map((tab) => tab.id);
  return [activeId, ...ordered.filter((id) => id !== activeId)];
}
