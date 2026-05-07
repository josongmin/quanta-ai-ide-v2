import { create } from 'zustand';
import type { AdmissionRule, RuleSource, RuleSeverity, RuleSignal } from '@entities/admission';
import { SAMPLE_RULES } from '@entities/admission';

// Single source of truth for the rule set during the session. We don't
// persist; SAMPLE_RULES is the seed and edits live in memory. The board,
// editor, and PR-decision panel all read from here.

export type EditorDraft = {
  /** null = creating new, string = editing existing rule id. */
  ruleId: string | null;
  name: string;
  description: string;
  source: RuleSource;
  severity: RuleSeverity;
  signal: RuleSignal;
  pathIncludes: string;   // comma-separated, parsed on save
  pathExcludes: string;
};

// Versioning — every save bumps the rule's `version` and pushes a small
// patch object onto `versions`. We keep this in-memory only; the goal is
// to make "v1.2 → v1.3" diffs visible in the inspector, not to be a real
// VCS.
export type RuleVersion = {
  version: number;
  changedAt: number;
  /** Plain-text summary, e.g. "blast threshold 25 → 50". */
  summary: string;
  /** Snapshot of the rule at this version. */
  snapshot: AdmissionRule;
};

// Rule packs — bundles of pre-authored rules a user can toggle on as a
// set. The pack itself is read-only; toggling activates/deactivates each
// member rule via the standard `toggle` flow. Members may already exist
// (in which case toggling the pack also affects standalone state).
export type RulePack = {
  id: string;
  name: string;
  description: string;
  source: 'owasp' | 'sans' | 'sei' | 'custom';
  ruleIds: string[];
};

// Scheduled rollout — a rule's severity walks from a soft tier (warn) up
// to a hard tier (block) over N days. We store the schedule alongside
// the rule; the evaluator can look up the *effective* severity at the
// current time when constructing decisions.
export type Rollout = {
  ruleId: string;
  fromSeverity: RuleSeverity;
  toSeverity: RuleSeverity;
  startedAt: number;       // ms
  durationDays: number;
};

// Override audit — whenever someone bypasses a fired rule we record it.
// The page lists these in reverse-chrono.
export type OverrideEntry = {
  id: string;
  at: number;
  prSeed: number;
  ruleId: string;
  ruleName: string;
  actor: string;       // login
  reason: string;
  severity: RuleSeverity;
};

// Bulk action target — list of rule ids selected in the rules table.
export type BulkSelection = Set<string>;

export type AdmissionStore = {
  rules: AdmissionRule[];
  /** id of currently-open rule in the editor; null when editor is closed. */
  editingId: string | null;
  /** When set, the editor is in "new rule" mode with this draft. */
  draft: EditorDraft | null;

  // Versioning
  versions: Record<string, RuleVersion[]>;     // ruleId → versions

  // Packs
  packs: RulePack[];

  // Rollouts
  rollouts: Rollout[];

  // Overrides (audit log)
  overrides: OverrideEntry[];

  // Bulk selection (Rules page)
  selection: BulkSelection;

  toggle: (id: string) => void;
  remove: (id: string) => void;
  upsert: (rule: AdmissionRule) => void;

  openEditor: (id: string | null) => void;
  closeEditor: () => void;
  updateDraft: (patch: Partial<EditorDraft>) => void;
  saveDraft: () => string | null;

  // Bulk
  selectToggle: (id: string) => void;
  selectClear: () => void;
  selectAll: (ids: string[]) => void;
  bulkSetSeverity: (severity: RuleSeverity) => void;
  bulkSetEnabled: (enabled: boolean) => void;
  bulkRemove: () => void;

  // Packs
  togglePack: (packId: string) => void;
  packIsActive: (packId: string) => boolean;

  // Rollouts
  startRollout: (ruleId: string, durationDays: number) => void;
  cancelRollout: (ruleId: string) => void;

  // Overrides
  recordOverride: (entry: Omit<OverrideEntry, 'id' | 'at'>) => void;

  // Import / export
  exportRules: () => string;                    // returns JSON
  importRules: (json: string) => { ok: true; count: number } | { ok: false; error: string };
};

const blankDraft = (): EditorDraft => ({
  ruleId: null,
  name: 'New rule',
  description: '',
  source: 'custom',
  severity: 'warn',
  signal: { kind: 'metric', field: 'blastRadius', op: '>', value: 25 },
  pathIncludes: '',
  pathExcludes: '',
});

const fromRule = (r: AdmissionRule): EditorDraft => ({
  ruleId: r.id,
  name: r.name,
  description: r.description,
  source: r.source,
  severity: r.severity,
  signal: r.signal,
  pathIncludes: r.scope.pathIncludes.join(', '),
  pathExcludes: r.scope.pathExcludes.join(', '),
});

const splitCsv = (s: string): string[] =>
  s.split(',').map((p) => p.trim()).filter(Boolean);

