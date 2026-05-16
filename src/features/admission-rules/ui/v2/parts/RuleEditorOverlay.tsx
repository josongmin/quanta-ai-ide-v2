import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Eye, Clock, Save, X as XIcon,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { Portal, useDialogA11y } from '@shared/ui';
import { useFilterStore } from '@features/filter-files';
import { simulateBranchDiff } from '@entities/repo';
import {
  previewRule, evaluateAdmission, estimateCost,
  type AdmissionRule, type RuleSource, type RuleSeverity, type RuleSignal,
  type MetricField, type CompareOp, type GraphPattern,
  type TaintSource, type TaintSink,
} from '@entities/admission';
import { useAdmissionStore } from '../../../model/store';
import { usesHint } from '../../sourceStyle';
import { SEVERITY_COLOR } from './tokens';
import { V2Card } from './primitives';
import { timeAgo } from './retrospective';

// ── Rule editor (drawer) ─────────────────────────────────────────────

export function RuleEditorOverlay({
  editingId, onClose,
}: {
  editingId: string | null;
  onClose: () => void;
}) {
  const { t: tA } = useTranslation('admission');
  const draft = useAdmissionStore((s) => s.draft);
  const updateDraft = useAdmissionStore((s) => s.updateDraft);
  const saveDraft = useAdmissionStore((s) => s.saveDraft);
  const repo = useFilterStore((s) => s.repo);
  const versions = useAdmissionStore((s) => editingId ? s.versions[editingId] : undefined);
  const dialogRef = useRef<HTMLElement>(null);
  // ESC closes, Tab cycles within the drawer, autofocus first input on open,
  // restore focus to the opener when the drawer unmounts.
  useDialogA11y(dialogRef, draft !== null, onClose);

  // Hooks must run unconditionally; the early return for "no draft" is moved
  // below the hooks block. When `draft` is null we feed safe defaults into
  // the preview rule so the hooks still have valid input.
  const previewRuleObj = useMemo<AdmissionRule>(() => ({
    id: draft?.ruleId ?? '_draft',
    name: draft?.name ?? '',
    description: draft?.description ?? '',
    source: draft?.source ?? 'native',
    severity: draft?.severity ?? 'warn',
    enabled: true,
    signal: draft?.signal ?? { kind: 'metric', field: 'blastRadius', op: '>', value: 25 },
    scope: {
      pathIncludes: (draft?.pathIncludes ?? '').split(',').map((p) => p.trim()).filter(Boolean),
      pathExcludes: (draft?.pathExcludes ?? '').split(',').map((p) => p.trim()).filter(Boolean),
      labels: [],
    },
    override: { allowAuthor: false, requiresApproverRole: null },
    evidence: 'exact',
  }), [draft]);

  const [debounced, setDebounced] = useState(previewRuleObj);
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(previewRuleObj); }, 200);
    return () => { clearTimeout(t); };
  }, [previewRuleObj]);

  const cost = estimateCost(previewRuleObj);
  const preview = useMemo(() => previewRule(debounced, repo), [debounced, repo]);
  const retroDiffs = useMemo(
    () => Array.from({ length: 12 }, (_, i) => simulateBranchDiff(repo, 700_000 + i)),
    [repo],
  );
  const retroImpact = useMemo(() => {
    let block = 0, warn = 0, pass = 0;
    for (const d of retroDiffs) {
      const dec = evaluateAdmission([previewRuleObj], repo, d);
      if (dec.blockingCount > 0) block++;
      else if (dec.warningCount > 0) warn++;
      else pass++;
    }
    return { block, warn, pass, total: retroDiffs.length };
  }, [retroDiffs, repo, previewRuleObj]);

  if (!draft) return null;

  return (
    <Portal>
      {/* Backdrop */}
      <div
        role="presentation"
        className="fixed inset-0 z-[200]"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      />
      {/* Drawer */}
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={editingId === null ? 'New rule' : 'Edit rule'}
        tabIndex={-1}
        className="fixed right-0 top-0 bottom-0 z-[201] flex flex-col overflow-hidden admv2-rise outline-none"
        style={{
          width: 520,
          background: '#0d1117',
          borderLeft: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '-24px 0 60px rgba(0,0,0,0.6)',
        }}
      >
        <div className="shrink-0 px-5 py-4 flex items-center gap-2 border-b border-white/5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            {editingId === null ? 'New rule' : 'Edit rule'}
          </h2>
          <span
            className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-px rounded-md"
            style={{
              color: 'rgba(255,255,255,0.65)',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            {cost}
          </span>
          {versions && versions.length > 0 && (
            <span
              className="text-[9px] font-mono px-1.5 py-px rounded-md"
              style={{
                color: '#7aa7d4',
                background: '#7aa7d415',
                border: '1px solid #7aa7d433',
              }}
            >
              v{versions.length}
            </span>
          )}
          <div className="flex-1" />
          <button type="button"
            onClick={() => saveDraft()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.18em] bg-white text-black hover:bg-white/90"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded-md text-white/55 hover:text-white hover:bg-white/5"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-5 space-y-5">
          {/* Identity */}
          <Field label="Name">
            <DrawerInput
              value={draft.name}
              onChange={(v) => { updateDraft({ name: v }); }}
              placeholder="Public-API touched without test"
            />
          </Field>
          <Field label="Description">
            <DrawerInput
              value={draft.description}
              onChange={(v) => { updateDraft({ description: v }); }}
              placeholder={tA('rule.whyExistsPlaceholder')}
              multiline
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Source">
              <DrawerSelect
                value={draft.source}
                onChange={(v) => { updateDraft({ source: v as RuleSource }); }}
                options={['native', 'eslint', 'semgrep', 'codeql', 'custom']}
              />
            </Field>
            <Field label="Severity">
              <DrawerSelect
                value={draft.severity}
                onChange={(v) => { updateDraft({ severity: v as RuleSeverity }); }}
                options={['block', 'warn', 'info']}
                accent={draft.severity === 'block' ? SEVERITY_COLOR.block
                  : draft.severity === 'warn' ? SEVERITY_COLOR.warn : undefined}
              />
            </Field>
          </div>

          {/* Signal */}
          <Field label="Signal">
            <div className="flex items-center gap-px rounded-md overflow-hidden bg-white/[0.04] border border-white/5">
              {(['metric', 'graph', 'taint', 'dsl', 'external'] as const).map((k) => {
                const active = draft.signal.kind === k;
                return (
                  <button type="button"
                    key={k}
                    onClick={() => { updateDraft({ signal: defaultSignalFor(k) }); }}
                    className={`flex-1 px-2 py-1 text-[10px] font-mono transition-colors ${
                      active ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/85'
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
            <div className="mt-2">
              <SignalEditor
                signal={draft.signal}
                onChange={(s) => { updateDraft({ signal: s }); }}
              />
            </div>
            <div className="mt-2 text-[10px] font-mono text-white/40">
              uses {usesHint(draft.signal)}
            </div>
          </Field>

          <Field label="Scope">
            <div className="grid grid-cols-2 gap-3">
              <DrawerInput
                value={draft.pathIncludes}
                onChange={(v) => { updateDraft({ pathIncludes: v }); }}
                placeholder="includes (csv)"
                mono
              />
              <DrawerInput
                value={draft.pathExcludes}
                onChange={(v) => { updateDraft({ pathExcludes: v }); }}
                placeholder="excludes (csv)"
                mono
              />
            </div>
          </Field>

          {/* Live preview */}
          <V2Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-3 h-3 text-white/55" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                live preview
              </span>
              <span className="ml-auto text-[9px] font-mono text-white/40">
                {preview.elapsedMs.toFixed(1)}ms · {preview.cost}
              </span>
            </div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-[24px] font-black tabular-nums text-white leading-none">
                {preview.matches.length}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                matches{preview.truncated ? ' (capped)' : ''}
              </span>
            </div>
            <div className="text-[10px] font-mono text-white/40 mb-2">
              exact {preview.confidenceMix.exact} · over {preview.confidenceMix.overapprox} · unk {preview.confidenceMix.unknown}
            </div>
            {preview.matches.length === 0 ? (
              <div className="text-[11px] font-mono text-white/40">
                No files match. Rule is ready to enable.
              </div>
            ) : (
              <ul className="space-y-px">
                {preview.matches.slice(0, 6).map((m) => {
                  const f = repo.files[m.fileId];
                  return (
                    <li
                      key={m.fileId}
                      className="flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded-md bg-white/[0.025]"
                    >
                      <span className="w-1 h-1 rounded-full bg-white/55" />
                      <span className="truncate flex-1 text-white/85">
                        {f ? `${f.folderPath}.${f.name}` : `#${m.fileId}`}
                      </span>
                      <span className="text-white/40 truncate max-w-[10rem]">
                        {m.evidenceText}
                      </span>
                    </li>
                  );
                })}
                {preview.matches.length > 6 && (
                  <li className="text-[10px] font-mono text-white/40 px-2">
                    … {preview.matches.length - 6} more
                  </li>
                )}
              </ul>
            )}
          </V2Card>

          {/* Retroactive impact */}
          <V2Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-3 h-3 text-white/55" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                if enabled (last 30d sim)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <RetroBadge label="block" value={retroImpact.block} color={SEVERITY_COLOR.block} />
              <RetroBadge label="warn"  value={retroImpact.warn}  color={SEVERITY_COLOR.warn} />
              <RetroBadge label="pass"  value={retroImpact.pass}  color="#5fa86c" />
            </div>
          </V2Card>

          {/* Version history */}
          {versions && versions.length > 0 && (
            <V2Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3 h-3 text-white/55" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                  history
                </span>
                <span className="ml-auto text-[9px] font-mono text-white/40">
                  {versions.length} revision{versions.length === 1 ? '' : 's'}
                </span>
              </div>
              <ul className="space-y-1.5">
                {versions.slice().reverse().slice(0, 6).map((v) => (
                  <li key={v.version} className="flex items-center gap-2 text-[10px] font-mono">
                    <span
                      className="px-1.5 py-px rounded-md text-[#7aa7d4]"
                      style={{ background: '#7aa7d415', border: '1px solid #7aa7d433' }}
                    >
                      v{v.version}
                    </span>
                    <span className="text-white/55 truncate flex-1">{v.summary}</span>
                    <span className="text-white/30">{timeAgo(v.changedAt)}</span>
                  </li>
                ))}
              </ul>
            </V2Card>
          )}
        </div>
      </aside>
    </Portal>
  );
}

