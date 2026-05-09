import { useMemo, useState } from 'react';
import {
  ArrowUpRight, Bot, GitPullRequest, KeyRound, Play, ShieldAlert, ShieldCheck, Users, Wand2,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import {
  computePrRisk,
  coverageDeltas,
  engineFindings,
  engineSummary,
  failedTestsRow,
  findPerson,
  incidentMatches,
  suggestReviewers,
  type EngineFinding,
  type EngineSeverity,
  type IncidentMatch,
  type PullRequest,
  type RiskTier,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { Avatar } from '@features/review-pr';
import {
  ruleProvenance,
  testCoverageRatio,
} from '../lib/sota';
import { trimMid } from '../lib/reviewStageFormatting';
import FixPatchPreview from './FixPatchPreview';
import { SceneHeader, V2Card } from './ReviewSurface';

export function OverviewScene({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const { t } = useTranslation('review');
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      <V2Card className="p-5">
        <SceneHeader icon={GitPullRequest} title="Description" hint="markdown · author intent" />
        <div className="mt-3 text-[13px] leading-relaxed text-white/85 whitespace-pre-wrap break-words font-sans">
          {pr.description.trim().length === 0
            ? <span className="italic text-white/40">{t('empty.noDescription')}</span>
            : pr.description}
        </div>
        {pr.labels.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {pr.labels.map((l) => (
              <span
                key={l}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-mono bg-white/[0.04] border-white/10 text-white/70"
              >
                #{l}
              </span>
            ))}
          </div>
        )}
      </V2Card>

      <ReviewerSuggestionsCard pr={pr} repo={repo} />
    </div>
  );
}

function ReviewerSuggestionsCard({ pr, repo }: { pr: PullRequest; repo: RepoData }) {
  const { t } = useTranslation('review');
  const suggestions = useMemo(() => suggestReviewers(pr, repo, 3), [pr, repo]);
  return (
    <V2Card className="p-5">
      <SceneHeader icon={Users} title={t('section.suggestedReviewers')} hint={t('section.suggestedReviewersHint')} />
      {suggestions.length === 0 ? (
        <div className="mt-3 text-[12px] italic text-white/40">{t('empty.noSuggestions')}</div>
      ) : (
        <ul className="mt-3 space-y-2">
          {suggestions.map((s) => {
            const person = findPerson(s.login);
            const pct = Math.round(Math.max(0, Math.min(1, s.score)) * 100);
            return (
              <li key={s.login} className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-white/[0.025]">
                <Avatar login={s.login} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-white/85 truncate">{person.display}</span>
                    <span className="text-[10px] font-mono text-white/40">@{s.login}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/40 truncate">
                    {s.reasons.join(' · ')}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" title={`Match ${String(pct)}%`}>
                  <div className="h-[4px] w-[60px] rounded-full overflow-hidden bg-white/[0.08]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${String(pct)}%`,
                        background: '#4f9a5c',
                        boxShadow: 'none',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-white/55">{pct}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </V2Card>
  );
}

export function EngineScene({
  pr,
  repo,
  severityColors,
  severityLabels,
  severityRank,
}: {
  pr: PullRequest;
  repo: RepoData;
  severityColors: Record<EngineSeverity, string>;
  severityLabels: Record<EngineSeverity, string>;
  severityRank: Record<EngineSeverity, number>;
}) {
  const { t } = useTranslation('review');
  const findings = useMemo(() => engineFindings(pr, repo), [pr, repo]);
  const summary = useMemo(() => engineSummary(findings), [findings]);
  const [filter, setFilter] = useState<'all' | EngineSeverity>('all');
  const [grouped, setGrouped] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down' | null>>({});

  const visible = filter === 'all' ? findings : findings.filter((f) => f.severity === filter);

  const groups = useMemo(() => {
    const map = new Map<string, EngineFinding[]>();
    for (const f of visible) {
      const key = `${f.category}/${f.rule}`;
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .map(([key, items]) => {
        const worst = items.reduce<EngineSeverity>(
          (acc, it) => severityRank[it.severity] < severityRank[acc] ? it.severity : acc,
          items[0]?.severity ?? 'low',
        );
        return { key, items, worst };
      })
      .sort((a, b) => {
        const r = severityRank[a.worst] - severityRank[b.worst];
        if (r !== 0) return r;
        return a.key.localeCompare(b.key);
      });
  }, [visible, severityRank]);

  const safeFocusIdx = visible.length === 0 ? 0 : Math.min(focusIdx, visible.length - 1);

  return (
    <V2Card className="p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Bot className="w-3.5 h-3.5 text-[#5a8fce]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
            p0 engine · auto-review
          </span>
          <span
            className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9px] font-mono"
            style={{ background: 'rgba(90,143,206,0.15)', color: '#7aa7ff', border: '1px solid rgba(90,143,206,0.35)' }}
            title="Findings are produced by deterministic AST + dataflow rules, not an LLM. Each finding is reproducible from the diff alone."
          >
            engine v0.42 · static · cached
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setFocusMode((v) => !v); }}
            aria-pressed={focusMode}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
            style={{
              background: focusMode ? 'rgba(122,167,212,0.18)' : 'var(--bg-hover)',
              color: focusMode ? '#7aa7d4' : 'var(--fg-muted)',
              border: focusMode ? '1px solid rgba(122,167,212,0.55)' : '1px solid var(--border-strong)',
            }}
            title="Focus mode shows one finding at a time. Use [ and ] to step."
          >
            focus
          </button>
          <button
            type="button"
            onClick={() => { setGrouped((v) => !v); }}
            aria-pressed={grouped}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] text-white/55 hover:text-white/85 transition-colors"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-strong)' }}
            title={grouped ? 'Switch to flat list' : 'Group identical rules'}
          >
            {grouped ? 'grouped' : 'ungrouped'}
          </button>
          {summary.autoFix > 0 && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-bold transition-colors text-black"
              style={{
                background: 'linear-gradient(140deg, #7aa7d4, #5a8fce)',
                boxShadow: 'none',
              }}
            >
              <Wand2 className="w-3 h-3" />
              Apply {summary.autoFix} fix{summary.autoFix === 1 ? '' : 'es'} in batch
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1 flex-wrap">
        <SevChip
          label={`All ${String(findings.length)}`}
          active={filter === 'all'}
          color="#8b949e"
          onClick={() => { setFilter('all'); }}
        />
        {(['blocker', 'high', 'medium', 'low'] as EngineSeverity[]).map((sev) => (
          <SevChip
            key={sev}
            label={`${severityLabels[sev]} ${String(summary[sev])}`}
            active={filter === sev}
            color={severityColors[sev]}
            onClick={() => { setFilter(sev); }}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center text-center px-4 py-10 rounded-lg border border-dashed border-white/10">
          <ShieldCheck className="w-5 h-5 mb-2 text-white/30" />
          <div className="text-[12px] font-bold text-white/40">{t('empty.noFindings')}</div>
        </div>
      ) : focusMode ? (
        <div className="mt-4">
          <FocusedFinding
            f={visible[safeFocusIdx] ?? visible[0]}
            idx={safeFocusIdx}
            total={visible.length}
            vote={feedback[(visible[safeFocusIdx] ?? visible[0]).id] ?? null}
            severityColors={severityColors}
            severityLabels={severityLabels}
            onPrev={() => { setFocusIdx((i) => Math.max(0, i - 1)); }}
            onNext={() => { setFocusIdx((i) => Math.min(visible.length - 1, i + 1)); }}
            onVote={(v) => {
              const id = (visible[safeFocusIdx] ?? visible[0]).id;
              setFeedback((prev) => ({ ...prev, [id]: prev[id] === v ? null : v }));
            }}
          />
        </div>
      ) : grouped ? (
        <ul className="mt-4 space-y-2">
          {groups.map((g) => (
            <FindingGroup
              key={g.key}
              groupKey={g.key}
              items={g.items}
              feedback={feedback}
              severityColors={severityColors}
              severityLabels={severityLabels}
              severityRank={severityRank}
              onVote={(id, v) => { setFeedback((prev) => ({ ...prev, [id]: prev[id] === v ? null : v })); }}
            />
          ))}
        </ul>
      ) : (
        <ul className="mt-4 space-y-2">
          {visible.map((f) => (
            <FindingRow
              key={f.id}
              f={f}
              vote={feedback[f.id] ?? null}
              severityColors={severityColors}
              severityLabels={severityLabels}
              onVote={(v) => { setFeedback((prev) => ({ ...prev, [f.id]: prev[f.id] === v ? null : v })); }}
            />
          ))}
        </ul>
      )}
    </V2Card>
  );
}

function FindingGroup({
  groupKey,
  items,
  feedback,
  severityColors,
  severityLabels,
  severityRank,
  onVote,
}: {
  groupKey: string;
  items: EngineFinding[];
  feedback: Record<string, 'up' | 'down' | null>;
  severityColors: Record<EngineSeverity, string>;
  severityLabels: Record<EngineSeverity, string>;
  severityRank: Record<EngineSeverity, number>;
  onVote: (id: string, v: 'up' | 'down') => void;
}) {
  const [expanded, setExpanded] = useState(items.length <= 2);
  const worstColor = severityColors[items.reduce<EngineSeverity>(
    (acc, it) => severityRank[it.severity] < severityRank[acc] ? it.severity : acc,
    items[0]?.severity ?? 'low',
  )];

  if (items.length === 1) {
    const f = items[0];
    if (!f) return null;
    return (
      <FindingRow
        f={f}
        vote={feedback[f.id] ?? null}
        severityColors={severityColors}
        severityLabels={severityLabels}
        onVote={(v) => { onVote(f.id, v); }}
      />
    );
  }

  return (
    <li
      className="rounded-lg overflow-hidden"
      style={{
        background: `linear-gradient(140deg, ${worstColor}10, transparent 60%)`,
        border: `1px solid ${worstColor}30`,
      }}
    >
      <button
        type="button"
        onClick={() => { setExpanded((v) => !v); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span
          className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.18em]"
          style={{ background: `${worstColor}26`, color: worstColor }}
        >
          ×{items.length}
        </span>
        <span className="text-[11px] font-mono text-white/85 truncate">{groupKey}</span>
        <span className="ml-auto text-[10px] font-mono text-white/40">
          {expanded ? 'collapse' : 'expand'}
        </span>
      </button>
      {expanded && (
        <ul className="px-2 pb-2 space-y-1.5">
          {items.map((f) => (
            <FindingRow
              key={f.id}
              f={f}
              vote={feedback[f.id] ?? null}
              severityColors={severityColors}
              severityLabels={severityLabels}
              onVote={(v) => { onVote(f.id, v); }}
              compact
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function FocusedFinding({
  f,
  idx,
  total,
  vote,
  severityColors,
  severityLabels,
  onPrev,
  onNext,
  onVote,
}: {
  f: EngineFinding;
  idx: number;
  total: number;
  vote: 'up' | 'down' | null;
  severityColors: Record<EngineSeverity, string>;
  severityLabels: Record<EngineSeverity, string>;
  onPrev: () => void;
  onNext: () => void;
  onVote: (v: 'up' | 'down') => void;
}) {
  const c = severityColors[f.severity];
  const provenance = ruleProvenance(f);
  return (
    <div
      className="rounded-lg p-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(140deg, ${c}10, transparent 60%)`,
        border: `1px solid ${c}30`,
      }}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.18em]" style={{ background: `${c}26`, color: c }}>
          {severityLabels[f.severity]}
        </span>
        <span className="text-[10px] font-mono text-white/40">
          {f.category}/{f.rule}
        </span>
        <span
          className="inline-flex items-center gap-1 px-1.5 h-4 rounded-sm text-[9px] font-mono"
          style={{ background: `${provenance.tone}1a`, color: provenance.tone, border: `1px solid ${provenance.tone}55` }}
          title="Where this rule comes from"
        >
          {provenance.source}
        </span>
        <span className="ml-auto text-[10px] font-mono text-white/55 tabular-nums">
          {idx + 1} / {total}
        </span>
      </div>
      <div className="text-[15px] font-bold leading-snug text-white/90">{f.title}</div>
      <div className="mt-1 text-[13px] leading-relaxed text-white/70">{f.body}</div>
      <div className="mt-2 text-[11px] font-mono text-white/45 truncate" title={f.filePath}>
        {f.filePath}{f.line !== null ? `:${String(f.line)}` : ''}
      </div>
      <FixPatchPreview finding={f} />
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onPrev}
          disabled={idx === 0}
          className="inline-flex items-center gap-1 h-7 px-3 rounded-md text-[11px] font-bold bg-white/[0.06] text-white/85 hover:bg-white/[0.10] disabled:opacity-40"
        >
          ← prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={idx >= total - 1}
          className="inline-flex items-center gap-1 h-7 px-3 rounded-md text-[11px] font-bold bg-white/[0.06] text-white/85 hover:bg-white/[0.10] disabled:opacity-40"
        >
          next →
        </button>
        {f.autoFixable && (
          <button
            type="button"
            className="inline-flex items-center gap-1 h-7 px-3 rounded-md text-[11px] font-bold bg-[#5a8fce]/15 text-[#7aa7ff] hover:bg-[#5a8fce]/30"
          >
            <Wand2 className="w-3 h-3" />
            Auto-fix
          </button>
        )}
        <span className="ml-auto inline-flex items-center gap-1" role="group" aria-label="Was this finding useful?">
          <button
            type="button"
            onClick={() => { onVote('up'); }}
            aria-pressed={vote === 'up'}
            title="Useful — keep firing this rule"
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[14px] transition-colors"
            style={{
              background: vote === 'up' ? 'rgba(95,168,108,0.20)' : 'var(--bg-hover)',
              color: vote === 'up' ? '#9ee2a4' : 'var(--fg-muted)',
              border: vote === 'up' ? '1px solid rgba(95,168,108,0.55)' : '1px solid var(--border-default)',
            }}
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => { onVote('down'); }}
            aria-pressed={vote === 'down'}
            title="False positive — suppress this pattern"
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[14px] transition-colors"
            style={{
              background: vote === 'down' ? 'rgba(194,90,85,0.20)' : 'var(--bg-hover)',
              color: vote === 'down' ? '#e88a85' : 'var(--fg-muted)',
              border: vote === 'down' ? '1px solid rgba(194,90,85,0.55)' : '1px solid var(--border-default)',
            }}
          >
            ▼
          </button>
        </span>
      </div>
    </div>
  );
}

function SevChip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
      style={{
        background: active ? `${color}26` : 'var(--bg-hover)',
        color: active ? color : 'var(--fg-muted)',
        border: active ? `1px solid ${color}77` : '1px solid var(--border-default)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </button>
  );
}

function FindingRow({
  f,
  vote = null,
  severityColors,
  severityLabels,
  onVote,
  compact = false,
}: {
  f: EngineFinding;
  vote?: 'up' | 'down' | null;
  severityColors: Record<EngineSeverity, string>;
  severityLabels: Record<EngineSeverity, string>;
  onVote?: (v: 'up' | 'down') => void;
  compact?: boolean;
}) {
  const { t } = useTranslation('review');
  const c = severityColors[f.severity];
  const provenance = ruleProvenance(f);
  return (
    <li
      className={`rounded-lg ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'} relative overflow-hidden transition-colors hover:bg-white/[0.02]`}
      style={compact
        ? { background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }
        : { background: `linear-gradient(140deg, ${c}10, transparent 60%)`, border: `1px solid ${c}30` }}
    >
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.18em]" style={{ background: `${c}26`, color: c }}>
          {severityLabels[f.severity]}
        </span>
        <span className="text-[10px] font-mono text-white/40 truncate">
          {f.category}/{f.rule}
        </span>
        {!compact && (
          <span
            className="text-[9px] font-mono px-1 h-4 inline-flex items-center rounded-sm"
            title="Where this rule comes from"
            style={{ background: `${provenance.tone}14`, color: provenance.tone, border: `1px solid ${provenance.tone}40` }}
          >
            {provenance.source}
          </span>
        )}
        <span className="ml-auto text-[10px] font-mono text-white/40 truncate" title={f.filePath}>
          {trimMid(f.filePath, 36)}{f.line !== null ? `:${String(f.line)}` : ''}
        </span>
      </div>
      <div className={`${compact ? 'text-[12px]' : 'text-[13px]'} font-bold leading-snug text-white/85`}>{f.title}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-white/55">{f.body}</div>
      {!compact && <FixPatchPreview finding={f} />}
      <div className="mt-2 flex items-center gap-2">
        {f.autoFixable ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 h-6 px-2.5 rounded-md text-[11px] font-bold transition-colors bg-[#5a8fce]/15 text-[#7aa7ff] hover:bg-[#5a8fce]/30"
          >
            <Wand2 className="w-2.5 h-2.5" />
            Auto-fix
          </button>
        ) : (
          <span className="text-[11px] text-white/40">{t('merge.needsManualReview')}</span>
        )}
        {onVote && (
          <span className="ml-auto inline-flex items-center gap-1" role="group" aria-label="Was this finding useful?">
            <button
              type="button"
              onClick={() => { onVote('up'); }}
              aria-pressed={vote === 'up'}
              title="Useful — keep firing this rule"
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[12px] transition-colors"
              style={{
                background: vote === 'up' ? 'rgba(95,168,108,0.20)' : 'var(--bg-hover)',
                color: vote === 'up' ? '#9ee2a4' : 'var(--fg-muted)',
                border: vote === 'up' ? '1px solid rgba(95,168,108,0.55)' : '1px solid var(--border-default)',
              }}
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => { onVote('down'); }}
              aria-pressed={vote === 'down'}
              title="False positive — suppress this pattern"
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[12px] transition-colors"
              style={{
                background: vote === 'down' ? 'rgba(194,90,85,0.20)' : 'var(--bg-hover)',
                color: vote === 'down' ? '#e88a85' : 'var(--fg-muted)',
                border: vote === 'down' ? '1px solid rgba(194,90,85,0.55)' : '1px solid var(--border-default)',
              }}
            >
              ▼
            </button>
          </span>
        )}
        <button
          type="button"
          className={`${onVote ? '' : 'ml-auto'} inline-flex items-center gap-0.5 text-[11px] font-medium text-[#7aa7ff] hover:underline`}
        >
          Jump to file
          <ArrowUpRight className="w-2.5 h-2.5" />
        </button>
      </div>
    </li>
  );
}

export function RiskScene({
  pr,
  repo,
  severityColors,
  tierColors,
  tierLabels,
}: {
  pr: PullRequest;
  repo: RepoData;
  severityColors: Record<EngineSeverity, string>;
  tierColors: Record<RiskTier, string>;
  tierLabels: Record<RiskTier, string>;
}) {
  const risk = useMemo(() => computePrRisk(pr, repo), [pr, repo]);
  const cov = useMemo(() => coverageDeltas(pr, repo), [pr, repo]);
  const tests = useMemo(() => failedTestsRow(pr), [pr]);
  const incidents = useMemo(() => incidentMatches(pr, repo), [pr, repo]);
  const testRatio = useMemo(() => testCoverageRatio(pr.files), [pr.files]);
  const accent = tierColors[risk.tier];

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-white/55" />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          Risk profile
        </span>
        <span
          className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ background: `${accent}26`, color: accent }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
          {tierLabels[risk.tier]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <RiskStat label="Blast" value={String(risk.blastSum)} accent={risk.blastSum >= 25 ? severityColors.medium : null} />
        <RiskStat label="Public API" value={String(risk.publicApiCount)} accent={risk.publicApiCount > 0 ? severityColors.medium : null} />
        <RiskStat label="Low safety" value={String(risk.lowSafetyCount)} accent={risk.lowSafetyCount > 0 ? severityColors.medium : null} />
        <RiskStat label="SAST" value={String(risk.sastFindings)} accent={risk.sastFindings > 0 ? severityColors.blocker : null} />
        <RiskStat label="Coverage" value={risk.avgCoverage === null ? '—' : `${String(Math.round(risk.avgCoverage * 100))}%`} accent={risk.avgCoverage !== null && risk.avgCoverage < 0.5 ? severityColors.medium : null} />
        <RiskStat label="Cyclic" value={String(risk.cyclicCount)} accent={risk.cyclicCount > 0 ? severityColors.medium : null} />
      </div>

      {risk.secretsRisk && (
        <div
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md text-[12px]"
          style={{ background: `${severityColors.blocker}1a`, color: severityColors.blocker, border: `1px solid ${severityColors.blocker}55` }}
        >
          <KeyRound className="w-3.5 h-3.5 shrink-0" />
          A changed file matched the secrets-likely heuristic. Treat with care.
        </div>
      )}

      {risk.reasons.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Why this score
          </div>
          <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-white/70">
            {risk.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span style={{ color: accent }}>▸</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {cov.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Coverage delta
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {cov.map((r) => {
              const dropPct = Math.min(100, Math.max(0, r.drop));
              return (
                <div key={r.filePath} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[11px] text-white/70">{r.filePath}</div>
                    <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: `${severityColors.blocker}22` }}>
                      <div className="h-full" style={{ width: `${String(dropPct)}%`, background: severityColors.blocker }} />
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 font-mono text-[11px] tabular-nums">
                    <span className="text-white/40">{r.before}%</span>
                    <span className="text-white/30">→</span>
                    <span className="text-white/85">{r.after}%</span>
                    <span style={{ color: r.drop > 0 ? severityColors.blocker : '#4f9a5c' }}>
                      {r.drop > 0 ? `-${String(r.drop)}pp` : `+${String(-r.drop)}pp`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {testRatio.total > 0 && (
        <div className="mt-4 text-[12px] text-white/65">
          <span className="font-bold text-white/85">{Math.round(testRatio.ratio * 100)}%</span> of
          {' '}{testRatio.total} touched source {testRatio.total === 1 ? 'file has' : 'files have'} a co-changed test
          {testRatio.ratio < 0.5 && (
            <span className="ml-1.5" style={{ color: severityColors.medium }}>
              · consider adding tests before merge
            </span>
          )}
        </div>
      )}

      {incidents.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Past incident proximity
            </span>
            <span className="ml-auto text-[10px] font-mono text-white/40">
              {incidents.length} prior {incidents.length === 1 ? 'match' : 'matches'}
            </span>
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {incidents.slice(0, 4).map((m) => <IncidentMatchRow key={m.id} m={m} mediumColor={severityColors.medium} />)}
          </ul>
        </div>
      )}

      {tests !== null && (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Failed tests
            </span>
            <span
              className="ml-auto inline-flex items-center px-2 h-5 rounded-full text-[10px] font-mono tabular-nums"
              style={{ background: '#5fa86c22', color: '#5fa86c' }}
            >
              {tests.passed}/{tests.passed + tests.failed} passing
            </span>
          </div>
          {tests.failingNames.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {tests.failingNames.map((name) => (
                <li key={name} className="flex items-center justify-between gap-3 px-2 py-1 rounded-md bg-white/[0.025]">
                  <span className="font-mono text-[11px] truncate text-white/85">{name}</span>
                  <button
                    type="button"
                    className="shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold bg-white/[0.06] text-white/70 hover:bg-white/[0.10]"
                  >
                    <Play className="w-3 h-3" />
                    Run
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </V2Card>
  );
}

function RiskStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string | null;
}) {
  return (
    <div
      className="rounded-lg p-2.5"
      style={{
        background: 'var(--bg-surface-muted)',
        border: `1px solid ${accent ?? 'var(--bg-active)'}`,
        boxShadow: 'none',
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div
        className="mt-0.5 text-[18px] font-black tabular-nums leading-none"
        style={{ color: accent ?? 'var(--fg-strong)' }}
      >
        {value}
      </div>
    </div>
  );
}

function IncidentMatchRow({
  m,
  mediumColor,
}: {
  m: IncidentMatch;
  mediumColor: string;
}) {
  const pct = Math.round(m.similarity * 100);
  const fill = m.similarity >= 0.6 ? mediumColor
    : m.similarity >= 0.4 ? '#7aa7d4'
      : '#8b949e';
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-2 py-1.5 rounded-md bg-white/[0.025]">
      <span className="font-mono text-[10px] text-white/55 shrink-0">{m.id}</span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] text-white/85">{m.title}</span>
        <span className="block mt-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-active)' }}>
          <span className="block h-full" style={{ width: `${String(pct)}%`, background: fill }} />
        </span>
      </span>
      <span className="shrink-0 inline-flex items-center gap-2 text-[10px] font-mono tabular-nums">
        <span className="text-white/40">{m.date}</span>
        <span style={{ color: fill }}>{pct}%</span>
      </span>
    </li>
  );
}
