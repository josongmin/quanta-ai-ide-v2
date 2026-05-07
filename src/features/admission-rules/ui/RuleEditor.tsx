import { useMemo, useEffect, useState } from 'react';
import { X, Save, Eye } from 'lucide-react';
import { useTheme } from '@shared/theme';
import { useFilterStore } from '@features/filter-files';
import { simulateBranchDiff } from '@entities/repo';
import {
  previewRule,
  retroactiveImpact,
  estimateCost,
  canPreviewInline,
} from '@entities/admission';
import type {
  AdmissionRule,
  RuleSource,
  RuleSeverity,
  RuleSignal,
  MetricField,
  CompareOp,
  GraphPattern,
  TaintSource,
  TaintSink,
} from '@entities/admission';
import { useAdmissionStore } from '../model/store';
import { CostBadge } from './CostBadge';
import { ConfidenceMix } from './ConfidenceMix';
import { describeSignal, usesHint, SEVERITY_COLOR } from './sourceStyle';
import { tokens } from '@shared/lib';

const METRIC_FIELDS: MetricField[] = [
  'blastRadius', 'editSafety', 'sastFindings', 'cognitive', 'cyclomatic',
  'loc', 'fanIn', 'fanOut', 'churn', 'lineCoverage', 'maintainability',
  'eslintErrors', 'todoCount',
];
const OPS: CompareOp[] = ['>', '>=', '<', '<=', '=', '!='];
const GRAPH_PATTERNS: GraphPattern[] = [
  'import-cycle', 'public-api-touched', 'public-api-without-test',
  'orphan-edit', 'blast-radius-spike', 'unknown-region-creep', 'layer-violation',
];
const TAINT_SOURCES: TaintSource[] = ['env', 'http', 'user-input', 'config', 'secret'];
const TAINT_SINKS: TaintSink[] = ['fs.write', 'exec', 'sql', 'network', 'log'];
const SOURCES: RuleSource[] = ['native', 'eslint', 'semgrep', 'codeql', 'custom'];
const SEVERITIES: RuleSeverity[] = ['block', 'warn', 'info'];

// Side panel. Three vertical sections: form (top), live preview (middle),
// retroactive impact (bottom). All neutral surfaces, no card-in-card.
// The only colour is severity on the verdict bits.