// ── Seed data ─────────────────────────────────────────────────────────

const SAMPLE_PACKS: RulePack[] = [
  {
    id: 'pack.owasp-top10',
    name: 'OWASP Top 10',
    description: '2021 web application top 10 — injection, broken access, …',
    source: 'owasp',
    ruleIds: ['semgrep.hardcoded-secret', 'codeql.sql-injection', 'native.taint-env-fs'],
  },
  {
    id: 'pack.sei-cert',
    name: 'SEI CERT',
    description: 'CERT secure coding standards subset',
    source: 'sei',
    ruleIds: ['eslint.no-eval', 'native.import-cycle'],
  },
  {
    id: 'pack.platform-baseline',
    name: 'Platform baseline',
    description: 'Internal floor for any new service: blast cap, public-API tests, edit-safety.',
    source: 'custom',
    ruleIds: [
      'native.blast-cap',
      'native.public-api-without-test',
      'native.edit-safety-floor',
    ],
  },
];

const SAMPLE_OVERRIDES: OverrideEntry[] = [
  {
    id: 'ov-001', at: Date.now() - 1000 * 60 * 23, prSeed: 412,
    ruleId: 'native.blast-cap', ruleName: 'Blast radius cap',
    actor: 'sondoo', severity: 'block',
    reason: 'Coordinated rollout — owners notified, follow-up issue tracked.',
  },
  {
    id: 'ov-002', at: Date.now() - 1000 * 60 * 60 * 5, prSeed: 408,
    ruleId: 'eslint.no-eval', ruleName: 'eslint: no-eval',
    actor: 'jhwang', severity: 'block',
    reason: 'Vendor lib uses eval internally; sandboxed.',
  },
  {
    id: 'ov-003', at: Date.now() - 1000 * 60 * 60 * 28, prSeed: 401,
    ruleId: 'native.unknown-region-creep', ruleName: 'Unknown-confidence region grew',
    actor: 'mlee', severity: 'warn',
    reason: 'Reflection-heavy migration; analyzer support tracked in INF-1124.',
  },
];

// ── Store ─────────────────────────────────────────────────────────────

