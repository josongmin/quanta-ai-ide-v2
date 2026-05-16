import { useMemo, useState } from 'react';
import { FolderTree, X, Plus } from 'lucide-react';
import type { AdmissionRule, RuleSeverity } from '@entities/admission';
import { useAdmissionStore } from '../../model/store';

// Per-path scoping (Rules §H2). The same rule can have different teeth in
// different parts of the monorepo:
//
//   • `block` everywhere by default
//   • `warn` inside `src/experiments/`
//   • `info`  inside `tools/`
//
// This panel surfaces those overrides as plain rows so the maintainer can
// see and edit them without spelunking the rule's signal. Demo-only model
// (the engine still runs at the rule level); production would push this
// into evaluator config.

const SEVERITIES: RuleSeverity[] = ['block', 'warn', 'info'];
const SEVERITY_FG: Record<RuleSeverity, string> = {
  block: 'var(--intent-danger-fg)',
  warn:  'var(--intent-warn-fg)',
  info:  'var(--fg-subtle)',
};

export function PathScopingPanel({
  rules,
}: {
  rules: AdmissionRule[];
}) {
  const pathOverrides = useAdmissionStore((s) => s.pathOverrides);
  const addOverride   = useAdmissionStore((s) => s.addPathOverride);
  const removeOverride = useAdmissionStore((s) => s.removePathOverride);

  const [draftRule, setDraftRule] = useState<string>('');
  const [draftPattern, setDraftPattern] = useState('');
  const [draftSeverity, setDraftSeverity] = useState<RuleSeverity>('warn');

  const ruled = useMemo(() => {
    return Object.entries(pathOverrides).map(([ruleId, list]) => {
      const r = rules.find((x) => x.id === ruleId);
      return { ruleId, ruleName: r?.name ?? ruleId, defaultSeverity: r?.severity, list };
    });
  }, [pathOverrides, rules]);

  const submit = () => {
    if (!draftRule || !draftPattern.trim()) return;
    addOverride(draftRule, draftPattern.trim(), draftSeverity);
    setDraftPattern('');
  };

  return (
    <section
      className="rounded-md overflow-hidden"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <header
        className="flex items-center gap-2 px-4 h-9"
        style={{
          background: 'var(--bg-surface-muted)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <FolderTree className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
        <h3
          className="text-[11px] uppercase tracking-[0.14em] font-semibold"
          style={{ color: 'var(--fg-strong)' }}
        >
          Per-path scoping
        </h3>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          override severity inside specific paths
        </span>
      </header>

      <div className="p-4 flex flex-col gap-3">
        {ruled.length === 0 ? (
          <div className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
            No path overrides defined. Use the form below to add one.
          </div>
        ) : (
          ruled.map((r) => (
            <div
              key={r.ruleId}
              className="rounded-md overflow-hidden"
              style={{ border: '1px solid var(--border-default)' }}
            >
              <div
                className="flex items-center gap-2 px-3 h-7"
                style={{
                  background: 'var(--bg-surface-muted)',
                  borderBottom: '1px solid var(--border-default)',
                }}
              >
                <span className="text-[11px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  {r.ruleName}
                </span>
                {r.defaultSeverity && (
                  <span
                    className="text-[9px] uppercase tracking-[0.14em] font-mono"
                    style={{ color: SEVERITY_FG[r.defaultSeverity] }}
                  >
                    default {r.defaultSeverity}
                  </span>
                )}
              </div>
              <ul>
                {r.list.map((override) => (
                  <li
                    key={override.pattern}
                    className="flex items-center gap-2 px-3 py-2 [&:not(:first-child)]:border-t"
                    style={{ borderColor: 'var(--border-default)' }}
                  >
                    <code
                      className="flex-1 text-[11px] font-mono truncate"
                      style={{ color: 'var(--fg-strong)' }}
                    >
                      {override.pattern}
                    </code>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--fg-subtle)' }}>
                      →
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-[0.14em] font-mono"
                      style={{ color: SEVERITY_FG[override.severity] }}
                    >
                      {override.severity}
                    </span>
                    <button
                      type="button"
                      onClick={() => { removeOverride(r.ruleId, override.pattern); }}
                      aria-label="Remove path override"
                      className="inline-flex items-center justify-center w-5 h-5 rounded transition-colors"
                      style={{ color: 'var(--fg-subtle)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--intent-danger-fg)';
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--fg-subtle)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}

        {/* Composer */}
        <div
          className="rounded-md p-3 flex items-end gap-2"
          style={{
            border: '1px dashed var(--border-default)',
          }}
        >
          <label className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Rule
            </span>
            <select
              value={draftRule}
              onChange={(e) => { setDraftRule(e.target.value); }}
              className="h-7 px-2 rounded text-[11px] outline-none"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            >
              <option value="">Select…</option>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Path glob
            </span>
            <input
              value={draftPattern}
              onChange={(e) => { setDraftPattern(e.target.value); }}
              placeholder="src/experiments/"
              className="h-7 px-2 rounded text-[11px] font-mono outline-none"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            />
          </label>
          <label className="flex flex-col gap-1 shrink-0">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Severity
            </span>
            <select
              value={draftSeverity}
              onChange={(e) => { setDraftSeverity(e.target.value as RuleSeverity); }}
              className="h-7 px-2 rounded text-[11px] outline-none"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            >
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!draftRule || !draftPattern.trim()}
            className="h-7 px-2.5 rounded-md text-[11px] font-medium inline-flex items-center gap-1 shrink-0"
            style={{
              background: 'var(--fg-strong)',
              color: 'var(--bg-canvas)',
              opacity: (draftRule && draftPattern.trim()) ? 1 : 0.4,
              cursor: (draftRule && draftPattern.trim()) ? 'pointer' : 'not-allowed',
            }}
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>
    </section>
  );
}
