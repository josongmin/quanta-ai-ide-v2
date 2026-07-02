import { useMemo, useState } from 'react';
import {
  ArrowUpRight, Bot, ShieldCheck, Wand2,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import {
  engineFindings,
  engineSummary,
  type EngineFinding,
  type EngineSeverity,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { ruleProvenance } from '../../lib/sota';
import { trimMid } from '../../lib/reviewStageFormatting';
import FixPatchPreview from '../FixPatchPreview';
import { V2Card } from '../ReviewSurface';

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
          <Bot className="w-3.5 h-3.5 text-[var(--intent-info-fg)]" />
          <span className="text-[11px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)]">
            p0 engine · auto-review
          </span>
          <span
            className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9px] font-mono"
            style={{ background: 'var(--intent-info-bg)', color: 'var(--fg-link)', border: '1px solid color-mix(in srgb, var(--intent-info-fg) 35%, transparent)' }}
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
            className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] transition-colors"
            style={{
              background: focusMode ? 'color-mix(in srgb, var(--fg-link) 18%, transparent)' : 'var(--bg-hover)',
              color: focusMode ? 'var(--fg-link)' : 'var(--fg-muted)',
              border: focusMode ? '1px solid color-mix(in srgb, var(--fg-link) 55%, transparent)' : '1px solid var(--border-strong)',
            }}
            title="Focus mode shows one finding at a time. Use [ and ] to step."
          >
            focus
          </button>
          <button
            type="button"
            onClick={() => { setGrouped((v) => !v); }}
            aria-pressed={grouped}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)] hover:text-[var(--fg-strong)] transition-colors"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-strong)' }}
            title={grouped ? 'Switch to flat list' : 'Group identical rules'}
          >
            {grouped ? 'grouped' : 'ungrouped'}
          </button>
          {summary.autoFix > 0 && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-bold transition-colors text-[var(--fg-on-accent)]"
              style={{
                background: 'linear-gradient(140deg, var(--fg-link), var(--intent-info-fg))',
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
          color="var(--fg-muted)"
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
        <div className="mt-4 flex flex-col items-center justify-center text-center px-4 py-10 rounded-lg border border-dashed border-[var(--border-default)]">
          <ShieldCheck className="w-5 h-5 mb-2 text-[var(--fg-subtle)]" />
          <div className="text-[12px] font-bold text-[var(--fg-subtle)]">{t('empty.noFindings')}</div>
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
        background: `linear-gradient(140deg, color-mix(in srgb, ${worstColor} 6%, transparent), transparent 60%)`,
        border: `1px solid color-mix(in srgb, ${worstColor} 19%, transparent)`,
      }}
    >
      <button
        type="button"
        onClick={() => { setExpanded((v) => !v); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-hover)] transition-colors"
      >
        <span
          className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)]"
          style={{ background: `color-mix(in srgb, ${worstColor} 15%, transparent)`, color: worstColor }}
        >
          ×{items.length}
        </span>
        <span className="text-[11px] font-mono text-[var(--fg-strong)] truncate">{groupKey}</span>
        <span className="ml-auto text-[10px] font-mono text-[var(--fg-subtle)]">
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
        background: `linear-gradient(140deg, color-mix(in srgb, ${c} 6%, transparent), transparent 60%)`,
        border: `1px solid color-mix(in srgb, ${c} 19%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)]" style={{ background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c }}>
          {severityLabels[f.severity]}
        </span>
        <span className="text-[10px] font-mono text-[var(--fg-subtle)]">
          {f.category}/{f.rule}
        </span>
        <span
          className="inline-flex items-center gap-1 px-1.5 h-4 rounded-sm text-[9px] font-mono"
          style={{ background: `color-mix(in srgb, ${provenance.tone} 10%, transparent)`, color: provenance.tone, border: `1px solid color-mix(in srgb, ${provenance.tone} 33%, transparent)` }}
          title="Where this rule comes from"
        >
          {provenance.source}
        </span>
        <span className="ml-auto text-[10px] font-mono text-[var(--fg-muted)] tabular-nums">
          {idx + 1} / {total}
        </span>
      </div>
      <div className="text-[15px] font-bold leading-snug text-[var(--fg-strong)]">{f.title}</div>
      <div className="mt-1 text-[13px] leading-relaxed text-[var(--fg-default)]">{f.body}</div>
      <div className="mt-2 text-[11px] font-mono text-[var(--fg-muted)] truncate" title={f.filePath}>
        {f.filePath}{f.line !== null ? `:${String(f.line)}` : ''}
      </div>
      <FixPatchPreview finding={f} />
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onPrev}
          disabled={idx === 0}
          className="inline-flex items-center gap-1 h-7 px-3 rounded-md text-[11px] font-bold bg-[var(--bg-elevated)] text-[var(--fg-strong)] hover:bg-[var(--bg-active)] disabled:opacity-40"
        >
          ← prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={idx >= total - 1}
          className="inline-flex items-center gap-1 h-7 px-3 rounded-md text-[11px] font-bold bg-[var(--bg-elevated)] text-[var(--fg-strong)] hover:bg-[var(--bg-active)] disabled:opacity-40"
        >
          next →
        </button>
        {f.autoFixable && (
          <button
            type="button"
            className="inline-flex items-center gap-1 h-7 px-3 rounded-md text-[11px] font-bold"
            style={{ background: 'var(--intent-info-bg)', color: 'var(--fg-link)' }}
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
              background: vote === 'up' ? 'color-mix(in srgb, var(--intent-success-fg) 20%, transparent)' : 'var(--bg-hover)',
              color: vote === 'up' ? 'var(--intent-success-fg)' : 'var(--fg-muted)',
              border: vote === 'up' ? '1px solid color-mix(in srgb, var(--intent-success-fg) 55%, transparent)' : '1px solid var(--border-default)',
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
              background: vote === 'down' ? 'color-mix(in srgb, var(--intent-danger-fg) 20%, transparent)' : 'var(--bg-hover)',
              color: vote === 'down' ? 'var(--intent-danger-fg)' : 'var(--fg-muted)',
              border: vote === 'down' ? '1px solid color-mix(in srgb, var(--intent-danger-fg) 55%, transparent)' : '1px solid var(--border-default)',
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
      className="inline-flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] transition-colors"
      style={{
        background: active ? `color-mix(in srgb, ${color} 15%, transparent)` : 'var(--bg-hover)',
        color: active ? color : 'var(--fg-muted)',
        border: active ? `1px solid color-mix(in srgb, ${color} 47%, transparent)` : '1px solid var(--border-default)',
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
      className={`rounded-lg ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'} relative overflow-hidden transition-colors hover:bg-[var(--bg-hover)]`}
      style={compact
        ? { background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }
        : { background: `linear-gradient(140deg, color-mix(in srgb, ${c} 6%, transparent), transparent 60%)`, border: `1px solid color-mix(in srgb, ${c} 19%, transparent)` }}
    >
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)]" style={{ background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c }}>
          {severityLabels[f.severity]}
        </span>
        <span className="text-[10px] font-mono text-[var(--fg-subtle)] truncate">
          {f.category}/{f.rule}
        </span>
        {!compact && (
          <span
            className="text-[9px] font-mono px-1 h-4 inline-flex items-center rounded-sm"
            title="Where this rule comes from"
            style={{ background: `color-mix(in srgb, ${provenance.tone} 8%, transparent)`, color: provenance.tone, border: `1px solid color-mix(in srgb, ${provenance.tone} 25%, transparent)` }}
          >
            {provenance.source}
          </span>
        )}
        <span className="ml-auto text-[10px] font-mono text-[var(--fg-subtle)] truncate" title={f.filePath}>
          {trimMid(f.filePath, 36)}{f.line !== null ? `:${String(f.line)}` : ''}
        </span>
      </div>
      <div className={`${compact ? 'text-[12px]' : 'text-[13px]'} font-bold leading-snug text-[var(--fg-strong)]`}>{f.title}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-[var(--fg-muted)]">{f.body}</div>
      {!compact && <FixPatchPreview finding={f} />}
      <div className="mt-2 flex items-center gap-2">
        {f.autoFixable ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 h-6 px-2.5 rounded-md text-[11px] font-bold transition-colors"
            style={{ background: 'var(--intent-info-bg)', color: 'var(--fg-link)' }}
          >
            <Wand2 className="w-2.5 h-2.5" />
            Auto-fix
          </button>
        ) : (
          <span className="text-[11px] text-[var(--fg-subtle)]">{t('merge.needsManualReview')}</span>
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
                background: vote === 'up' ? 'color-mix(in srgb, var(--intent-success-fg) 20%, transparent)' : 'var(--bg-hover)',
                color: vote === 'up' ? 'var(--intent-success-fg)' : 'var(--fg-muted)',
                border: vote === 'up' ? '1px solid color-mix(in srgb, var(--intent-success-fg) 55%, transparent)' : '1px solid var(--border-default)',
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
                background: vote === 'down' ? 'color-mix(in srgb, var(--intent-danger-fg) 20%, transparent)' : 'var(--bg-hover)',
                color: vote === 'down' ? 'var(--intent-danger-fg)' : 'var(--fg-muted)',
                border: vote === 'down' ? '1px solid color-mix(in srgb, var(--intent-danger-fg) 55%, transparent)' : '1px solid var(--border-default)',
              }}
            >
              ▼
            </button>
          </span>
        )}
        <button
          type="button"
          className={`${onVote ? '' : 'ml-auto'} inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--fg-link)] hover:underline`}
        >
          Jump to file
          <ArrowUpRight className="w-2.5 h-2.5" />
        </button>
      </div>
    </li>
  );
}
