 
// AgentProfileModal — the heart of agent customization.
//
// Layout: a right-sliding sheet (not a centred modal) so the user can keep
// the conversation visible while editing. Five tabs along the top:
//
//   1. Modes      — primary; flips the active mode + edits the trust dial
//   2. Rules      — table of rules with glob/scope/source columns
//   3. Workflows  — slash playbooks
//   4. Pain-points— ❌-reacted turns waiting to be turned into rules
//   5. Marketplace— import third-party profiles
//
// Differentiators that aren't in any shipping competitor:
//
//   * Trust dial 1-5 — explicit autonomy rather than the "guess what the
//     agent can do" black box of Cursor/Skills auto-activation.
//   * Pain-points tab — the ❌ reaction collected by `toggleReaction` on
//     agent turns becomes a 1-click rule generator. Closes the loop
//     between "I disliked this" and "the agent learns from it".
//   * Diff-as-rule — entry point lives on the turn context menu, not in
//     this modal, but the resulting `AgentRule` (source: 'diff-pattern')
//     surfaces here with the right badge.

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type {
  AgentMode, AgentProfile, AgentRule, AgentWorkflow,
  Task,
} from './types';
import { TabBar } from './agent-profile/TabBar';
import { ModesTab } from './agent-profile/ModesTab';
import { RulesTab } from './agent-profile/RulesTab';
import { WorkflowsTab } from './agent-profile/WorkflowsTab';
import { PainPointsTab } from './agent-profile/PainPointsTab';
import { MarketplaceTab } from './agent-profile/MarketplaceTab';
import {
  collectPainPoints, MODE_ICON, ACCENT_HEX,
  type Tab, type TranslateFn, type PainPoint,
} from './agent-profile/types';

// Re-exports preserved so existing consumers (ModeChip) keep working.
export { MODE_ICON, ACCENT_HEX as MODE_ACCENT_HEX, collectPainPoints };
export type { PainPoint };

// ─── Modal shell ─────────────────────────────────────────────────────────