export function RuleEditor({ onClose }: { onClose: () => void }) {
  const { isDark } = useTheme();
  const draft = useAdmissionStore((s) => s.draft);
  const updateDraft = useAdmissionStore((s) => s.updateDraft);
  const saveDraft = useAdmissionStore((s) => s.saveDraft);
  const repo = useFilterStore((s) => s.repo);
  const [previewKey, setPreviewKey] = useState(0);

  const previewRuleObj: AdmissionRule | null = useMemo(() => {
    if (!draft) return null;
    return {
      id: draft.ruleId ?? '_draft',
      name: draft.name,
      description: draft.description,
      source: draft.source,
      severity: draft.severity,
      enabled: true,
      signal: draft.signal,
      scope: {
        pathIncludes: splitCsv(draft.pathIncludes),
        pathExcludes: splitCsv(draft.pathExcludes),
        labels: [],
      },
      override: { allowAuthor: false, requiresApproverRole: null },
      evidence: 'exact',
    };
  }, [draft]);

  const [debouncedRule, setDebouncedRule] = useState(previewRuleObj);
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedRule(previewRuleObj); }, 180);
    return () => { clearTimeout(t); };
  }, [previewRuleObj]);

  const cost = previewRuleObj ? estimateCost(previewRuleObj) : 'instant';
  const canPreview = canPreviewInline(cost);

  const preview = useMemo(() => {
    if (!debouncedRule) return null;
    if (!canPreview) return null;
    return previewRule(debouncedRule, repo);
  }, [debouncedRule, repo, canPreview, previewKey]);

  const retro = useMemo(() => {
    if (!debouncedRule) return null;
    const diffs = Array.from({ length: 12 }, (_, i) => simulateBranchDiff(repo, 700_000 + i));
    return retroactiveImpact(debouncedRule, repo, diffs);
  }, [debouncedRule, repo]);

  if (!draft || !previewRuleObj) return null;
  const isNew = draft.ruleId === null;

  return (
    <aside
      className="shrink-0 flex flex-col overflow-hidden"
      style={{
        width: 480,
        borderLeft: `1px solid ${tokens(isDark).border}`,
        backgroundColor: isDark ? 'rgba(10, 14, 22, 0.55)' : 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
      }}
    >
      {/* Header */}
      <div
        className="shrink-0 px-5 py-3 flex items-center gap-2"
        style={{ borderBottom: `1px solid ${tokens(isDark).border}` }}
      >
        <h2 className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
          isDark ? 'text-white/85' : 'text-black/85'
        }`}>
          {isNew ? 'New rule' : 'Edit rule'}
        </h2>
        <CostBadge cost={cost} />
        <div className="flex-1" />
        <button type="button"
          onClick={() => { saveDraft(); setPreviewKey((k) => k + 1); }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${
            isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'
          }`}
        >
          <Save className="w-3 h-3" /> Save
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className={`p-1 rounded-md ${
            isDark ? 'text-white/55 hover:bg-white/5' : 'text-black/55 hover:bg-black/5'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto px-5 py-4 space-y-5">
        {/* Form */}
        <Section dim={isDark} title="Rule">
          <FieldRow dim={isDark} label="Name">
            <Input
              isDark={isDark}
              value={draft.name}
              onChange={(v) => { updateDraft({ name: v }); }}
              placeholder="Public-API touched without test"
            />
          </FieldRow>
          <FieldRow dim={isDark} label="Description">
            <Input
              isDark={isDark}
              value={draft.description}
              onChange={(v) => { updateDraft({ description: v }); }}
              placeholder="Why this rule exists"
              multiline
            />
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow dim={isDark} label="Source">
              <Select
                isDark={isDark}
                value={draft.source}
                onChange={(v) => { updateDraft({ source: v as RuleSource }); }}
                options={SOURCES}
              />
            </FieldRow>
            <FieldRow dim={isDark} label="Severity">
              <Select
                isDark={isDark}
                value={draft.severity}
                onChange={(v) => { updateDraft({ severity: v as RuleSeverity }); }}
                options={SEVERITIES}
                accent={draft.severity === 'block' ? SEVERITY_COLOR.block : draft.severity === 'warn' ? SEVERITY_COLOR.warn : undefined}
              />
            </FieldRow>
          </div>
        </Section>

        {/* Signal */}
        <Section dim={isDark} title="Signal">
          <div className={`flex items-center gap-px rounded-md overflow-hidden ${
            isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'
          }`}>
            {(['metric', 'graph', 'taint', 'dsl', 'external'] as const).map((k) => {
              const active = draft.signal.kind === k;
              return (
                <button type="button"
                  key={k}
                  onClick={() => { updateDraft({ signal: defaultSignalFor(k) }); }}
                  className={`flex-1 px-2 py-1 text-[10px] font-mono transition-colors ${
                    active
                      ? (isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-black')
                      : (isDark ? 'text-white/40 hover:text-white/70' : 'text-black/55 hover:text-black/70')
                  }`}
                >
                  {k}
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            <SignalEditor
              isDark={isDark}
              signal={draft.signal}
              onChange={(s) => { updateDraft({ signal: s }); }}
            />
          </div>
          <div className={`mt-2 text-[10px] font-mono ${isDark ? 'text-white/40' : 'text-black/55'}`}>
            <span className="opacity-70">uses</span> {usesHint(draft.signal)}
          </div>
        </Section>

        {/* Scope */}
        <Section dim={isDark} title="Scope">
          <div className="grid grid-cols-2 gap-3">
            <Input
              isDark={isDark}
              value={draft.pathIncludes}
              onChange={(v) => { updateDraft({ pathIncludes: v }); }}
              placeholder="includes (csv)"
              mono
            />
            <Input
              isDark={isDark}
              value={draft.pathExcludes}
              onChange={(v) => { updateDraft({ pathExcludes: v }); }}
              placeholder="excludes (csv)"
              mono
            />
          </div>
        </Section>

        {/* Live preview */}
        <Section
          dim={isDark}
          title="Live preview"
          icon={Eye}
          right={preview && (
            <span className={`text-[10px] font-mono ${isDark ? 'text-white/40' : 'text-black/55'}`}>
              {preview.elapsedMs.toFixed(1)}ms
            </span>
          )}
        >
          {!canPreview ? (
            <div className={`text-[11px] leading-relaxed font-mono ${
              isDark ? 'text-white/55' : 'text-black/55'
            }`}>
              Signal too expensive for inline preview. Save and run in background to see results.
            </div>
          ) : preview ? (
            <PreviewBody
              isDark={isDark}
              preview={preview}
              repoLookup={(id) => {
                const f = repo.files[id];
                return f ? `${f.folderPath}.${f.name}` : `#${id}`;
              }}
            />
          ) : (
            <div className={`text-[11px] font-mono ${isDark ? 'text-white/40' : 'text-black/55'}`}>…</div>
          )}
        </Section>

        {/* Retroactive */}
        {retro && (
          <Section dim={isDark} title="If enabled (last 30d)">
            <div className="grid grid-cols-3 gap-3">
              <RetroStat dim={isDark} label="block" value={retro.wouldBlock} color={SEVERITY_COLOR.block} />
              <RetroStat dim={isDark} label="warn"  value={retro.wouldWarn}  color={SEVERITY_COLOR.warn} />
              <RetroStat dim={isDark} label="pass"  value={retro.wouldPass} />
            </div>
            <div className={`mt-2 text-[10px] font-mono ${isDark ? 'text-white/40' : 'text-black/40'}`}>
              {retro.simulated} synthetic PRs · deterministic seeds
            </div>
          </Section>
        )}
      </div>

      <div
        className={`shrink-0 px-5 py-2 text-[10px] font-mono truncate ${
          isDark ? 'text-white/40' : 'text-black/40'
        }`}
        style={{ borderTop: `1px solid ${tokens(isDark).border}` }}
      >
        {describeSignal(draft.signal)}
      </div>
    </aside>
  );
}

