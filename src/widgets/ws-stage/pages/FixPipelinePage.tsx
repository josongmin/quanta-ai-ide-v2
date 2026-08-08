import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, AlertTriangle, GitBranch } from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { SettingsContractNotice } from '../parts/SettingsContractNotice';
import { Section, Row, Toggle, Button, SaveBar } from '@shared/ui/forms';
import { InlineError, SkeletonText } from '@shared/ui';
import {
  workspaceArray,
  workspaceBoolean,
  workspaceNumber,
  workspaceObject,
  workspaceString,
} from '@entities/workspace';
import { formatNumber } from '@shared/i18n';
import { useWorkspaceSettingsForm } from '../lib/useWorkspaceSettingsForm';

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

// label/sub resolved from ws:fix.obligations.<key>.* at render time.
const OBLIGATION_INFO: { id: Obligation; key: string }[] = [
  { id: 'no-secrets', key: 'noSecrets' },
  { id: 'tests-pass', key: 'testsPass' },
  { id: 'type-check', key: 'typeCheck' },
  { id: 'lint-clean', key: 'lintClean' },
];

// Approximate mock spend so the warning band logic has something to react to.
const MOCK_SPEND_USD = 1310;

function isObligation(value: string | null): value is Obligation {
  return OBLIGATION_INFO.some((item) => item.id === value);
}

