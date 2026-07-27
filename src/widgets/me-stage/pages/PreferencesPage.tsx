import { useTranslation } from 'react-i18next';
import { Brain, Code2, GitPullRequest, ShieldCheck, Bot } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Toggle, Select, Divider, SaveBar } from '@shared/ui/forms';
import { useDirtyState } from '../lib/useDirtyState';

type Preferences = {
  startTab: 'intelligence' | 'coding' | 'agents' | 'reviews' | 'admission' | 'fixes' | 'last-visited';
  intelligence: {
    defaultViz: 'dot-field' | 'matrix' | 'universe';
    autoOpenInspect: boolean;
    showScoreLabels: boolean;
    confidenceFloor: 'low' | 'medium' | 'high';
  };
  coding: {
    sideBySideDiff: boolean;
    softWrap: boolean;
    showWhitespace: boolean;
    autoSaveDrafts: boolean;
    inlineSuggestions: 'always' | 'on-hotkey' | 'never';
  };
  reviews: {
    defaultSort: 'review-requested' | 'updated' | 'opened' | 'risk';
    showCiBeforeApprove: boolean;
    requireResolveAll: boolean;
  };
  agents: {
    defaultAgent: 'fix-pipeline' | 'review-bot' | 'investigation';
    requireConfirm: boolean;
    parallelLimit: 1 | 2 | 3 | 5;
  };
  admission: {
    showProofOnFail: boolean;
    autoLink: boolean;
  };
};

const INITIAL: Preferences = {
  startTab: 'last-visited',
  intelligence: {
    defaultViz: 'dot-field',
    autoOpenInspect: true,
    showScoreLabels: true,
    confidenceFloor: 'medium',
  },
  coding: {
    sideBySideDiff: true,
    softWrap: false,
    showWhitespace: false,
    autoSaveDrafts: true,
    inlineSuggestions: 'on-hotkey',
  },
  reviews: {
    defaultSort: 'review-requested',
    showCiBeforeApprove: true,
    requireResolveAll: false,
  },
  agents: {
    defaultAgent: 'fix-pipeline',
    requireConfirm: true,
    parallelLimit: 3,
  },
  admission: {
    showProofOnFail: true,
    autoLink: true,
  },
};