export function AgentProfileModal({
  open, onClose, profile, onProfileChange, projectName,
  tasks, isDark, t, initialTab,
}: {
  open: boolean;
  onClose: () => void;
  profile: AgentProfile;
  onProfileChange: (next: AgentProfile) => void;
  projectName: string;
  tasks: Task[];
  isDark: boolean;
  t: TranslateFn;
  // Which tab to land on when the modal opens. Lets callers (e.g.
  // "Save edit pattern as rule" on a turn) drop the user directly on
  // the tab where their action's effect is visible. Optional — defaults
  // to 'modes' on first open.
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab ?? 'modes');

  // Sync the local tab state whenever the modal is opened with a
  // different requested tab. Without this the second-open-with-different-
  // initialTab would silently keep the previous tab.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open && initialTab != null) setTab(initialTab);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  const painPoints = useMemo(() => collectPainPoints(tasks), [tasks]);

  if (!open) return null;

  const surface = 'bg-[var(--bg-surface)] border-[var(--border-default)]';
  const heading = 'text-[var(--fg-strong)]';
  const muted   = 'text-[var(--fg-muted)]';
  const faint   = 'text-[var(--fg-subtle)]';

  function setRules(rules: AgentRule[]) { onProfileChange({ ...profile, rules }); }
  function setModes(modes: AgentMode[]) { onProfileChange({ ...profile, modes }); }
  function setWorkflows(workflows: AgentWorkflow[]) { onProfileChange({ ...profile, workflows }); }

  function deriveRuleFromPainPoint(p: PainPoint) {
    const id = `r-${Date.now().toString(36)}`;
    const inferGlobs = (paths: string[]): string[] => {
      if (paths.length === 0) return ['**/*'];
      const dirs = new Set(paths.map((path) => {
        const parts = path.split('/');
        return parts.slice(0, Math.min(2, parts.length - 1)).join('/');
      }));
      return [...dirs].slice(0, 3).map((d) => `${d}/**/*`);
    };
    // Short label for the rule name. p.preview is already truncated at
    // 120; trim further to 36 for the rule list, only adding an ellipsis
    // when we actually cut.
    const shortLabel = p.preview.length > 36
      ? `${p.preview.slice(0, 36).trimEnd()}…`
      : p.preview;
    const newRule: AgentRule = {
      id,
      name: t('agentProfile.painpoint.deriveName', { preview: shortLabel }),
      body: t('agentProfile.painpoint.deriveBody', { preview: p.preview }),
      globs: inferGlobs(p.filesTouched),
      scope: 'always',
      enabled: true,
      source: 'pain-point',
      fromTurnId: p.turnId,
      updatedAtMs: Date.now(),
    };
    setRules([newRule, ...profile.rules]);
    setTab('rules');
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Scrim — closes on click. Subtle, not blocking. Rendered as a
          <button> so keyboard users can dismiss with the same target. */}
      <button
        type="button"
        aria-label={t('agentProfile.close')}
        onClick={onClose}
        className={`absolute inset-0 bg-[var(--bg-scrim)] backdrop-blur-sm cursor-default`}
      />

      {/* Right sheet — 720px wide on desktop, full-width on phones. */}
      <aside
        className={`relative ml-auto h-full w-full max-w-[760px] flex flex-col border-l shadow-2xl ${surface}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('agentProfile.title')}
      >
        <header className={`shrink-0 px-5 pt-4 pb-3 border-b border-[var(--border-default)]`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className={`text-[10px] uppercase tracking-[0.18em] font-bold ${faint}`}>
                {t('agentProfile.subtitle')}
              </div>
              <h2 className={`text-[15px] font-bold ${heading}`}>
                {t('agentProfile.titleFor', { project: projectName })}
              </h2>
              <p className={`text-[11px] ${muted} mt-0.5`}>
                {t('agentProfile.savesAs')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('agentProfile.close')}
              className={`shrink-0 p-1.5 rounded-md transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:[background:var(--bg-hover)]`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <TabBar
            tab={tab}
            onChange={setTab}
            isDark={isDark}
            t={t}
            counts={{
              modes: profile.modes.length,
              rules: profile.rules.length,
              workflows: profile.workflows.length,
              painpoints: painPoints.length,
            }}
          />
        </header>

        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
          {tab === 'modes' && (
            <ModesTab
              modes={profile.modes}
              activeId={profile.activeModeId}
              onActiveChange={(id) => { onProfileChange({ ...profile, activeModeId: id }); }}
              onModesChange={setModes}
              isDark={isDark}
              t={t}
            />
          )}
          {tab === 'rules' && (
            <RulesTab
              rules={profile.rules}
              onRulesChange={setRules}
              isDark={isDark}
              t={t}
            />
          )}
          {tab === 'workflows' && (
            <WorkflowsTab
              workflows={profile.workflows}
              modes={profile.modes}
              onWorkflowsChange={setWorkflows}
              isDark={isDark}
              t={t}
            />
          )}
          {tab === 'painpoints' && (
            <PainPointsTab
              painPoints={painPoints}
              onDerive={deriveRuleFromPainPoint}
              isDark={isDark}
              t={t}
            />
          )}
          {tab === 'marketplace' && (
            <MarketplaceTab
              importedFromId={profile.importedFromId}
              isDark={isDark}
              t={t}
              onImport={(mp) => {
                // Synthesise the rules/modes/workflows the listing
                // promised. Real impl would fetch the actual payload;
                // demo fabricates plausible items so the count badges
                // on the Modes/Rules/Workflows tabs actually move.
                const stamp = Date.now();
                 
                const importedRules: AgentRule[] = Array.from(
                  { length: mp.preview.rules },
                  (_, i): AgentRule => ({
                    id: `r-${stamp.toString(36)}-${String(i)}`,
                    name: t('agentProfile.marketplace.fabRuleName', { mp: mp.name, n: i + 1 }),
                    body: t('agentProfile.marketplace.fabRuleBody', { mp: mp.name, author: mp.author }),
                    globs: ['**/*'],
                    scope: 'requested',
                    enabled: true,
                    source: 'marketplace',
                    updatedAtMs: stamp,
                  }),
                );
                const importedModes: AgentMode[] = Array.from(
                  { length: mp.preview.modes },
                  (_, i): AgentMode => ({
                    id: `mode-${stamp.toString(36)}-${String(i)}`,
                    name: t('agentProfile.marketplace.fabModeName', { mp: mp.name, n: i + 1 }),
                    blurb: t('agentProfile.marketplace.fabModeBlurb', { mp: mp.name }),
                    icon: 'compass',
                    accent: 'sky',
                    systemPrompt: t('agentProfile.marketplace.fabModePrompt', { mp: mp.name }),
                    allowedTools: ['read', 'edit', 'search', 'plan'],
                    trust: 2,
                  }),
                );
                const importedWorkflows: AgentWorkflow[] = Array.from(
                  { length: mp.preview.workflows },
                  (_, i): AgentWorkflow => ({
                    id: `w-${stamp.toString(36)}-${String(i)}`,
                    slug: `${mp.id}-wf-${String(i + 1)}`,
                    name: t('agentProfile.marketplace.fabWfName', { mp: mp.name, n: i + 1 }),
                    blurb: t('agentProfile.marketplace.fabWfBlurb', { mp: mp.name }),
                    steps: [
                      t('agentProfile.marketplace.fabWfStep1'),
                      t('agentProfile.marketplace.fabWfStep2'),
                      t('agentProfile.marketplace.fabWfStep3'),
                    ],
                  }),
                );
                 
                onProfileChange({
                  ...profile,
                  rules: [...importedRules, ...profile.rules],
                  modes: [...profile.modes, ...importedModes],
                  workflows: [...importedWorkflows, ...profile.workflows],
                  importedFromId: mp.id,
                });
                setTab('rules');
              }}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
