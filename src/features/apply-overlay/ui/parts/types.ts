import type { LucideIcon } from 'lucide-react';

// Overlay categories surfaced as rows in the master-detail rail. Time window
// is intentionally absent — it's a child control of the heat metric, not a
// top-level row (see OverlayPopover header comment).
export type RowId = 'heat' | 'risk' | 'api' | 'boundaries';

export const ROW_ORDER: RowId[] = ['heat', 'risk', 'api', 'boundaries'];

export type RailRowData = {
  id: RowId;
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: string;
  on: boolean;
};
