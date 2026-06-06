import { useAdmissionStore } from './store';
import type {
  OverrideEntry,
  SuppressionEntry,
} from './store';
import type { AdmissionRule, RuleSeverity } from '@entities/admission';

// Focused facade hooks over the (deliberately wide) AdmissionStore.
//
// The store exposes 30+ methods so every concern can reach the single source
// of truth — but most consumers only need a handful. Pulling the whole store
// (or a long list of individual selectors) couples a component to surface it
// never touches and re-subscribes it to slices it doesn't read (ISP problem).
//
// Each hook below returns *only* the slice a given role needs, composed from
// `useAdmissionStore` selectors. The store's shape and behavior are unchanged;
// this is purely a narrowing/segregation layer. Hooks are exported so any
// consumer (v2 tree included) can opt in.

// ── Rule list / table actions ──────────────────────────────────────────
// Toggling, removing, upserting, and opening the editor on a single rule.
export type RuleListActions = {
  rules: AdmissionRule[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
  upsert: (rule: AdmissionRule) => void;
  openEditor: (id: string | null) => void;
};
export function useRuleListActions(): RuleListActions {
  const rules = useAdmissionStore((s) => s.rules);
  const toggle = useAdmissionStore((s) => s.toggle);
  const remove = useAdmissionStore((s) => s.remove);
  const upsert = useAdmissionStore((s) => s.upsert);
  const openEditor = useAdmissionStore((s) => s.openEditor);
  return { rules, toggle, remove, upsert, openEditor };
}

// ── Bulk selection + bulk mutations (Rules page table) ──────────────────
export type BulkActions = {
  selection: Set<string>;
  selectToggle: (id: string) => void;
  selectClear: () => void;
  selectAll: (ids: string[]) => void;
  bulkSetSeverity: (severity: RuleSeverity) => void;
  bulkSetEnabled: (enabled: boolean) => void;
  bulkRemove: () => void;
};
export function useBulkActions(): BulkActions {
  const selection = useAdmissionStore((s) => s.selection);
  const selectToggle = useAdmissionStore((s) => s.selectToggle);
  const selectClear = useAdmissionStore((s) => s.selectClear);
  const selectAll = useAdmissionStore((s) => s.selectAll);
  const bulkSetSeverity = useAdmissionStore((s) => s.bulkSetSeverity);
  const bulkSetEnabled = useAdmissionStore((s) => s.bulkSetEnabled);
  const bulkRemove = useAdmissionStore((s) => s.bulkRemove);
  return {
    selection,
    selectToggle,
    selectClear,
    selectAll,
    bulkSetSeverity,
    bulkSetEnabled,
    bulkRemove,
  };
}

// ── Override / suppression ledger (Gate action plan + audit views) ──────
export type OverrideAudit = {
  overrides: OverrideEntry[];
  suppressions: SuppressionEntry[];
  recordOverride: (entry: Omit<OverrideEntry, 'id' | 'at'>) => void;
  recordSuppression: (entry: Omit<SuppressionEntry, 'id' | 'at'>) => void;
  revokeSuppression: (id: string) => void;
};
export function useOverrideAudit(): OverrideAudit {
  const overrides = useAdmissionStore((s) => s.overrides);
  const suppressions = useAdmissionStore((s) => s.suppressions);
  const recordOverride = useAdmissionStore((s) => s.recordOverride);
  const recordSuppression = useAdmissionStore((s) => s.recordSuppression);
  const revokeSuppression = useAdmissionStore((s) => s.revokeSuppression);
  return {
    overrides,
    suppressions,
    recordOverride,
    recordSuppression,
    revokeSuppression,
  };
}