function defaultSignalFor(kind: RuleSignal['kind']): RuleSignal {
  switch (kind) {
    case 'metric':   return { kind: 'metric', field: 'blastRadius', op: '>', value: 25 };
    case 'graph':    return { kind: 'graph', pattern: 'public-api-without-test' };
    case 'taint':    return { kind: 'taint', source: 'env', sink: 'fs.write', requireSanitizer: true };
    case 'dsl':      return { kind: 'dsl', expr: 'safety:<40 +publicApi' };
    case 'external': return { kind: 'external', tool: 'eslint', ruleId: 'no-eval' };
  }
}

function splitCsv(s: string): string[] {
  return s.split(',').map((p) => p.trim()).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────

function Section({
  dim, title, icon: Icon, right, children,
}: {
  dim: boolean;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className={`w-3 h-3 ${dim ? 'text-white/55' : 'text-black/55'}`} />}
        <h3 className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
          dim ? 'text-white/70' : 'text-black/70'
        }`}>
          {title}
        </h3>
        <div className="flex-1" />
        {right}
      </div>
      {children}
    </section>
  );
}

function FieldRow({
  dim, label, children,
}: { dim: boolean; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className={`mb-1 text-[9px] font-mono uppercase tracking-[0.18em] ${
        dim ? 'text-white/40' : 'text-black/55'
      }`}>
        {label}
      </div>
      {children}
    </div>
  );
}

function SignalEditor({
  isDark, signal, onChange,
}: { isDark: boolean; signal: RuleSignal; onChange: (s: RuleSignal) => void }) {
  if (signal.kind === 'metric') {
    return (
      <div className="grid grid-cols-3 gap-2">
        <Select
          isDark={isDark}
          value={signal.field}
          onChange={(v) => { onChange({ ...signal, field: v as MetricField }); }}
          options={METRIC_FIELDS}
        />
        <Select
          isDark={isDark}
          value={signal.op}
          onChange={(v) => { onChange({ ...signal, op: v as CompareOp }); }}
          options={OPS}
        />
        <Input
          isDark={isDark}
          value={String(signal.value)}
          onChange={(v) => { onChange({ ...signal, value: Number(v) || 0 }); }}
          numeric
        />
      </div>
    );
  }
  if (signal.kind === 'graph') {
    return (
      <div className="space-y-2">
        <Select
          isDark={isDark}
          value={signal.pattern}
          onChange={(v) => { onChange({ kind: 'graph', pattern: v as GraphPattern, value: signal.value }); }}
          options={GRAPH_PATTERNS}
        />
        {signal.pattern === 'blast-radius-spike' && (
          <Input
            isDark={isDark}
            value={String(signal.value ?? 25)}
            onChange={(v) => { onChange({ ...signal, value: Number(v) || 0 }); }}
            numeric
            placeholder="threshold"
          />
        )}
      </div>
    );
  }
  if (signal.kind === 'taint') {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Select
            isDark={isDark}
            value={signal.source}
            onChange={(v) => { onChange({ ...signal, source: v as TaintSource }); }}
            options={TAINT_SOURCES}
          />
          <Select
            isDark={isDark}
            value={signal.sink}
            onChange={(v) => { onChange({ ...signal, sink: v as TaintSink }); }}
            options={TAINT_SINKS}
          />
        </div>
        <label className={`flex items-center gap-2 text-[10px] font-mono ${
          isDark ? 'text-white/55' : 'text-black/70'
        }`}>
          <input
            type="checkbox"
            checked={signal.requireSanitizer}
            onChange={(e) => { onChange({ ...signal, requireSanitizer: e.currentTarget.checked }); }}
          />
          require sanitizer on path
        </label>
      </div>
    );
  }
  if (signal.kind === 'dsl') {
    return (
      <Input
        isDark={isDark}
        value={signal.expr}
        onChange={(v) => { onChange({ kind: 'dsl', expr: v }); }}
        placeholder="safety:<40 +publicApi !test"
        mono
      />
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        isDark={isDark}
        value={signal.tool}
        onChange={(v) => { onChange({ ...signal, tool: v as 'eslint' | 'semgrep' | 'codeql' | 'bandit' | 'ruff' }); }}
        options={['eslint', 'semgrep', 'codeql', 'bandit', 'ruff']}
      />
      <Input
        isDark={isDark}
        value={signal.ruleId}
        onChange={(v) => { onChange({ ...signal, ruleId: v }); }}
        placeholder="rule id"
        mono
      />
    </div>
  );
}

function PreviewBody({
  isDark, preview, repoLookup,
}: {
  isDark: boolean;
  preview: NonNullable<ReturnType<typeof previewRule>>;
  repoLookup: (id: number) => string;
}) {
  const total = preview.matches.length;
  const cap = Math.min(total, 6);
  const baseAlpha = isDark ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-2">
        <span
          className={`text-[22px] font-bold leading-none tabular-nums ${
            total === 0
              ? (isDark ? 'text-white/40' : 'text-black/40')
              : (isDark ? 'text-white' : 'text-black')
          }`}
        >
          {total}
        </span>
        <span className={`text-[10px] font-mono uppercase tracking-[0.18em] ${
          isDark ? 'text-white/40' : 'text-black/55'
        }`}>
          matches{preview.truncated ? ' · capped' : ''}
        </span>
        <div className="flex-1" />
        <ConfidenceMix mix={preview.confidenceMix} width={100} height={3} />
      </div>
      <div className={`text-[10px] font-mono mb-2 ${isDark ? 'text-white/40' : 'text-black/55'}`}>
        <span style={{ color: `${baseAlpha}0.85)` }}>exact {preview.confidenceMix.exact}</span>
        <span className="opacity-50"> · </span>
        <span style={{ color: `${baseAlpha}0.55)` }}>over {preview.confidenceMix.overapprox}</span>
        <span className="opacity-50"> · </span>
        <span style={{ color: `${baseAlpha}0.30)` }}>unk {preview.confidenceMix.unknown}</span>
      </div>
      {total === 0 ? (
        <div className={`text-[11px] font-mono ${isDark ? 'text-white/40' : 'text-black/40'}`}>
          No files match — rule is ready to enable.
        </div>
      ) : (
        <ul className="space-y-px">
          {preview.matches.slice(0, cap).map((m) => (
            <li
              key={m.fileId}
              className={`flex items-center gap-2 text-[10px] font-mono px-1.5 py-1 rounded-md ${
                isDark ? 'bg-white/[0.03]' : 'bg-black/[0.03]'
              }`}
            >
              <span
                className={`shrink-0 ${
                  m.confidence === 'exact'
                    ? (isDark ? 'text-white/70' : 'text-black/70')
                    : m.confidence === 'overapprox'
                      ? (isDark ? 'text-white/55' : 'text-black/55')
                      : (isDark ? 'text-white/30' : 'text-black/40')
                }`}
              >
                —
              </span>
              <span className={`truncate min-w-0 flex-1 ${
                isDark ? 'text-white/85' : 'text-black/85'
              }`}>
                {repoLookup(m.fileId)}
              </span>
              <span className={`shrink-0 truncate max-w-[12rem] ${
                isDark ? 'text-white/40' : 'text-black/40'
              }`}>
                {m.evidenceText}
              </span>
            </li>
          ))}
          {total > cap && (
            <li className={`text-[10px] font-mono px-1.5 py-1 ${
              isDark ? 'text-white/40' : 'text-black/40'
            }`}>
              … {total - cap} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function RetroStat({
  label, value, color, dim,
}: { label: string; value: number; color?: string; dim: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="text-[18px] font-bold tabular-nums"
        style={color ? { color } : { color: dim ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)' }}
      >
        {value}
      </span>
      <span className={`text-[9px] font-mono uppercase tracking-[0.18em] ${
        dim ? 'text-white/55' : 'text-black/55'
      }`}>
        {label}
      </span>
    </div>
  );
}

function Input({
  isDark, value, onChange, placeholder, multiline, numeric, mono,
}: {
  isDark: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  mono?: boolean;
}) {
  const cls = `w-full px-2 py-1 rounded-md border text-[11px] ${
    mono ? 'font-mono' : ''
  } ${
    isDark
      ? 'bg-white/[0.03] border-white/10 text-white/85 placeholder-white/30'
      : 'bg-white border-black/10 text-black/85 placeholder-black/35'
  } focus:outline-none focus:border-[#7aa7d4]/40`;
  if (multiline) {
    return (
      <textarea
        rows={2}
        className={cls}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.currentTarget.value); }}
      />
    );
  }
  return (
    <input
      type={numeric ? 'number' : 'text'}
      className={cls}
      value={value}
      placeholder={placeholder}
      onChange={(e) => { onChange(e.currentTarget.value); }}
    />
  );
}

function Select({
  isDark, value, onChange, options, accent,
}: {
  isDark: boolean;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  accent?: string;
}) {
  return (
    <select
      className={`w-full px-2 py-1 rounded-md border text-[11px] font-mono ${
        isDark
          ? 'bg-white/[0.03] border-white/10 text-white/85'
          : 'bg-white border-black/10 text-black/85'
      } focus:outline-none focus:border-[#7aa7d4]/40`}
      style={accent ? { color: accent } : undefined}
      value={value}
      onChange={(e) => { onChange(e.currentTarget.value); }}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}
