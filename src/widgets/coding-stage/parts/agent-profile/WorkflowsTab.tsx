import { Plus, Trash2, X } from 'lucide-react';
import type { AgentMode, AgentWorkflow } from '../types';
import type { TranslateFn } from './types';

export function WorkflowsTab({
  workflows, modes, onWorkflowsChange, isDark, t,
}: {
  workflows: AgentWorkflow[];
  modes: AgentMode[];
  onWorkflowsChange: (next: AgentWorkflow[]) => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  function patchWorkflow(id: string, p: Partial<AgentWorkflow>) {
    onWorkflowsChange(workflows.map((w) => w.id === id ? { ...w, ...p } : w));
  }
  function deleteWorkflow(id: string) {
    onWorkflowsChange(workflows.filter((w) => w.id !== id));
  }
  function addWorkflow() {
    const id = `w-${Date.now().toString(36)}`;
    const newWf: AgentWorkflow = {
      id,
      slug: 'new-workflow',
      name: t('agentProfile.workflows.newName'),
      blurb: '',
      steps: [t('agentProfile.workflows.firstStepPlaceholder')],
    };
    onWorkflowsChange([newWf, ...workflows]);
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-[11px] leading-relaxed text-[var(--fg-muted)] max-w-[440px]`}>
          {t('agentProfile.workflows.intro')}
        </p>
        <button
          type="button"
          onClick={addWorkflow}
          className={`shrink-0 px-2.5 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-colors bg-[var(--bg-elevated)] text-[var(--fg-strong)] hover:[background:var(--bg-active-strong)]`}
        >
          <Plus className="w-3.5 h-3.5" />
          {t('agentProfile.workflows.add')}
        </button>
      </div>

      <div className="space-y-2">
        {workflows.map((w) => (
          <WorkflowCard
            key={w.id}
            workflow={w}
            modes={modes}
            onPatch={(p) => { patchWorkflow(w.id, p); }}
            onDelete={() => { deleteWorkflow(w.id); }}
            isDark={isDark}
            t={t}
          />
        ))}
        {workflows.length === 0 && (
          <div className={`text-[12px] text-[var(--fg-muted)] py-8 text-center`}>
            {t('agentProfile.workflows.empty')}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowCard({
  workflow, modes, onPatch, onDelete, isDark, t,
}: {
  workflow: AgentWorkflow;
  modes: AgentMode[];
  onPatch: (p: Partial<AgentWorkflow>) => void;
  onDelete: () => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  void isDark;
  const heading = 'text-[var(--fg-strong)]';
  const muted   = 'text-[var(--fg-muted)]';
  const faint   = 'text-[var(--fg-subtle)]';
  const surface = 'bg-[var(--bg-surface-muted)] border-[var(--border-default)]';

  return (
    <div className={`rounded-lg border ${surface}`}>
      <div className="px-3.5 py-3 flex items-start gap-2.5">
        <span
          className={`shrink-0 mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-md font-mono text-[10px] font-bold bg-[var(--bg-active)] text-[var(--fg-default)] ring-1 ring-inset ring-[var(--border-default)]`}
        >
          /{workflow.slug.charAt(0)}
        </span>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={workflow.name}
              onChange={(e) => { onPatch({ name: e.target.value }); }}
              className={`bg-transparent text-[12px] font-semibold outline-none border-b border-transparent focus:border-current ${heading} max-w-[240px]`}
            />
            <span className={`text-[10px] font-mono ${faint}`}>/</span>
            <input
              type="text"
              value={workflow.slug}
              onChange={(e) => { onPatch({ slug: e.target.value.replace(/[^a-z0-9-]/g, '') }); }}
              className={`bg-transparent text-[11px] font-mono outline-none border-b border-transparent focus:border-current max-w-[160px] ${muted}`}
            />
          </div>
          <input
            type="text"
            value={workflow.blurb}
            onChange={(e) => { onPatch({ blurb: e.target.value }); }}
            placeholder={t('agentProfile.workflows.blurbPlaceholder')}
            className={`w-full bg-transparent text-[11px] outline-none ${muted} placeholder:opacity-50`}
          />
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('agentProfile.workflows.delete')}
          className={`shrink-0 p-1.5 rounded transition-colors text-[var(--fg-muted)] hover:[background:var(--intent-danger-bg)] hover:text-[var(--intent-danger-fg)]`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className={`px-3.5 py-3 border-t border-[var(--border-muted)]`}>
        <div className={`text-[10px] uppercase tracking-[0.18em] font-bold mb-1.5 ${faint}`}>
          {t('agentProfile.workflows.steps')}
        </div>
        <ol className="space-y-1">
          {workflow.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold mt-0.5 bg-[var(--bg-elevated)] text-[var(--fg-muted)]`}>
                {i + 1}
              </span>
              <textarea
                value={step}
                onChange={(e) => {
                  const next = workflow.steps.slice();
                  next[i] = e.target.value;
                  onPatch({ steps: next });
                }}
                rows={1}
                className={`flex-1 text-[11px] leading-relaxed bg-transparent outline-none resize-none ${heading}`}
              />
              <button
                type="button"
                onClick={() => {
                  onPatch({ steps: workflow.steps.filter((_, idx) => idx !== i) });
                }}
                aria-label={t('agentProfile.workflows.removeStep')}
                className={`shrink-0 mt-1 p-0.5 rounded transition-colors text-[var(--fg-subtle)] hover:text-[var(--intent-danger-fg)]`}
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => { onPatch({ steps: [...workflow.steps, ''] }); }}
          className={`mt-1.5 text-[11px] flex items-center gap-1 transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)]`}
        >
          <Plus className="w-3 h-3" />
          {t('agentProfile.workflows.addStep')}
        </button>
      </div>

      <div className={`px-3.5 py-2.5 border-t border-[var(--border-muted)] flex items-center gap-2`}>
        <span className={`text-[10px] uppercase tracking-[0.18em] font-bold ${faint}`}>
          {t('agentProfile.workflows.pairWith')}
        </span>
        <select
          value={workflow.pairedModeId ?? ''}
          onChange={(e) => { onPatch({ pairedModeId: e.target.value || undefined }); }}
          className={`text-[11px] rounded px-1.5 py-0.5 outline-none bg-[var(--bg-active)] border border-[var(--border-default)] text-[var(--fg-strong)]`}
        >
          <option value="">{t('agentProfile.workflows.pairNone')}</option>
          {modes.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
