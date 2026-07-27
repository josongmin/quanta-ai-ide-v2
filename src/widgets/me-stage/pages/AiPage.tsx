import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Toggle, Select, Divider, SaveBar } from '@shared/ui/forms';
import { useDirtyState } from '../lib/useDirtyState';
import { MODELS, SURFACE_META, INITIAL, type Surface } from './parts/ai/types';
import { ModelRow } from './parts/ai/ModelRow';
import { CostInput } from './parts/ai/CostInput';
import { SpendMeter } from './parts/ai/SpendMeter';

export default function AiPage() {
  const { t } = useTranslation('me');
  const { draft, setDraft, dirty, savingState, save, discard } = useDirtyState(INITIAL);

  // Estimate today's spend from a fake usage history. Drives the warning banner.
  const todaySpend = useMemo(() => 5.42, []);
  const spendPct = draft.costCapPerDay > 0 ? (todaySpend / draft.costCapPerDay) * 100 : 0;

  return (
    <MeShell
      title={t('ai.title')}
      subtitle={t('ai.subtitle')}
    >
      <Section
        title={t('ai.models.title')}
        hint={t('ai.models.hint')}
      >
        <div className="grid grid-cols-1 gap-2">
          {(Object.keys(SURFACE_META) as Surface[]).map((s) => (
            <ModelRow
              key={s}
              surface={s}
              model={MODELS.find((m) => m.id === draft.models[s])!}
              onChange={(id) => { setDraft({ ...draft, models: { ...draft.models, [s]: id } }); }}
            />
          ))}
        </div>
      </Section>

      <Section title={t('ai.behavior.title')} hint={t('ai.behavior.hint')}>
        <Row label={t('ai.behavior.inline')} sub={t('ai.behavior.inlineSub')}>
          <Toggle
            checked={draft.inlineSuggestions}
            onChange={(v) => { setDraft({ ...draft, inlineSuggestions: v }); }}
            label={t('ai.behavior.inlineToggle')}
          />
        </Row>
        <Row label={t('ai.behavior.verbosity')} sub={t('ai.behavior.verbositySub')}>
          <Select
            value={draft.suggestionVerbosity}
            onChange={(v) => { setDraft({ ...draft, suggestionVerbosity: v }); }}
            options={[
              { id: 'brief',   label: t('ai.behavior.brief'),   sub: t('ai.behavior.briefSub')  },
              { id: 'normal',  label: t('ai.behavior.normal'),  sub: t('ai.behavior.normalSub')  },
              { id: 'verbose', label: t('ai.behavior.verbose'), sub: t('ai.behavior.verboseSub')  },
            ]}
          />
        </Row>
        <Row label={t('ai.behavior.autoCommit')} sub={t('ai.behavior.autoCommitSub')}>
          <Toggle
            checked={draft.autoCommitMessages}
            onChange={(v) => { setDraft({ ...draft, autoCommitMessages: v }); }}
            label={t('ai.behavior.autoCommitToggle')}
          />
        </Row>
        <Row label={t('ai.behavior.autoSummary')} sub={t('ai.behavior.autoSummarySub')}>
          <Toggle
            checked={draft.autoReviewSummaries}
            onChange={(v) => { setDraft({ ...draft, autoReviewSummaries: v }); }}
            label={t('ai.behavior.autoSummaryToggle')}
          />
        </Row>
        <Row label={t('ai.behavior.autoEvidence')} sub={t('ai.behavior.autoEvidenceSub')}>
          <Toggle
            checked={draft.autoEvidenceLinks}
            onChange={(v) => { setDraft({ ...draft, autoEvidenceLinks: v }); }}
            label={t('ai.behavior.autoEvidenceToggle')}
          />
        </Row>
        <Row label={t('ai.behavior.contextDepth')} sub={t('ai.behavior.contextDepthSub')}>
          <Select
            value={draft.contextDepth}
            onChange={(v) => { setDraft({ ...draft, contextDepth: v }); }}
            options={[
              { id: 'file',      label: t('ai.behavior.file'),      sub: t('ai.behavior.fileSub') },
              { id: 'module',    label: t('ai.behavior.module'),    sub: t('ai.behavior.moduleSub') },
              { id: 'workspace', label: t('ai.behavior.workspace'), sub: t('ai.behavior.workspaceSub') },
            ]}
          />
        </Row>
      </Section>

      <Section title={t('ai.privacy.title')} hint={t('ai.privacy.hint')}>
        <Row label={t('ai.privacy.optOut')} sub={t('ai.privacy.optOutSub')}>
          <Toggle
            checked={draft.trainingOptOut}
            onChange={(v) => { setDraft({ ...draft, trainingOptOut: v }); }}
            label={t('ai.privacy.optOutToggle')}
          />
        </Row>
        <Row label={t('ai.privacy.redact')} sub={t('ai.privacy.redactSub')}>
          <Toggle
            checked={draft.redactSecrets}
            onChange={(v) => { setDraft({ ...draft, redactSecrets: v }); }}
            label={t('ai.privacy.redactToggle')}
          />
        </Row>
      </Section>

      <Section
        title={t('ai.spend.title')}
        hint={t('ai.spend.hint')}
      >
        <Row label={t('ai.spend.dailyCap')} sub={<>{t('ai.spend.dailyCapSubPrefix')}<span style={{ color: 'var(--fg-subtle)' }}>{t('ai.spend.today', { amount: todaySpend.toFixed(2) })}</span></>}>
          <CostInput value={draft.costCapPerDay} onChange={(v) => { setDraft({ ...draft, costCapPerDay: v }); }} />
        </Row>

        {draft.costCapPerDay > 0 && (
          <SpendMeter pct={spendPct} cap={draft.costCapPerDay} spent={todaySpend} alertAt={draft.spikeAlertAt} />
        )}

        <Row label={t('ai.spend.alertWhen')} sub={t('ai.spend.alertWhenSub')}>
          <Select
            value={String(draft.spikeAlertAt) as '50' | '75' | '90' | '100'}
            onChange={(v) => { setDraft({ ...draft, spikeAlertAt: Number(v) }); }}
            options={[
              { id: '50',  label: t('ai.spend.alert50') },
              { id: '75',  label: t('ai.spend.alert75') },
              { id: '90',  label: t('ai.spend.alert90') },
              { id: '100', label: t('ai.spend.alert100') },
            ]}
          />
        </Row>
        <Row label={t('ai.spend.fallback')} sub={<>{t('ai.spend.fallbackSub', { pct: draft.spikeAlertAt })}</>}>
          <Toggle
            checked={draft.fallbackToFastModel}
            onChange={(v) => { setDraft({ ...draft, fallbackToFastModel: v }); }}
            label={t('ai.spend.fallbackToggle')}
          />
        </Row>
      </Section>

      <Divider />

      <SaveBar visible={true} dirty={dirty} savingState={savingState} onSave={save} onDiscard={discard} />
    </MeShell>
  );
}
