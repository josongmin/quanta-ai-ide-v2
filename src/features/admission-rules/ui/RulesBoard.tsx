import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTheme } from '@shared/theme';
import { useFilterStore } from '@features/filter-files';
import { previewRule, estimateCost, type AdmissionRule, type RuleSource } from '@entities/admission';
import { useAdmissionStore } from '../model/store';
import { CostBadge } from './CostBadge';
import { ConfidenceMix } from './ConfidenceMix';
import {
  SOURCE_LABEL, SOURCE_GLYPH, SEVERITY_COLOR,
  describeSignal, usesHint,
} from './sourceStyle';
import { tokens } from '@shared/lib';
import { RuleEditor } from './RuleEditor';

// Rule list. One column on the left, optional editor pane on the right.
// Rows are visually flat — single border, no per-source colour. Severity
// is the only hue that appears. Source/evidence/cost are text-only.

type FilterKey = 'all' | RuleSource;

export default function RulesBoard() {
  const { isDark } = useTheme();
  const rules = useAdmissionStore((s) => s.rules);
  const editingId = useAdmissionStore((s) => s.editingId);
  const draft = useAdmissionStore((s) => s.draft);
  const openEditor = useAdmissionStore((s) => s.openEditor);
  const closeEditor = useAdmissionStore((s) => s.closeEditor);
  const toggle = useAdmissionStore((s) => s.toggle);
  const remove = useAdmissionStore((s) => s.remove);
  const repo = useFilterStore((s) => s.repo);
  const [filter, setFilter] = useState<FilterKey>('all');

  const previews = useMemo(() => {
    const out = new Map<string, ReturnType<typeof previewRule>>();
    for (const r of rules) out.set(r.id, previewRule(r, repo));
    return out;
  }, [rules, repo]);

  const visible = filter === 'all' ? rules : rules.filter((r) => r.source === filter);
  const grouped = useMemo(() => groupBySource(visible), [visible]);

  return (
    <div className="absolute inset-0 flex overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div
          className="shrink-0 px-6 py-3 flex items-center gap-2"
          style={{
            borderBottom: `1px solid ${tokens(isDark).borderSoft}`,
            backgroundColor: isDark ? 'rgba(13,17,23,0.45)' : 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(22px) saturate(160%)',
            WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          }}
        >
          <span className="text-[10px] font-mono text-[color:var(--fg-muted)]">
            {rules.filter((r) => r.enabled).length} of {rules.length} active
          </span>

          <div className="mx-2 h-3 w-px bg-[color:var(--bg-surface)]" />

          {(['all', 'native', 'eslint', 'semgrep', 'codeql', 'custom'] as FilterKey[]).map((k) => {
            const active = filter === k;
            const count = k === 'all' ? rules.length : rules.filter((r) => r.source === k).length;
            return (
              <button type="button"
                key={k}
                onClick={() => { setFilter(k); }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors ${
                  active
                    ? 'bg-[color:var(--bg-surface)] text-[color:var(--fg-strong)]'
                    : (isDark ? 'text-white/40 hover:text-white/70' : 'text-black/55 hover:text-black/70')
                }`}
              >
                {k}
                <span className="ml-1 opacity-50 tabular-nums">{count}</span>
              </button>
            );
          })}

          <div className="flex-1" />

          <button type="button"
            onClick={() => { openEditor(null); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] transition-colors bg-[color:var(--fg-strong)] text-[color:var(--bg-canvas)] hover:opacity-90"
          >
            <Plus className="w-3 h-3" />
            New
          </button>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-auto">
          {grouped.map(([source, list]) => (
            <section key={source}>
              <div
                className="sticky top-0 z-10 px-6 py-1.5"
                style={{
                  backgroundColor: isDark ? 'rgba(13,17,23,0.55)' : 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(22px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(22px) saturate(160%)',
                  borderBottom: `1px solid ${tokens(isDark).borderSoft}`,
                }}
              >
                <span className={`text-[10px] font-mono uppercase tracking-[0.18em] ${
                  isDark ? 'text-white/40' : 'text-black/55'
                }`}>
                  {SOURCE_GLYPH[source]} {SOURCE_LABEL[source]}
                  <span className="ml-2 opacity-60">{list.length}</span>
                </span>
              </div>
              <div className="divide-y divide-[color:var(--border-muted)]">
                {list.map((r) => (
                  <RuleRow
                    key={r.id}
                    rule={r}
                    matches={previews.get(r.id)?.matches.length ?? 0}
                    mix={previews.get(r.id)?.confidenceMix ?? { exact: 0, overapprox: 0, unknown: 0 }}
                    selected={editingId === r.id}
                    isDark={isDark}
                    onToggle={() => { toggle(r.id); }}
                    onOpen={() => { openEditor(r.id); }}
                    onDelete={() => { remove(r.id); }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {draft !== null && <RuleEditor onClose={closeEditor} />}
    </div>
  );
}

function groupBySource(rules: AdmissionRule[]): [RuleSource, AdmissionRule[]][] {
  const order: RuleSource[] = ['native', 'eslint', 'semgrep', 'codeql', 'custom'];
  const buckets = new Map<RuleSource, AdmissionRule[]>();
  for (const r of rules) {
    const list = buckets.get(r.source) ?? [];
    list.push(r);
    buckets.set(r.source, list);
  }
  return order
    .map((s) => [s, buckets.get(s) ?? []] as [RuleSource, AdmissionRule[]])
    .filter(([, list]) => list.length > 0);
}

function RuleRow({
  rule, matches, mix, selected, isDark, onToggle, onOpen, onDelete,
}: {
  rule: AdmissionRule;
  matches: number;
  mix: { exact: number; overapprox: number; unknown: number };
  selected: boolean;
  isDark: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const cost = estimateCost(rule);
  const sevColor = SEVERITY_COLOR[rule.severity];
  const off = !rule.enabled;
  const isBlocking = rule.enabled && rule.severity === 'block' && matches > 0;
  const isWarning  = rule.enabled && rule.severity === 'warn'  && matches > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`px-6 py-2.5 cursor-pointer transition-colors flex items-center gap-3 ${
        selected
          ? (isDark ? 'bg-white/[0.05]' : 'bg-black/[0.04]')
          : (isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-black/[0.025]')
      } ${off ? 'opacity-45' : ''}`}
    >
      {/* Toggle */}
      <button type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`shrink-0 relative w-7 h-3.5 rounded-full transition-colors ${
          rule.enabled
            ? (isDark ? 'bg-white/40' : 'bg-black/45')
            : 'bg-[color:var(--bg-surface)]'
        }`}
        aria-label={rule.enabled ? 'Disable' : 'Enable'}
      >
        <span
          className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all bg-white"
          style={{ left: rule.enabled ? '14px' : '2px' }}
        />
      </button>

      {/* Name + signal description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold truncate text-[color:var(--fg-strong)]">
            {rule.name}
          </span>
          {rule.severity !== 'info' && (
            <span
              className="text-[9px] font-mono uppercase tracking-[0.18em] px-1 py-px rounded-md shrink-0"
              style={{
                color: sevColor,
                backgroundColor: 'var(--bg-hover)',
              }}
            >
              {rule.severity}
            </span>
          )}
        </div>
        <div className={`mt-0.5 text-[10px] font-mono truncate ${
          isDark ? 'text-white/40' : 'text-black/55'
        }`}>
          <span className="opacity-70">uses</span> {usesHint(rule.signal)}
          <span className="opacity-40"> · </span>
          <span className="opacity-80">{describeSignal(rule.signal)}</span>
        </div>
      </div>

      {/* Confidence mix */}
      <ConfidenceMix mix={mix} width={64} />

      {/* Match count */}
      <span
        className="shrink-0 text-[12px] font-mono tabular-nums w-10 text-right"
        style={
          matches === 0
            ? { color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.32)' }
            : isBlocking
              ? { color: SEVERITY_COLOR.block }
              : isWarning
                ? { color: SEVERITY_COLOR.warn }
                : { color: 'var(--fg-strong)' }
        }
        title={`${matches} files match`}
      >
        {matches}
      </span>

      {/* Cost */}
      <CostBadge cost={cost} />

      {rule.source === 'custom' && (
        <button type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 px-1 text-[10px] font-mono text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-default)]"
          title="Delete rule"
        >
          ✕
        </button>
      )}
    </div>
  );
}
