import { useState } from 'react';
import { Plus, Trash2, GitBranch, Eye } from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Section, Row, Toggle, Button, SaveBar } from '@shared/ui/forms';
import { shallowEqual } from '@shared/lib';

// Review policy. Five sections: required approvers, auto-assignment,
// reviewer pool, branch overrides, block conditions.

type Assignment = 'round-robin' | 'load-balanced' | 'codeowners-only';

type Team = {
  id: string;
  name: string;
  description: string;
  inPool: boolean;
};

type BranchOverride = {
  id: string;
  pattern: string;
  minApprovers: number;
};

type Form = {
  minApprovers: number;
  excludeAuthor: boolean;
  dismissStaleOnPush: boolean;
  assignment: Assignment;
  maxReviewersPerPR: number;
  teams: Team[];
  overrides: BranchOverride[];
  blockSoleReviewer: boolean;
  blockUnresolvedThreads: boolean;
  blockOnRedCI: boolean;
};

const INITIAL: Form = {
  minApprovers: 2,
  excludeAuthor: true,
  dismissStaleOnPush: true,
  assignment: 'load-balanced',
  maxReviewersPerPR: 3,
  teams: [
    { id: 'frontend', name: 'Frontend', description: '12 members · UI, design system, web app', inPool: true  },
    { id: 'backend',  name: 'Backend',  description: '9 members · API, services, data layer',    inPool: true  },
    { id: 'security', name: 'Security', description: '4 members · auto-added on protected paths',inPool: true  },
    { id: 'platform', name: 'Platform', description: '6 members · build, infra, tooling',        inPool: false },
  ],
  overrides: [
    { id: 'o1', pattern: 'main',       minApprovers: 2 },
    { id: 'o2', pattern: 'release/*',  minApprovers: 3 },
  ],
  blockSoleReviewer: true,
  blockUnresolvedThreads: true,
  blockOnRedCI: true,
};

