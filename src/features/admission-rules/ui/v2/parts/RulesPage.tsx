import { useMemo, useState } from 'react';
import {
  Zap, Cpu, Layers, Plus, Clock,
  ListChecks, Gavel, FileText, Search,
  Trash2, X as XIcon,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { PRDiff } from '@entities/repo';
import { useFilterStore } from '@features/filter-files';
import {
  estimateCost,
  type previewRule, type evaluateAdmission,
  type AdmissionRule, type RuleSource, type RuleSeverity,
} from '@entities/admission';
import { useAdmissionStore } from '../../../model/store';
import { SOURCE_GLYPH, usesHint, describeSignal } from '../../sourceStyle';
import { SEVERITY_COLOR, useV2, type V2Theme } from './tokens';
import { V2Card, SectionTitle } from './primitives';
import { timeAgo } from './retrospective';
import { RuleEditorOverlay } from './RuleEditorOverlay';

// ═════════════════════════════════════════════════════════════════════════
// RULES PAGE — full management surface
// Features: list (with bulk select), live preview editor, packs, rollouts,
// versioning, import/export.
// ═════════════════════════════════════════════════════════════════════════

export function RulesPage({
  rules, previews, retro,
}: {
  rules: AdmissionRule[];
  previews: Map<string, ReturnType<typeof previewRule>>;
  retro: { seed: number; diff: PRDiff; decision: ReturnType<typeof evaluateAdmission> }[];
}) {
  const t = useV2();
  const repo = useFilterStore((s) => s.repo);
  const [section, setSection] = useState<'list' | 'packs' | 'audit' | 'io'>('list');
  const editingId = useAdmissionStore((s) => s.editingId);
  const draft = useAdmissionStore((s) => s.draft);
  const closeEditor = useAdmissionStore((s) => s.closeEditor);

  return (
    <div className="relative min-h-full p-6 pt-10 flex flex-col gap-5">
      {/* Page heading */}
      <div className="flex items-center gap-3 admv2-rise">
        <ListChecks className="w-4 h-4" style={{ color: t.textMuted }} />
        <h1 className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: t.textBody }}>
          Rule management
        </h1>
        <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>
          author · simulate · roll out
        </span>
        <div className="flex-1" />
        <SectionTabs section={section} onChange={setSection} />
      </div>

      {section === 'list' && (
        <RuleListSection rules={rules} previews={previews} retro={retro} repo={repo} />
      )}
      {section === 'packs' && <RulePacksSection />}
      {section === 'audit' && <AuditSection />}
      {section === 'io' && <ImportExportSection />}

      {/* Floating editor drawer */}
      {draft !== null && (
        <RuleEditorOverlay
          editingId={editingId}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}

function SectionTabs({
  section, onChange,
}: {
  section: 'list' | 'packs' | 'audit' | 'io';
  onChange: (s: 'list' | 'packs' | 'audit' | 'io') => void;
}) {
  const t = useV2();
  const opts: { id: 'list' | 'packs' | 'audit' | 'io'; label: string }[] = [
    { id: 'list',  label: 'Rules' },
    { id: 'packs', label: 'Packs' },
    { id: 'audit', label: 'Audit' },
    { id: 'io',    label: 'Import / Export' },
  ];
  return (
    <div
      className="flex items-center gap-px rounded-md overflow-hidden"
      style={{ background: t.inset, border: `1px solid ${t.borderSoft}` }}
    >
      {opts.map((o) => {
        const active = section === o.id;
        return (
          <button type="button"
            key={o.id}
            onClick={() => { onChange(o.id); }}
            className="px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
            style={{
              background: active ? t.hoverActive : 'transparent',
              color: active ? t.textHi : t.textSubtle,
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = t.textBody; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = t.textSubtle; }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Rule list (with bulk + filter) ───────────────────────────────────

function RuleListSection({
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
  const bulkSetSeverity = useAdmissionStore((s) => s.bulkSetSeverity);
  const bulkSetEnabled = useAdmissionStore((s) => s.bulkSetEnabled);
  const bulkRemove = useAdmissionStore((s) => s.bulkRemove);
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
              className="flex-1 bg-transparent text-[11px] outline-none"
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
            className="text-[10px] font-mono px-2 py-1 rounded-md"
            style={{ background: t.inset, border: `1px solid ${t.border}`, color: t.textBody }}
          >
            <option value="matches">sort: matches</option>
            <option value="severity">sort: severity</option>
            <option value="name">sort: name</option>
          </select>

          <button type="button"
            onClick={() => { openEditor(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ background: t.textHi, color: t.page }}
          >
            <Plus className="w-3 h-3" />
            New rule
          </button>
        </div>

        {/* Bulk action bar */}
        {someChecked && (
          <div
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md admv2-rise"
            style={{
              background: `linear-gradient(140deg, ${t.accent}1f, ${t.accent}08)`,
              border: `1px solid ${t.accent}59`,
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: t.textHi }}>
              {selection.size} selected
            </span>
            <div className="w-px h-4" style={{ background: t.border }} />
            <button type="button"
              onClick={() => { bulkSetEnabled(true); }}
              className="text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-md"
              style={{ color: t.textBody }}
              onMouseEnter={(e) => { e.currentTarget.style.color = t.textHi; e.currentTarget.style.background = t.hoverSubtle; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = t.textBody; e.currentTarget.style.background = ''; }}
            >
              enable
            </button>
            <button type="button"
              onClick={() => { bulkSetEnabled(false); }}
              className="text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-md"
              style={{ color: t.textBody }}
              onMouseEnter={(e) => { e.currentTarget.style.color = t.textHi; e.currentTarget.style.background = t.hoverSubtle; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = t.textBody; e.currentTarget.style.background = ''; }}
            >
              disable
            </button>
            <div className="w-px h-4" style={{ background: t.border }} />
            <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: t.textSubtle }}>severity →</span>
            {(['block', 'warn', 'info'] as RuleSeverity[]).map((sev) => (
              <button type="button"
                key={sev}
                onClick={() => { bulkSetSeverity(sev); }}
                className="text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-md"
                style={{
                  color: sev === 'block' ? SEVERITY_COLOR.block
                    : sev === 'warn' ? SEVERITY_COLOR.warn : t.textMuted,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverSubtle; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
              >
                {sev}
              </button>
            ))}
            <div className="flex-1" />
            <button type="button"
              onClick={() => {
                if (confirm(`Delete ${selection.size} rules?`)) bulkRemove();
              }}
              className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-md hover:bg-[#c25a55]/15 text-[#c25a55]"
            >
              <Trash2 className="w-3 h-3" />
              delete
            </button>
            <button type="button"
              onClick={selectClear}
              className="text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-md"
              style={{ color: t.textMuted }}
              onMouseEnter={(e) => { e.currentTarget.style.color = t.textHi; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = t.textMuted; }}
            >
              clear
            </button>
          </div>
        )}
      </V2Card>

      {/* Table */}
      <V2Card className="p-0 overflow-hidden">
        <div
          className="grid grid-cols-[28px_minmax(0,1fr)_80px_70px_60px_70px_24px] gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.18em]"
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
            <div className="px-4 py-8 text-center text-[11px] font-mono" style={{ color: t.textSubtle }}>
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
                    <span className="text-[12px] font-bold truncate" style={{ color: t.textBody }}>
                      {r.name}
                    </span>
                    {inRollout && (
                      <span
                        className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-px rounded-md"
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
                  <div className="mt-0.5 text-[10px] font-mono truncate" style={{ color: t.textSubtle }}>
                    {usesHint(r.signal)} · {describeSignal(r.signal)}
                  </div>
                </div>
                <span className="text-[10px] font-mono" style={{ color: t.textMuted }}>
                  {SOURCE_GLYPH[r.source]} {r.source}
                </span>
                <span
                  className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-md inline-block"
                  style={{ color: sevColor, background: `${sevColor}1a` }}
                >
                  {r.severity}
                </span>
                <span
                  className="text-[12px] font-mono tabular-nums text-right"
                  style={{
                    color: matches === 0 ? t.textFaint
                      : r.severity === 'block' ? sevColor
                      : t.textBody,
                  }}
                >
                  {matches}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>
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
                  className="text-[9px]"
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
          className="px-4 py-2 flex items-center text-[10px] font-mono"
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
            <span className="text-[28px] font-black tabular-nums leading-none" style={{ color: t.textHi }}>
              {rules.filter((r) => r.enabled).length}
            </span>
            <span className="text-[14px] font-mono leading-none" style={{ color: t.textSubtle }}>
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
            <span className="text-[28px] font-black tabular-nums text-[#c25a55] leading-none"
              style={{ textShadow: '0 0 12px #c25a5555' }}
            >
              {retro.filter((r) => r.decision.outcome === 'block').length}
            </span>
            <span className="text-[14px] font-mono leading-none" style={{ color: t.textSubtle }}>
              / {retro.length}
            </span>
          </div>
          <div className="mt-2 text-[10px] font-mono" style={{ color: t.textSubtle }}>
            simulated PRs would block under current ruleset
          </div>
        </V2Card>

        <V2Card className="p-4">
          <SectionTitle icon={Cpu}>{tA('section.rolloutsInProgress')}</SectionTitle>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-[28px] font-black tabular-nums leading-none"
              style={{ color: t.accent, textShadow: `0 0 12px ${t.accent}55` }}
            >
              {rollouts.length}
            </span>
            <span className="text-[14px] font-mono leading-none" style={{ color: t.textSubtle }}>
              warn → block
            </span>
          </div>
          <div className="mt-2 text-[10px] font-mono" style={{ color: t.textSubtle }}>
            scheduled rule promotions
          </div>
        </V2Card>
      </div>
    </>
  );
}

function Checkbox({ checked, indeterminate, t }: { checked: boolean; indeterminate?: boolean; t: V2Theme }) {
  return (
    <span
      className="inline-flex w-3.5 h-3.5 items-center justify-center rounded-md transition-colors"
      style={{
        background: checked || indeterminate ? t.accent : 'transparent',
        border: `1px solid ${checked || indeterminate ? t.accent : t.textFaint}`,
      }}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke={t.page} strokeWidth={2.4}>
          <path d="M2 6.5 L5 9.5 L10 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {indeterminate && !checked && (
        <span className="block w-2 h-[2px]" style={{ background: t.page }} />
      )}
    </span>
  );
}

function SourceFilterChips({
  value, onChange, rules,
}: {
  value: RuleSource | 'all';
  onChange: (v: RuleSource | 'all') => void;
  rules: AdmissionRule[];
}) {
  const t = useV2();
  const opts: (RuleSource | 'all')[] = ['all', 'native', 'eslint', 'semgrep', 'codeql', 'custom'];
  return (
    <div
      className="flex items-center gap-px rounded-md overflow-hidden"
      style={{ background: t.inset, border: `1px solid ${t.borderSoft}` }}
    >
      {opts.map((o) => {
        const active = value === o;
        const count = o === 'all' ? rules.length : rules.filter((r) => r.source === o).length;
        return (
          <button type="button"
            key={o}
            onClick={() => { onChange(o); }}
            className="px-2 py-1 text-[10px] font-mono transition-colors"
            style={{
              background: active ? t.hoverActive : 'transparent',
              color: active ? t.textHi : t.textSubtle,
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = t.textMuted; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = t.textSubtle; }}
          >
            {o}
            <span className="ml-1 opacity-60 tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Rule packs ───────────────────────────────────────────────────────

function RulePacksSection() {
  const t = useV2();
  const packs = useAdmissionStore((s) => s.packs);
  const rules = useAdmissionStore((s) => s.rules);
  const togglePack = useAdmissionStore((s) => s.togglePack);
  const packIsActive = useAdmissionStore((s) => s.packIsActive);

  return (
    <div className="grid grid-cols-2 gap-4">
      {packs.map((pack) => {
        const active = packIsActive(pack.id);
        const memberRules = rules.filter((r) => pack.ruleIds.includes(r.id));
        const enabledMembers = memberRules.filter((r) => r.enabled).length;
        return (
          <V2Card
            key={pack.id}
            className="p-5 cursor-pointer transition-all hover:scale-[1.005]"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: active
                    ? `linear-gradient(140deg, ${t.accent}4d, ${t.accent}0d)`
                    : t.inset,
                  border: `1px solid ${active ? `${t.accent}8c` : t.border}`,
                  boxShadow: active ? `0 0 16px ${t.accent}40` : 'none',
                }}
              >
                <Layers className="w-4 h-4" style={{ color: active ? t.accent : t.textMuted }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: t.textHi }}>
                    {pack.name}
                  </span>
                  <span
                    className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-px rounded-md"
                    style={{ color: t.textSubtle, background: t.inset }}
                  >
                    {pack.source}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] font-mono" style={{ color: t.textMuted }}>
                  {pack.description}
                </div>
              </div>
              <button type="button"
                onClick={() => { togglePack(pack.id); }}
                className="shrink-0 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
                style={{
                  background: active ? t.accent : t.inset,
                  color: active ? t.page : t.textBody,
                  border: `1px solid ${active ? t.accent : t.border}`,
                }}
              >
                {active ? 'Activated' : 'Activate'}
              </button>
            </div>

            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${t.borderSoft}` }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: t.textSubtle }}>
                  {enabledMembers} / {memberRules.length} active
                </span>
                <div className="flex-1 h-px" style={{ background: t.borderSoft }} />
              </div>
              <div className="space-y-1">
                {memberRules.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-[11px] font-mono">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: r.enabled ? t.ok : t.textFaint }}
                    />
                    <span style={{ color: r.enabled ? t.textBody : t.textSubtle }}>
                      {SOURCE_GLYPH[r.source]} {r.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </V2Card>
        );
      })}
    </div>
  );
}

// ── Audit (overrides + version log) ──────────────────────────────────

function AuditSection() {
  const t = useV2();
  const { t: tA } = useTranslation('admission');
  const overrides = useAdmissionStore((s) => s.overrides);
  const versions = useAdmissionStore((s) => s.versions);
  const rules = useAdmissionStore((s) => s.rules);

  const versionLog = useMemo(() => {
    const flat: { ruleId: string; ruleName: string; v: number; at: number; summary: string }[] = [];
    for (const [ruleId, list] of Object.entries(versions)) {
      const rule = rules.find((r) => r.id === ruleId);
      for (const v of list) {
        flat.push({
          ruleId,
          ruleName: rule?.name ?? v.snapshot.name,
          v: v.version,
          at: v.changedAt,
          summary: v.summary,
        });
      }
    }
    return flat.sort((a, b) => b.at - a.at).slice(0, 20);
  }, [versions, rules]);

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
      <V2Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <SectionTitle icon={Gavel}>{tA('section.overrideAudit')}</SectionTitle>
          <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>
            who bypassed what · when · why
          </span>
        </div>
        {overrides.length === 0 ? (
          <div className="text-[11px] font-mono" style={{ color: t.textSubtle }}>{tA('empty.noOverrides')}</div>
        ) : (
          <div className="space-y-2">
            {overrides.map((o) => (
              <div
                key={o.id}
                className="px-3 py-2 rounded-md"
                style={{
                  background: t.inset,
                  border: `1px solid ${t.borderSoft}`,
                }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="w-1 h-3 rounded-full shrink-0"
                    style={{
                      background: o.severity === 'block' ? SEVERITY_COLOR.block
                        : o.severity === 'warn' ? SEVERITY_COLOR.warn : t.textSubtle,
                    }}
                  />
                  <span className="text-[11px] font-bold" style={{ color: t.textBody }}>{o.ruleName}</span>
                  <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>PR #{o.prSeed}</span>
                  <span className="ml-auto text-[10px] font-mono" style={{ color: t.textSubtle }}>
                    @{o.actor} · {timeAgo(o.at)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-mono" style={{ color: t.textMuted }}>
                  {o.reason}
                </div>
              </div>
            ))}
          </div>
        )}
      </V2Card>

      <V2Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <SectionTitle icon={Clock}>{tA('section.versionLog')}</SectionTitle>
          <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>
            edits to ruleset · most recent
          </span>
        </div>
        {versionLog.length === 0 ? (
          <div className="text-[11px] font-mono" style={{ color: t.textSubtle }}>
            No edits yet — saving any rule will record a version here.
          </div>
        ) : (
          <div className="space-y-2">
            {versionLog.map((v) => (
              <div
                key={`${v.ruleId}-${v.v}`}
                className="px-3 py-2 rounded-md"
                style={{
                  background: t.inset,
                  border: `1px solid ${t.borderSoft}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-mono px-1.5 py-px rounded-md"
                    style={{ color: t.accent, background: `${t.accent}15`, border: `1px solid ${t.accent}33` }}
                  >
                    v{v.v}
                  </span>
                  <span className="text-[11px] font-bold truncate" style={{ color: t.textBody }}>
                    {v.ruleName}
                  </span>
                  <span className="ml-auto text-[10px] font-mono" style={{ color: t.textSubtle }}>
                    {timeAgo(v.at)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-mono" style={{ color: t.textMuted }}>
                  {v.summary}
                </div>
              </div>
            ))}
          </div>
        )}
      </V2Card>
    </div>
  );
}

// ── Import / export ──────────────────────────────────────────────────

function ImportExportSection() {
  const t = useV2();
  const { t: tA } = useTranslation('admission');
  const exportRules = useAdmissionStore((s) => s.exportRules);
  const importRules = useAdmissionStore((s) => s.importRules);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<string | null>(null);

  const exported = useMemo(() => exportRules(), [exportRules]);

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
      <V2Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <SectionTitle icon={FileText}>{tA('section.export')}</SectionTitle>
          <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>
            current ruleset as JSON
          </span>
          <div className="flex-1" />
          <button type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(exported);
            }}
            className="text-[10px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-md"
            style={{ background: t.badgeBg, color: t.textBody, border: `1px solid ${t.border}` }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverActive; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = t.badgeBg; }}
          >
            Copy
          </button>
        </div>
        <pre
          className="text-[10px] font-mono overflow-auto p-3 rounded-md leading-relaxed"
          style={{
            color: t.textBody,
            background: t.inset,
            border: `1px solid ${t.borderSoft}`,
            maxHeight: 360,
          }}
        >
          {exported}
        </pre>
      </V2Card>

      <V2Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <SectionTitle icon={FileText}>{tA('section.import')}</SectionTitle>
          <span className="text-[10px] font-mono" style={{ color: t.textSubtle }}>
            paste JSON · merges by id
          </span>
        </div>
        <textarea
          value={importText}
          onChange={(e) => { setImportText(e.target.value); setImportResult(null); }}
          placeholder='{"version": 1, "rules": [ ... ]}'
          className="w-full text-[10px] font-mono p-3 rounded-md leading-relaxed outline-none"
          style={{
            color: t.textBody,
            background: t.inset,
            border: `1px solid ${t.borderSoft}`,
            minHeight: 200,
          }}
        />
        <div className="mt-3 flex items-center gap-2">
          <button type="button"
            onClick={() => {
              const r = importRules(importText);
              if (r.ok) setImportResult(`Imported ${r.count} rules.`);
              else setImportResult(`Error: ${r.error}`);
            }}
            disabled={!importText.trim()}
            className="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: t.textHi, color: t.page }}
          >
            Import
          </button>
          <button type="button"
            onClick={() => { setImportText(''); setImportResult(null); }}
            className="text-[10px] font-mono uppercase tracking-[0.18em] px-2"
            style={{ color: t.textSubtle }}
            onMouseEnter={(e) => { e.currentTarget.style.color = t.textBody; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = t.textSubtle; }}
          >
            clear
          </button>
          <div className="flex-1" />
          {importResult && (
            <span
              className="text-[10px] font-mono"
              style={{
                color: importResult.startsWith('Error') ? SEVERITY_COLOR.block : t.ok,
              }}
            >
              {importResult}
            </span>
          )}
        </div>
        <div className="mt-4 text-[10px] font-mono leading-relaxed" style={{ color: t.textSubtle }}>
          Tip — drop in your <span style={{ color: t.textMuted }}>.eslintrc</span> rules,
          a <span style={{ color: t.textMuted }}>semgrep.yml</span> excerpt, or a CodeQL
          query pack manifest. The importer normalises into the unified rule shape;
          unknown fields are preserved as <span style={{ color: t.textMuted }}>external</span> signals.
        </div>
      </V2Card>
    </div>
  );
}
