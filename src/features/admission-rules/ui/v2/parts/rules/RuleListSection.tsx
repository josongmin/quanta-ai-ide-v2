import { useMemo, useState } from 'react';
import { Zap, Cpu, Layers, Plus, Search, X as XIcon } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { PRDiff } from '@entities/repo';
import type { useFilterStore } from '@entities/filter-state';
import {
  estimateCost,
  type previewRule, type evaluateAdmission,
  type AdmissionRule, type RuleSource, type RuleSeverity,
} from '@entities/admission';
import { useAdmissionStore } from '../../../../model/store';
import { SOURCE_GLYPH, usesHint, describeSignal } from '../../../sourceStyle';
import { SEVERITY_COLOR, useV2 } from '../tokens';
import { V2Card, SectionTitle } from '../primitives';
import { Checkbox } from './Checkbox';
import { SourceFilterChips } from './SourceFilterChips';
import { BulkActionBar } from './BulkActionBar';

// ── Rule list (with bulk + filter) ───────────────────────────────────

export function RuleListSection({
  rules, previews, retro,
}: {
  rules: AdmissionRule[];
  previews: Map<string, ReturnType<typeof previewRule>>;
  retro: { seed: number; diff: PRDiff; decision: ReturnType<typeof evaluateAdmission> }[];
  repo: ReturnType<typeof useFilterStore.getState>['repo'];
}) {
  const t = useV2();
  const { t: tA } = useTranslation('admission');
  const openEditor = useAdmissionStore((s) => s.openEditor);
  const toggle = useAdmissionStore((s) => s.toggle);
  const selection = useAdmissionStore((s) => s.selection);
  const selectToggle = useAdmissionStore((s) => s.selectToggle);
  const selectClear = useAdmissionStore((s) => s.selectClear);
  const selectAll = useAdmissionStore((s) => s.selectAll);
  const startRollout = useAdmissionStore((s) => s.startRollout);
  const rollouts = useAdmissionStore((s) => s.rollouts);

  const [filter, setFilter] = useState<RuleSource | 'all'>('all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'matches' | 'severity'>('matches');

  const visible = useMemo(() => {
    let out = rules;
    if (filter !== 'all') out = out.filter((r) => r.source === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((r) =>
        r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
      );
    }
    out = out.slice().sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'severity') {
        const rank = (s: RuleSeverity) => s === 'block' ? 3 : s === 'warn' ? 2 : 1;
        return rank(b.severity) - rank(a.severity);
      }
      return (previews.get(b.id)?.matches.length ?? 0) - (previews.get(a.id)?.matches.length ?? 0);
    });
    return out;
  }, [rules, filter, query, sortKey, previews]);

  const allChecked = visible.length > 0 && visible.every((r) => selection.has(r.id));
  const someChecked = selection.size > 0;

  return (
    <>
      {/* Toolbar */}
      <V2Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md flex-1 min-w-[200px]"
            style={{
              background: t.inset,
              border: `1px solid ${t.borderSoft}`,
            }}
          >
            <Search className="w-3 h-3" style={{ color: t.textSubtle }} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); }}
              placeholder={tA('search.rulesPlaceholder')}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: t.textBody }}
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); }}
                style={{ color: t.textSubtle }}
                onMouseEnter={(e) => { e.currentTarget.style.color = t.textBody; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = t.textSubtle; }}
              >
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          <SourceFilterChips value={filter} onChange={setFilter} rules={rules} />

          <select
            value={sortKey}
            onChange={(e) => { setSortKey(e.target.value as 'name' | 'matches' | 'severity'); }}
            className="text-xs font-mono px-2 py-1 rounded-md"
            style={{ background: t.inset, border: `1px solid ${t.border}`, color: t.textBody }}
          >
            <option value="matches">sort: matches</option>
            <option value="severity">sort: severity</option>
            <option value="name">sort: name</option>
          </select>

          <button type="button"
            onClick={() => { openEditor(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-eyebrow"
            style={{ background: t.textHi, color: t.page }}
          >
            <Plus className="w-3 h-3" />
            New rule
          </button>
        </div>

        {/* Bulk action bar */}
        {someChecked && <BulkActionBar />}
      </V2Card>

      {/* Table */}
      <V2Card className="p-0 overflow-hidden">
        <div
          className="grid grid-cols-[28px_minmax(0,1fr)_80px_70px_60px_70px_24px] gap-2 px-4 py-2 text-2xs font-bold uppercase tracking-eyebrow"
          style={{ borderBottom: `1px solid ${t.borderSoft}`, color: t.textSubtle }}
        >
          <button type="button"
            onClick={() => { allChecked ? selectClear() : selectAll(visible.map((r) => r.id)); }}
            style={{ color: t.textSubtle }}
            onMouseEnter={(e) => { e.currentTarget.style.color = t.textHi; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = t.textSubtle; }}
            aria-label={allChecked ? 'unselect all' : 'select all'}
          >
            <Checkbox checked={allChecked} indeterminate={someChecked && !allChecked} t={t} />
          </button>
          <span>{tA('table.rule')}</span>
          <span>{tA('table.source')}</span>
          <span>{tA('table.severity')}</span>
          <span className="text-right">{tA('table.matches')}</span>
          <span>{tA('table.cost')}</span>
          <span />
        </div>
        <div className="max-h-[calc(100vh-360px)] overflow-y-auto">
          {visible.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm font-mono" style={{ color: t.textSubtle }}>
              No rules match.
            </div>
          ) : visible.map((r) => {
            const checked = selection.has(r.id);
            const matches = previews.get(r.id)?.matches.length ?? 0;
            const sevColor = r.severity === 'block' ? SEVERITY_COLOR.block
              : r.severity === 'warn' ? SEVERITY_COLOR.warn : t.textMuted;
            const cost = estimateCost(r);
            const inRollout = rollouts.find((ro) => ro.ruleId === r.id);
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                className={`grid grid-cols-[28px_minmax(0,1fr)_80px_70px_60px_70px_24px] gap-2 px-4 py-2.5 items-center cursor-pointer transition-colors ${
                  !r.enabled ? 'opacity-50' : ''
                }`}
                style={{
                  borderBottom: `1px solid ${t.borderSoft}`,
                  background: checked ? `${t.accent}0f` : 'transparent',
                }}
                onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = t.hoverSubtle; }}
                onMouseLeave={(e) => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
                onClick={() => { openEditor(r.id); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditor(r.id);
                  }
                }}
              >
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); selectToggle(r.id); }}
                  style={{ color: t.textMuted }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = t.textHi; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = t.textMuted; }}
                >
                  <Checkbox checked={checked} t={t} />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); toggle(r.id); }}
                      className="shrink-0 w-7 h-3.5 rounded-full relative transition-colors"
                      style={{ background: r.enabled ? `${t.ok}66` : t.hoverActive }}
                      aria-label={r.enabled ? 'disable' : 'enable'}
                    >
                      <span
                        className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all"
                        style={{
                          left: r.enabled ? '14px' : '2px',
                          background: r.enabled ? t.ok : t.textHi,
                        }}
                      />
                    </button>
                    <span className="text-base font-bold truncate" style={{ color: t.textBody }}>
                      {r.name}
                    </span>
                    {inRollout && (
                      <span
                        className="text-2xs font-mono uppercase tracking-eyebrow px-1.5 py-px rounded-md"
                        style={{
                          color: t.accent,
                          background: `${t.accent}15`,
                          border: `1px solid ${t.accent}44`,
                        }}
                        title={`Rolling out — warn → block over ${inRollout.durationDays}d`}
                      >
                        rollout
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs font-mono truncate" style={{ color: t.textSubtle }}>
                    {usesHint(r.signal)} · {describeSignal(r.signal)}
                  </div>
                </div>
                <span className="text-xs font-mono" style={{ color: t.textMuted }}>
                  {SOURCE_GLYPH[r.source]} {r.source}
                </span>
                <span
                  className="text-2xs font-mono uppercase tracking-eyebrow px-1.5 py-0.5 rounded-md inline-block"
                  style={{ color: sevColor, background: `${sevColor}1a` }}
                >
                  {r.severity}
                </span>
                <span
                  className="text-base font-mono tabular-nums text-right"
                  style={{
                    color: matches === 0 ? t.textFaint
                      : r.severity === 'block' ? sevColor
                      : t.textBody,
                  }}
                >
                  {matches}
                </span>
                <span className="text-2xs font-mono uppercase tracking-eyebrow" style={{ color: t.textMuted }}>
                  {cost}
                </span>
                <button type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (inRollout) {
                      useAdmissionStore.getState().cancelRollout(r.id);
                    } else {
                      startRollout(r.id, 7);
                    }
                  }}
                  className="text-2xs"
                  style={{ color: t.textSubtle }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = t.textBody; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = t.textSubtle; }}
                  title={inRollout ? 'Cancel rollout' : 'Start 7d rollout'}
                >
                  {inRollout ? '▸stop' : '▸7d'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer: total info + retro cue */}
        <div
          className="px-4 py-2 flex items-center text-xs font-mono"
          style={{ borderTop: `1px solid ${t.borderSoft}`, color: t.textSubtle }}
        >
          <span>{visible.length} of {rules.length} rules</span>
          <span className="ml-auto">
            edit / delete / start rollout · click row to edit
          </span>
        </div>
      </V2Card>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <V2Card className="p-4">
          <SectionTitle icon={Layers}>{tA('section.activeVsTotal')}</SectionTitle>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-4xl font-black tabular-nums leading-none" style={{ color: t.textHi }}>
              {rules.filter((r) => r.enabled).length}
            </span>
            <span className="text-lg font-mono leading-none" style={{ color: t.textSubtle }}>
              / {rules.length}
            </span>
          </div>
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: t.inset }}>
            <span
              className="block h-full rounded-full"
              style={{
                width: `${(rules.filter((r) => r.enabled).length / Math.max(1, rules.length)) * 100}%`,
                background: `linear-gradient(90deg, ${t.accent}, ${t.ok})`,
              }}
            />
          </div>
        </V2Card>

        <V2Card className="p-4">
          <SectionTitle icon={Zap}>{tA('section.ifTodayRan')}</SectionTitle>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-4xl font-black tabular-nums text-[var(--intent-danger-fg)] leading-none"
              style={{ textShadow: '0 0 12px rgb(from var(--intent-danger-fg) r g b / 0.33)' }}
            >
              {retro.filter((r) => r.decision.outcome === 'block').length}
            </span>
            <span className="text-lg font-mono leading-none" style={{ color: t.textSubtle }}>
              / {retro.length}
            </span>
          </div>
          <div className="mt-2 text-xs font-mono" style={{ color: t.textSubtle }}>
            simulated PRs would block under current ruleset
          </div>
        </V2Card>

        <V2Card className="p-4">
          <SectionTitle icon={Cpu}>{tA('section.rolloutsInProgress')}</SectionTitle>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-4xl font-black tabular-nums leading-none"
              style={{ color: t.accent, textShadow: `0 0 12px ${t.accent}55` }}
            >
              {rollouts.length}
            </span>
            <span className="text-lg font-mono leading-none" style={{ color: t.textSubtle }}>
              warn → block
            </span>
          </div>
          <div className="mt-2 text-xs font-mono" style={{ color: t.textSubtle }}>
            scheduled rule promotions
          </div>
        </V2Card>
      </div>
    </>
  );
}