// ── Field + drawer inputs (also used by the override modal in GatePage)

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      {children}
    </div>
  );
}

export function DrawerInput({
  value, onChange, placeholder, multiline, mono, numeric,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  mono?: boolean;
  numeric?: boolean;
}) {
  const cls = `w-full px-3 py-2 rounded-md text-[11px] outline-none transition-colors ${mono ? 'font-mono' : ''} text-white/85 placeholder:text-white/30`;
  const style: React.CSSProperties = {
    background: 'rgba(0,0,0,0.30)',
    border: '1px solid rgba(255,255,255,0.08)',
  };
  if (multiline) {
    return (
      <textarea
        rows={2}
        className={cls}
        style={style}
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
      style={style}
      value={value}
      placeholder={placeholder}
      onChange={(e) => { onChange(e.currentTarget.value); }}
    />
  );
}

function DrawerSelect({
  value, onChange, options, accent,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  accent?: string;
}) {
  return (
    <select
      className="w-full px-3 py-2 rounded-md text-[11px] font-mono outline-none text-white/85"
      style={{
        background: 'rgba(0,0,0,0.30)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: accent,
      }}
      value={value}
      onChange={(e) => { onChange(e.currentTarget.value); }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SignalEditor({
  signal, onChange,
}: { signal: RuleSignal; onChange: (s: RuleSignal) => void }) {
  if (signal.kind === 'metric') {
    return (
      <div className="grid grid-cols-3 gap-2">
        <DrawerSelect
          value={signal.field}
          onChange={(v) => { onChange({ ...signal, field: v as MetricField }); }}
          options={['blastRadius', 'editSafety', 'sastFindings', 'cognitive', 'cyclomatic',
            'loc', 'fanIn', 'fanOut', 'churn', 'lineCoverage', 'maintainability',
            'eslintErrors', 'todoCount']}
        />
        <DrawerSelect
          value={signal.op}
          onChange={(v) => { onChange({ ...signal, op: v as CompareOp }); }}
          options={['>', '>=', '<', '<=', '=', '!=']}
        />
        <DrawerInput
          value={String(signal.value)}
          onChange={(v) => { onChange({ ...signal, value: Number(v) || 0 }); }}
          numeric
        />
      </div>
    );
  }
  if (signal.kind === 'graph') {
    return (
      <DrawerSelect
        value={signal.pattern}
        onChange={(v) => { onChange({ kind: 'graph', pattern: v as GraphPattern }); }}
        options={['import-cycle', 'public-api-touched', 'public-api-without-test',
          'orphan-edit', 'blast-radius-spike', 'unknown-region-creep', 'layer-violation']}
      />
    );
  }
  if (signal.kind === 'taint') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <DrawerSelect
          value={signal.source}
          onChange={(v) => { onChange({ ...signal, source: v as TaintSource }); }}
          options={['env', 'http', 'user-input', 'config', 'secret']}
        />
        <DrawerSelect
          value={signal.sink}
          onChange={(v) => { onChange({ ...signal, sink: v as TaintSink }); }}
          options={['fs.write', 'exec', 'sql', 'network', 'log']}
        />
      </div>
    );
  }
  if (signal.kind === 'dsl') {
    return (
      <DrawerInput
        value={signal.expr}
        onChange={(v) => { onChange({ kind: 'dsl', expr: v }); }}
        placeholder="safety:<40 +publicApi !test"
        mono
      />
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <DrawerSelect
        value={signal.tool}
        onChange={(v) => { onChange({ ...signal, tool: v as 'eslint' | 'semgrep' | 'codeql' | 'bandit' | 'ruff' }); }}
        options={['eslint', 'semgrep', 'codeql', 'bandit', 'ruff']}
      />
      <DrawerInput
        value={signal.ruleId}
        onChange={(v) => { onChange({ ...signal, ruleId: v }); }}
        placeholder="rule id"
        mono
      />
    </div>
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

function RetroBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="px-3 py-2 rounded-md"
      style={{
        background: `${color}11`,
        border: `1px solid ${color}33`,
      }}
    >
      <div className="text-[20px] font-black tabular-nums leading-none" style={{ color }}>
        {value}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40 mt-1">
        {label}
      </div>
    </div>
  );
}