export default function FixPipelinePage() {
  const { t } = useTranslation('ws');
  const blockedMessage = t('settingsContract.body', { surface: t('fix.title') });
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
    saveBlockedReason,
    saving,
    setForm,
    shell,
  } = useWorkspaceSettingsForm<Form>({
    initial: INITIAL,
    fromDetail: (workspace) => {
      const fix = workspaceObject(workspace.raw, 'fix_pipeline', 'fixPipeline') ?? {};
      const obligations = new Set<Obligation>(
        (workspaceArray(fix, 'obligations', 'required_obligations', 'requiredObligations') ?? [])
          .map((item) => workspaceString(item))
          .filter(isObligation),
      );
      const branches = (workspaceArray(fix, 'branches', 'allowed_branches', 'allowedBranches') ?? [])
        .map((item) => workspaceString(item))
        .filter((branch): branch is string => branch !== null);
      return {
        allowAutoPr: workspaceBoolean(fix, 'allow_auto_pr', 'allowAutoPr') ?? INITIAL.allowAutoPr,
        allowAutoMerge: workspaceBoolean(fix, 'allow_auto_merge', 'allowAutoMerge') ?? INITIAL.allowAutoMerge,
        allowRollback: workspaceBoolean(fix, 'allow_rollback', 'allowRollback') ?? INITIAL.allowRollback,
        monthlyBudgetUsd: workspaceNumber(fix, 'monthly_budget_usd', 'monthlyBudgetUsd') ?? INITIAL.monthlyBudgetUsd,
        perRunTokenCapK: workspaceNumber(fix, 'per_run_token_cap_k', 'perRunTokenCapK') ?? INITIAL.perRunTokenCapK,
        perRunWallMinutes: workspaceNumber(fix, 'per_run_wall_minutes', 'perRunWallMinutes') ?? INITIAL.perRunWallMinutes,
        branches: branches.length > 0 ? branches : INITIAL.branches,
        obligations: obligations.size > 0 ? obligations : INITIAL.obligations,
        successChannel: workspaceString(fix, 'success_channel', 'successChannel') ?? INITIAL.successChannel,
        failureChannel: workspaceString(fix, 'failure_channel', 'failureChannel') ?? INITIAL.failureChannel,
        failurePageOnCall: workspaceBoolean(fix, 'failure_page_on_call', 'failurePageOnCall') ?? INITIAL.failurePageOnCall,
        rollbackChannel: workspaceString(fix, 'rollback_channel', 'rollbackChannel') ?? INITIAL.rollbackChannel,
      };
    },
    toPatch: (next) => ({
      fix_pipeline: {
        allow_auto_pr: next.allowAutoPr,
        allow_auto_merge: next.allowAutoMerge,
        allow_rollback: next.allowRollback,
        monthly_budget_usd: next.monthlyBudgetUsd,
        per_run_token_cap_k: next.perRunTokenCapK,
        per_run_wall_minutes: next.perRunWallMinutes,
        branches: next.branches,
        obligations: Array.from(next.obligations),
        success_channel: next.successChannel,
        failure_channel: next.failureChannel,
        failure_page_on_call: next.failurePageOnCall,
        rollback_channel: next.rollbackChannel,
      },
    }),
    realSaveMode: 'unsupported',
    realSaveMessage: blockedMessage,
  });
  const [branchDraft, setBranchDraft] = useState('');

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

  const spendPct = form.monthlyBudgetUsd > 0
    ? Math.min(100, Math.round((MOCK_SPEND_USD / form.monthlyBudgetUsd) * 100))
    : 0;
  const overBudgetWarn = spendPct > 80;

  if (isReal && loadError) {
    return (
      <WsShell
        orgName={shell.orgName}
        orgSlug={shell.orgSlug}
        wsName={shell.wsName}
        wsSlug={shell.wsSlug}
        title={t('fix.title')}
        subtitle={t('fix.subtitle')}
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
        title={t('fix.title')}
        subtitle={t('fix.subtitle')}
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
      title={t('fix.title')}
      subtitle={t('fix.subtitle')}
    >
      {isReal && saveBlockedReason && (
        <div className="mb-3">
          <SettingsContractNotice title={t('settingsContract.title')} message={saveBlockedReason} />
        </div>
      )}

      {actionError && (
        <div className="mb-3">
          <InlineError message={actionError} onRetry={clearActionError} />
        </div>
      )}

      {/* Permissions */}
      <Section
        title={t('fix.permissions.title')}
        hint={t('fix.permissions.hint')}
      >
        <Row
          label={t('fix.allowAutoPr.label')}
          sub={t('fix.allowAutoPr.sub')}
        >
          <Toggle checked={form.allowAutoPr} onChange={(v) => { set('allowAutoPr', v); }} />
        </Row>
        <Row
          label={t('fix.allowAutoMerge.label')}
          sub={t('fix.allowAutoMerge.sub')}
        >
          <Toggle checked={form.allowAutoMerge} onChange={(v) => { set('allowAutoMerge', v); }} />
        </Row>
        <Row
          label={t('fix.allowRollback.label')}
          sub={t('fix.allowRollback.sub')}
        >
          <Toggle checked={form.allowRollback} onChange={(v) => { set('allowRollback', v); }} />
        </Row>
      </Section>

      {/* Resource caps */}
      <Section
        title={t('fix.resourceCaps.title')}
        hint={t('fix.resourceCaps.hint')}
      >
        <Row label={t('fix.monthlyBudget.label')} sub={t('fix.monthlyBudget.sub', { spend: formatNumber(MOCK_SPEND_USD) })}>
          <div
            className="flex items-center gap-2 h-8 px-2.5 rounded-md"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
          >
            <span className="text-base" style={{ color: 'var(--fg-subtle)' }}>$</span>
            <input
              type="number"
              min={0}
              value={form.monthlyBudgetUsd}
              onChange={(e) => { set('monthlyBudgetUsd', Number(e.target.value) || 0); }}
              className="w-24 bg-transparent outline-none text-base tabular-nums"
              style={{ color: 'var(--fg-strong)' }}
            />
            <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>{t('fix.usdPerMonth')}</span>
          </div>
        </Row>

        {overBudgetWarn && (
          <div
            className="flex items-start gap-2 px-3 py-2 rounded-md text-sm"
            style={{
              background: 'var(--intent-warn-bg)',
              color: 'var(--intent-warn-fg)',
              border: '1px solid color-mix(in srgb, var(--intent-warn-fg) 45%, transparent)',
            }}
          >
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="font-medium">{t('fix.spendAtCap', { pct: spendPct })}</span>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-muted)' }}>
                <div
                  className="h-full"
                  style={{ width: `${spendPct}%`, background: 'var(--intent-warn-fg)' }}
                />
              </div>
              <span style={{ color: 'var(--fg-muted)' }}>
                {t('fix.spendPauseNote')}
              </span>
            </div>
          </div>
        )}

        <Row label={t('fix.perRunTokenCap.label')} sub={t('fix.perRunTokenCap.sub')}>
          <div
            className="flex items-center gap-2 h-8 px-2.5 rounded-md"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
          >
            <input
              type="number"
              min={0}
              value={form.perRunTokenCapK}
              onChange={(e) => { set('perRunTokenCapK', Number(e.target.value) || 0); }}
              className="w-20 bg-transparent outline-none text-base tabular-nums"
              style={{ color: 'var(--fg-strong)' }}
            />
            <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>{t('fix.kTokensPerRun')}</span>
          </div>
        </Row>

        <Row label={t('fix.perRunWallTime.label')} sub={t('fix.perRunWallTime.sub')}>
          <div
            className="flex items-center gap-2 h-8 px-2.5 rounded-md"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
          >
            <input
              type="number"
              min={1}
              value={form.perRunWallMinutes}
              onChange={(e) => { set('perRunWallMinutes', Number(e.target.value) || 1); }}
              className="w-16 bg-transparent outline-none text-base tabular-nums"
              style={{ color: 'var(--fg-strong)' }}
            />
            <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>{t('fix.minutes')}</span>
          </div>
        </Row>
      </Section>

      {/* Allowed branches */}
      <Section
        title={t('fix.allowedBranches.title')}
        hint={t('fix.allowedBranches.hint')}
      >
        <div
          className="flex flex-wrap gap-1.5 p-3 rounded-md min-h-[60px]"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
        >
          {form.branches.length === 0 && (
            <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
              {t('fix.noPatterns')}
            </span>
          )}
          {form.branches.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-md text-sm font-mono"
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
                aria-label={t('fix.removeBranchAria', { branch: b })}
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
            placeholder={t('fix.branchPlaceholder')}
            className="flex-1 h-8 rounded-md px-2.5 text-base outline-none font-mono"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          />
          <Button leading={<Plus className="w-3 h-3" />} onClick={addBranch} disabled={!branchDraft.trim()}>
            {t('fix.addPattern')}
          </Button>
        </div>
      </Section>

      {/* Required obligations */}
      <Section
        title={t('fix.requiredObligations.title')}
        hint={t('fix.requiredObligations.hint')}
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
                  <span className="font-mono text-base font-medium" style={{ color: 'var(--fg-strong)' }}>
                    {t(`fix.obligations.${o.key}.label`)}
                  </span>
                  <span className="text-sm leading-snug" style={{ color: 'var(--fg-subtle)' }}>
                    {t(`fix.obligations.${o.key}.sub`)}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </Section>

      {/* Notification routing */}
      <Section
        title={t('fix.notificationRouting.title')}
        hint={t('fix.notificationRouting.hint')}
      >
        <Row label={t('fix.onSuccess.label')} sub={t('fix.onSuccess.sub')}>
          <ChannelInput value={form.successChannel} onChange={(v) => { set('successChannel', v); }} />
        </Row>
        <Row label={t('fix.onFailure.label')} sub={t('fix.onFailure.sub')}>
          <div className="flex items-center gap-2">
            <ChannelInput value={form.failureChannel} onChange={(v) => { set('failureChannel', v); }} />
            <label className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--fg-muted)' }}>
              <Toggle checked={form.failurePageOnCall} onChange={(v) => { set('failurePageOnCall', v); }} />
              {t('fix.pageOnCall')}
            </label>
          </div>
        </Row>
        <Row label={t('fix.onRollback.label')} sub={t('fix.onRollback.sub')}>
          <ChannelInput value={form.rollbackChannel} onChange={(v) => { set('rollbackChannel', v); }} />
        </Row>
      </Section>

      <SaveBar
        visible={dirty || saving !== 'idle'}
        dirty={dirty}
        savingState={saving}
        onSave={() => { void save(); }}
        onDiscard={() => { discard(); setBranchDraft(''); }}
        saveDisabled={Boolean(saveBlockedReason)}
        saveDisabledTitle={saveBlockedReason ?? undefined}
      />
    </WsShell>
  );
}

function ChannelInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation('ws');
  return (
    <input
      value={value}
      onChange={(e) => { onChange(e.target.value); }}
      placeholder={t('fix.channelPlaceholder')}
      className="h-8 rounded-md px-2.5 text-base outline-none font-mono"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
        color: 'var(--fg-strong)',
        minWidth: 220,
      }}
    />
  );
}
