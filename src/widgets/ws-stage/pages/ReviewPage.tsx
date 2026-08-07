import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GitBranch, Eye } from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Section, Row, Toggle, Button, SaveBar } from '@shared/ui/forms';
import { InlineError, SkeletonText } from '@shared/ui';
import {
  workspaceArray,
  workspaceBoolean,
  workspaceNumber,
  workspaceObject,
  workspaceString,
} from '@entities/workspace';
import { useWorkspaceSettingsForm } from '../lib/useWorkspaceSettingsForm';

// Review policy. Five sections: required approvers, auto-assignment,
// reviewer pool, branch overrides, block conditions.

type Assignment = 'round-robin' | 'load-balanced' | 'codeowners-only';

// name/description resolved from ws:review.teams.<id>.* at render time.
type Team = {
  id: string;
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

const ASSIGNMENTS: Assignment[] = ['round-robin', 'load-balanced', 'codeowners-only'];

const INITIAL: Form = {
  minApprovers: 2,
  excludeAuthor: true,
  dismissStaleOnPush: true,
  assignment: 'load-balanced',
  maxReviewersPerPR: 3,
  teams: [
    { id: 'frontend', inPool: true  },
    { id: 'backend',  inPool: true  },
    { id: 'security', inPool: true  },
    { id: 'platform', inPool: false },
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
  const { t } = useTranslation('ws');
  const {
    actionError,
    clearActionError,
    detail,
    dirty,
    discard,
    form,
    isPending,
    isReal,
    loadError,
    retryLoad,
    save,
    saving,
    setForm,
    shell,
  } = useWorkspaceSettingsForm<Form>({
    initial: INITIAL,
    fromDetail: (workspace) => {
      const review = workspaceObject(workspace.raw, 'review_policy', 'reviewPolicy') ?? {};
      const loadedTeams = workspaceArray(review, 'teams');
      const teamFlags = new Map<string, boolean>();
      for (const item of loadedTeams ?? []) {
        const team = workspaceObject(item);
        const id = workspaceString(team, 'id');
        if (!id) continue;
        teamFlags.set(id, workspaceBoolean(team, 'in_pool', 'inPool') ?? false);
      }

      const teams = [
        ...INITIAL.teams.map((team) => (
          teamFlags.has(team.id)
            ? { ...team, inPool: teamFlags.get(team.id) ?? team.inPool }
            : team
        )),
        ...(loadedTeams ?? [])
          .map((item) => workspaceObject(item))
          .filter((team): team is Record<string, unknown> => team !== null)
          .map((team) => ({
            id: workspaceString(team, 'id') ?? '',
            inPool: workspaceBoolean(team, 'in_pool', 'inPool') ?? false,
          }))
          .filter((team) => team.id.length > 0 && !INITIAL.teams.some((existing) => existing.id === team.id)),
      ];

      const overrides = (workspaceArray(review, 'overrides') ?? [])
        .map((item, index) => {
          const rule = workspaceObject(item);
          return rule ? {
            id: workspaceString(rule, 'id') ?? `o${index.toString(36)}`,
            pattern: workspaceString(rule, 'pattern') ?? '',
            minApprovers: workspaceNumber(rule, 'min_approvers', 'minApprovers') ?? 0,
          } : null;
        })
        .filter((rule): rule is BranchOverride => rule !== null);

      const assignment = workspaceString(review, 'assignment');
      return {
        minApprovers: workspaceNumber(review, 'min_approvers', 'minApprovers') ?? INITIAL.minApprovers,
        excludeAuthor: workspaceBoolean(review, 'exclude_author', 'excludeAuthor') ?? INITIAL.excludeAuthor,
        dismissStaleOnPush: workspaceBoolean(review, 'dismiss_stale_on_push', 'dismissStaleOnPush') ?? INITIAL.dismissStaleOnPush,
        assignment: ASSIGNMENTS.includes(assignment as Assignment) ? assignment as Assignment : INITIAL.assignment,
        maxReviewersPerPR: workspaceNumber(review, 'max_reviewers_per_pr', 'maxReviewersPerPR') ?? INITIAL.maxReviewersPerPR,
        teams: teams.length > 0 ? teams : INITIAL.teams,
        overrides: overrides.length > 0 ? overrides : INITIAL.overrides,
        blockSoleReviewer: workspaceBoolean(review, 'block_sole_reviewer', 'blockSoleReviewer') ?? INITIAL.blockSoleReviewer,
        blockUnresolvedThreads: workspaceBoolean(review, 'block_unresolved_threads', 'blockUnresolvedThreads') ?? INITIAL.blockUnresolvedThreads,
        blockOnRedCI: workspaceBoolean(review, 'block_on_red_ci', 'blockOnRedCI') ?? INITIAL.blockOnRedCI,
      };
    },
    toPatch: (next) => ({
      review_policy: {
        min_approvers: next.minApprovers,
        exclude_author: next.excludeAuthor,
        dismiss_stale_on_push: next.dismissStaleOnPush,
        assignment: next.assignment,
        max_reviewers_per_pr: next.maxReviewersPerPR,
        teams: next.teams.map((team) => ({ id: team.id, in_pool: team.inPool })),
        overrides: next.overrides.map((override) => ({
          id: override.id,
          pattern: override.pattern,
          min_approvers: override.minApprovers,
        })),
        block_sole_reviewer: next.blockSoleReviewer,
        block_unresolved_threads: next.blockUnresolvedThreads,
        block_on_red_ci: next.blockOnRedCI,
      },
    }),
  });

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

  if (isReal && loadError) {
    return (
      <WsShell
        orgName={shell.orgName}
        orgSlug={shell.orgSlug}
        wsName={shell.wsName}
        wsSlug={shell.wsSlug}
        title={t('review.title')}
        subtitle={t('review.subtitle')}
      >
        <InlineError message={loadError} onRetry={retryLoad} />
      </WsShell>
    );
  }

  if (isReal && isPending && !detail) {
    return (
      <WsShell
        orgName={shell.orgName}
        orgSlug={shell.orgSlug}
        wsName={shell.wsName}
        wsSlug={shell.wsSlug}
        title={t('review.title')}
        subtitle={t('review.subtitle')}
      >
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
          <SkeletonText lines={6} />
        </div>
      </WsShell>
    );
  }

  return (
    <WsShell
      orgName={shell.orgName}
      orgSlug={shell.orgSlug}
      wsName={shell.wsName}
      wsSlug={shell.wsSlug}
      title={t('review.title')}
      subtitle={t('review.subtitle')}
    >
      {actionError && (
        <div className="mb-3">
          <InlineError message={actionError} onRetry={clearActionError} />
        </div>
      )}

      <Section title={t('review.requiredApprovers.title')} hint={t('review.requiredApprovers.hint')}>
        <Row label={t('review.minApprovers.label')} sub={t('review.minApprovers.sub')}>
          <NumberStepper
            value={form.minApprovers}
            min={0}
            max={6}
            onChange={(v) => { set('minApprovers', v); }}
          />
        </Row>
        <Row label={t('review.excludeAuthor.label')} sub={t('review.excludeAuthor.sub')}>
          <Toggle checked={form.excludeAuthor} onChange={(v) => { set('excludeAuthor', v); }} />
        </Row>
        <Row label={t('review.dismissStale.label')} sub={t('review.dismissStale.sub')}>
          <Toggle checked={form.dismissStaleOnPush} onChange={(v) => { set('dismissStaleOnPush', v); }} />
        </Row>
      </Section>

      <Section title={t('review.autoAssignment.title')} hint={t('review.autoAssignment.hint')}>
        <Row label={t('review.strategy.label')} sub={t('review.strategy.sub')}>
          <RadioGroup
            value={form.assignment}
            onChange={(v) => { set('assignment', v); }}
            options={[
              { id: 'round-robin',     label: t('review.assignment.roundRobin') },
              { id: 'load-balanced',   label: t('review.assignment.loadBalanced') },
              { id: 'codeowners-only', label: t('review.assignment.codeownersOnly') },
            ]}
          />
        </Row>
        <Row
          label={t('review.maxReviewers.label')}
          sub={t('review.maxReviewers.sub', { count: form.maxReviewersPerPR })}
        >
          <Slider
            label={t('review.maxReviewers.label')}
            value={form.maxReviewersPerPR}
            min={1}
            max={8}
            onChange={(v) => { set('maxReviewersPerPR', v); }}
          />
        </Row>
      </Section>

      <Section title={t('review.reviewerPool.title')} hint={t('review.reviewerPool.hint')}>
        <div
          className="rounded-md overflow-hidden"
          style={{ border: '1px solid var(--border-muted)' }}
        >
          {form.teams.map((team, i) => (
            <div
              key={team.id}
              className="flex items-center gap-3 px-3 py-3"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)' }}
            >
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-base font-medium" style={{ color: 'var(--fg-strong)' }}>
                  {t(`review.teams.${team.id}.name`)}
                </span>
                <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                  {t(`review.teams.${team.id}.description`)}
                </span>
              </div>
              <span
                className="text-xs uppercase tracking-eyebrow font-semibold"
                style={{ color: team.inPool ? 'var(--intent-success-fg)' : 'var(--fg-subtle)' }}
              >
                {team.inPool ? t('review.inPool') : t('review.excluded')}
              </span>
              <Toggle checked={team.inPool} onChange={() => { toggleTeam(team.id); }} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={t('review.branchOverrides.title')}
        hint={t('review.branchOverrides.hint')}
        right={<Button leading={<Plus className="w-3 h-3" />} onClick={addOverride}>{t('review.addOverride')}</Button>}
      >
        <div
          className="rounded-md overflow-hidden"
          style={{ border: '1px solid var(--border-muted)' }}
        >
          <div
            className="grid items-center px-3 h-8 text-xs uppercase tracking-eyebrow font-semibold"
            style={{
              gridTemplateColumns: '1fr 140px 56px',
              gap: 12,
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span>{t('review.colBranchPattern')}</span>
            <span>{t('review.colMinApprovers')}</span>
            <span />
          </div>
          {form.overrides.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
              <GitBranch className="w-5 h-5" style={{ color: 'var(--fg-subtle)' }} />
              <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
                {t('review.noOverrides')}
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
                  placeholder={t('review.overridePlaceholder')}
                  className="h-7 px-2 rounded-md text-base font-mono outline-none"
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
                    aria-label={t('review.removeOverrideAria')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Section>

      <Section title={t('review.blockConditions.title')} hint={t('review.blockConditions.hint')}>
        <Row label={t('review.blockSoleReviewer.label')} sub={t('review.blockSoleReviewer.sub')}>
          <Toggle checked={form.blockSoleReviewer} onChange={(v) => { set('blockSoleReviewer', v); }} />
        </Row>
        <Row label={t('review.blockUnresolved.label')} sub={t('review.blockUnresolved.sub')}>
          <Toggle checked={form.blockUnresolvedThreads} onChange={(v) => { set('blockUnresolvedThreads', v); }} />
        </Row>
        <Row label={t('review.blockRedCI.label')} sub={t('review.blockRedCI.sub')}>
          <Toggle checked={form.blockOnRedCI} onChange={(v) => { set('blockOnRedCI', v); }} />
        </Row>
      </Section>

      <p className="text-sm mt-4 px-1 flex items-start gap-1.5" style={{ color: 'var(--fg-subtle)' }}>
        <Eye className="w-3 h-3 mt-0.5 shrink-0" />
        {t('review.footerNote')}
      </p>

      <SaveBar
        visible={dirty || saving !== 'idle'}
        dirty={dirty}
        savingState={saving}
        onSave={() => { void save(); }}
        onDiscard={discard}
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
        className="w-7 inline-flex items-center justify-center text-lg transition-colors"
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
        className="w-10 inline-flex items-center justify-center text-base tabular-nums font-medium"
        style={{ background: 'var(--bg-canvas)', color: 'var(--fg-strong)' }}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="w-7 inline-flex items-center justify-center text-lg transition-colors"
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
            className="h-8 px-3 text-sm font-medium transition-colors"
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
  value, min, max, onChange, label,
}: { value: number; min: number; max: number; onChange: (v: number) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2.5" style={{ minWidth: 200 }}>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={(e) => { onChange(Number(e.target.value)); }}
        className="flex-1"
        style={{ accentColor: 'var(--fg-accent)' }}
      />
      <span
        className="text-base tabular-nums font-medium w-6 text-right"
        style={{ color: 'var(--fg-strong)' }}
      >
        {value}
      </span>
    </div>
  );
}
