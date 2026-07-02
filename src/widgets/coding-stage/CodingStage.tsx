import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { safeLocalGet, safeLocalSet } from '@shared/lib';
import { TaskRail } from './parts/chrome/TaskRail';
import { type ComposerModelId } from './parts/Composer';
import { CommandPalette, type PaletteAction } from './parts/palette/CommandPalette';
import { TurnContextMenu } from './parts/turn/TurnContextMenu';
import { ACCENT_HEX, ThreadPane } from './parts/chrome/ThreadPane';
import { ContextRail } from './parts/chrome/ContextRail';
import {
  buildTurnMenuItems,
  isModelId,
  pickKeyword,
} from './lib/codingStageHelpers';
import { useTaskThread } from './lib/useTaskThread';
import { useComposerState } from './lib/useComposerState';
import { useBudgetChallenge } from './lib/useBudgetChallenge';
import { useCommandPalette } from './lib/useCommandPalette';
import { useCodingBlockEvents } from './lib/useCodingBlockEvents';
import type {
  AgentBlock, AgentTurn, Project, Task, UserTurn, ReactionKind,
} from './parts/types';
import {
  useVerifiedFixStore,
} from '@features/verified-fix';

// Stable empty array so the `promptHistory[id] ?? []` fallback doesn't
// allocate a fresh array reference on every render.
const EMPTY_PROMPT_HISTORY: string[] = [];

// Top-level coding workspace. Three columns:
//   - Left rail: project-grouped task threads
//   - Center: thread (user + agent turns) + bottom-pinned composer
//   - Right: project context, activity, shortcuts
// Everything is local state; no agent backend round-trips.