export default function ReviewPage() {
  const [form, setForm] = useState<Form>(INITIAL);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');

  const dirty = !shallowEqual(form, INITIAL);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };
  const toggleTeam = (id: string) => {
    set('teams', form.teams.map((t) => (t.id === id ? { ...t, inPool: !t.inPool } : t)));
  };
  const addOverride = () => {
    set('overrides', [
      ...form.overrides,
      { id: `o${Date.now().toString(36)}`, pattern: '', minApprovers: 2 },
    ]);
  };
  const updateOverride = (id: string, patch: Partial<BranchOverride>) => {
    set('overrides', form.overrides.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };
  const removeOverride = (id: string) => {
    set('overrides', form.overrides.filter((o) => o.id !== id));
  };

  const save = () => {
    setSaving('saving');
    setTimeout(() => {
      setSaving('saved');
      setTimeout(() => { setSaving('idle'); }, 1200);
    }, 600);
  };

  return (
    <WsShell
      orgName="ACME, Inc."
      orgSlug="acme"
      wsName="monorepo"
      wsSlug="monorepo"
      title="Review policy"
      subtitle="Approval requirements, reviewer assignment, and merge gating for this workspace."
    >
      <Section title="Required approvers" hint="Minimum sign-offs before a PR can merge.">
        <Row label="Minimum approvers" sub="Counted as distinct human approvers. Owners count once.">
          <NumberStepper
            value={form.minApprovers}
            min={0}
            max={6}
            onChange={(v) => { set('minApprovers', v); }}
          />
        </Row>
        <Row label="Exclude author" sub="An author's own approval (e.g. on a co-authored PR) does not count toward the minimum.">
          <Toggle checked={form.excludeAuthor} onChange={(v) => { set('excludeAuthor', v); }} />
        </Row>
        <Row label="Dismiss stale approvals on push" sub="Existing approvals are revoked when new commits land. Reviewers must re-approve.">
          <Toggle checked={form.dismissStaleOnPush} onChange={(v) => { set('dismissStaleOnPush', v); }} />
        </Row>
      </Section>

      <Section title="Auto-assignment" hint="How reviewers get added when a PR opens.">
        <Row label="Strategy" sub="Round robin rotates evenly. Load balanced picks whoever has the fewest open reviews. Codeowners-only assigns from CODEOWNERS matches alone.">
          <RadioGroup
            value={form.assignment}
            onChange={(v) => { set('assignment', v); }}
            options={[
              { id: 'round-robin',     label: 'Round robin' },
              { id: 'load-balanced',   label: 'Load balanced' },
              { id: 'codeowners-only', label: 'Codeowners only' },
            ]}
          />
        </Row>
        <Row
          label="Max reviewers per PR"
          sub={`Cap auto-additions at ${String(form.maxReviewersPerPR)}. Manual @mentions still work.`}
        >
          <Slider
            value={form.maxReviewersPerPR}
            min={1}
            max={8}
            onChange={(v) => { set('maxReviewersPerPR', v); }}
          />
        </Row>
      </Section>

      <Section title="Reviewer pool" hint="Teams that auto-assignment can draw from. Toggling a team off removes them from the rotation.">
        <div
          className="rounded-md overflow-hidden"
          style={{ border: '1px solid var(--border-muted)' }}
        >
          {form.teams.map((t, i) => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-3 py-3"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)' }}
            >
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-[12px] font-medium" style={{ color: 'var(--fg-strong)' }}>
                  {t.name}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                  {t.description}
                </span>
              </div>
              <span
                className="text-[10px] uppercase tracking-[0.14em] font-semibold"
                style={{ color: t.inPool ? 'var(--intent-success-fg)' : 'var(--fg-subtle)' }}
              >
                {t.inPool ? 'in pool' : 'excluded'}
              </span>
              <Toggle checked={t.inPool} onChange={() => { toggleTeam(t.id); }} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Branch overrides"
        hint="Per-branch approval minimums. More specific patterns win."
        right={<Button leading={<Plus className="w-3 h-3" />} onClick={addOverride}>Add override</Button>}
      >
        <div
          className="rounded-md overflow-hidden"
          style={{ border: '1px solid var(--border-muted)' }}
        >
          <div
            className="grid items-center px-3 h-8 text-[10px] uppercase tracking-[0.14em] font-semibold"
            style={{
              gridTemplateColumns: '1fr 140px 56px',
              gap: 12,
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span>Branch pattern</span>
            <span>Min approvers</span>
            <span />
          </div>
          {form.overrides.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
              <GitBranch className="w-5 h-5" style={{ color: 'var(--fg-subtle)' }} />
              <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
                No overrides — every branch uses the default minimum.
              </span>
            </div>
          ) : (
            form.overrides.map((o) => (
              <div
                key={o.id}
                className="grid items-center px-3 py-2"
                style={{
                  gridTemplateColumns: '1fr 140px 56px',
                  gap: 12,
                  borderTop: '1px solid var(--border-muted)',
                }}
              >
                <input
                  value={o.pattern}
                  onChange={(e) => { updateOverride(o.id, { pattern: e.target.value }); }}
                  placeholder="release/*"
                  className="h-7 px-2 rounded-md text-[12px] font-mono outline-none"
                  style={{
                    background: 'var(--bg-surface-muted)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--fg-strong)',
                  }}
                />
                <NumberStepper
                  value={o.minApprovers}
                  min={0}
                  max={6}
                  onChange={(v) => { updateOverride(o.id, { minApprovers: v }); }}
                />
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => { removeOverride(o.id); }}
                    className="w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors"
                    style={{ color: 'var(--fg-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    aria-label="Remove override"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Section>

      <Section title="Block conditions" hint="Hard merge blockers. Each is independent — any active block prevents merge.">
        <Row label="Block if author is sole reviewer" sub="Prevents merging a PR where only the author has approved (e.g. via stale rotations).">
          <Toggle checked={form.blockSoleReviewer} onChange={(v) => { set('blockSoleReviewer', v); }} />
        </Row>
        <Row label="Block on unresolved threads" sub="All review comment threads must be marked resolved before merge.">
          <Toggle checked={form.blockUnresolvedThreads} onChange={(v) => { set('blockUnresolvedThreads', v); }} />
        </Row>
        <Row label="Block if CI is red" sub="Required check failures block merge regardless of approvals.">
          <Toggle checked={form.blockOnRedCI} onChange={(v) => { set('blockOnRedCI', v); }} />
        </Row>
      </Section>

      <p className="text-[11px] mt-4 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <Eye className="w-3 h-3 mt-0.5 shrink-0" />
        Changes apply to PRs opened after save. Existing PRs keep the policy that was active when they opened.
      </p>

      <SaveBar
        visible={dirty || saving !== 'idle'}
        dirty={dirty}
        savingState={saving}
        onSave={save}
        onDiscard={() => { setForm(INITIAL); }}
      />
    </WsShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function NumberStepper({
  value, min, max, onChange,
}: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const dec = () => { if (value > min) onChange(value - 1); };
  const inc = () => { if (value < max) onChange(value + 1); };
  return (
    <div
      className="inline-flex items-stretch h-8 rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-default)' }}
    >
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className="w-7 inline-flex items-center justify-center text-[14px] transition-colors"
        style={{
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-default)',
          opacity: value <= min ? 0.4 : 1,
          cursor: value <= min ? 'not-allowed' : 'pointer',
        }}
      >
        −
      </button>
      <span
        className="w-10 inline-flex items-center justify-center text-[12px] tabular-nums font-medium"
        style={{ background: 'var(--bg-canvas)', color: 'var(--fg-strong)' }}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="w-7 inline-flex items-center justify-center text-[14px] transition-colors"
        style={{
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-default)',
          opacity: value >= max ? 0.4 : 1,
          cursor: value >= max ? 'not-allowed' : 'pointer',
        }}
      >
        +
      </button>
    </div>
  );
}

function RadioGroup<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="inline-flex shrink-0 rounded-md overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => { onChange(o.id); }}
            className="h-8 px-3 text-[11px] font-medium transition-colors"
            style={{
              background: active ? 'var(--bg-active)' : 'transparent',
              color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Slider({
  value, min, max, onChange,
}: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2.5" style={{ minWidth: 200 }}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => { onChange(Number(e.target.value)); }}
        className="flex-1"
        style={{ accentColor: 'var(--fg-accent)' }}
      />
      <span
        className="text-[12px] tabular-nums font-medium w-6 text-right"
        style={{ color: 'var(--fg-strong)' }}
      >
        {value}
      </span>
    </div>
  );
}
