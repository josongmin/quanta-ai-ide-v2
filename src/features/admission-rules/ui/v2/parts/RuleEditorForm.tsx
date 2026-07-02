import { useTranslation } from '@shared/i18n';
import { usesHint } from '../../sourceStyle';
import { SEVERITY_COLOR, type V2Theme } from './tokens';
import { Field, DrawerInput, DrawerSelect } from './DrawerFields';
import { SignalEditor, defaultSignalFor } from './SignalEditor';
import type { EditorDraft } from '../../../model/store';

// Identity / source+severity / signal / scope inputs for the rule drawer.
export function RuleEditorForm({
  draft, updateDraft, t,
}: {
  draft: EditorDraft;
  updateDraft: (patch: Partial<EditorDraft>) => void;
  t: V2Theme;
}) {
  const { t: tA } = useTranslation('admission');
  return (
    <>
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
            onChange={(v) => { updateDraft({ source: v }); }}
            options={['native', 'eslint', 'semgrep', 'codeql', 'custom']}
            t={t}
          />
        </Field>
        <Field label="Severity" t={t}>
          <DrawerSelect
            value={draft.severity}
            onChange={(v) => { updateDraft({ severity: v }); }}
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
    </>
  );
}
