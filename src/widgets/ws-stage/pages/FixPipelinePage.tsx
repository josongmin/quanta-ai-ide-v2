import { useState } from 'react';
import { Plus, X, AlertTriangle, GitBranch } from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Section, Row, Toggle, Button, SaveBar } from '@shared/ui/forms';
import { formatNumber } from '@shared/i18n';
import { shallowEqual } from '@shared/lib';

type Obligation = 'no-secrets' | 'tests-pass' | 'type-check' | 'lint-clean';

type Form = {
  // Permissions
  allowAutoPr: boolean;
  allowAutoMerge: boolean;
  allowRollback: boolean;
  // Resource caps
  monthlyBudgetUsd: number;
  perRunTokenCapK: number;
  perRunWallMinutes: number;
  // Allowed branches
  branches: string[];
  // Required obligations
  obligations: Set<Obligation>;
  // Notification routing
  successChannel: string;
  failureChannel: string;
  failurePageOnCall: boolean;
  rollbackChannel: string;
};

const INITIAL: Form = {
  allowAutoPr: true,
  allowAutoMerge: false,
  allowRollback: true,
  monthlyBudgetUsd: 1500,
  perRunTokenCapK: 250,
  perRunWallMinutes: 30,
  branches: ['feature/*', 'bugfix/*', 'chore/*'],
  obligations: new Set<Obligation>(['no-secrets', 'tests-pass', 'type-check']),
  successChannel: '#fix-pipeline-ok',
  failureChannel: '#fix-pipeline-alerts',
  failurePageOnCall: true,
  rollbackChannel: '#fix-pipeline-rollback',
};

const OBLIGATION_INFO: { id: Obligation; label: string; sub: string }[] = [
  { id: 'no-secrets', label: 'no-secrets',  sub: 'No diff lines match the secret scanner before fix-pipeline acts.' },
  { id: 'tests-pass', label: 'tests-pass',  sub: 'All required test suites must be green on the source SHA.' },
  { id: 'type-check', label: 'type-check',  sub: 'tsc / project-language type checker exits 0.' },
  { id: 'lint-clean', label: 'lint-clean',  sub: 'Lint passes with no errors (warnings allowed).' },
];

// Approximate mock spend so the warning band logic has something to react to.
const MOCK_SPEND_USD = 1310;

