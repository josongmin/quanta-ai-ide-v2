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
  const { draft, setDraft, dirty, savingState, save, discard } = useDirtyState(INITIAL);

  return (
    <MeShell
      title="Preferences"
      subtitle="How each workbench behaves by default. These apply only to you — your team has their own."
    >
      <Section title="On startup" hint="Where the app lands when you open it after sign-in.">
        <Row label="Starting workbench" sub="Pick a fixed tab, or 'Last visited' to resume where you were.">
          <Select
            value={draft.startTab}
            onChange={(v) => { setDraft({ ...draft, startTab: v }); }}
            options={[
              { id: 'last-visited',  label: 'Last visited' },
              { id: 'intelligence',  label: 'Intelligence' },
              { id: 'coding',        label: 'Coding' },
              { id: 'agents',        label: 'Agents' },
              { id: 'reviews',       label: 'Reviews' },
              { id: 'admission',     label: 'Admission' },
              { id: 'fixes',         label: 'Fixes' },
            ]}
          />
        </Row>
      </Section>

      <WorkbenchSection
        title="Intelligence"
        icon={Brain}
        hint="Dot field, matrix view, and universe mode."
      >
        <Row label="Default visualization">
          <Select
            value={draft.intelligence.defaultViz}
            onChange={(v) => { setDraft({ ...draft, intelligence: { ...draft.intelligence, defaultViz: v } }); }}
            options={[
              { id: 'dot-field', label: 'Dot field' },
              { id: 'matrix',    label: 'Matrix' },
              { id: 'universe',  label: 'Universe' },
            ]}
          />
        </Row>
        <Row label="Auto-open Inspect on click" sub="Clicking a dot opens the right-hand Inspect panel automatically.">
          <Toggle
            checked={draft.intelligence.autoOpenInspect}
            onChange={(v) => { setDraft({ ...draft, intelligence: { ...draft.intelligence, autoOpenInspect: v } }); }}
            label="Auto-open Inspect"
          />
        </Row>
        <Row label="Show score labels in dot field" sub="Numeric labels next to each dot for risk + confidence.">
          <Toggle
            checked={draft.intelligence.showScoreLabels}
            onChange={(v) => { setDraft({ ...draft, intelligence: { ...draft.intelligence, showScoreLabels: v } }); }}
            label="Score labels"
          />
        </Row>
        <Row label="Confidence floor" sub="Hide dots below this confidence level by default.">
          <Select
            value={draft.intelligence.confidenceFloor}
            onChange={(v) => { setDraft({ ...draft, intelligence: { ...draft.intelligence, confidenceFloor: v } }); }}
            options={[
              { id: 'low',    label: 'Low (show everything)' },
              { id: 'medium', label: 'Medium (recommended)'  },
              { id: 'high',   label: 'High (only confident)' },
            ]}
          />
        </Row>
      </WorkbenchSection>

      <WorkbenchSection title="Coding" icon={Code2} hint="Editor and AI behavior in the coding stage.">
        <Row label="Side-by-side diffs" sub="Show old/new in two columns instead of unified.">
          <Toggle
            checked={draft.coding.sideBySideDiff}
            onChange={(v) => { setDraft({ ...draft, coding: { ...draft.coding, sideBySideDiff: v } }); }}
            label="Side-by-side"
          />
        </Row>
        <Row label="Soft wrap long lines" sub="Wrap lines longer than the editor width.">
          <Toggle
            checked={draft.coding.softWrap}
            onChange={(v) => { setDraft({ ...draft, coding: { ...draft.coding, softWrap: v } }); }}
            label="Soft wrap"
          />
        </Row>
        <Row label="Show whitespace markers" sub="Render dots/arrows for spaces and tabs.">
          <Toggle
            checked={draft.coding.showWhitespace}
            onChange={(v) => { setDraft({ ...draft, coding: { ...draft.coding, showWhitespace: v } }); }}
            label="Show whitespace"
          />
        </Row>
        <Row label="Auto-save drafts" sub="Drafts persist in the browser; turning this off requires explicit save.">
          <Toggle
            checked={draft.coding.autoSaveDrafts}
            onChange={(v) => { setDraft({ ...draft, coding: { ...draft.coding, autoSaveDrafts: v } }); }}
            label="Auto-save drafts"
          />
        </Row>
        <Row label="Inline AI suggestions" sub="Ghost text suggestions while typing.">
          <Select
            value={draft.coding.inlineSuggestions}
            onChange={(v) => { setDraft({ ...draft, coding: { ...draft.coding, inlineSuggestions: v } }); }}
            options={[
              { id: 'always',    label: 'Always show'              },
              { id: 'on-hotkey', label: 'Only on hotkey · ⌘.'      },
              { id: 'never',     label: 'Never'                    },
            ]}
          />
        </Row>
      </WorkbenchSection>

      <WorkbenchSection title="Reviews" icon={GitPullRequest} hint="PR review behaviors.">
        <Row label="Default sort" sub="How the PR list is ordered when you open the Reviews tab.">
          <Select
            value={draft.reviews.defaultSort}
            onChange={(v) => { setDraft({ ...draft, reviews: { ...draft.reviews, defaultSort: v } }); }}
            options={[
              { id: 'review-requested', label: 'Review requested first' },
              { id: 'updated',          label: 'Recently updated'        },
              { id: 'opened',           label: 'Recently opened'         },
              { id: 'risk',             label: 'Highest risk first'      },
            ]}
          />
        </Row>
        <Row label="Show CI summary before approve" sub="Display the pass/fail bar above the approve button.">
          <Toggle
            checked={draft.reviews.showCiBeforeApprove}
            onChange={(v) => { setDraft({ ...draft, reviews: { ...draft.reviews, showCiBeforeApprove: v } }); }}
            label="CI before approve"
          />
        </Row>
        <Row label="Require all conversations resolved" sub="Disables approve button if open threads exist.">
          <Toggle
            checked={draft.reviews.requireResolveAll}
            onChange={(v) => { setDraft({ ...draft, reviews: { ...draft.reviews, requireResolveAll: v } }); }}
            label="Resolve all"
          />
        </Row>
      </WorkbenchSection>

      <WorkbenchSection title="Agents" icon={Bot} hint="Default agent and run-time policies.">
        <Row label="Default agent">
          <Select
            value={draft.agents.defaultAgent}
            onChange={(v) => { setDraft({ ...draft, agents: { ...draft.agents, defaultAgent: v } }); }}
            options={[
              { id: 'fix-pipeline',  label: 'Fix pipeline'  },
              { id: 'review-bot',    label: 'Review bot'    },
              { id: 'investigation', label: 'Investigation' },
            ]}
          />
        </Row>
        <Row label="Confirm before launching" sub="Show a summary modal before any agent starts.">
          <Toggle
            checked={draft.agents.requireConfirm}
            onChange={(v) => { setDraft({ ...draft, agents: { ...draft.agents, requireConfirm: v } }); }}
            label="Confirm launch"
          />
        </Row>
        <Row label="Max parallel runs" sub="Throttles your concurrent agent runs.">
          <Select
            value={String(draft.agents.parallelLimit) as '1' | '2' | '3' | '5'}
            onChange={(v) => { setDraft({ ...draft, agents: { ...draft.agents, parallelLimit: Number(v) as 1 | 2 | 3 | 5 } }); }}
            options={[
              { id: '1', label: '1' },
              { id: '2', label: '2' },
              { id: '3', label: '3 (default)' },
              { id: '5', label: '5 (paid plans only)' },
            ]}
          />
        </Row>
      </WorkbenchSection>

      <WorkbenchSection title="Admission" icon={ShieldCheck} hint="Gate behavior when a check fails.">
        <Row label="Show proof obligations on fail" sub="Expanded breakdown of which obligation each check tested.">
          <Toggle
            checked={draft.admission.showProofOnFail}
            onChange={(v) => { setDraft({ ...draft, admission: { ...draft.admission, showProofOnFail: v } }); }}
            label="Show proof"
          />
        </Row>
        <Row label="Auto-link to fix candidate" sub="Suggest a fix candidate alongside each failed obligation.">
          <Toggle
            checked={draft.admission.autoLink}
            onChange={(v) => { setDraft({ ...draft, admission: { ...draft.admission, autoLink: v } }); }}
            label="Auto-link fix"
          />
        </Row>
      </WorkbenchSection>

      <Section title="Reset to defaults" hint="Restore every setting on this page to its factory default.">
        <Row label="Reset all preferences" sub="Other people's settings, your password, and your tokens are not affected.">
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
            Reset to defaults
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