export const useAdmissionStore = create<AdmissionStore>((set, get) => ({
  rules: SAMPLE_RULES,
  editingId: null,
  draft: null,
  versions: {},
  packs: SAMPLE_PACKS,
  rollouts: [],
  overrides: SAMPLE_OVERRIDES,
  selection: new Set(),

  toggle: (id) => { set((s) => ({
    rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
  })); },

  remove: (id) => { set((s) => ({
    rules: s.rules.filter((r) => r.id !== id),
    editingId: s.editingId === id ? null : s.editingId,
    draft: s.draft?.ruleId === id ? null : s.draft,
    selection: filterOut(s.selection, id),
  })); },

  upsert: (rule) => { set((s) => {
    const idx = s.rules.findIndex((r) => r.id === rule.id);
    const next = s.rules.slice();
    if (idx < 0) {
      next.push(rule);
    } else {
      next[idx] = rule;
    }
    // Bump version + record snapshot
    const prevVersions = s.versions[rule.id] ?? [];
    const last = prevVersions[prevVersions.length - 1];
    const summary = last
      ? diffSummary(last.snapshot, rule)
      : 'initial revision';
    const nextVersions = [
      ...prevVersions,
      {
        version: prevVersions.length + 1,
        changedAt: Date.now(),
        summary,
        snapshot: rule,
      },
    ];
    return {
      rules: next,
      versions: { ...s.versions, [rule.id]: nextVersions },
    };
  }); },

  openEditor: (id) => { set((s) => {
    if (id === null) return { editingId: null, draft: blankDraft() };
    const rule = s.rules.find((r) => r.id === id);
    if (!rule) return s;
    return { editingId: id, draft: fromRule(rule) };
  }); },

  closeEditor: () => { set({ editingId: null, draft: null }); },

  updateDraft: (patch) => { set((s) => ({
    draft: s.draft ? { ...s.draft, ...patch } : s.draft,
  })); },

  saveDraft: () => {
    const s = get();
    if (!s.draft) return null;
    const d = s.draft;
    const id = d.ruleId ?? `custom.${Date.now().toString(36)}`;
    const rule: AdmissionRule = {
      id,
      name: d.name.trim() || 'Unnamed rule',
      description: d.description,
      source: d.source,
      severity: d.severity,
      enabled: true,
      signal: d.signal,
      scope: {
        pathIncludes: splitCsv(d.pathIncludes),
        pathExcludes: splitCsv(d.pathExcludes),
        labels: [],
      },
      override: { allowAuthor: false, requiresApproverRole: null },
      evidence: 'exact',
    };
    get().upsert(rule);
    set({ editingId: id, draft: fromRule(rule) });
    return id;
  },

  // ── Bulk ───────────────────────────────────────────────────────────
  selectToggle: (id) => { set((s) => {
    const next = new Set(s.selection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return { selection: next };
  }); },
  selectClear: () => { set({ selection: new Set() }); },
  selectAll: (ids) => { set({ selection: new Set(ids) }); },
  bulkSetSeverity: (severity) => { set((s) => ({
    rules: s.rules.map((r) => (s.selection.has(r.id) ? { ...r, severity } : r)),
  })); },
  bulkSetEnabled: (enabled) => { set((s) => ({
    rules: s.rules.map((r) => (s.selection.has(r.id) ? { ...r, enabled } : r)),
  })); },
  bulkRemove: () => { set((s) => ({
    rules: s.rules.filter((r) => !s.selection.has(r.id)),
    selection: new Set(),
  })); },

  // ── Packs ──────────────────────────────────────────────────────────
  togglePack: (packId) => { set((s) => {
    const pack = s.packs.find((p) => p.id === packId);
    if (!pack) return s;
    const allOn = pack.ruleIds.every(
      (id) => s.rules.find((r) => r.id === id)?.enabled,
    );
    return {
      rules: s.rules.map((r) =>
        pack.ruleIds.includes(r.id) ? { ...r, enabled: !allOn } : r,
      ),
    };
  }); },
  packIsActive: (packId) => {
    const s = get();
    const pack = s.packs.find((p) => p.id === packId);
    if (!pack) return false;
    return pack.ruleIds.every(
      (id) => s.rules.find((r) => r.id === id)?.enabled,
    );
  },

  // ── Rollouts ───────────────────────────────────────────────────────
  startRollout: (ruleId, durationDays) => { set((s) => {
    const rule = s.rules.find((r) => r.id === ruleId);
    if (!rule) return s;
    const fromSeverity: RuleSeverity = rule.severity === 'block' ? 'warn' : 'warn';
    return {
      rollouts: [
        ...s.rollouts.filter((r) => r.ruleId !== ruleId),
        {
          ruleId,
          fromSeverity,
          toSeverity: 'block',
          startedAt: Date.now(),
          durationDays,
        },
      ],
      rules: s.rules.map((r) => (r.id === ruleId ? { ...r, severity: fromSeverity } : r)),
    };
  }); },
  cancelRollout: (ruleId) => { set((s) => ({
    rollouts: s.rollouts.filter((r) => r.ruleId !== ruleId),
  })); },

  // ── Overrides ──────────────────────────────────────────────────────
  recordOverride: (entry) => { set((s) => ({
    overrides: [
      { ...entry, id: `ov-${Date.now().toString(36)}`, at: Date.now() },
      ...s.overrides,
    ],
  })); },

  // ── Import / export ────────────────────────────────────────────────
  exportRules: () => {
    const s = get();
    return JSON.stringify({ version: 1, rules: s.rules }, null, 2);
  },
  importRules: (json) => {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !('rules' in parsed) ||
        !Array.isArray(parsed.rules)
      ) {
        return { ok: false, error: 'Expected {"rules": [...]}' };
      }
      const incoming = parsed.rules as AdmissionRule[];
      // Validate minimal shape
      for (const r of incoming) {
        if (!r.id || !r.name || !r.signal) {
          return { ok: false, error: `Invalid rule: ${JSON.stringify(r).slice(0, 80)}` };
        }
      }
      set((s) => {
        const merged = [...s.rules];
        for (const r of incoming) {
          const idx = merged.findIndex((x) => x.id === r.id);
          if (idx >= 0) merged[idx] = r;
          else merged.push(r);
        }
        return { rules: merged };
      });
      return { ok: true, count: incoming.length };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
}));

// ── helpers ─────────────────────────────────────────────────────────

function filterOut(set: Set<string>, id: string): Set<string> {
  if (!set.has(id)) return set;
  const n = new Set(set);
  n.delete(id);
  return n;
}

function diffSummary(prev: AdmissionRule, next: AdmissionRule): string {
  const parts: string[] = [];
  if (prev.severity !== next.severity) parts.push(`severity ${prev.severity}→${next.severity}`);
  if (prev.enabled !== next.enabled) parts.push(next.enabled ? 'enabled' : 'disabled');
  if (prev.name !== next.name) parts.push(`renamed`);
  // Signal changes
  const ps = JSON.stringify(prev.signal);
  const ns = JSON.stringify(next.signal);
  if (ps !== ns) {
    if (prev.signal.kind === 'metric' && next.signal.kind === 'metric'
        && prev.signal.field === next.signal.field
        && prev.signal.op === next.signal.op) {
      parts.push(`threshold ${prev.signal.value}→${next.signal.value}`);
    } else {
      parts.push('signal updated');
    }
  }
  if (JSON.stringify(prev.scope) !== JSON.stringify(next.scope)) {
    parts.push('scope updated');
  }
  return parts.length === 0 ? 'no-op' : parts.join(' · ');
}
