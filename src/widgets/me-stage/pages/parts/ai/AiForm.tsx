import { useTranslation } from 'react-i18next';
import { Section, Row, Toggle, Select } from '@shared/ui/forms';
import { MODELS, SURFACE_META, type AiPrefs, type Surface } from './types';
import { ModelRow } from './ModelRow';
import { CostInput } from './CostInput';
import { SpendMeter } from './SpendMeter';

// Shared AI-settings form body — driven by (draft, setDraft) so both the demo page
// (useDirtyState + fake save) and the real page (backend save) render identical controls.
// todaySpend is live usage: a number in the demo, null in real mode (not metered yet) —
// when null the live spend meter/hint are hidden (we don't fabricate a spend figure).
export function AiForm({
  draft, setDraft, todaySpend,
}: {
  draft: AiPrefs;
  setDraft: (next: AiPrefs) => void;
  todaySpend: number | null;
}) {
  const { t } = useTranslation('me');
  const spendPct = todaySpend != null && draft.costCapPerDay > 0 ? (todaySpend / draft.costCapPerDay) * 100 : 0;

  return (
    <>
      <Section title={t('ai.models.title')} hint={t('ai.models.hint')}>
        <div className="grid grid-cols-1 gap-2">
          {(Object.keys(SURFACE_META) as Surface[]).map((s) => {
            // ★백엔드는 임의 모델 id를 저장할 수 있고 카탈로그는 시간이 지나며 드리프트한다.
            // 저장된 id가 MODELS에 없으면 find가 undefined → 옛 `!`는 ModelMeta에서 전체 크래시.
            // 안전 폴백(MODELS[0])으로 크래시를 막는다(드리프트 시 표시만 첫 모델로).
            const model = MODELS.find((m) => m.id === draft.models[s]) ?? MODELS[0];
            return (
              <ModelRow
                key={s}
                surface={s}
                model={model}
                onChange={(id) => { setDraft({ ...draft, models: { ...draft.models, [s]: id } }); }}
              />
            );
          })}
        </div>
      </Section>

      <Section title={t('ai.behavior.title')} hint={t('ai.behavior.hint')}>
        <Row label={t('ai.behavior.inline')} sub={t('ai.behavior.inlineSub')}>
          <Toggle checked={draft.inlineSuggestions} onChange={(v) => { setDraft({ ...draft, inlineSuggestions: v }); }} label={t('ai.behavior.inlineToggle')} />
        </Row>
        <Row label={t('ai.behavior.verbosity')} sub={t('ai.behavior.verbositySub')}>
          <Select
            value={draft.suggestionVerbosity}
            onChange={(v) => { setDraft({ ...draft, suggestionVerbosity: v }); }}
            options={[
              { id: 'brief', label: t('ai.behavior.brief'), sub: t('ai.behavior.briefSub') },
              { id: 'normal', label: t('ai.behavior.normal'), sub: t('ai.behavior.normalSub') },
              { id: 'verbose', label: t('ai.behavior.verbose'), sub: t('ai.behavior.verboseSub') },
            ]}
          />
        </Row>
        <Row label={t('ai.behavior.autoCommit')} sub={t('ai.behavior.autoCommitSub')}>
          <Toggle checked={draft.autoCommitMessages} onChange={(v) => { setDraft({ ...draft, autoCommitMessages: v }); }} label={t('ai.behavior.autoCommitToggle')} />
        </Row>
        <Row label={t('ai.behavior.autoSummary')} sub={t('ai.behavior.autoSummarySub')}>
          <Toggle checked={draft.autoReviewSummaries} onChange={(v) => { setDraft({ ...draft, autoReviewSummaries: v }); }} label={t('ai.behavior.autoSummaryToggle')} />
        </Row>
        <Row label={t('ai.behavior.autoEvidence')} sub={t('ai.behavior.autoEvidenceSub')}>
          <Toggle checked={draft.autoEvidenceLinks} onChange={(v) => { setDraft({ ...draft, autoEvidenceLinks: v }); }} label={t('ai.behavior.autoEvidenceToggle')} />
        </Row>
        <Row label={t('ai.behavior.contextDepth')} sub={t('ai.behavior.contextDepthSub')}>
          <Select
            value={draft.contextDepth}
            onChange={(v) => { setDraft({ ...draft, contextDepth: v }); }}
            options={[
              { id: 'file', label: t('ai.behavior.file'), sub: t('ai.behavior.fileSub') },
              { id: 'module', label: t('ai.behavior.module'), sub: t('ai.behavior.moduleSub') },
              { id: 'workspace', label: t('ai.behavior.workspace'), sub: t('ai.behavior.workspaceSub') },
            ]}
          />
        </Row>
      </Section>

      <Section title={t('ai.privacy.title')} hint={t('ai.privacy.hint')}>
        <Row label={t('ai.privacy.optOut')} sub={t('ai.privacy.optOutSub')}>
          <Toggle checked={draft.trainingOptOut} onChange={(v) => { setDraft({ ...draft, trainingOptOut: v }); }} label={t('ai.privacy.optOutToggle')} />
        </Row>
        <Row label={t('ai.privacy.redact')} sub={t('ai.privacy.redactSub')}>
          <Toggle checked={draft.redactSecrets} onChange={(v) => { setDraft({ ...draft, redactSecrets: v }); }} label={t('ai.privacy.redactToggle')} />
        </Row>
      </Section>

      <Section title={t('ai.spend.title')} hint={t('ai.spend.hint')}>
        <Row
          label={t('ai.spend.dailyCap')}
          sub={
            <>
              {t('ai.spend.dailyCapSubPrefix')}
              {todaySpend != null && (
                <span style={{ color: 'var(--fg-subtle)' }}>{t('ai.spend.today', { amount: todaySpend.toFixed(2) })}</span>
              )}
            </>
          }
        >
          <CostInput value={draft.costCapPerDay} onChange={(v) => { setDraft({ ...draft, costCapPerDay: v }); }} />
        </Row>

        {todaySpend != null && draft.costCapPerDay > 0 && (
          <SpendMeter pct={spendPct} cap={draft.costCapPerDay} spent={todaySpend} alertAt={draft.spikeAlertAt} />
        )}

        <Row label={t('ai.spend.alertWhen')} sub={t('ai.spend.alertWhenSub')}>
          <Select
            value={String(draft.spikeAlertAt) as '50' | '75' | '90' | '100'}
            onChange={(v) => { setDraft({ ...draft, spikeAlertAt: Number(v) }); }}
            options={[
              { id: '50', label: t('ai.spend.alert50') },
              { id: '75', label: t('ai.spend.alert75') },
              { id: '90', label: t('ai.spend.alert90') },
              { id: '100', label: t('ai.spend.alert100') },
            ]}
          />
        </Row>
        <Row label={t('ai.spend.fallback')} sub={<>{t('ai.spend.fallbackSub', { pct: draft.spikeAlertAt })}</>}>
          <Toggle checked={draft.fallbackToFastModel} onChange={(v) => { setDraft({ ...draft, fallbackToFastModel: v }); }} label={t('ai.spend.fallbackToggle')} />
        </Row>
      </Section>
    </>
  );
}
