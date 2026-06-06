import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Eye, Clock, Save, X as XIcon,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { Portal, ModalBackdrop, useDialogA11y } from '@shared/ui';
import { useFilterStore } from '@entities/filter-state';
import { simulateBranchDiff } from '@entities/repo';
import {
  previewRule, evaluateAdmission, estimateCost,
  type AdmissionRule, type RuleSource, type RuleSeverity,
} from '@entities/admission';
import { useAdmissionStore } from '../../../model/store';
import { usesHint } from '../../sourceStyle';
import { SEVERITY_COLOR, useV2, type V2Theme } from './tokens';
import { V2Card } from './primitives';
import { timeAgo } from './retrospective';
import { SignalEditor, defaultSignalFor } from './SignalEditor';

// ── Rule editor (drawer) ─────────────────────────────────────────────

export function RuleEditorOverlay({
  editingId, onClose,
}: {
  editingId: string | null;
  onClose: () => void;
}) {
  const { t: tA } = useTranslation('admission');
  const t = useV2();
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
      {/* Backdrop — click-to-dismiss; Escape handled by useDialogA11y. */}
      <ModalBackdrop onClick={onClose} z="z-[200]" alpha={0.55} blur="sm" label="Close" />
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
          background: t.cardBacking,
          borderLeft: `1px solid ${t.border}`,
          boxShadow: '-24px 0 60px rgba(0,0,0,0.6)',
        }}
      >
        <div
          className="shrink-0 px-5 py-4 flex items-center gap-2 border-b"
          style={{ borderColor: t.borderSoft }}
        >
          <h2
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: t.textHi }}
          >
            {editingId === null ? 'New rule' : 'Edit rule'}
          </h2>
          <span
            className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-px rounded-md"
            style={{
              color: t.textMuted,
              background: t.inset,
            }}
          >
            {cost}
          </span>
          {versions && versions.length > 0 && (
            <span
              className="text-[9px] font-mono px-1.5 py-px rounded-md"
              style={{
                color: t.accent,
                background: `${t.accent}15`,
                border: `1px solid ${t.accent}33`,
              }}
            >
              v{versions.length}
            </span>
          )}
          <div className="flex-1" />
          <button type="button"
            onClick={() => saveDraft()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ background: t.textHi, color: t.page }}
          >
            <Save className="w-3 h-3" />
            Save
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: t.textMuted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = t.textHi;
              e.currentTarget.style.background = t.hoverSubtle;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = t.textMuted;
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-5 space-y-5">
          {/* Identity */}
          <Field label="Name" t={t}>
            <DrawerInput
              value={draft.name}
              onChange={(v) => { updateDraft({ name: v }); }}
              placeholder="Public-API touched without test"
              t={t}
            />
          </Field>
          <Field label="Description" t={t}>
            <DrawerInput
              value={draft.description}
              onChange={(v) => { updateDraft({ description: v }); }}
              placeholder={tA('rule.whyExistsPlaceholder')}
              multiline
              t={t}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Source" t={t}>
              <DrawerSelect
                value={draft.source}
                onChange={(v) => { updateDraft({ source: v as RuleSource }); }}
                options={['native', 'eslint', 'semgrep', 'codeql', 'custom']}
                t={t}
              />
            </Field>
            <Field label="Severity" t={t}>
              <DrawerSelect
                value={draft.severity}
                onChange={(v) => { updateDraft({ severity: v as RuleSeverity }); }}
                options={['block', 'warn', 'info']}
                accent={draft.severity === 'block' ? SEVERITY_COLOR.block
                  : draft.severity === 'warn' ? SEVERITY_COLOR.warn : undefined}
                t={t}
              />
            </Field>
          </div>

          {/* Signal */}
          <Field label="Signal" t={t}>
            <div
              className="flex items-center gap-px rounded-md overflow-hidden border"
              style={{ background: t.inset, borderColor: t.borderSoft }}
            >
              {(['metric', 'graph', 'taint', 'dsl', 'external'] as const).map((k) => {
                const active = draft.signal.kind === k;
                return (
                  <button type="button"
                    key={k}
                    onClick={() => { updateDraft({ signal: defaultSignalFor(k) }); }}
                    className="flex-1 px-2 py-1 text-[10px] font-mono transition-colors"
                    style={{
                      background: active ? t.hoverActive : 'transparent',
                      color: active ? t.textHi : t.textSubtle,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.color = t.textBody;
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.color = t.textSubtle;
                    }}
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
                t={t}
              />
            </div>
            <div
              className="mt-2 text-[10px] font-mono"
              style={{ color: t.textSubtle }}
            >
              uses {usesHint(draft.signal)}
            </div>
          </Field>

          <Field label="Scope" t={t}>
            <div className="grid grid-cols-2 gap-3">
              <DrawerInput
                value={draft.pathIncludes}
                onChange={(v) => { updateDraft({ pathIncludes: v }); }}
                placeholder="includes (csv)"
                mono
                t={t}
              />
              <DrawerInput
                value={draft.pathExcludes}
                onChange={(v) => { updateDraft({ pathExcludes: v }); }}
                placeholder="excludes (csv)"
                mono
                t={t}
              />
            </div>
          </Field>

          {/* Live preview */}
          <V2Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-3 h-3" style={{ color: t.textMuted }} />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: t.textBody }}
              >
                live preview
              </span>
              <span
                className="ml-auto text-[9px] font-mono"
                style={{ color: t.textSubtle }}
              >
                {preview.elapsedMs.toFixed(1)}ms · {preview.cost}
              </span>
            </div>
            <div className="flex items-baseline gap-3 mb-2">
              <span
                className="text-[24px] font-black tabular-nums leading-none"
                style={{ color: t.textHi }}
              >
                {preview.matches.length}
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: t.textSubtle }}
              >
                matches{preview.truncated ? ' (capped)' : ''}
              </span>
            </div>
            <div
              className="text-[10px] font-mono mb-2"
              style={{ color: t.textSubtle }}
            >
              exact {preview.confidenceMix.exact} · over {preview.confidenceMix.overapprox} · unk {preview.confidenceMix.unknown}
            </div>
            {preview.matches.length === 0 ? (
              <div
                className="text-[11px] font-mono"
                style={{ color: t.textSubtle }}
              >
                No files match. Rule is ready to enable.
              </div>
            ) : (
              <ul className="space-y-px">
                {preview.matches.slice(0, 6).map((m) => {
                  const f = repo.files[m.fileId];
                  return (
                    <li
                      key={m.fileId}
                      className="flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded-md"
                      style={{ background: t.inset }}
                    >
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ background: t.textMuted }}
                      />
                      <span
                        className="truncate flex-1"
                        style={{ color: t.textBody }}
                      >
                        {f ? `${f.folderPath}.${f.name}` : `#${m.fileId}`}
                      </span>
                      <span
                        className="truncate max-w-[10rem]"
                        style={{ color: t.textSubtle }}
                      >
                        {m.evidenceText}
                      </span>
                    </li>
                  );
                })}
                {preview.matches.length > 6 && (
                  <li
                    className="text-[10px] font-mono px-2"
                    style={{ color: t.textSubtle }}
                  >
                    … {preview.matches.length - 6} more
                  </li>
                )}
              </ul>
            )}
          </V2Card>

          {/* Retroactive impact */}
          <V2Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-3 h-3" style={{ color: t.textMuted }} />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: t.textBody }}
              >
                if enabled (last 30d sim)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <RetroBadge label="block" value={retroImpact.block} color={SEVERITY_COLOR.block} t={t} />
              <RetroBadge label="warn"  value={retroImpact.warn}  color={SEVERITY_COLOR.warn} t={t} />
              <RetroBadge label="pass"  value={retroImpact.pass}  color={t.ok} t={t} />
            </div>
          </V2Card>

          {/* Version history */}
          {versions && versions.length > 0 && (
            <V2Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3 h-3" style={{ color: t.textMuted }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: t.textBody }}
                >
                  history
                </span>
                <span
                  className="ml-auto text-[9px] font-mono"
                  style={{ color: t.textSubtle }}
                >
                  {versions.length} revision{versions.length === 1 ? '' : 's'}
                </span>
              </div>
              <ul className="space-y-1.5">
                {versions.slice().reverse().slice(0, 6).map((v) => (
                  <li key={v.version} className="flex items-center gap-2 text-[10px] font-mono">
                    <span
                      className="px-1.5 py-px rounded-md"
                      style={{
                        color: t.accent,
                        background: `${t.accent}15`,
                        border: `1px solid ${t.accent}33`,
                      }}
                    >
                      v{v.version}
                    </span>
                    <span
                      className="truncate flex-1"
                      style={{ color: t.textMuted }}
                    >
                      {v.summary}
                    </span>
                    <span style={{ color: t.textFaint }}>{timeAgo(v.changedAt)}</span>
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

export function Field({ label, children, t }: { label: string; children: React.ReactNode; t?: V2Theme }) {
  const tv = useV2();
  const tt = t ?? tv;
  return (
    <div>
      <div
        className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em]"
        style={{ color: tt.textSubtle }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

export function DrawerInput({
  value, onChange, placeholder, multiline, mono, numeric, t,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  mono?: boolean;
  numeric?: boolean;
  t?: V2Theme;
}) {
  const tv = useV2();
  const tt = t ?? tv;
  const cls = `w-full px-3 py-2 rounded-md text-[11px] outline-none transition-colors ${mono ? 'font-mono' : ''}`;
  const style: React.CSSProperties = {
    background: tt.inset,
    border: `1px solid ${tt.border}`,
    color: tt.textBody,
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

export function DrawerSelect({
  value, onChange, options, accent, t,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  accent?: string;
  t?: V2Theme;
}) {
  const tv = useV2();
  const tt = t ?? tv;
  return (
    <select
      className="w-full px-3 py-2 rounded-md text-[11px] font-mono outline-none"
      style={{
        background: tt.inset,
        border: `1px solid ${tt.border}`,
        color: accent ?? tt.textBody,
      }}
      value={value}
      onChange={(e) => { onChange(e.currentTarget.value); }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function RetroBadge({ label, value, color, t }: { label: string; value: number; color: string; t: V2Theme }) {
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
      <div
        className="text-[9px] font-bold uppercase tracking-[0.18em] mt-1"
        style={{ color: t.textSubtle }}
      >
        {label}
      </div>
    </div>
  );
}