export default function FixPipelinePage() {
  const [form, setForm] = useState<Form>(INITIAL);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [branchDraft, setBranchDraft] = useState('');

  const dirty = !shallowEqual(form, INITIAL);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const toggleObligation = (id: Obligation) => {
    setForm((f) => {
      const next = new Set(f.obligations);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...f, obligations: next };
    });
  };

  const addBranch = () => {
    const v = branchDraft.trim();
    if (!v) return;
    if (form.branches.includes(v)) { setBranchDraft(''); return; }
    set('branches', [...form.branches, v]);
    setBranchDraft('');
  };

  const removeBranch = (b: string) => {
    set('branches', form.branches.filter((x) => x !== b));
  };

  const save = () => {
    setSaving('saving');
    setTimeout(() => {
      setSaving('saved');
      setTimeout(() => { setSaving('idle'); }, 1200);
    }, 600);
  };

  const spendPct = form.monthlyBudgetUsd > 0
    ? Math.min(100, Math.round((MOCK_SPEND_USD / form.monthlyBudgetUsd) * 100))
    : 0;
  const overBudgetWarn = spendPct > 80;

  return (
    <WsShell
      orgName="ACME, Inc."
      orgSlug="acme"
      wsName="monorepo"
      wsSlug="monorepo"
      title="Fix pipeline"
      subtitle="What the autonomous fix pipeline is allowed to do, how much it can spend, and where it pings humans."
    >
      {/* Permissions */}
      <Section
        title="Permissions"
        hint="Each switch widens fix-pipeline's blast radius. Off means a human still has to ratify the action."
      >
        <Row
          label="Allow auto-PR creation"
          sub="Fix-pipeline can open a PR with the proposed patch. The PR still needs human merge."
        >
          <Toggle checked={form.allowAutoPr} onChange={(v) => { set('allowAutoPr', v); }} />
        </Row>
        <Row
          label="Allow auto-merge on green"
          sub="If checks pass and obligations below are met, fix-pipeline merges without human approval. Highest blast radius."
        >
          <Toggle checked={form.allowAutoMerge} onChange={(v) => { set('allowAutoMerge', v); }} />
        </Row>
        <Row
          label="Allow rollback"
          sub="Fix-pipeline can revert its own merged PRs if downstream signals (errors, latency) regress."
        >
          <Toggle checked={form.allowRollback} onChange={(v) => { set('allowRollback', v); }} />
        </Row>
      </Section>

      {/* Resource caps */}
      <Section
        title="Resource caps"
        hint="Hard ceilings so a runaway loop can't drain the budget."
      >
        <Row label="Monthly budget cap" sub={`Current month-to-date spend: $${formatNumber(MOCK_SPEND_USD)}.`}>
          <div
            className="flex items-center gap-2 h-8 px-2.5 rounded-md"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
          >
            <span className="text-[12px]" style={{ color: 'var(--fg-subtle)' }}>$</span>
            <input
              type="number"
              min={0}
              value={form.monthlyBudgetUsd}
              onChange={(e) => { set('monthlyBudgetUsd', Number(e.target.value) || 0); }}
              className="w-24 bg-transparent outline-none text-[12px] tabular-nums"
              style={{ color: 'var(--fg-strong)' }}
            />
            <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>USD / month</span>
          </div>
        </Row>

        {overBudgetWarn && (
          <div
            className="flex items-start gap-2 px-3 py-2 rounded-md text-[11px]"
            style={{
              background: 'var(--intent-warn-bg)',
              color: 'var(--intent-warn-fg)',
              border: '1px solid color-mix(in srgb, var(--intent-warn-fg) 45%, transparent)',
            }}
          >
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="font-medium">Spend at {spendPct}% of cap</span>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-muted)' }}>
                <div
                  className="h-full"
                  style={{ width: `${spendPct}%`, background: 'var(--intent-warn-fg)' }}
                />
              </div>
              <span style={{ color: 'var(--fg-muted)' }}>
                Fix-pipeline will pause itself when month-to-date spend hits the cap.
              </span>
            </div>
          </div>
        )}

        <Row label="Per-run token cap" sub="Caps a single fix attempt. The pipeline will short-circuit and report partial findings.">
          <div
            className="flex items-center gap-2 h-8 px-2.5 rounded-md"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
          >
            <input
              type="number"
              min={0}
              value={form.perRunTokenCapK}
              onChange={(e) => { set('perRunTokenCapK', Number(e.target.value) || 0); }}
              className="w-20 bg-transparent outline-none text-[12px] tabular-nums"
              style={{ color: 'var(--fg-strong)' }}
            />
            <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>k tokens / run</span>
          </div>
        </Row>

        <Row label="Per-run wall-time cap" sub="Real time, not CPU time. A run exceeding this is killed and marked timed-out.">
          <div
            className="flex items-center gap-2 h-8 px-2.5 rounded-md"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
          >
            <input
              type="number"
              min={1}
              value={form.perRunWallMinutes}
              onChange={(e) => { set('perRunWallMinutes', Number(e.target.value) || 1); }}
              className="w-16 bg-transparent outline-none text-[12px] tabular-nums"
              style={{ color: 'var(--fg-strong)' }}
            />
            <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>minutes</span>
          </div>
        </Row>
      </Section>

      {/* Allowed branches */}
      <Section
        title="Allowed branches"
        hint="Glob patterns. Fix-pipeline will only open PRs against branches matching one of these."
      >
        <div
          className="flex flex-wrap gap-1.5 p-3 rounded-md min-h-[60px]"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
        >
          {form.branches.length === 0 && (
            <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
              No patterns. Fix-pipeline is effectively disabled.
            </span>
          )}
          {form.branches.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-md text-[11px] font-mono"
              style={{
                background: 'var(--bg-canvas)',
                color: 'var(--fg-default)',
                border: '1px solid var(--border-default)',
              }}
            >
              <GitBranch className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
              {b}
              <button
                type="button"
                onClick={() => { removeBranch(b); }}
                className="w-5 h-5 inline-flex items-center justify-center rounded"
                style={{ color: 'var(--fg-subtle)' }}
                aria-label={`Remove ${b}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={branchDraft}
            onChange={(e) => { setBranchDraft(e.target.value); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBranch(); } }}
            placeholder="e.g. release/*"
            className="flex-1 h-8 rounded-md px-2.5 text-[12px] outline-none font-mono"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          />
          <Button leading={<Plus className="w-3 h-3" />} onClick={addBranch} disabled={!branchDraft.trim()}>
            Add pattern
          </Button>
        </div>
      </Section>

      {/* Required obligations */}
      <Section
        title="Required obligations"
        hint="Gates that must pass before fix-pipeline is allowed to act. If any fail, the run is held for human review."
      >
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
          {OBLIGATION_INFO.map((o, i) => {
            const on = form.obligations.has(o.id);
            return (
              <label
                key={o.id}
                className="flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors"
                style={{
                  borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)',
                  background: on ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => { toggleObligation(o.id); }}
                  className="w-3.5 h-3.5 mt-0.5 cursor-pointer"
                />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="font-mono text-[12px] font-medium" style={{ color: 'var(--fg-strong)' }}>
                    {o.label}
                  </span>
                  <span className="text-[11px] leading-snug" style={{ color: 'var(--fg-subtle)' }}>
                    {o.sub}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </Section>

      {/* Notification routing */}
      <Section
        title="Notification routing"
        hint="Where fix-pipeline pings humans for each outcome. Channel input accepts Slack channels or emails."
      >
        <Row label="On success" sub="A short note on the merged PR and target channel.">
          <ChannelInput value={form.successChannel} onChange={(v) => { set('successChannel', v); }} />
        </Row>
        <Row label="On failure" sub="Posted with the failing obligation, last error, and a link to the run.">
          <div className="flex items-center gap-2">
            <ChannelInput value={form.failureChannel} onChange={(v) => { set('failureChannel', v); }} />
            <label className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
              <Toggle checked={form.failurePageOnCall} onChange={(v) => { set('failurePageOnCall', v); }} />
              Page on-call
            </label>
          </div>
        </Row>
        <Row label="On rollback" sub="Distinct channel so reverts don't get lost in the failure stream.">
          <ChannelInput value={form.rollbackChannel} onChange={(v) => { set('rollbackChannel', v); }} />
        </Row>
      </Section>

      <SaveBar
        visible={dirty || saving !== 'idle'}
        dirty={dirty}
        savingState={saving}
        onSave={save}
        onDiscard={() => { setForm(INITIAL); setBranchDraft(''); }}
      />
    </WsShell>
  );
}

function ChannelInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => { onChange(e.target.value); }}
      placeholder="#channel or person@org"
      className="h-8 rounded-md px-2.5 text-[12px] outline-none font-mono"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
        color: 'var(--fg-strong)',
        minWidth: 220,
      }}
    />
  );
}