export default function CodingStage() {
  const { isDark } = useTheme();
  const { t } = useTranslation('coding');
  const navigate = useNavigate();
  // Verified-fix store action — used at agent-turn-end to seed a fix
  // case so the review-stage card has something to pick up.
  const seedVerifiedFix = useVerifiedFixStore((s) => s.seed);

  // Thread / task / turn cluster — tasks, projects, active selection,
  // derived view memos, the synthetic-stream registry and every thread
  // mutation. The model-persist effect lives in useComposerState; this
  // hook has no effects so it is order-neutral here.
  const {
    projects, setProjects,
    tasks, setTasks,
    activeId, setActiveId,
    scrubHead, setScrubHead,
    active,
    activeProject,
    isStreaming,
    saveProjectDefaultModel,
    applyInverseOf,
    forkFrom,
    toggleReaction,
    visibleThread,
    isScrubbed,
    cost,
    appendTurns,
    stopStream,
    runSyntheticAgent,
  } = useTaskThread(t, seedVerifiedFix);

  // Composer-side input state: intent, draft, lifted+persisted model,
  // side-by-side comparison model, and per-task prompt history. The
  // model-persist `useEffect` fires from inside this hook.
  const {
    intent, setIntent,
    draft, setDraft,
    sideBySideModel,
    model, setModel,
    promptHistory, pushPromptHistory,
  } = useComposerState();

  // Soft-cap budget challenge + per-task override state. The
  // submit-intercept and the 3-choice handlers stay below as composition
  // glue (they close over onSubmitComposer / cost / model).
  const {
    budgetChallenge, setBudgetChallenge,
    softCapOverridden, setSoftCapOverridden,
  } = useBudgetChallenge();

  // A11y / density preferences. `prefers-contrast: more` hydrates the
  // initial value so OS pref users get high contrast for free. Density
  // toggle is shell-style compact/comfortable/spacious.
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (safeLocalGet('coding:highContrast') === '1') return true;
    return window.matchMedia?.('(prefers-contrast: more)').matches ?? false;
  });
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>(() => {
    if (typeof window === 'undefined') return 'comfortable';
    const raw = safeLocalGet('coding:density');
    if (raw === 'compact' || raw === 'comfortable' || raw === 'spacious') return raw;
    return 'comfortable';
  });
  // Single persistence effect for both a11y prefs — same storage keys and
  // write behavior, one effect instead of two.
  useEffect(() => {
    safeLocalSet('coding:highContrast', highContrast ? '1' : '0');
    safeLocalSet('coding:density', density);
  }, [highContrast, density]);

  // When the active project changes, mirror its `defaultModel` into the
  // lifted model state — unless the user has set a per-project override
  // in this session, which wins over the static project default.
  useEffect(() => {
    if (!active) return;
    const proj = projects.find((p) => p.id === active.projectId);
    const stored = safeLocalGet(`coding:project-default-model:${active.projectId}`);
    if (isModelId(stored)) { setModel(stored); return; }
    if (proj?.defaultModel != null && isModelId(proj.defaultModel)) {
      setModel(proj.defaultModel);
    }
  }, [active?.projectId, active, projects, setModel]);

  // Window event bridge from Blocks (plan auto-advance + inline line edit).
  // Registered before useCommandPalette()'s ⌘K listener to preserve the
  // original effect mount order from the pre-split monolith.
  useCodingBlockEvents(setDraft);

  // Command palette + per-turn context menu open state. The ⌘K
  // capture-phase listener fires from inside this hook.
  const {
    paletteOpen,
    turnMenu,
    handleOpenTurnMenu,
    handlePaletteClose,
    handleTurnMenuClose,
  } = useCommandPalette();

  // Compose new turn into the active thread. If the thread is empty we
  // also flip the task title so the rail shows something useful.
  // Synthetic agent response — extracted so single-model and
  // side-by-side paths share the same block sequence.
  function buildSyntheticResponse(trimmed: string): AgentBlock[] {
    return [
      { kind: 'thinking', durationMs: 1600, text: '입력을 분석하고 변경 범위를 추정합니다.' },
      { kind: 'text', text: `요청 접수: \`${trimmed.slice(0, 80)}${trimmed.length > 80 ? '…' : ''}\`. 컨텍스트를 모으는 중입니다.` },
      { kind: 'tool', tool: 'search', label: `rg "${pickKeyword(trimmed)}"`, detail: '8 results · 5 files', status: 'ok' },
      { kind: 'tool', tool: 'read', label: 'src/index.ts', detail: 'L1-80', status: 'ok' },
      { kind: 'plan', title: 'change plan', items: [
        { id: 'p1', text: '변경 영향 범위 식별', done: true },
        { id: 'p2', text: '핵심 시그니처 보존하며 구현 교체', done: false },
        { id: 'p3', text: '단위 테스트 추가 + 회귀 검증', done: false },
      ] },
      { kind: 'text', text: '계획대로 진행하겠습니다. 다음 메시지에서 변경 사항을 적용합니다.' },
    ];
  }

  const onSubmitComposer = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed || !active) return;

    // Soft-cap guard. If the project's soft cap is set and we've
    // already crossed it, intercept the submit and surface the
    // 3-choice modal. Once the user picks "raise cap" we mark this
    // task overridden so subsequent turns don't repeat the prompt.
    const budget = activeProject?.budget;
    const overridden = softCapOverridden[active.id];
    if (
      budget?.softCapUsd != null &&
      cost.usd >= budget.softCapUsd &&
      !overridden
    ) {
      const downgrade: ComposerModelId =
        model === 'claude-opus-4-7'   ? 'claude-sonnet-4-6'
        : model === 'claude-sonnet-4-6' ? 'claude-haiku-4-5'
        : 'claude-haiku-4-5';
      setBudgetChallenge({
        used: cost.usd,
        cap: budget.softCapUsd,
        primary: model,
        downgrade,
      });
      return;
    }

    const userId = `u-${Date.now()}`;
    const userTurn: UserTurn = {
      id: userId, role: 'user', text: trimmed, at: 'now',
    };
    const primaryId = `a-${Date.now()}`;
    const agentTurn: AgentTurn = {
      id: primaryId, role: 'agent', at: 'now', streaming: true, blocks: [],
      model, phase: 'thinking',
    };

    // Side-by-side: append a paired agent turn for the comparison model
    // and tag both with each other's id so the renderer can lay them
    // out as a 2-column grid. The synthetic stream below kicks off
    // both in parallel.
    if (sideBySideModel != null && sideBySideModel !== model) {
      const secondaryId = `a-${Date.now() + 1}`;
      agentTurn.sideBySideOf = secondaryId;
      const secondaryTurn: AgentTurn = {
        id: secondaryId, role: 'agent', at: 'now', streaming: true, blocks: [],
        model: sideBySideModel, phase: 'thinking',
        sideBySideOf: primaryId,
      };
      appendTurns(active.id, userTurn, agentTurn, secondaryTurn);
      pushPromptHistory(active.id, trimmed);
      setDraft('');
      const synthetic = buildSyntheticResponse(trimmed);
      requestAnimationFrame(() => {
        runSyntheticAgent(active.id, primaryId, synthetic);
        // Stagger the secondary so the two streams don't lock-step
        // visually — feels more like real parallel inference.
        window.setTimeout(() => {
          runSyntheticAgent(active.id, secondaryId, synthetic);
        }, 250);
      });
      return;
    }

    appendTurns(active.id, userTurn, agentTurn);
    pushPromptHistory(active.id, trimmed);
    setDraft('');

    const synthetic = buildSyntheticResponse(trimmed);
    requestAnimationFrame(() => {
      runSyntheticAgent(active.id, primaryId, synthetic);
    });
  }, [
    draft, active, activeProject, softCapOverridden, cost.usd, model,
    sideBySideModel, appendTurns, pushPromptHistory, runSyntheticAgent,
    setBudgetChallenge, setDraft,
  ]);

  const startNewTask = useCallback((projectId?: string) => {
    const target = projectId ?? active?.projectId ?? projects[0].id;

    const id = `t-${Date.now().toString(36)}`;
    const task: Task = {
      id, projectId: target,
      title: t('rail.untitled'),
      branch: 'agent/new',
      baseBranch: 'main',
      status: 'open',
      timeAgo: 'now',
      diffStats: { added: 0, removed: 0, files: 0 },
      thread: [],
    };
    setTasks((cur) => [task, ...cur]);
    setActiveId(id);
    setDraft('');
  }, [active?.projectId, projects, t, setActiveId, setDraft, setTasks]);

  // Demo: "create project" prepends a new project with rotated accent
  // colour. No persistence; a real impl would prompt for repo URL.
  const startNewProject = useCallback(() => {
    const accents = ['emerald', 'sky', 'violet', 'amber', 'rose', 'cyan'] as const;
    const accent = accents[projects.length % accents.length];

    const id = `p-${Date.now().toString(36)}`;
    const project: Project = {
      id,
      name: 'untitled-project',
      slug: 'github.com/me/untitled',
      initial: 'U',
      accent,
    };
    setProjects((cur) => [project, ...cur]);
    startNewTask(id);
  }, [projects.length, startNewTask, setProjects]);

  // ⌘N → new task in current project
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        startNewTask();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [startNewTask]);

  // Stable handler wrappers — referenced by JSX props so heavy children
  // (TaskRail / ThreadPane / ContextRail / CommandPalette) don't see a
  // fresh closure each render. Wrappers that need a live `active` read
  // it from the latest value rather than a stale closure capture.
  const activeId_ = active?.id;
  const activeProjectId_ = active?.projectId;
  const handleSaveProjectDefaultModel = useCallback(() => {
    if (activeProjectId_ != null) saveProjectDefaultModel(activeProjectId_, model);
  }, [activeProjectId_, model, saveProjectDefaultModel]);
  const handleApplyInverse = useCallback((turnId: string) => {
    if (activeId_ != null) applyInverseOf(activeId_, turnId);
  }, [activeId_, applyInverseOf]);
  const handleFork = useCallback((turnId: string) => {
    if (activeId_ != null) forkFrom(activeId_, turnId);
  }, [activeId_, forkFrom]);
  const handleReact = useCallback((turnId: string, kind: ReactionKind) => {
    if (activeId_ != null) toggleReaction(activeId_, turnId, kind);
  }, [activeId_, toggleReaction]);
  const handleJumpTask = useCallback((id: string) => { setActiveId(id); }, [setActiveId]);
  const handleInsertSlash = useCallback((cmd: string) => { setDraft(`${cmd} `); }, [setDraft]);
  const handleTaskRailWidthChange = useCallback(() => { /* width control wiring pending */ }, []);
  const handleBudgetStop = useCallback(() => { setBudgetChallenge(null); }, [setBudgetChallenge]);
  const handleBudgetAutoDowngrade = useCallback(() => {
    if (budgetChallenge == null) return;
    setModel(budgetChallenge.downgrade);
    setBudgetChallenge(null);
    requestAnimationFrame(() => { onSubmitComposer(); });
  }, [budgetChallenge, onSubmitComposer, setBudgetChallenge, setModel]);
  const handleBudgetOverride = useCallback(() => {
    if (activeId_ == null) return;
    setSoftCapOverridden((cur) => ({ ...cur, [activeId_]: true }));
    setBudgetChallenge(null);
    requestAnimationFrame(() => { onSubmitComposer(); });
  }, [activeId_, onSubmitComposer, setBudgetChallenge, setSoftCapOverridden]);

  // Build palette actions. Memoized so a re-render caused by an
  // unrelated state change doesn't rebuild the action array and force
  // CommandPalette to diff a fresh prop reference.
  const paletteActionList = useMemo<PaletteAction[]>(() => [
    { id: 'newTask',    label: t('palette.actions.newTask'),    hint: '⌘N', onRun: () => { startNewTask(); } },
    { id: 'newProject', label: t('palette.actions.newProject'), onRun: startNewProject },
    { id: 'rewindLast', label: t('palette.actions.rewindLast'), onRun: () => {
      if (active == null) return;
      for (let i = active.thread.length - 1; i >= 0; i--) {
        const tn = active.thread[i];
        if (tn.role === 'agent') { applyInverseOf(active.id, tn.id); return; }
      }
    } },
    { id: 'modelOpus',   label: t('palette.actions.switchModelCapable'),  keywords: ['opus'],   onRun: () => { setModel('claude-opus-4-7'); } },
    { id: 'modelSonnet', label: t('palette.actions.switchModelBalanced'), keywords: ['sonnet'], onRun: () => { setModel('claude-sonnet-4-6'); } },
    { id: 'modelHaiku',  label: t('palette.actions.switchModelFast'),     keywords: ['haiku'],  onRun: () => { setModel('claude-haiku-4-5'); } },
    { id: 'openCatalog', label: t('palette.actions.openCatalog'),
      keywords: ['catalog', '카탈로그', 'saas', 'pages', 'index', 'directory', 'scaffold'],
      onRun: () => { void navigate({ to: '/catalog' }); } },
  ], [t, startNewTask, startNewProject, active, applyInverseOf, navigate, setModel]);

  // Turn-menu items: only built when the menu is open, but the builder
  // gets fresh closures anyway — fine because TurnContextMenu only
  // mounts in that conditional branch.
  const handleTurnMenuCopy = useCallback((text: string) => {
    void navigator.clipboard?.writeText(text);
  }, []);
  const handleTurnMenuOpenInNew = useCallback((text: string) => {
    if (activeProjectId_ != null) startNewTask(activeProjectId_);
    setDraft(text);
  }, [activeProjectId_, startNewTask, setDraft]);

  if (!active || !activeProject) return null;

  // Match the Intelligence DotField canvas background (#0d1117) so the
  // coding workspace reads as the same blueprint surface, not a separate
  // black sheet. Light mode keeps the cool off-white pair.
  const surface = 'bg-[var(--bg-stage)]';

  return (
    <div
      className={`absolute inset-0 flex font-sans ${surface}`}
      data-coding-stage
      data-coding-density={density}
      data-coding-contrast={highContrast ? 'high' : 'normal'}
    >
      <TaskRail
        projects={projects}
        tasks={tasks}
        activeId={activeId}
        onSelect={setActiveId}
        onNewTask={startNewTask}
        onNewProject={startNewProject}
        t={t}
        width={284}
        onWidthChange={handleTaskRailWidthChange}
      />

      <ThreadPane
        task={active}
        project={activeProject}
        isDark={isDark}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={onSubmitComposer}
        onStop={stopStream}
        intent={intent}
        onIntent={setIntent}
        isStreaming={isStreaming}
        t={t}
        model={model}
        onModelChange={setModel}
        onSaveProjectDefaultModel={handleSaveProjectDefaultModel}
        promptHistory={promptHistory[active.id] ?? EMPTY_PROMPT_HISTORY}
        visibleThread={visibleThread}
        scrubHead={scrubHead}
        onScrub={setScrubHead}
        isScrubbed={isScrubbed}
        onApplyInverse={handleApplyInverse}
        onFork={handleFork}
        onReact={handleReact}
        onOpenTurnMenu={handleOpenTurnMenu}
        cost={cost}
      />

      <ContextRail
        task={active}
        project={activeProject}
        accent={ACCENT_HEX[activeProject.accent]}
        isDark={isDark}
        t={t}
        density={density}
        onDensityChange={setDensity}
        highContrast={highContrast}
        onHighContrastChange={setHighContrast}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={handlePaletteClose}
        actions={paletteActionList}
        tasks={tasks}
        onJumpTask={handleJumpTask}
        onInsertSlash={handleInsertSlash}
        isDark={isDark}
        t={t}
      />

      {budgetChallenge && (
        <BudgetSoftCapModal
          used={budgetChallenge.used}
          cap={budgetChallenge.cap}
          primary={budgetChallenge.primary}
          downgrade={budgetChallenge.downgrade}
          t={t}
          onAutoDowngrade={handleBudgetAutoDowngrade}
          onOverride={handleBudgetOverride}
          onStop={handleBudgetStop}
        />
      )}
      {turnMenu && (
        <TurnContextMenu
          x={turnMenu.x}
          y={turnMenu.y}
          isDark={isDark}
          onClose={handleTurnMenuClose}
          items={buildTurnMenuItems(turnMenu.turn, t, {
            onCopy: handleTurnMenuCopy,
            onOpenInNew: handleTurnMenuOpenInNew,
          })}
        />
      )}
    </div>
  );
}