export default function PreferencesPage() {
  const { t } = useTranslation('me');
  const { draft, setDraft, dirty, savingState, save, discard } = useDirtyState(INITIAL);

  return (
    <MeShell
      title={t('preferences.title')}
      subtitle={t('preferences.subtitle')}
    >
      <Section title={t('preferences.startup.title')} hint={t('preferences.startup.hint')}>
        <Row label={t('preferences.startup.startingWorkbench')} sub={t('preferences.startup.startingWorkbenchSub')}>
          <Select
            value={draft.startTab}
            onChange={(v) => { setDraft({ ...draft, startTab: v }); }}
            options={[
              { id: 'last-visited',  label: t('preferences.startup.lastVisited') },
              { id: 'intelligence',  label: t('preferences.startup.intelligence') },
              { id: 'coding',        label: t('preferences.startup.coding') },
              { id: 'agents',        label: t('preferences.startup.agents') },
              { id: 'reviews',       label: t('preferences.startup.reviews') },
              { id: 'admission',     label: t('preferences.startup.admission') },
              { id: 'fixes',         label: t('preferences.startup.fixes') },
            ]}
          />
        </Row>
      </Section>

      <WorkbenchSection
        title={t('preferences.intelligence.title')}
        icon={Brain}
        hint={t('preferences.intelligence.hint')}
      >
        <Row label={t('preferences.intelligence.defaultViz')}>
          <Select
            value={draft.intelligence.defaultViz}
            onChange={(v) => { setDraft({ ...draft, intelligence: { ...draft.intelligence, defaultViz: v } }); }}
            options={[
              { id: 'dot-field', label: t('preferences.intelligence.dotField') },
              { id: 'matrix',    label: t('preferences.intelligence.matrix') },
              { id: 'universe',  label: t('preferences.intelligence.universe') },
            ]}
          />
        </Row>
        <Row label={t('preferences.intelligence.autoOpenInspect')} sub={t('preferences.intelligence.autoOpenInspectSub')}>
          <Toggle
            checked={draft.intelligence.autoOpenInspect}
            onChange={(v) => { setDraft({ ...draft, intelligence: { ...draft.intelligence, autoOpenInspect: v } }); }}
            label={t('preferences.intelligence.autoOpenInspectToggle')}
          />
        </Row>
        <Row label={t('preferences.intelligence.showScoreLabels')} sub={t('preferences.intelligence.showScoreLabelsSub')}>
          <Toggle
            checked={draft.intelligence.showScoreLabels}
            onChange={(v) => { setDraft({ ...draft, intelligence: { ...draft.intelligence, showScoreLabels: v } }); }}
            label={t('preferences.intelligence.showScoreLabelsToggle')}
          />
        </Row>
        <Row label={t('preferences.intelligence.confidenceFloor')} sub={t('preferences.intelligence.confidenceFloorSub')}>
          <Select
            value={draft.intelligence.confidenceFloor}
            onChange={(v) => { setDraft({ ...draft, intelligence: { ...draft.intelligence, confidenceFloor: v } }); }}
            options={[
              { id: 'low',    label: t('preferences.intelligence.low') },
              { id: 'medium', label: t('preferences.intelligence.medium') },
              { id: 'high',   label: t('preferences.intelligence.high') },
            ]}
          />
        </Row>
      </WorkbenchSection>

      <WorkbenchSection title={t('preferences.coding.title')} icon={Code2} hint={t('preferences.coding.hint')}>
        <Row label={t('preferences.coding.sideBySide')} sub={t('preferences.coding.sideBySideSub')}>
          <Toggle
            checked={draft.coding.sideBySideDiff}
            onChange={(v) => { setDraft({ ...draft, coding: { ...draft.coding, sideBySideDiff: v } }); }}
            label={t('preferences.coding.sideBySideToggle')}
          />
        </Row>
        <Row label={t('preferences.coding.softWrap')} sub={t('preferences.coding.softWrapSub')}>
          <Toggle
            checked={draft.coding.softWrap}
            onChange={(v) => { setDraft({ ...draft, coding: { ...draft.coding, softWrap: v } }); }}
            label={t('preferences.coding.softWrapToggle')}
          />
        </Row>
        <Row label={t('preferences.coding.whitespace')} sub={t('preferences.coding.whitespaceSub')}>
          <Toggle
            checked={draft.coding.showWhitespace}
            onChange={(v) => { setDraft({ ...draft, coding: { ...draft.coding, showWhitespace: v } }); }}
            label={t('preferences.coding.whitespaceToggle')}
          />
        </Row>
        <Row label={t('preferences.coding.autoSave')} sub={t('preferences.coding.autoSaveSub')}>
          <Toggle
            checked={draft.coding.autoSaveDrafts}
            onChange={(v) => { setDraft({ ...draft, coding: { ...draft.coding, autoSaveDrafts: v } }); }}
            label={t('preferences.coding.autoSaveToggle')}
          />
        </Row>
        <Row label={t('preferences.coding.inline')} sub={t('preferences.coding.inlineSub')}>
          <Select
            value={draft.coding.inlineSuggestions}
            onChange={(v) => { setDraft({ ...draft, coding: { ...draft.coding, inlineSuggestions: v } }); }}
            options={[
              { id: 'always',    label: t('preferences.coding.always') },
              { id: 'on-hotkey', label: t('preferences.coding.onHotkey') },
              { id: 'never',     label: t('preferences.coding.never') },
            ]}
          />
        </Row>
      </WorkbenchSection>

      <WorkbenchSection title={t('preferences.reviews.title')} icon={GitPullRequest} hint={t('preferences.reviews.hint')}>
        <Row label={t('preferences.reviews.defaultSort')} sub={t('preferences.reviews.defaultSortSub')}>
          <Select
            value={draft.reviews.defaultSort}
            onChange={(v) => { setDraft({ ...draft, reviews: { ...draft.reviews, defaultSort: v } }); }}
            options={[
              { id: 'review-requested', label: t('preferences.reviews.reviewRequested') },
              { id: 'updated',          label: t('preferences.reviews.updated') },
              { id: 'opened',           label: t('preferences.reviews.opened') },
              { id: 'risk',             label: t('preferences.reviews.risk') },
            ]}
          />
        </Row>
        <Row label={t('preferences.reviews.ciBefore')} sub={t('preferences.reviews.ciBeforeSub')}>
          <Toggle
            checked={draft.reviews.showCiBeforeApprove}
            onChange={(v) => { setDraft({ ...draft, reviews: { ...draft.reviews, showCiBeforeApprove: v } }); }}
            label={t('preferences.reviews.ciBeforeToggle')}
          />
        </Row>
        <Row label={t('preferences.reviews.resolveAll')} sub={t('preferences.reviews.resolveAllSub')}>
          <Toggle
            checked={draft.reviews.requireResolveAll}
            onChange={(v) => { setDraft({ ...draft, reviews: { ...draft.reviews, requireResolveAll: v } }); }}
            label={t('preferences.reviews.resolveAllToggle')}
          />
        </Row>
      </WorkbenchSection>

      <WorkbenchSection title={t('preferences.agents.title')} icon={Bot} hint={t('preferences.agents.hint')}>
        <Row label={t('preferences.agents.defaultAgent')}>
          <Select
            value={draft.agents.defaultAgent}
            onChange={(v) => { setDraft({ ...draft, agents: { ...draft.agents, defaultAgent: v } }); }}
            options={[
              { id: 'fix-pipeline',  label: t('preferences.agents.fixPipeline') },
              { id: 'review-bot',    label: t('preferences.agents.reviewBot') },
              { id: 'investigation', label: t('preferences.agents.investigation') },
            ]}
          />
        </Row>
        <Row label={t('preferences.agents.confirm')} sub={t('preferences.agents.confirmSub')}>
          <Toggle
            checked={draft.agents.requireConfirm}
            onChange={(v) => { setDraft({ ...draft, agents: { ...draft.agents, requireConfirm: v } }); }}
            label={t('preferences.agents.confirmToggle')}
          />
        </Row>
        <Row label={t('preferences.agents.maxParallel')} sub={t('preferences.agents.maxParallelSub')}>
          <Select
            value={String(draft.agents.parallelLimit) as '1' | '2' | '3' | '5'}
            onChange={(v) => { setDraft({ ...draft, agents: { ...draft.agents, parallelLimit: Number(v) as 1 | 2 | 3 | 5 } }); }}
            options={[
              { id: '1', label: '1' },
              { id: '2', label: '2' },
              { id: '3', label: t('preferences.agents.parallel3') },
              { id: '5', label: t('preferences.agents.parallel5') },
            ]}
          />
        </Row>
      </WorkbenchSection>

      <WorkbenchSection title={t('preferences.admission.title')} icon={ShieldCheck} hint={t('preferences.admission.hint')}>
        <Row label={t('preferences.admission.showProof')} sub={t('preferences.admission.showProofSub')}>
          <Toggle
            checked={draft.admission.showProofOnFail}
            onChange={(v) => { setDraft({ ...draft, admission: { ...draft.admission, showProofOnFail: v } }); }}
            label={t('preferences.admission.showProofToggle')}
          />
        </Row>
        <Row label={t('preferences.admission.autoLink')} sub={t('preferences.admission.autoLinkSub')}>
          <Toggle
            checked={draft.admission.autoLink}
            onChange={(v) => { setDraft({ ...draft, admission: { ...draft.admission, autoLink: v } }); }}
            label={t('preferences.admission.autoLinkToggle')}
          />
        </Row>
      </WorkbenchSection>

      <Section title={t('preferences.reset.title')} hint={t('preferences.reset.hint')}>
        <Row label={t('preferences.reset.label')} sub={t('preferences.reset.sub')}>
          <button
            type="button"
            onClick={() => { setDraft(INITIAL); }}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-default)',
              border: '1px dashed var(--border-default)',
            }}
          >
            {t('preferences.reset.button')}
          </button>
        </Row>
      </Section>

      <Divider />

      <SaveBar visible={dirty} dirty={dirty} savingState={savingState} onSave={save} onDiscard={discard} />
    </MeShell>
  );
}

function WorkbenchSection({
  title, hint, icon: Icon, children,
}: {
  title: string;
  hint: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) {
  return (
    <Section
      title={title}
      hint={hint}
      right={
        <span
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
            border: '1px solid var(--fg-accent)',
          }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
        </span>
      }
    >
      {children}
    </Section>
  );
}
