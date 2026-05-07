import { useMemo } from 'react';
import { Shuffle, X, ShieldCheck, ShieldAlert, FileText } from 'lucide-react';
import { useTheme } from '@shared/theme';
import { useFilterStore } from '@features/filter-files';
import { simulateBranchDiff } from '@entities/repo';
import { evaluateAdmission, type RuleEvaluation } from '@entities/admission';
import { usePrPreview } from '@features/pr-preview';
import { useTranslation } from '@shared/i18n';
import { useAdmissionStore } from '../model/store';
import {
  SOURCE_GLYPH, SEVERITY_COLOR, describeSignal, usesHint,
} from './sourceStyle';
import { tokens } from '@shared/lib';

// Two-column layout. Left = files in the PR. Right = rule results,
// grouped by status. We keep the verdict header restrained — one
// coloured icon + a small pill — and let the details speak through
// hierarchy rather than colour.

export function DecisionTab() {
  const { isDark } = useTheme();
  const { t } = useTranslation('admission');
  const rules = useAdmissionStore((s) => s.rules);
  const repo = useFilterStore((s) => s.repo);
  const { active, diff, seed, start, regenerate, stop } = usePrPreview();

  const effectiveSeed = seed ?? 42;
  const effectiveDiff = useMemo(
    () => diff ?? simulateBranchDiff(repo, effectiveSeed),
    [diff, repo, effectiveSeed],
  );
  const decision = useMemo(
    () => evaluateAdmission(rules, repo, effectiveDiff),
    [rules, repo, effectiveDiff],
  );

  const outcome = decision.outcome;
  const outcomeColor =
    outcome === 'block' ? SEVERITY_COLOR.block :
    outcome === 'warn'  ? SEVERITY_COLOR.warn  :
    '#5fa86c';
  const Icon = outcome === 'allow' ? ShieldCheck : ShieldAlert;

  const fired   = decision.ruleResults.filter((r) => r.status === 'block' || r.status === 'warn');
  const passed  = decision.ruleResults.filter((r) => r.status === 'pass');
  const skipped = decision.ruleResults.filter((r) => r.status === 'skip');

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Verdict header */}
      <div
        className="shrink-0 px-8 py-4 flex items-center gap-4"
        style={{ borderBottom: `1px solid ${tokens(isDark).border}` }}
      >
        <Icon className="w-5 h-5 shrink-0" style={{ color: outcomeColor }} />
        <span
          className="text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-md"
          style={{
            color: outcomeColor,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          }}
        >
          {outcome}
        </span>
        <div className={`text-[11px] font-mono ${isDark ? 'text-white/55' : 'text-black/55'}`}>
          PR #{effectiveSeed} · {effectiveDiff.changes.length} files · {effectiveDiff.affected.length} ripple
        </div>
        <div className="flex-1" />

        <Counter dim={isDark} label="block" value={decision.blockingCount} color={SEVERITY_COLOR.block} />
        <Counter dim={isDark} label="warn"  value={decision.warningCount}  color={SEVERITY_COLOR.warn} />
        <Counter dim={isDark} label="pass"  value={decision.passingCount} />

        <div className={`mx-2 h-4 w-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

        <button type="button"
          onClick={active ? regenerate : start}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${
            isDark ? 'text-white/70 hover:bg-white/5' : 'text-black/70 hover:bg-black/5'
          }`}
        >
          <Shuffle className="w-3 h-3" />
          {active ? 'Regenerate' : 'Sample PR'}
        </button>
        {active && (
          <button
            type="button"
            aria-label="Stop"
            onClick={stop}
            className={`p-1 rounded-md ${
              isDark ? 'text-white/55 hover:bg-white/5' : 'text-black/55 hover:bg-black/5'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,360px)_minmax(0,1fr)] overflow-hidden">
        {/* Left: changed files */}
        <div
          className="min-h-0 overflow-auto"
          style={{ borderRight: `1px solid ${tokens(isDark).border}` }}
        >
          <SectionHeader dim={isDark}>{t('section.filesInThisPr')}</SectionHeader>
          <div className={isDark ? 'divide-y divide-white/5' : 'divide-y divide-black/5'}>
            {effectiveDiff.changes.map((c) => {
              const f = repo.files[c.id];
              if (!f) return null;
              const ruleHits = decision.ruleResults
                .filter((rr) => rr.hits.some((h) => h.fileId === c.id));
              const worst = ruleHits.find((r) => r.status === 'block')
                ?? ruleHits.find((r) => r.status === 'warn');
              const accent = worst?.status === 'block'
                ? SEVERITY_COLOR.block
                : worst?.status === 'warn'
                  ? SEVERITY_COLOR.warn
                  : undefined;
              return (
                <div key={c.id} className="px-6 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className={`w-3 h-3 shrink-0 ${
                      isDark ? 'text-white/40' : 'text-black/40'
                    }`} />
                    <span className={`text-[11px] font-mono truncate min-w-0 flex-1 ${
                      isDark ? 'text-white/85' : 'text-black/85'
                    }`}>
                      {f.folderPath}.{f.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase tracking-[0.18em] shrink-0 ${
                        isDark ? 'text-white/40' : 'text-black/40'
                      }`}
                    >
                      {c.kind}
                    </span>
                    {accent && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: accent }}
                        aria-label={worst?.status}
                      />
                    )}
                  </div>
                  {ruleHits.length > 0 && (
                    <div className={`mt-1 text-[10px] font-mono truncate ${
                      isDark ? 'text-white/40' : 'text-black/55'
                    }`}>
                      {ruleHits.map((rr) => rr.ruleName).join(' · ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: rule results */}
        <div className="min-h-0 overflow-auto">
          {fired.length > 0 && (
            <ResultGroup title="Fired" count={fired.length} dim={isDark} accent={SEVERITY_COLOR.block}>
              {fired
                .sort((a, b) => statusRank(b.status) - statusRank(a.status))
                .map((r) => <RuleResultRow key={r.ruleId} r={r} dim={isDark} repo={repo} />)}
            </ResultGroup>
          )}
          <ResultGroup title="Passed" count={passed.length} dim={isDark}>
            {passed.map((r) => <RuleResultRow key={r.ruleId} r={r} dim={isDark} repo={repo} />)}
          </ResultGroup>
          {skipped.length > 0 && (
            <ResultGroup title="Skipped" count={skipped.length} dim={isDark} muted>
              {skipped.map((r) => <RuleResultRow key={r.ruleId} r={r} dim={isDark} repo={repo} />)}
            </ResultGroup>
          )}
        </div>
      </div>
    </div>
  );
}

function statusRank(s: string): number {
  return s === 'block' ? 4 : s === 'warn' ? 3 : s === 'pass' ? 2 : 1;
}

function SectionHeader({ children, dim }: { children: React.ReactNode; dim: boolean }) {
  return (
    <div
      className={`sticky top-0 z-10 px-6 py-1.5 backdrop-blur-md text-[10px] font-mono uppercase tracking-[0.18em] ${
        dim ? 'text-white/40' : 'text-black/55'
      }`}
      style={{
        backgroundColor: dim ? 'rgba(13,17,23,0.55)' : 'rgba(255,255,255,0.55)',
        borderBottom: `1px solid ${tokens(dim).border}`,
      }}
    >
      {children}
    </div>
  );
}

function ResultGroup({
  title, count, children, dim, accent, muted,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  dim: boolean;
  accent?: string;
  muted?: boolean;
}) {
  return (
    <section className={muted ? 'opacity-50' : ''}>
      <div
        className={`sticky top-0 z-10 px-6 py-1.5 backdrop-blur-md flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] ${
          dim ? 'text-white/55' : 'text-black/55'
        }`}
        style={{
          backgroundColor: dim ? 'rgba(13,17,23,0.55)' : 'rgba(255,255,255,0.55)',
          borderBottom: `1px solid ${tokens(dim).border}`,
        }}
      >
        {accent && (
          <span className="w-1 h-3 rounded-sm" style={{ backgroundColor: accent }} />
        )}
        <span>{title}</span>
        <span className="opacity-60 tabular-nums">{count}</span>
      </div>
      <div className={dim ? 'divide-y divide-white/5' : 'divide-y divide-black/5'}>
        {children}
      </div>
    </section>
  );
}

function RuleResultRow({
  r, dim, repo,
}: {
  r: RuleEvaluation;
  dim: boolean;
  repo: ReturnType<typeof useFilterStore.getState>['repo'];
}) {
  const sevColor =
    r.status === 'block' ? SEVERITY_COLOR.block :
    r.status === 'warn'  ? SEVERITY_COLOR.warn :
    undefined;
  const rule = useAdmissionStore.getState().rules.find((x) => x.id === r.ruleId);
  return (
    <div className="px-6 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        {sevColor ? (
          <span className="w-1 h-3 rounded-sm shrink-0" style={{ backgroundColor: sevColor }} />
        ) : (
          <span className={`w-1 h-3 shrink-0 ${dim ? 'opacity-0' : 'opacity-0'}`} />
        )}
        <span className={`text-[11px] font-mono shrink-0 ${
          dim ? 'text-white/40' : 'text-black/40'
        }`}>
          {SOURCE_GLYPH[r.source]}
        </span>
        <span className={`text-[12px] font-bold truncate min-w-0 flex-1 ${
          dim ? 'text-white/85' : 'text-black/85'
        }`}>
          {r.ruleName}
        </span>
        {r.hits.length > 0 && (
          <span
            className="text-[11px] font-mono tabular-nums shrink-0"
            style={sevColor ? { color: sevColor } : undefined}
          >
            {r.hits.length}
          </span>
        )}
      </div>
      <div className={`mt-0.5 text-[10px] font-mono truncate ${
        dim ? 'text-white/40' : 'text-black/55'
      }`}>
        {r.reason}
        {rule && (
          <>
            <span className="opacity-50"> · </span>
            <span className="opacity-80">{usesHint(rule.signal)}</span>
          </>
        )}
      </div>
      {rule && r.hits.length > 0 && (
        <ul className={`mt-1.5 space-y-px text-[10px] font-mono ${
          dim ? 'text-white/55' : 'text-black/70'
        }`}>
          {r.hits.slice(0, 4).map((h) => {
            const f = repo.files[h.fileId];
            return (
              <li key={h.fileId} className="flex items-center gap-2">
                <span className={dim ? 'opacity-40' : 'opacity-50'}>—</span>
                <span className="truncate min-w-0 flex-1">
                  {f ? `${f.folderPath}.${f.name}` : `#${h.fileId}`}
                </span>
                <span className={`shrink-0 truncate max-w-[14rem] ${
                  dim ? 'text-white/40' : 'text-black/40'
                }`}>
                  {h.evidenceText}
                </span>
              </li>
            );
          })}
          {r.hits.length > 4 && (
            <li className={dim ? 'text-white/40' : 'text-black/40'}>
              … {r.hits.length - 4} more
            </li>
          )}
        </ul>
      )}
      {rule && r.status === 'pass' && (
        <div className={`mt-0.5 text-[10px] font-mono ${
          dim ? 'text-white/30' : 'text-black/40'
        }`}>
          {describeSignal(rule.signal)}
        </div>
      )}
    </div>
  );
}

function Counter({
  label, value, color, dim,
}: { label: string; value: number; color?: string; dim: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="text-[15px] font-bold tabular-nums"
        style={color ? { color } : { color: dim ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)' }}
      >
        {value}
      </span>
      <span className={`text-[9px] font-mono uppercase tracking-[0.18em] ${
        dim ? 'text-white/40' : 'text-black/55'
      }`}>
        {label}
      </span>
    </div>
  );
}