// ─── Right rail ───────────────────────────────────────────────────────────


// Soft-cap budget modal. 3-choice paradigm — auto-downgrade (safe
// default), raise cap (expert override), stop (no spend). Pattern:
// AWS Budget threshold action + ATM overdraft warning.
function BudgetSoftCapModal({
  used, cap, primary, downgrade, t,
  onAutoDowngrade, onOverride, onStop,
}: {
  used: number;
  cap: number;
  primary: ComposerModelId;
  downgrade: ComposerModelId;
  t: (k: string, opts?: Record<string, unknown>) => string;
  onAutoDowngrade: () => void;
  onOverride: () => void;
  onStop: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onStop(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [onStop]);
  const surface = 'bg-[var(--bg-elevated)] border-[color:var(--border-default)]';
  const heading = 'text-[color:var(--fg-strong)]';
  const muted = 'text-[color:var(--fg-muted)]';
  const newCap = (cap * 2).toFixed(2);
  const estDown = (used + 0.18).toFixed(2);
  // Prettify model id for display.
  const modelLabel = (id: ComposerModelId) => id.replace(/^claude-/, '').replace(/-(\d)/, ' $1').replace(/-/g, '.');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default bg-[color:var(--bg-scrim)] backdrop-blur-sm"
        onClick={onStop}
        onKeyDown={(e) => { if (e.key === 'Escape') onStop(); }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Soft cap reached"
        className={`relative w-full max-w-[480px] rounded-xl border shadow-2xl ${surface} coding-pill-rise`}
      >
        <div className="px-5 py-4">
          <div className={`flex items-center gap-2 mb-1`}>
            <span className="text-[16px]" aria-hidden>🛑</span>
            <h2 className={`text-[14px] font-bold ${heading}`}>{t('budgetV2.softCapModalTitle')}</h2>
          </div>
          <p className={`text-[12px] ${muted} mb-4`}>
            {t('budgetV2.softCapModalBody', { used: used.toFixed(2), cap: cap.toFixed(2) })}
          </p>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onAutoDowngrade}
              autoFocus
              style={{
                borderColor: 'color-mix(in srgb, var(--intent-success-vivid) 30%, transparent)',
                background: 'var(--intent-success-bg)',
                color: 'var(--intent-success-fg)',
              }}
              className="w-full text-left px-3 py-2.5 rounded-md border transition-colors"
            >
              <div className="text-[12px] font-semibold">
                {t('budgetV2.softCapAutoDown', { model: modelLabel(downgrade), est: estDown })}
              </div>
            </button>
            <button
              type="button"
              onClick={onOverride}
              style={{
                borderColor: 'color-mix(in srgb, var(--intent-warn-vivid) 30%, transparent)',
                background: 'var(--intent-warn-bg)',
                color: 'var(--intent-warn-fg)',
              }}
              className="w-full text-left px-3 py-2.5 rounded-md border transition-colors"
            >
              <div className="text-[12px] font-semibold">
                {t('budgetV2.softCapOverride', { newCap })}
              </div>
              <div className="text-[10px] opacity-70 mt-0.5">{modelLabel(primary)}</div>
            </button>
            <button
              type="button"
              onClick={onStop}
              className="w-full text-left px-3 py-2.5 rounded-md border transition-colors border-[color:var(--border-default)] hover:bg-[color:var(--bg-hover)] text-[color:var(--fg-strong)]"
            >
              <div className="text-[12px] font-semibold">{t('budgetV2.softCapStop')}</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────
