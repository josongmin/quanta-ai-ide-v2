import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GitBranch, FileCode, CheckCircle2, Clock, Sparkles, MoreHorizontal,
  GitPullRequest, Activity, Cpu, Zap, Coins, RotateCcw, GitFork,
  ThumbsUp, ThumbsDown, Heart, Target,
  Hash as HashIcon, MessageCircle, AlertOctagon, Palette, Briefcase, Code,
} from 'lucide-react';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { formatNumber } from '@shared/lib';
import { TaskRail } from './parts/TaskRail';
import { Composer, type ComposerModelId } from './parts/Composer';
import { BlockView } from './parts/Blocks';
import { TimelineScrubber, sliceToHead } from './parts/TimelineScrubber';
import { CommandPalette, type PaletteAction } from './parts/CommandPalette';
import { TurnContextMenu, type TurnContextMenuItem } from './parts/TurnContextMenu';
import { LiveSnapshotCard } from './parts/LiveSnapshotCard';
import { SAMPLE_PROJECTS, getSampleTasks } from './parts/data';
import type {
  AgentBlock, AgentTurn, Project, Task, Turn, UserTurn,
  ReactionKind, Integration, BranchState, PrState, CiCheck,
} from './parts/types';

// Top-level coding workspace. Three columns:
//   - Left rail: project-grouped task threads
//   - Center: thread (user + agent turns) + bottom-pinned composer
//   - Right: project context, activity, shortcuts
// Everything is local state; no agent backend round-trips.

export default function CodingStage() {
  const { isDark } = useTheme();
  const { t } = useTranslation('coding');

  // Demo fixtures live in coding.json under `demo.*`. Resolve once on mount
  // so the rail title / chat thread / plans use the user's chosen locale.
  const initialTasks = useMemo(() => getSampleTasks(t), [t]);
  const [projects, setProjects] = useState<Project[]>(() => SAMPLE_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(() => initialTasks);
  const [activeId, setActiveId] = useState<string>(initialTasks[1]?.id ?? initialTasks[0]?.id ?? '');
  const [intent, setIntent] = useState<'code' | 'ask'>('code');
  const [draft, setDraft] = useState('');

  // Soft-cap modal state. null = no challenge; set = block-or-choose.
  // The modal is shown when the user attempts to submit while cost
  // already exceeds the project's soft cap. Pattern: ATM "you're about
  // to overdraft" challenge — present 3 paths, never silent failure.
  const [budgetChallenge, setBudgetChallenge] = useState<null | { used: number; cap: number; primary: ComposerModelId; downgrade: ComposerModelId }>(null);
  // Per-task soft-cap override — once raised, that task's threshold is
  // bumped to hardCap so the user can finish the work without being
  // re-prompted on every turn.
  const [softCapOverridden, setSoftCapOverridden] = useState<Record<string, boolean>>({});

  // Side-by-side comparison model. null = single-model run; set =
  // every onSubmit fires both `model` and `sideBySideModel` in parallel
  // and the renderer pairs the two outputs in a 2-column grid so the
  // user can pick the winner.
  const [sideBySideModel, setSideBySideModel] = useState<ComposerModelId | null>(null);

  // Lifted model selection. Persists across task switches; per-project
  // default applies on project change unless the user has overridden in
  // the current session.
  const [model, setModel] = useState<ComposerModelId>(() => {
    if (typeof window === 'undefined') return 'claude-opus-4-7';
    const raw = window.localStorage.getItem('coding:model');
    if (isModelId(raw)) return raw;
    return 'claude-opus-4-7';
  });
  useEffect(() => { window.localStorage.setItem('coding:model', model); }, [model]);

  // Per-task prompt history for shell-style ↑↓ recall.
  const [promptHistory, setPromptHistory] = useState<Record<string, string[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem('coding:prompt-history');
      return raw != null ? JSON.parse(raw) as Record<string, string[]> : {};
    } catch { return {}; }
  });
  function pushPromptHistory(taskId: string, prompt: string) {
    setPromptHistory((cur) => {
      const list = cur[taskId] ?? [];
      if (list[list.length - 1] === prompt) return cur;
      const next = [...list, prompt].slice(-50);
      const merged = { ...cur, [taskId]: next };
      try { window.localStorage.setItem('coding:prompt-history', JSON.stringify(merged)); } catch { /* fine */ }
      return merged;
    });
  }

  // Time-travel scrubber preview state. null = live; otherwise the
  // index of the turn the user has scrubbed back to. Composer locks
  // while scrubbed (handled below).
  const [scrubHead, setScrubHead] = useState<number | null>(null);

  // Command palette + per-turn context menu state.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [turnMenu, setTurnMenu] = useState<{ x: number; y: number; turn: Turn } | null>(null);

  // A11y / density preferences. `prefers-contrast: more` hydrates the
  // initial value so OS pref users get high contrast for free. Density
  // toggle is shell-style compact/comfortable/spacious.
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (window.localStorage.getItem('coding:highContrast') === '1') return true;
    return window.matchMedia?.('(prefers-contrast: more)').matches ?? false;
  });
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>(() => {
    if (typeof window === 'undefined') return 'comfortable';
    const raw = window.localStorage.getItem('coding:density');
    if (raw === 'compact' || raw === 'comfortable' || raw === 'spacious') return raw;
    return 'comfortable';
  });
  useEffect(() => { window.localStorage.setItem('coding:highContrast', highContrast ? '1' : '0'); }, [highContrast]);
  useEffect(() => { window.localStorage.setItem('coding:density', density); }, [density]);

  const active = useMemo(
    () => tasks.find((task) => task.id === activeId) ?? tasks[0],
    [tasks, activeId],
  );
  const activeProject = useMemo(
    () => projects.find((p) => p.id === active?.projectId) ?? projects[0],
    [projects, active],
  );

  const isStreaming = useMemo(
    () => active?.thread.some((tn) => tn.role === 'agent' && tn.streaming) ?? false,
    [active],
  );

  // When the active project changes, mirror its `defaultModel` into the
  // lifted model state — unless the user has set a per-project override
  // in this session, which wins over the static project default.
  /* eslint-disable react-hooks/set-state-in-effect --
   * External-trigger sync: project switch updates a UI-side preference. */
  useEffect(() => {
    if (!active) return;
    const proj = projects.find((p) => p.id === active.projectId);
    const stored = window.localStorage.getItem(`coding:project-default-model:${active.projectId}`);
    if (isModelId(stored)) { setModel(stored); return; }
    if (proj?.defaultModel != null && isModelId(proj.defaultModel)) {
      setModel(proj.defaultModel);
    }
  }, [active?.projectId, active, projects]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Save the active model as a per-project default. Clicked from the
  // Composer's model dropdown footer.
  function saveProjectDefaultModel(projectId: string, next: ComposerModelId) {
    window.localStorage.setItem(`coding:project-default-model:${projectId}`, next);
    setProjects((cur) => cur.map((p) =>
      p.id === projectId ? { ...p, defaultModel: next } : p,
    ));
  }

  // Recovery-engine: append a synthetic agent turn that *describes* the
  // inverse of the targeted turn. History is preserved (audit trail),
  // working state is what the user actually wanted. Replaces the old
  // destructive `rewindTo`.
  function applyInverseOf(taskId: string, turnId: string) {
    // If a stream is in flight for this task, stop it first — appending
    // an inverse while the targeted turn is still mid-stream would race.
    // streamRef is keyed by turnId; iterate to find any entry that
    // belongs to this task and clear it.
    for (const [tid, entry] of streamRef.current) {
      if (entry.taskId === taskId) {
        window.clearTimeout(entry.timer);
        streamRef.current.delete(tid);
      }
    }
    setTasks((cur) => cur.map((task) => {
      if (task.id !== taskId) return task;
      const target = task.thread.find((tn) => tn.id === turnId);
      if (target == null) return task;
      if (target.role !== 'agent') return task;
      // eslint-disable-next-line react-hooks/purity -- event-handler id
      const invId = `inv-${Date.now().toString(36)}`;
      const inverseTurn: AgentTurn = {
        id: invId,
        role: 'agent',
        at: 'now',
        streaming: false,
        // Tag the inverse turn with the target id so the scrubber can
        // draw an arrow back and the AgentTurnView can show an "inverse
        // of …" anchor chip. Audit trail at-a-glance.
        inverseOf: turnId,
        blocks: [
          { kind: 'text', text: `Inverse of turn #${task.thread.indexOf(target) + 1}.` },
        ],
      };
      return { ...task, thread: [...task.thread, inverseTurn], timeAgo: 'now' };
    }));
  }

  // Fork creates a new task seeded with the thread up through `turnId`.
  function forkFrom(taskId: string, turnId: string) {
    const src = tasks.find((task) => task.id === taskId);
    if (src == null) return;
    const idx = src.thread.findIndex((tn) => tn.id === turnId);
    if (idx < 0) return;
     
    const id = `t-${Date.now().toString(36)}`;
    const fork: Task = {
      ...src, id,
      title: `${src.title} · fork`,
      branch: `${src.branch}-fork`,
      timeAgo: 'now', status: 'open',
      thread: src.thread.slice(0, idx + 1),
    };
    setTasks((cur) => [fork, ...cur]);
    setActiveId(id);
  }

  // Toggle a reaction on a specific agent turn. Reactions live on the
  // turn so they persist across task switches.
  function toggleReaction(taskId: string, turnId: string, kind: ReactionKind) {
    setTasks((cur) => cur.map((task) => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        thread: task.thread.map((tn) => {
          if (tn.role !== 'agent' || tn.id !== turnId) return tn;
          const curR = tn.reactions ?? {};
          const reactions: NonNullable<AgentTurn['reactions']> = {};
          for (const k of Object.keys(curR) as ReactionKind[]) {
            if (k !== kind && curR[k]) reactions[k] = true;
          }
          if (!curR[kind]) reactions[kind] = true;
          return { ...tn, reactions };
        }),
      };
    }));
  }

  // Annotate citations with `staleAfterTurn` so the renderer can flag
  // citations whose file has been touched by a *later* turn.
  const annotatedThread = useMemo(() => {
    if (!active) return [];
    const filesAfter = new Map<number, Set<string>>();
    for (let i = 0; i < active.thread.length; i++) {
      const accum = new Set<string>();
      for (let j = i + 1; j < active.thread.length; j++) {
        const tn = active.thread[j];
        if (tn.role !== 'agent') continue;
        for (const block of tn.blocks) {
          if (block.kind === 'tool' && block.tool === 'edit') accum.add(block.label);
          if (block.kind === 'diff') for (const f of block.files) accum.add(f.path);
        }
      }
      filesAfter.set(i, accum);
    }
    return active.thread.map((tn, i) => {
      if (tn.role !== 'agent' || !tn.citations) return tn;
      const after = filesAfter.get(i) ?? new Set<string>();
      const annotated = tn.citations.map((c) => {
        if (after.has(c.path)) {
          for (let j = i + 1; j < active.thread.length; j++) {
            const lt = active.thread[j];
            if (lt.role !== 'agent') continue;
            const touches = lt.blocks.some((b) =>
              (b.kind === 'tool' && b.tool === 'edit' && b.label === c.path)
              || (b.kind === 'diff' && b.files.some((f) => f.path === c.path))
            );
            if (touches) return { ...c, staleAfterTurn: j };
          }
        }
        return c;
      });
      return { ...tn, citations: annotated };
    });
  }, [active]);

  const visibleThread = useMemo(
    () => sliceToHead(annotatedThread, scrubHead),
    [annotatedThread, scrubHead],
  );
  const isScrubbed = scrubHead !== null;

  // Cumulative cost rollup with per-turn projection + budget escalation.
  const cost = useMemo(() => {
    if (!active) return { inTok: 0, outTok: 0, usd: 0, avgUsd: 0 };
    let inTok = 0; let outTok = 0; let usd = 0; let agentTurnCount = 0;
    for (const tn of active.thread) {
      if (tn.role !== 'agent' || !tn.tokens) continue;
      inTok += tn.tokens.in; outTok += tn.tokens.out;
      const rate = MODEL_PRICING[tn.model ?? 'claude-opus-4-7'] ?? MODEL_PRICING['claude-opus-4-7'];
      usd += (tn.tokens.in / 1_000_000) * rate.in + (tn.tokens.out / 1_000_000) * rate.out;
      agentTurnCount += 1;
    }
    return { inTok, outTok, usd, avgUsd: agentTurnCount > 0 ? usd / agentTurnCount : 0 };
  }, [active]);

  // Window event bridge from Blocks (plan auto-advance + inline line edit).
  useEffect(() => {
    function onPlanAdvance(e: Event) {
      const detail = (e as CustomEvent<{ nextText: string }>).detail;
      if (detail?.nextText == null) return;
      setDraft(`다음 단계: ${detail.nextText} `);
    }
    function onLineRewrite(e: Event) {
      const detail = (e as CustomEvent<{ original: string; instruction: string }>).detail;
      if (detail?.instruction == null) return;
      const orig = detail.original.length > 80 ? `${detail.original.slice(0, 80)}…` : detail.original;
      setDraft(`이 줄을 다시 작성: \`${orig}\` — ${detail.instruction}`);
    }
    window.addEventListener('coding:plan-advance', onPlanAdvance);
    window.addEventListener('coding:line-rewrite', onLineRewrite);
    return () => {
      window.removeEventListener('coding:plan-advance', onPlanAdvance);
      window.removeEventListener('coding:line-rewrite', onLineRewrite);
    };
  }, []);

  // ⌘K toggles palette — capture phase so it wins over chat-agent's ⌘K.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); };
  }, []);

  // Compose new turn into the active thread. If the thread is empty we
  // also flip the task title so the rail shows something useful.
  function appendTurns(taskId: string, ...turns: Turn[]) {
    setTasks((cur) => cur.map((task) => {
      if (task.id !== taskId) return task;
      const titled = task.thread.length === 0 && turns[0]?.role === 'user'
        ? deriveTitle((turns[0]).text)
        : task.title;
      return {
        ...task,
        thread: [...task.thread, ...turns],
        title: titled,
        timeAgo: 'now',
        status: 'running',
      };
    }));
  }

  function patchTurn(taskId: string, turnId: string, patch: Partial<AgentTurn>) {
    setTasks((cur) => cur.map((task) => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        thread: task.thread.map((tn) =>
          tn.role === 'agent' && tn.id === turnId ? { ...tn, ...patch } : tn,
        ),
      };
    }));
  }

  // Synthesised streaming. Drops blocks into the agent turn over time so
  // the demo "looks alive" without a real model. Cancellable via the stop
  // button, which clears the pending interval and freezes the turn.
  // Keyed by turnId so multiple in-flight turns (follow-up sent while a
  // prior turn is still streaming) coexist without clobbering each other.
  const streamRef = useRef<Map<string, { taskId: string; timer: number }>>(new Map());

  function stopStream() {
    if (!active) return;
    for (const [turnId, entry] of streamRef.current) {
      if (entry.taskId !== active.id) continue;
      window.clearTimeout(entry.timer);
      patchTurn(entry.taskId, turnId, { streaming: false });
      streamRef.current.delete(turnId);
    }
  }

  function runSyntheticAgent(taskId: string, turnId: string, blocks: AgentBlock[]) {
    let i = 0;
    const tick = () => {
      if (i >= blocks.length) {
        patchTurn(taskId, turnId, { streaming: false, elapsed: `${(blocks.length * 0.7).toFixed(1)}s`, tokens: { in: 1200 + blocks.length * 320, out: 300 + blocks.length * 110 } });
        streamRef.current.delete(turnId);
        // Mark task as review when stream ends with a diff, else open
        const last = blocks[blocks.length - 1];
        setTasks((cur) => cur.map((task) =>
          task.id === taskId
            ? { ...task, status: last?.kind === 'diff' ? 'review' : 'open' }
            : task,
        ));
        return;
      }
      const block = blocks[i++];
      setTasks((cur) => cur.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          thread: task.thread.map((tn) =>
            tn.role === 'agent' && tn.id === turnId
              ? { ...tn, blocks: [...tn.blocks, block] }
              : tn,
          ),
        };
      }));
      const delay = block.kind === 'thinking' ? 900 : block.kind === 'tool' ? 600 : 500;
      const timer = window.setTimeout(tick, delay);
      streamRef.current.set(turnId, { taskId, timer });
    };
    tick();
  }

  function onSubmitComposer() {
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

     
    /* eslint-disable react-hooks/purity --
     * Event-handler turn ids; not render-time computation. */
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
    /* eslint-enable react-hooks/purity */
  }

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

  function startNewTask(projectId?: string) {
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
  }

  // Demo: "create project" prepends a new project with rotated accent
  // colour. No persistence; a real impl would prompt for repo URL.
  function startNewProject() {
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
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startNewTask
    // closes over `active?.projectId` and several setters; including it
    // would re-bind the global keydown listener on every render. The narrow
    // dep is intentional — re-bind only when the active project changes.
  }, [active?.projectId]);

  if (!active || !activeProject) return null;

  const surface = isDark ? 'bg-[#0b0d10]' : 'bg-[#f7f8fa]';

  // Build palette actions on every render. Closures capture the current
  // active/model so "rewind last" / "switch model" always operate on
  // fresh state.
   
  const paletteActionList: PaletteAction[] = [
    { id: 'newTask',    label: t('palette.actions.newTask'),    hint: '⌘N', onRun: () => { startNewTask(); } },
    { id: 'newProject', label: t('palette.actions.newProject'), onRun: startNewProject },
    { id: 'rewindLast', label: t('palette.actions.rewindLast'), onRun: () => {
      for (let i = active.thread.length - 1; i >= 0; i--) {
        const tn = active.thread[i];
        if (tn.role === 'agent') { applyInverseOf(active.id, tn.id); return; }
      }
    } },
    { id: 'modelOpus',   label: t('palette.actions.switchModelCapable'),  keywords: ['opus'],   onRun: () => { setModel('claude-opus-4-7'); } },
    { id: 'modelSonnet', label: t('palette.actions.switchModelBalanced'), keywords: ['sonnet'], onRun: () => { setModel('claude-sonnet-4-6'); } },
    { id: 'modelHaiku',  label: t('palette.actions.switchModelFast'),     keywords: ['haiku'],  onRun: () => { setModel('claude-haiku-4-5'); } },
  ];

  return (
    <div
      className={`absolute inset-0 flex font-sans ${surface}`}
      data-coding-stage
      data-coding-density={density}
      data-coding-contrast={highContrast ? 'high' : 'normal'}
    >
      <a href="#coding-composer" className="coding-skip-link">
        {t('a11y.skipToComposer')}
      </a>
      <TaskRail
        projects={projects}
        tasks={tasks}
        activeId={activeId}
        onSelect={setActiveId}
        onNewTask={startNewTask}
        onNewProject={startNewProject}
        isDark={isDark}
        t={t}
        width={284}
        onWidthChange={() => { /* width control wiring pending */ }}
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
        onSaveProjectDefaultModel={() => { saveProjectDefaultModel(active.projectId, model); }}
        promptHistory={promptHistory[active.id] ?? []}
        visibleThread={visibleThread}
        scrubHead={scrubHead}
        onScrub={setScrubHead}
        isScrubbed={isScrubbed}
        onApplyInverse={(turnId) => { applyInverseOf(active.id, turnId); }}
        onFork={(turnId) => { forkFrom(active.id, turnId); }}
        onReact={(turnId, kind) => { toggleReaction(active.id, turnId, kind); }}
        onOpenTurnMenu={(x, y, turn) => { setTurnMenu({ x, y, turn }); }}
        cost={cost}
      />

      <ContextRail
        task={active}
        project={activeProject}
        isDark={isDark}
        t={t}
        density={density}
        onDensityChange={setDensity}
        highContrast={highContrast}
        onHighContrastChange={setHighContrast}
        sideBySideModel={sideBySideModel}
        onSideBySideModelChange={setSideBySideModel}
        primaryModel={model}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => { setPaletteOpen(false); }}
        actions={paletteActionList}
        tasks={tasks}
        onJumpTask={(id) => { setActiveId(id); }}
        onInsertSlash={(cmd) => { setDraft(`${cmd} `); }}
        isDark={isDark}
        t={t}
      />

      {budgetChallenge && (
        <BudgetSoftCapModal
          used={budgetChallenge.used}
          cap={budgetChallenge.cap}
          primary={budgetChallenge.primary}
          downgrade={budgetChallenge.downgrade}
          isDark={isDark}
          t={t}
          onAutoDowngrade={() => {
            setModel(budgetChallenge.downgrade);
            setBudgetChallenge(null);
            // Defer one frame so the model state lands before the
            // synthetic stream picks it up.
            requestAnimationFrame(() => { onSubmitComposer(); });
          }}
          onOverride={() => {
            setSoftCapOverridden((cur) => ({ ...cur, [active.id]: true }));
            setBudgetChallenge(null);
            requestAnimationFrame(() => { onSubmitComposer(); });
          }}
          onStop={() => { setBudgetChallenge(null); }}
        />
      )}
      {turnMenu && (
        <TurnContextMenu
          x={turnMenu.x}
          y={turnMenu.y}
          isDark={isDark}
          onClose={() => { setTurnMenu(null); }}
          items={buildTurnMenuItems(turnMenu.turn, t, {
            onCopy: (text) => { void navigator.clipboard?.writeText(text); },
            onOpenInNew: (text) => { startNewTask(active.projectId); setDraft(text); },
          })}
        />
      )}
    </div>
  );
}

// ─── Palette + turn-menu helpers ─────────────────────────────────────────

function buildTurnMenuItems(
  turn: Turn,
  t: (k: string) => string,
  cb: { onCopy: (text: string) => void; onOpenInNew: (text: string) => void },
): TurnContextMenuItem[] {
  const plain = turnToPlainText(turn);
  const prDesc = turnToPrDescription(turn);
  return [
    { id: 'copy',      label: t('turnMenu.copy'),          onSelect: () => { cb.onCopy(plain); } },
    { id: 'copyMd',    label: t('turnMenu.copyMd'),        onSelect: () => { cb.onCopy(plain); } },
    { id: 'share',     label: t('turnMenu.share'),         onSelect: () => { cb.onCopy(plain); } },
    { id: 'export',    label: t('turnMenu.export'),        onSelect: () => { cb.onCopy(plain); } },
    { id: 'exportPr',  label: t('exportPr.label'),         onSelect: () => { cb.onCopy(prDesc); } },
    { id: 'openInNew', label: t('turnMenu.openInNewTask'), onSelect: () => { cb.onOpenInNew(plain); } },
  ];
}

// Format a turn as a GitHub-style PR description. Pulls plan items into
// a "Changes" checklist, lists touched files under "Files", and prepends
// the user's request as the "Why" section. Real impl would also append
// CI status + reviewer mentions; this stays self-contained for the demo.
function turnToPrDescription(turn: Turn): string {
  if (turn.role === 'user') return `## Why

${turn.text}`;
  const lines: string[] = [];
  // Plan → checklist
  for (const block of turn.blocks) {
    if (block.kind === 'plan') {
      lines.push(`## ${block.title}`);
      lines.push('');
      for (const it of block.items) {
        lines.push(`- [${it.done ? 'x' : ' '}] ${it.text}`);
      }
      lines.push('');
    }
  }
  // Touched files
  const files = new Set<string>();
  for (const block of turn.blocks) {
    if (block.kind === 'tool' && (block.tool === 'edit' || block.tool === 'read')) files.add(block.label);
    if (block.kind === 'diff') for (const f of block.files) files.add(f.path);
  }
  if (files.size > 0) {
    lines.push('## Files');
    lines.push('');
    for (const f of files) lines.push(`- \`${f}\``);
    lines.push('');
  }
  // Diff summary
  for (const block of turn.blocks) {
    if (block.kind === 'diff') {
      lines.push('## Diff');
      lines.push('');
      lines.push(`\`+${block.added}\` / \`-${block.removed}\` across ${block.files.length} files.`);
      lines.push('');
    }
  }
  // Closing prose
  for (const block of turn.blocks) {
    if (block.kind === 'text') {
      lines.push(block.text);
      lines.push('');
    }
  }
  // Footer
  lines.push('---');
  if (turn.model) lines.push(`_Generated by ${turn.model}_`);
  if (turn.elapsed) lines.push(`_Took ${turn.elapsed}._`);
  return lines.join('\n');
}

function turnToPlainText(turn: Turn): string {
  if (turn.role === 'user') return turn.text;
  return turn.blocks.map((b) => {
    if (b.kind === 'text' || b.kind === 'thinking') return b.text;
    if (b.kind === 'plan') return `${b.title}\n${b.items.map((it, i) => `${i + 1}. ${it.text}`).join('\n')}`;
    if (b.kind === 'tool') return `[${b.tool}] ${b.label}${b.detail ? ` — ${b.detail}` : ''}`;
    if (b.kind === 'diff') return `[diff] +${b.added}/-${b.removed} across ${b.files.length} files`;
    if (b.kind === 'diff-preview') return `[preview] ${b.ref} ← ${b.base}\n${b.summary}`;
    return '';
  }).filter(Boolean).join('\n\n');
}

// Anthropic 2026 list prices (USD per 1M tokens). Used by the cost
// meter / projection. Update here when pricing changes.
const MODEL_PRICING: Record<string, { in: number; out: number }> = {
  'claude-opus-4-7':   { in: 15.00, out: 75.00 },
  'claude-sonnet-4-6': { in:  3.00, out: 15.00 },
  'claude-haiku-4-5':  { in:  0.80, out:  4.00 },
};

function isModelId(raw: unknown): raw is ComposerModelId {
  return raw === 'claude-opus-4-7' || raw === 'claude-sonnet-4-6' || raw === 'claude-haiku-4-5';
}

// ─── Center pane ──────────────────────────────────────────────────────────

function ThreadPane({
  task, project, isDark, draft, onDraftChange, onSubmit, onStop, intent, onIntent, isStreaming, t,
  model, onModelChange, onSaveProjectDefaultModel, promptHistory,
  visibleThread, scrubHead, onScrub, isScrubbed,
  onApplyInverse, onFork, onReact, onOpenTurnMenu,
  cost,
}: {
  task: Task;
  project: Project;
  isDark: boolean;
  draft: string;
  onDraftChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  intent: 'code' | 'ask';
  onIntent: (v: 'code' | 'ask') => void;
  isStreaming: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
  model: ComposerModelId;
  onModelChange: (id: ComposerModelId) => void;
  onSaveProjectDefaultModel: () => void;
  promptHistory: string[];
  visibleThread: Turn[];
  scrubHead: number | null;
  onScrub: (idx: number | null) => void;
  isScrubbed: boolean;
  onApplyInverse: (turnId: string) => void;
  onFork: (turnId: string) => void;
  onReact: (turnId: string, kind: ReactionKind) => void;
  onOpenTurnMenu: (x: number, y: number, turn: Turn) => void;
  cost: { inTok: number; outTok: number; usd: number; avgUsd: number };
}) {
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const textPrimary = isDark ? 'text-white/85' : 'text-black/85';
  const textMuted = isDark ? 'text-white/40' : 'text-black/55';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';

  const scrollRef = useRef<HTMLDivElement>(null);
  // Auto-scroll to bottom when thread grows. Honest tradeoff: scrolling up
  // mid-stream still snaps you back; that's fine for the demo but a real
  // app would track "user scrolled away" and pause.
  // Track the deepest tail block count so streaming pushes us to the bottom too.
  const tailLen = task.thread[task.thread.length - 1]?.role === 'agent'
    ? (task.thread[task.thread.length - 1] as AgentTurn).blocks.length
    : 0;
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [task.id, task.thread.length, tailLen]);

  // Baseline phase-duration averages across the *task* — used by each
  // turn's LatencyBar to surface a "vs baseline" delta. Excludes the
  // current turn from its own baseline (otherwise it always reports 1×).
  const baselinePhaseDurations = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    for (const tn of task.thread) {
      if (tn.role !== 'agent' || tn.phaseDurationsMs == null) continue;
      for (const [phase, ms] of Object.entries(tn.phaseDurationsMs)) {
        if (ms == null || ms <= 0) continue;
        sums[phase] = sums[phase] ?? { total: 0, count: 0 };
        sums[phase].total += ms;
        sums[phase].count += 1;
      }
    }
    const avg: Record<string, number> = {};
    for (const [phase, { total, count }] of Object.entries(sums)) {
      if (count > 0) avg[phase] = total / count;
    }
    return avg;
  }, [task.thread]);

  return (
    <section className="flex-1 min-w-0 flex flex-col">
      {/* Header */}
      <div className={`shrink-0 h-12 flex items-center justify-between px-5 border-b ${border}`}>
        <div className="flex items-center gap-2 min-w-0">
          <ProjectChip project={project} isDark={isDark} />
          <span className={textFaint}>/</span>
          <StatusBadge status={task.status} isDark={isDark} />
          <span className={`text-[13px] font-semibold truncate ${textPrimary}`}>
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {(cost.inTok + cost.outTok > 0) && (() => {
            const budget = project.budget;
            let tone = textMuted;
            let badge: string | null = null;
            // 3-tier budget — pattern from AWS Budget. hard > soft > alert.
            // Heart-rate pulse animation only on alert/hardCap so the
            // viewer's attention is drawn without strobing.
            let pulseClass = '';
            if (budget?.hardCapUsd != null && cost.usd >= budget.hardCapUsd) {
              tone = isDark ? 'text-rose-300' : 'text-rose-700';
              badge = t('budgetV2.tier.hardCap');
              pulseClass = 'coding-cost-hard';
            } else if (budget?.softCapUsd != null && cost.usd >= budget.softCapUsd) {
              tone = isDark ? 'text-rose-300' : 'text-rose-700';
              badge = t('budgetV2.tier.softCap');
              pulseClass = 'coding-cost-hard';
            } else if (budget?.alertUsd != null && cost.usd >= budget.alertUsd) {
              tone = isDark ? 'text-amber-300' : 'text-amber-700';
              badge = t('budgetV2.tier.alert');
              pulseClass = 'coding-cost-alert';
            }
            return (
              <span
                className={`flex items-center gap-1.5 text-[11px] font-mono ${tone} ${pulseClass} px-1.5 py-0.5`}
                title={t('cost.tooltip')}
              >
                <Coins className="w-3 h-3" />
                <span className="tabular-nums">{formatNumber(cost.inTok + cost.outTok)}</span>
                <span className={textFaint}>{t('cost.tokensShort')}</span>
                <span className={textFaint}>·</span>
                <span className="tabular-nums">
                  {t('cost.estimate')} ${cost.usd.toFixed(cost.usd < 0.01 ? 4 : cost.usd < 1 ? 3 : 2)}
                </span>
                {badge != null && (
                  <span className={`px-1 py-px rounded-sm text-[9px] font-bold uppercase tracking-[0.16em] border ${
                    badge === t('budget.exceeded')
                      ? (isDark ? 'border-rose-400/40 bg-rose-400/10' : 'border-rose-500/40 bg-rose-50')
                      : (isDark ? 'border-amber-400/40 bg-amber-400/10' : 'border-amber-500/40 bg-amber-50')
                  }`}>{badge}</span>
                )}
                {cost.avgUsd > 0 && (
                  <span className={`${textFaint} tabular-nums`}>· {t('projection.label')} ${cost.avgUsd.toFixed(3)}</span>
                )}
                {/* Forecast — only meaningful while streaming. Adds the
                    expected cost-to-completion of the in-flight turn so
                    the user can decide *now* whether to stop before
                    spending the rest. SRE error-budget pattern. */}
                {isStreaming && cost.avgUsd > 0 && (
                  <span
                    className={`${textFaint} tabular-nums`}
                    title={t('forecast.tooltip')}
                  >
                    · {t('forecast.remaining', { usd: cost.avgUsd.toFixed(3) })}
                  </span>
                )}
              </span>
            );
          })()}
          {(cost.inTok + cost.outTok > 0) && <span className={textFaint}>·</span>}
          <span className={`flex items-center gap-1 text-[11px] font-mono ${textMuted}`}>
            <GitBranch className="w-3 h-3" />
            {task.branch}
            <span className={textFaint}>← {task.baseBranch}</span>
          </span>
          <span className={textFaint}>·</span>
          <button type="button" className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
            isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.05]' : 'text-black/55 hover:text-black hover:bg-black/[0.05]'
          }`}>
            <GitPullRequest className="w-3 h-3" />
            {t('header.openPr')}
          </button>
          <button
            type="button"
            aria-label="More options"
            className={`p-1 rounded-md transition-colors ${
              isDark ? 'text-white/40 hover:text-white/85 hover:bg-white/[0.05]' : 'text-black/40 hover:text-black/85 hover:bg-black/[0.05]'
            }`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Streaming progress strip */}
      {isStreaming && (
        <div className="shrink-0 h-0.5 overflow-hidden relative">
          <div className={`absolute inset-0 coding-shimmer bg-gradient-to-r from-transparent ${
            isDark ? 'via-white/40' : 'via-black/35'
          } to-transparent`} />
        </div>
      )}

      {/* Thread or empty state */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        {task.thread.length === 0 ? (
          <EmptyState project={project} isDark={isDark} t={t} />
        ) : (
          <div className="max-w-[760px] mx-auto px-6 py-6 space-y-6">
            {visibleThread.map((turn) => (
              <TurnView
                key={turn.id}
                turn={turn}
                isDark={isDark}
                t={t}
                onApplyInverse={() => { onApplyInverse(turn.id); }}
                onFork={() => { onFork(turn.id); }}
                onReact={(kind) => { onReact(turn.id, kind); }}
                onContextMenu={(x, y) => { onOpenTurnMenu(x, y, turn); }}
                baselinePhaseDurationsMs={baselinePhaseDurations}
              />
            ))}
            {!isStreaming && !isScrubbed && task.thread[task.thread.length - 1]?.role === 'agent' && (
              <LiveSnapshotCard
                task={task}
                isDark={isDark}
                t={t}
                onContinue={() => { onDraftChange(t('snapshot.continue') + ': '); }}
              />
            )}
          </div>
        )}
      </div>

      {/* Time-travel scrubber — non-destructive preview. Inverse-op
          recovery is handled by the per-turn anchor; the scrubber here
          stays a pure preview tool to keep the model coherent. */}
      {task.thread.length >= 2 && (
        <div className="shrink-0">
          <TimelineScrubber
            turns={task.thread}
            headIdx={scrubHead}
            onScrub={onScrub}
            isDark={isDark}
            t={t}
            onApplyInverse={(targetIdx) => {
              const turn = task.thread[targetIdx];
              if (turn != null) onApplyInverse(turn.id);
              onScrub(null);
            }}
          />
        </div>
      )}

      {/* Composer */}
      <div
        id="coding-composer"
        className={`shrink-0 border-t ${border} ${isDark ? 'bg-[#0b0d10]/85' : 'bg-white/70'} backdrop-blur ${
          isScrubbed ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <div className="max-w-[760px] mx-auto px-6 py-4">
          <Composer
            draft={draft}
            onChange={onDraftChange}
            onSubmit={onSubmit}
            onStop={onStop}
            intent={intent}
            onIntent={onIntent}
            isDark={isDark}
            t={t}
            isStreaming={isStreaming}
            branch={task.branch}
            baseBranch={task.baseBranch}
            model={model}
            onModelChange={onModelChange}
            onSaveProjectDefaultModel={onSaveProjectDefaultModel}
            history={promptHistory}
          />
        </div>
      </div>
    </section>
  );
}

function ProjectChip({ project, isDark }: { project: Project; isDark: boolean }) {
  const accent = ACCENT_HEX[project.accent];
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-md font-mono text-[9px] font-bold"
        style={{
          background: `${accent}20`,
          color: accent,
          boxShadow: `inset 0 0 0 1px ${accent}38`,
        }}
      >
        {project.initial}
      </span>
      <span className={`text-[12px] font-semibold ${isDark ? 'text-white/70' : 'text-black/70'}`}>
        {project.name}
      </span>
    </div>
  );
}

// Tone down: every project resolves to the same neutral grey. ProjectChip
// and EmptyState used to bloom in the project's accent — now they all read
// as plain monochrome chrome.
const ACCENT_HEX = {
  emerald: '#a1a1aa',
  sky:     '#a1a1aa',
  violet:  '#a1a1aa',
  amber:   '#a1a1aa',
  rose:    '#a1a1aa',
  cyan:    '#a1a1aa',
};

function StatusBadge({ status, isDark }: { status: Task['status']; isDark: boolean }) {
  const label = status;
  const tone = isDark
    ? 'text-white/70 bg-white/[0.06] border-white/[0.10]'
    : 'text-black/65 bg-black/[0.05] border-black/[0.10]';
  const dot = `${isDark ? 'bg-white/55' : 'bg-black/50'}${status === 'running' ? ' animate-pulse' : ''}`;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[10px] font-bold uppercase tracking-[0.18em] border ${tone}`}>
      <span className={`w-1 h-1 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function EmptyState({ project, isDark, t }: { project: Project; isDark: boolean; t: (k: string) => string }) {
  const accent = ACCENT_HEX[project.accent];
  const textPrimary = isDark ? 'text-white/85' : 'text-black/85';
  const textMuted = isDark ? 'text-white/40' : 'text-black/55';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';
  const card = isDark
    ? 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.06] hover:border-white/[0.12]'
    : 'bg-black/[0.015] hover:bg-black/[0.03] border-black/[0.06] hover:border-black/[0.14]';

  const presets = [
    { key: 'fixFlaky',  icon: Activity },
    { key: 'addTests',  icon: CheckCircle2 },
    { key: 'refactor',  icon: Sparkles },
    { key: 'review',    icon: GitPullRequest },
  ] as const;

  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <div className="max-w-[600px] w-full text-center">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
          style={{
            background: `${accent}1f`,
            boxShadow: `inset 0 0 0 1px ${accent}33, 0 8px 32px -8px ${accent}55`,
          }}
        >
          <span className="font-mono text-[18px] font-bold" style={{ color: accent }}>
            {project.initial}
          </span>
        </div>
        <h2 className={`text-[15px] font-semibold mb-1 ${textPrimary}`}>
          {t('empty.title')}
        </h2>
        <p className={`text-[12px] ${textMuted} mb-2`}>
          {t('empty.subtitle')}
        </p>
        <p className={`text-[11px] font-mono ${textFaint} mb-8`}>
          {project.slug}
        </p>

        <div className="grid grid-cols-2 gap-2 text-left">
          {presets.map(({ key, icon: Icon }) => (
            <button type="button"
              key={key}
              className={`rounded-lg border ${card} px-3 py-2.5 transition-all duration-150`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3.5 h-3.5 ${textFaint}`} />
                <span className={`text-[12px] font-semibold ${textPrimary}`}>
                  {t(`suggestion.${key}.title`)}
                </span>
              </div>
              <div className={`text-[11px] leading-relaxed ${textMuted} line-clamp-2`}>
                {t(`suggestion.${key}.body`)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Turns ────────────────────────────────────────────────────────────────

function TurnView({
  turn, isDark, t, onApplyInverse, onFork, onReact, onContextMenu, baselinePhaseDurationsMs,
}: {
  turn: Turn;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
  onApplyInverse: () => void;
  onFork: () => void;
  onReact: (kind: ReactionKind) => void;
  onContextMenu: (x: number, y: number) => void;
  baselinePhaseDurationsMs?: Record<string, number>;
}) {
  function onCtx(e: React.MouseEvent) {
    e.preventDefault();
    onContextMenu(e.clientX, e.clientY);
  }
  if (turn.role === 'user') {
    return <div onContextMenu={onCtx}><UserTurnView turn={turn} isDark={isDark} /></div>;
  }
  return (
    <div onContextMenu={onCtx}>
      <AgentTurnView
        turn={turn}
        isDark={isDark}
        t={t}
        onApplyInverse={onApplyInverse}
        onFork={onFork}
        onReact={onReact}
        baselinePhaseDurationsMs={baselinePhaseDurationsMs}
      />
    </div>
  );
}

// Kept for reference — legacy turn dispatcher; the new TurnView wires
// in t/onApplyInverse/onFork/onReact.
export function _LegacyTurnView(_props: { turn: Turn; isDark: boolean }) {
  return null;
}

function UserTurnView({ turn, isDark }: { turn: UserTurn; isDark: boolean }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%]">
        <div className={`px-3 py-2.5 rounded-2xl rounded-tr-sm text-[13px] leading-relaxed ${
          isDark ? 'bg-white/[0.07] text-white/85' : 'bg-black/[0.06] text-black/85'
        }`}>
          <div className="whitespace-pre-wrap break-words">{turn.text}</div>
          {turn.mentions && turn.mentions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {turn.mentions.map((m, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[10px] ${
                    isDark ? 'bg-white/[0.08] text-white/70' : 'bg-black/[0.06] text-black/70'
                  }`}
                >
                  <span className={isDark ? 'text-white/40' : 'text-black/40'}>
                    {m.kind === 'file' ? '#' : '@'}
                  </span>
                  {m.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className={`mt-1 text-right text-[10px] font-mono ${isDark ? 'text-white/30' : 'text-black/40'}`}>
          {turn.at}
        </div>
      </div>
    </div>
  );
}

function AgentTurnView({
  turn, isDark, t, onApplyInverse, onFork, onReact, baselinePhaseDurationsMs,
}: {
  turn: AgentTurn;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
  onApplyInverse: () => void;
  onFork: () => void;
  onReact: (kind: ReactionKind) => void;
  baselinePhaseDurationsMs?: Record<string, number>;
}) {
  const muted = isDark ? 'text-white/40' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  const modelLabel = turn.model
    ? turn.model.replace(/^claude-/, '').replace(/-(\d)/, ' $1').replace(/-/g, '.')
    : null;
  const phaseLabel = turn.phase ? t(`phase.${turn.phase}`) : null;
  return (
    <div className="flex gap-3 relative group/turn">
      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
        isDark ? 'bg-gradient-to-br from-white/[0.10] to-white/[0.04] border border-white/[0.10]' : 'bg-gradient-to-br from-black/[0.06] to-black/[0.02] border border-black/[0.08]'
      }`}>
        <Sparkles className={`w-3 h-3 ${isDark ? 'text-white/70' : 'text-black/70'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`text-[11px] font-semibold ${isDark ? 'text-white/85' : 'text-black/85'}`}>
            agent
          </span>
          <span className={`text-[10px] font-mono ${faint}`}>{turn.at}</span>
          {modelLabel && (
            <span
              className={`flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono ${
                isDark ? 'bg-white/[0.04] text-white/55' : 'bg-black/[0.04] text-black/55'
              }`}
              title={turn.model}
            >
              <Cpu className="w-2.5 h-2.5" />
              {modelLabel}
            </span>
          )}
          {/* Self-eval confidence chip — Anthropic-style calibration
              probability. ≥85% = high (subtle emerald), 60–85% = mid
              (neutral), <60% = low (amber, "review me"). */}
          {turn.confidence != null && (() => {
            const pct = Math.round(turn.confidence * 100);
            const tone = pct >= 85
              ? (isDark ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30' : 'bg-emerald-50 text-emerald-700 border-emerald-500/30')
              : pct >= 60
                ? (isDark ? 'bg-white/[0.04] text-white/55 border-white/[0.10]' : 'bg-black/[0.04] text-black/55 border-black/[0.10]')
                : (isDark ? 'bg-amber-400/10 text-amber-300 border-amber-400/30' : 'bg-amber-50 text-amber-700 border-amber-500/30');
            const label = pct >= 85 ? t('selfEval.high', { pct })
              : pct >= 60 ? t('selfEval.mid', { pct })
              : t('selfEval.low', { pct });
            return (
              <span
                className={`flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono border ${tone}`}
                title={turn.confidenceRationale ?? t('selfEval.tooltip')}
              >
                <Target className="w-2.5 h-2.5" />
                {label}
              </span>
            );
          })()}
          {turn.streaming && (
            <span className={`flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-mono ${
              isDark ? 'bg-white/[0.06] text-white/70' : 'bg-black/[0.05] text-black/65'
            }`}>
              <span className={`w-1 h-1 rounded-full coding-tps-live ${
                isDark ? 'bg-white/60' : 'bg-black/55'
              }`} />
              {phaseLabel ?? 'streaming'}
            </span>
          )}
          {turn.streaming && <TpsLiveMeter turn={turn} isDark={isDark} t={t} />}
          {/* Inverse-op anchor pointer. When this turn is the inverse
              of an earlier turn, surface a small chip linking back. */}
          {turn.inverseOf && (
            <span
              className={`flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono ${
                isDark ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                       : 'bg-amber-50 text-amber-700 border border-amber-500/30'
              }`}
              title={t('inverse.anchor')}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              {t('inverse.anchor')}
            </span>
          )}
          {!turn.streaming && turn.tokens && (
            <span className={`flex items-center gap-2 ml-auto text-[10px] font-mono ${muted}`}>
              <span className="flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" />
                {formatNumber(turn.tokens.in)} in · {formatNumber(turn.tokens.out)} out
              </span>
              {turn.elapsed && (
                <span className="flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />
                  {turn.elapsed}
                </span>
              )}
            </span>
          )}
        </div>
        {/* Latency profile bar — shown post-streaming when the turn has
            phase-duration data. Stacks per-phase widths into a single
            row so the user can see *where* the time went. */}
        {!turn.streaming && turn.phaseDurationsMs != null && (
          <LatencyBar
            durations={turn.phaseDurationsMs}
            baseline={baselinePhaseDurationsMs}
            isDark={isDark}
            t={t}
          />
        )}
        {turn.citations && turn.citations.length > 0 && (
          <CitationStrip citations={turn.citations} isDark={isDark} t={t} />
        )}
        <div className="space-y-2">
          {turn.blocks.map((block, i) => (
            <BlockView key={i} block={block} isDark={isDark} />
          ))}
          {turn.streaming && turn.blocks.length === 0 && <StreamingDots isDark={isDark} />}
        </div>
        {!turn.streaming && turn.blocks.length > 0 && (
          <ReactionBar reactions={turn.reactions} onReact={onReact} isDark={isDark} t={t} />
        )}
      </div>
      {/* Hover anchor: inverse-op (recovery-engine, never destructive) +
          fork. Composer-style floating button group; no left stripe per
          design rule. */}
      {!turn.streaming && (
        <div className="absolute top-0 right-0 opacity-0 group-hover/turn:opacity-100 transition-opacity pointer-events-none group-hover/turn:pointer-events-auto">
          <div className={`flex items-center gap-px rounded-md border shadow-lg ${
            isDark ? 'bg-[#11141a] border-white/[0.10]' : 'bg-white border-black/[0.10]'
          }`}>
            <button
              type="button"
              onClick={onApplyInverse}
              title={`${t('applyV2.inverse')} · ${t('applyV2.inverseTooltip')}`}
              aria-label={t('applyV2.inverse')}
              className={`p-1.5 rounded-l-md transition-colors ${
                isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.06]' : 'text-black/55 hover:text-black hover:bg-black/[0.05]'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onFork}
              title={t('checkpoint.forkFromHere')}
              aria-label={t('checkpoint.forkFromHere')}
              className={`p-1.5 rounded-r-md transition-colors ${
                isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.06]' : 'text-black/55 hover:text-black hover:bg-black/[0.05]'
              }`}
            >
              <GitFork className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// TPS (tokens-per-second) live meter — only renders during streaming.
// Estimates t/s from blocks-emitted-so-far × ~tokens-per-block, ticking
// once a second so the number isn't a wild flutter. Real impl would
// receive token counts from the streaming SSE; the demo derives them
// from block density which tracks the same shape.
function TpsLiveMeter({
  turn, isDark, t,
}: {
  turn: AgentTurn;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  // Both startedAt + now live in state so render reads ordinary state,
  // not a ref. setNow inside useEffect is mirroring the wall clock —
  // legitimate effect work, suppressed locally.
  const [startedAt, setStartedAt] = useState<number>(0);
  const [now, setNow] = useState<number>(0);
  /* eslint-disable react-hooks/set-state-in-effect --
   * Mirroring the wall clock into render state is the documented
   * pattern for live ticking displays. */
  useEffect(() => {
    setStartedAt(Date.now());
    setNow(Date.now());
    const id = window.setInterval(() => { setNow(Date.now()); }, 900);
    return () => { window.clearInterval(id); };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  // Blocks accumulate at ~one per 500–900ms (synthetic delay). Each
  // block carries a hand-tuned token estimate matching the on-finish
  // turn.tokens.out. We sum the estimates and divide by elapsed.
  const elapsedMs = Math.max(1, now - startedAt);
  const tokensSoFar = turn.blocks.reduce((sum, b) => {
    if (b.kind === 'thinking') return sum + 240;
    if (b.kind === 'plan')     return sum + 180;
    if (b.kind === 'diff')     return sum + 320;
    if (b.kind === 'text')     return sum + 110;
    if (b.kind === 'tool')     return sum + 45;
    return sum + 60;
  }, 0);
  const tps = Math.max(0, Math.round((tokensSoFar / elapsedMs) * 1000));
  return (
    <span
      className={`flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono tabular-nums ${
        isDark ? 'bg-white/[0.04] text-white/70' : 'bg-black/[0.04] text-black/65'
      }`}
      title={t('tps.tooltip')}
    >
      <Zap className="w-2.5 h-2.5 coding-tps-live" />
      {tps}
      <span className="opacity-60">{t('tps.label')}</span>
    </span>
  );
}

// Latency profile — tiny stacked bar showing where the turn spent its
// wall-clock time. Phases with under 5% of total are merged into a
// trailing "other" segment so the bar doesn't shatter into slivers.
const LATENCY_PHASE_TONE: Record<string, { d: string; l: string }> = {
  thinking:  { d: 'rgba(167,139,250,0.85)', l: 'rgba(124,58,237,0.85)' }, // violet
  reading:   { d: 'rgba(125,211,252,0.85)', l: 'rgba(2,132,199,0.85)'  }, // sky
  searching: { d: 'rgba(196,181,253,0.85)', l: 'rgba(139,92,246,0.85)' }, // light violet
  editing:   { d: 'rgba(110,231,183,0.85)', l: 'rgba(5,150,105,0.85)'  }, // emerald
  running:   { d: 'rgba(252,211,77,0.85)',  l: 'rgba(217,119,6,0.85)'  }, // amber
  planning:  { d: 'rgba(249,168,212,0.85)', l: 'rgba(190,24,93,0.85)'  }, // pink
  writing:   { d: 'rgba(186,230,253,0.85)', l: 'rgba(8,145,178,0.85)'  }, // cyan
};

function LatencyBar({
  durations, baseline, isDark, t,
}: {
  durations: NonNullable<AgentTurn['phaseDurationsMs']>;
  baseline?: Record<string, number>;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const entries = Object.entries(durations).filter((e): e is [string, number] => e[1] != null && e[1] > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, ms]) => s + ms, 0);
  // Baseline comparison: sum the *expected* total under baseline
  // averages (only counting phases that appear in this turn) and
  // compute the multiplier. Threshold ±15% to call it "match", ±50% to
  // call it noteworthy. This mirrors the latency-budget convention in
  // the SRE handbook (small fluctuations don't deserve attention; >50%
  // does). Below 50% / above 150% gets coloured.
  const muted = isDark ? 'text-white/40' : 'text-black/45';
  let baselineChip: React.ReactNode = null;
  if (baseline != null) {
    let baseTotal = 0;
    let cmpTotal = 0;
    for (const [phase, ms] of entries) {
      const b = baseline[phase];
      if (b != null && b > 0) {
        baseTotal += b;
        cmpTotal += ms;
      }
    }
    if (baseTotal > 0 && cmpTotal > 0) {
      const ratio = cmpTotal / baseTotal;
      const isMatch = ratio >= 0.85 && ratio <= 1.15;
      const tone = isMatch
        ? muted
        : ratio < 1
          ? (isDark ? 'text-emerald-300' : 'text-emerald-700')
          : (isDark ? 'text-amber-300' : 'text-amber-700');
      const x = (ratio < 1 ? 1 / ratio : ratio).toFixed(1);
      const label = isMatch
        ? t('latencyBaseline.match')
        : ratio < 1 ? t('latencyBaseline.faster', { x }) : t('latencyBaseline.slower', { x });
      baselineChip = (
        <span
          className={`shrink-0 text-[9px] font-mono tabular-nums ${tone}`}
          title={t('latencyBaseline.tooltip')}
        >
          {label}
        </span>
      );
    }
  }
  return (
    <div
      className="mt-1.5 flex items-center gap-2"
      title={t('latency.tooltip')}
      aria-label={t('latency.label')}
    >
      <div className="flex-1 coding-latency-bar">
        {entries.map(([phase, ms]) => {
          const pct = (ms / total) * 100;
          const tone = LATENCY_PHASE_TONE[phase] ?? { d: 'rgba(255,255,255,0.5)', l: 'rgba(0,0,0,0.5)' };
          return (
            <span
              key={phase}
              style={{ width: `${pct}%`, background: isDark ? tone.d : tone.l }}
              title={`${t(`phase.${phase}`)} · ${ms}ms (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <span className={`shrink-0 text-[9px] font-mono tabular-nums ${muted}`}>
        {t('latency.totalLabel', { ms: total })}
      </span>
      {baselineChip}
    </div>
  );
}

// Citation strip with stale detection (annotated upstream).
function CitationStrip({
  citations, isDark, t,
}: {
  citations: NonNullable<AgentTurn['citations']>;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? citations : citations.slice(0, 3);
  const overflow = citations.length - visible.length;
  const muted = isDark ? 'text-white/40' : 'text-black/45';
  const chip = isDark ? 'bg-white/[0.04] text-white/70' : 'bg-black/[0.04] text-black/70';
  return (
    <div className="mb-2 flex items-center gap-1.5 flex-wrap">
      <span className={`text-[9px] font-bold uppercase tracking-[0.18em] ${muted}`}>
        {t('citations.label')}
      </span>
      {visible.map((c, i) => {
        const basename = c.path.split('/').pop() ?? c.path;
        const range = c.lines
          ? t('citations.lines', { start: c.lines[0], end: c.lines[1] })
          : t('citations.noLines');
        const isStale = c.staleAfterTurn != null;
        const fullTitle = [
          c.path,
          c.lines ? `L${c.lines[0]}-${c.lines[1]}` : null,
          c.note,
          isStale ? t('citationStale.tooltip') : null,
        ].filter(Boolean).join(' · ');
        const staleChipTone = isDark
          ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
          : 'border-amber-500/40 bg-amber-50 text-amber-700';
        return (
          <span
            key={`${c.path}:${i}`}
            title={fullTitle}
            className={`inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[10px] font-mono cursor-help ${chip} ${
              isStale ? 'opacity-75' : ''
            }`}
          >
            <FileCode className="w-2.5 h-2.5 opacity-70" />
            <span className={isStale ? 'line-through opacity-80' : ''}>{basename}</span>
            <span className="opacity-60">·</span>
            <span className="opacity-70">{range}</span>
            {isStale && (
              <span className={`ml-0.5 px-1 rounded-sm text-[8.5px] font-bold uppercase tracking-[0.16em] border ${staleChipTone}`}>
                {t('citationStale.label')}
              </span>
            )}
          </span>
        );
      })}
      {overflow > 0 && !expanded && (
        <button
          type="button"
          onClick={() => { setExpanded(true); }}
          className={`text-[10px] font-mono underline ${muted}`}
        >
          {t('citations.more', { count: overflow })}
        </button>
      )}
    </div>
  );
}

// 4-kind reaction bar — emoji-free (lucide icons only). Active state
// uses subtle tint, never a vivid fill.
function ReactionBar({
  reactions, onReact, isDark, t,
}: {
  reactions: AgentTurn['reactions'];
  onReact: (kind: ReactionKind) => void;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const items: { kind: ReactionKind; Icon: React.ComponentType<{ className?: string; fill?: string }>; tone: string }[] = [
    { kind: 'thumbsUp',   Icon: ThumbsUp,   tone: isDark ? 'text-emerald-300 bg-emerald-400/15' : 'text-emerald-700 bg-emerald-100' },
    { kind: 'thumbsDown', Icon: ThumbsDown, tone: isDark ? 'text-rose-300 bg-rose-400/15'       : 'text-rose-700 bg-rose-100' },
    { kind: 'heart',      Icon: Heart,      tone: isDark ? 'text-pink-300 bg-pink-400/15'       : 'text-pink-700 bg-pink-100' },
    { kind: 'target',     Icon: Target,     tone: isDark ? 'text-amber-300 bg-amber-400/15'     : 'text-amber-700 bg-amber-100' },
  ];
  const idle = isDark ? 'text-white/30 hover:text-white/70 hover:bg-white/[0.05]' : 'text-black/30 hover:text-black/70 hover:bg-black/[0.04]';
  return (
    <div className="mt-2 flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
      {items.map(({ kind, Icon, tone }) => {
        const active = reactions?.[kind];
        return (
          <button
            key={kind}
            type="button"
            onClick={() => { onReact(kind); }}
            title={t(`reactions.${kind}`)}
            aria-label={t(`reactions.${kind}`)}
            aria-pressed={!!active}
            className={`p-1 rounded transition-colors ${active ? tone : idle}`}
          >
            <Icon className="w-3 h-3" fill={active ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
}

function StreamingDots({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white/40' : 'bg-black/35'} animate-pulse`}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

// ─── Right rail ───────────────────────────────────────────────────────────

function ContextRail({
  task, project, isDark, t,
  density, onDensityChange, highContrast, onHighContrastChange,
  sideBySideModel, onSideBySideModelChange, primaryModel,
}: {
  task: Task;
  project: Project;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
  density: 'compact' | 'comfortable' | 'spacious';
  onDensityChange: (d: 'compact' | 'comfortable' | 'spacious') => void;
  highContrast: boolean;
  onHighContrastChange: (v: boolean) => void;
  sideBySideModel: ComposerModelId | null;
  onSideBySideModelChange: (id: ComposerModelId | null) => void;
  primaryModel: ComposerModelId;
}) {
  // density / highContrast are consumed by the panel sections below.
  const drift = useMemo<{ kind: 'stuck' | 'noisy' | 'ok' | 'idle'; multiple: number }>(() => {
    const agentTurns = task.thread.filter((tn): tn is AgentTurn => tn.role === 'agent');
    if (agentTurns.length < 3) return { kind: 'idle', multiple: 0 };
    const last = agentTurns[agentTurns.length - 1];
    const prior = agentTurns.slice(0, -1);
    function thinkingRatio(tn: AgentTurn): number {
      if (tn.blocks.length === 0) return 0;
      return tn.blocks.filter((b) => b.kind === 'thinking').length / tn.blocks.length;
    }
    function toolCount(tn: AgentTurn): number {
      return tn.blocks.filter((b) => b.kind === 'tool').length;
    }
    const baselineThinking = prior.reduce((s, tn) => s + thinkingRatio(tn), 0) / prior.length || 0.01;
    const baselineTools = prior.reduce((s, tn) => s + toolCount(tn), 0) / prior.length || 0.5;
    const thinkingMul = thinkingRatio(last) / baselineThinking;
    const toolMul = toolCount(last) / baselineTools;
    if (thinkingMul >= 2.0) return { kind: 'stuck', multiple: thinkingMul };
    if (toolMul >= 2.0) return { kind: 'noisy', multiple: toolMul };
    return { kind: 'ok', multiple: 1 };
  }, [task.thread]);

  // Tool / model success rates. Iterates every agent turn, counting
  // tool blocks by `status === 'ok'` for the bar's numerator and total
  // tool calls for the denominator. Bucketed by tool kind and by the
  // turn's model so the user can compare reliability across both axes.
  const successRate = useMemo(() => {
    const byTool: Record<string, { ok: number; total: number }> = {};
    const byModel: Record<string, { ok: number; total: number }> = {};
    for (const tn of task.thread) {
      if (tn.role !== 'agent') continue;
      const model = tn.model ?? 'unknown';
      for (const block of tn.blocks) {
        if (block.kind !== 'tool') continue;
        const tool = block.tool;
        const ok = block.status === 'ok' || block.status == null;
        byTool[tool] = byTool[tool] ?? { ok: 0, total: 0 };
        byTool[tool].total += 1;
        if (ok) byTool[tool].ok += 1;
        byModel[model] = byModel[model] ?? { ok: 0, total: 0 };
        byModel[model].total += 1;
        if (ok) byModel[model].ok += 1;
      }
    }
    return { byTool, byModel };
  }, [task.thread]);
  const hasSuccessData =
    Object.keys(successRate.byTool).length > 0 ||
    Object.keys(successRate.byModel).length > 0;

  const panel = isDark ? 'bg-[#0a0c0f]' : 'bg-white';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';
  const accent = ACCENT_HEX[project.accent];

  return (
    <aside className={`shrink-0 w-[268px] flex flex-col ${panel} border-l ${border}`}>
      <div className={`shrink-0 h-12 flex items-center px-4 border-b ${border}`}>
        <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${textFaint}`}>
          {t('context.title')}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin p-4 space-y-5">
        <ContextSection label={t('context.project')} isDark={isDark}>
          <div className={`flex items-center gap-2 p-2 rounded-lg ${
            isDark ? 'bg-white/[0.025] border border-white/[0.06]' : 'bg-black/[0.02] border border-black/[0.06]'
          }`}>
            <span
              className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md font-mono text-[12px] font-bold"
              style={{
                background: `${accent}1f`,
                color: accent,
                boxShadow: `inset 0 0 0 1px ${accent}33`,
              }}
            >
              {project.initial}
            </span>
            <div className="min-w-0">
              <div className={`text-[12px] font-semibold truncate ${isDark ? 'text-white/85' : 'text-black/85'}`}>
                {project.name}
              </div>
              <div className={`text-[10px] font-mono truncate ${textFaint}`}>
                {project.slug}
              </div>
            </div>
          </div>
        </ContextSection>

        <ContextSection label={t('context.environment')} isDark={isDark}>
          <Field label={t('context.branch')} value={task.branch} mono isDark={isDark} />
          <Field label={t('context.base')} value={task.baseBranch} mono isDark={isDark} />
          <Field label={t('context.runtime')} value="node 20.11" mono isDark={isDark} />
        </ContextSection>

        <ContextSection label={t('context.activity')} isDark={isDark}>
          <ActivityRow icon={Clock} text={t('context.activityStarted')} time="2m" isDark={isDark} />
          <ActivityRow icon={Sparkles} text={t('context.activityPlanned')} time="2m" isDark={isDark} />
          <ActivityRow icon={FileCode} text={t('context.activityEdited')} time="1m" isDark={isDark} />
          <ActivityRow icon={CheckCircle2} text={t('context.activityTests')} time="now" isDark={isDark} />
        </ContextSection>

        <ContextSection label={t('context.shortcuts')} isDark={isDark}>
          <KeyHint label={t('context.kbRun')} keys={['⌘', '↵']} isDark={isDark} />
          <KeyHint label={t('context.kbNew')} keys={['⌘', 'N']} isDark={isDark} />
          <KeyHint label={t('context.kbSearch')} keys={['⌘', 'K']} isDark={isDark} />
          <KeyHint label={t('context.kbSlash')} keys={['/']} isDark={isDark} />
        </ContextSection>

        {drift.kind !== 'idle' && (
          <ContextSection label={t('drift.label')} isDark={isDark}>
            <DriftRow drift={drift} isDark={isDark} t={t} />
          </ContextSection>
        )}

        {hasSuccessData && (
          <ContextSection label={t('successRate.label')} isDark={isDark}>
            <SuccessRatePanel data={successRate} isDark={isDark} t={t} />
          </ContextSection>
        )}

        {(task.branchState != null || task.prState != null) && (
          <ContextSection label={t('prCi.branchTitle')} isDark={isDark}>
            <PrCiPanel
              branchState={task.branchState}
              prState={task.prState}
              isDark={isDark}
              t={t}
            />
          </ContextSection>
        )}

        {project.integrations && project.integrations.length > 0 && (
          <ContextSection label={t('integrations.title')} isDark={isDark}>
            {project.integrations.map((it, i) => (
              <IntegrationRow key={`${it.kind}:${i}`} integration={it} isDark={isDark} t={t} />
            ))}
          </ContextSection>
        )}

        <ContextSection label={t('density.label')} isDark={isDark}>
          <div className={`flex items-center gap-px rounded-md p-px ${
            isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'
          }`}>
            {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => { onDensityChange(d); }}
                aria-pressed={density === d}
                className={`flex-1 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                  density === d
                    ? (isDark ? 'bg-white/[0.10] text-white' : 'bg-white text-black shadow-sm')
                    : (isDark ? 'text-white/45 hover:text-white/75' : 'text-black/45 hover:text-black/75')
                }`}
              >
                {t(`density.${d}`)}
              </button>
            ))}
          </div>
        </ContextSection>

        <ContextSection label={t('sideBySide.label')} isDark={isDark}>
          <SideBySidePanel
            primaryModel={primaryModel}
            sideBySideModel={sideBySideModel}
            onChange={onSideBySideModelChange}
            isDark={isDark}
            t={t}
          />
        </ContextSection>

        <ContextSection label={t('a11y.highContrast')} isDark={isDark}>
          <button
            type="button"
            onClick={() => { onHighContrastChange(!highContrast); }}
            aria-pressed={highContrast}
            className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-[11px] transition-colors ${
              isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.025]'
            }`}
          >
            <span className={isDark ? 'text-white/70' : 'text-black/70'}>
              {t('a11y.highContrast')}
            </span>
            <span
              className={`shrink-0 inline-flex items-center w-7 h-3.5 rounded-full transition-colors ${
                highContrast
                  ? (isDark ? 'bg-emerald-400/85' : 'bg-emerald-500')
                  : (isDark ? 'bg-white/[0.15]' : 'bg-black/[0.15]')
              }`}
            >
              <span
                className={`block w-3 h-3 rounded-full bg-white shadow transition-transform ${
                  highContrast ? 'translate-x-[14px]' : 'translate-x-px'
                }`}
              />
            </span>
          </button>
        </ContextSection>
      </div>

      <div className={`shrink-0 px-4 py-3 border-t ${border} text-[10px] font-mono ${textFaint}`}>
        {t('context.footer')}
      </div>
    </aside>
  );
}

// Per-tool / per-model success rate panel. Two short stacks of bars —
// each row is `{tool|model} [bar of width pct%] {ok}/{total}`. Tone
// shifts amber below 80% (the "review me" line in agent-eval lit) and
// rose below 50%. Stays subtle so it doesn't dominate the rail.
function SuccessRatePanel({
  data, isDark, t,
}: {
  data: {
    byTool: Record<string, { ok: number; total: number }>;
    byModel: Record<string, { ok: number; total: number }>;
  };
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const muted = isDark ? 'text-white/45' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  const trackBg = isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]';

  function rateRow(label: string, ok: number, total: number, key: string) {
    const pct = total > 0 ? (ok / total) * 100 : 0;
    const fillTone = pct >= 80
      ? 'bg-emerald-400/85'
      : pct >= 50
        ? (isDark ? 'bg-amber-400/80' : 'bg-amber-500/85')
        : (isDark ? 'bg-rose-400/80' : 'bg-rose-500/85');
    return (
      <div key={key} className="flex items-center gap-2 text-[10px]">
        <span className={`shrink-0 w-14 truncate font-mono ${muted}`} title={label}>{label}</span>
        <div className={`flex-1 h-1 rounded-full ${trackBg} overflow-hidden`}>
          <div className={`h-full rounded-full ${fillTone}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`shrink-0 w-10 text-right font-mono tabular-nums ${muted}`}>
          {t('successRate.rate', { ok, total })}
        </span>
      </div>
    );
  }

  const toolEntries = Object.entries(data.byTool);
  const modelEntries = Object.entries(data.byModel);
  return (
    <div className="space-y-2">
      {toolEntries.length > 0 && (
        <div className="space-y-1">
          <div className={`text-[9px] font-bold uppercase tracking-[0.18em] ${faint}`}>
            {t('successRate.byTool')}
          </div>
          {toolEntries.map(([tool, { ok, total }]) => rateRow(tool, ok, total, `t:${tool}`))}
        </div>
      )}
      {modelEntries.length > 0 && (
        <div className="space-y-1">
          <div className={`text-[9px] font-bold uppercase tracking-[0.18em] ${faint}`}>
            {t('successRate.byModel')}
          </div>
          {modelEntries.map(([model, { ok, total }]) => {
            const short = model.replace(/^claude-/, '').replace(/-(\d)/, ' $1').replace(/-/g, '.');
            return rateRow(short, ok, total, `m:${model}`);
          })}
        </div>
      )}
    </div>
  );
}

// Soft-cap budget modal. 3-choice paradigm — auto-downgrade (safe
// default), raise cap (expert override), stop (no spend). Pattern:
// AWS Budget threshold action + ATM overdraft warning.
function BudgetSoftCapModal({
  used, cap, primary, downgrade, isDark, t,
  onAutoDowngrade, onOverride, onStop,
}: {
  used: number;
  cap: number;
  primary: ComposerModelId;
  downgrade: ComposerModelId;
  isDark: boolean;
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
  const surface = isDark ? 'bg-[#11141a] border-white/[0.10]' : 'bg-white border-black/[0.10]';
  const heading = isDark ? 'text-white/90' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const newCap = (cap * 2).toFixed(2);
  const estDown = (used + 0.18).toFixed(2);
  // Prettify model id for display.
  const modelLabel = (id: ComposerModelId) => id.replace(/^claude-/, '').replace(/-(\d)/, ' $1').replace(/-/g, '.');
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onStop}
    >
      <div className={`absolute inset-0 ${isDark ? 'bg-black/40' : 'bg-black/20'} backdrop-blur-sm`} />
      <div
        className={`relative w-full max-w-[480px] rounded-xl border shadow-2xl ${surface} coding-pill-rise`}
        onClick={(e) => { e.stopPropagation(); }}
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
              className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
                isDark
                  ? 'border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/15 text-emerald-200'
                  : 'border-emerald-500/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
              }`}
            >
              <div className="text-[12px] font-semibold">
                {t('budgetV2.softCapAutoDown', { model: modelLabel(downgrade), est: estDown })}
              </div>
            </button>
            <button
              type="button"
              onClick={onOverride}
              className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
                isDark
                  ? 'border-amber-400/30 bg-amber-400/[0.06] hover:bg-amber-400/[0.10] text-amber-200'
                  : 'border-amber-500/30 bg-amber-50 hover:bg-amber-100 text-amber-700'
              }`}
            >
              <div className="text-[12px] font-semibold">
                {t('budgetV2.softCapOverride', { newCap })}
              </div>
              <div className="text-[10px] opacity-70 mt-0.5">{modelLabel(primary)}</div>
            </button>
            <button
              type="button"
              onClick={onStop}
              className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
                isDark
                  ? 'border-white/[0.10] hover:bg-white/[0.04] text-white/85'
                  : 'border-black/[0.10] hover:bg-black/[0.04] text-black/85'
              }`}
            >
              <div className="text-[12px] font-semibold">{t('budgetV2.softCapStop')}</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Side-by-side comparison picker. Off = single-model. Picking a model
// other than the primary turns on dual-lane mode where every onSubmit
// fires both models in parallel and the renderer pairs them. Disabling
// requires re-clicking "Off" — there's no auto-revert when the user
// happens to pick the same model in both slots, the comparison just
// reduces to a no-op for that turn.
function SideBySidePanel({
  primaryModel, sideBySideModel, onChange, isDark, t,
}: {
  primaryModel: ComposerModelId;
  sideBySideModel: ComposerModelId | null;
  onChange: (id: ComposerModelId | null) => void;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const opts: { id: ComposerModelId; label: string }[] = [
    { id: 'claude-opus-4-7',   label: 'opus 4.7' },
    { id: 'claude-sonnet-4-6', label: 'sonnet 4.6' },
    { id: 'claude-haiku-4-5',  label: 'haiku 4.5' },
  ];
  const idle = isDark ? 'text-white/45 hover:text-white/75' : 'text-black/45 hover:text-black/75';
  const active = isDark ? 'bg-white/[0.10] text-white' : 'bg-white text-black shadow-sm';
  return (
    <div className="space-y-1.5">
      <div
        className={`flex items-center gap-px rounded-md p-px ${
          isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'
        }`}
        title={t('sideBySide.tooltip')}
      >
        <button
          type="button"
          onClick={() => { onChange(null); }}
          aria-pressed={sideBySideModel == null}
          className={`flex-1 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
            sideBySideModel == null ? active : idle
          }`}
        >
          {t('sideBySide.off')}
        </button>
        {opts.map((o) => {
          // Disable picking the primary model as the comparison —
          // running the same model twice would not be useful.
          const disabled = o.id === primaryModel;
          const isActive = sideBySideModel === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => { if (!disabled) onChange(o.id); }}
              aria-pressed={isActive}
              aria-disabled={disabled}
              className={`flex-1 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                isActive ? active : disabled ? (isDark ? 'text-white/15 cursor-not-allowed' : 'text-black/15 cursor-not-allowed') : idle
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {sideBySideModel != null && (
        <div className={`text-[10px] font-mono ${isDark ? 'text-white/35' : 'text-black/45'}`}>
          {t('sideBySide.leftLane', { model: primaryModel.replace(/^claude-/, '').replace(/-(\d)/, ' $1').replace(/-/g, '.') })}
          {' · '}
          {t('sideBySide.rightLane', { model: sideBySideModel.replace(/^claude-/, '').replace(/-(\d)/, ' $1').replace(/-/g, '.') })}
        </div>
      )}
    </div>
  );
}

// Drift indicator + integration row helpers — placed near ContextRail
// so they live next to their only consumer.
function DriftRow({
  drift, isDark, t,
}: {
  drift: { kind: 'stuck' | 'noisy' | 'ok' | 'idle'; multiple: number };
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  if (drift.kind === 'idle') return null;
  const isAnomaly = drift.kind === 'stuck' || drift.kind === 'noisy';
  const tone = isAnomaly
    ? (isDark ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-amber-500/40 bg-amber-50 text-amber-700')
    : (isDark ? 'border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-300' : 'border-emerald-500/30 bg-emerald-50 text-emerald-700');
  const x = drift.multiple.toFixed(1);
  const text = drift.kind === 'stuck' ? t('drift.stuck', { x })
    : drift.kind === 'noisy' ? t('drift.noisy', { x })
    : t('drift.ok');
  return (
    <div className={`flex items-start gap-2 px-2 py-1.5 rounded-md border ${tone}`}>
      <Activity className="w-3 h-3 shrink-0 mt-0.5 opacity-80" />
      <span className="text-[11px] leading-relaxed">{text}</span>
    </div>
  );
}

const INTEGRATION_ICON: Record<Integration['kind'], React.ComponentType<{ className?: string }>> = {
  slack:  MessageCircle,
  linear: HashIcon,
  jira:   Briefcase,
  github: Code,
  sentry: AlertOctagon,
  figma:  Palette,
};

// Branch + PR + CI status panel. Branch state at the top (ahead/behind
// + mergeable verdict), PR meta below, then a list of CI checks each
// with its own status dot. Pattern: GitHub PR widget + GitLab MR
// widget. Real impl polls every 30s; the demo uses static fixture.
function PrCiPanel({
  branchState, prState, isDark, t,
}: {
  branchState?: BranchState;
  prState?: PrState;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/35' : 'text-black/40';
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';

  function checkTone(status: CiCheck['status']): { dot: string; running: boolean } {
    if (status === 'success')   return { dot: 'bg-emerald-500', running: false };
    if (status === 'failure')   return { dot: 'bg-rose-500',    running: false };
    if (status === 'cancelled') return { dot: 'bg-zinc-400/60', running: false };
    if (status === 'queued')    return { dot: 'bg-zinc-400/60', running: false };
    // running
    return { dot: isDark ? 'bg-amber-300' : 'bg-amber-500', running: true };
  }

  return (
    <div className="space-y-2">
      {branchState && (
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className={muted}>{t('prCi.ahead', { n: branchState.ahead })}</span>
          <span className={faint}>·</span>
          <span className={muted}>{t('prCi.behind', { n: branchState.behind })}</span>
          <span className={faint}>·</span>
          {branchState.mergeable === 'clean' ? (
            <span className={isDark ? 'text-emerald-300' : 'text-emerald-700'}>
              ✓ {t('prCi.mergeable')}
            </span>
          ) : branchState.mergeable === 'dirty' ? (
            <span className={isDark ? 'text-rose-300' : 'text-rose-700'}>
              ⚠ {t('prCi.dirty')}
            </span>
          ) : branchState.mergeable === 'blocked' ? (
            <span className={isDark ? 'text-amber-300' : 'text-amber-700'}>
              ⊘ {t('prCi.blocked')}
            </span>
          ) : null}
        </div>
      )}

      {prState && (
        <div className={`rounded-md border ${border} p-2 space-y-1.5`}>
          <div className={`flex items-center justify-between text-[11px] font-mono ${heading}`}>
            <span>
              {prState.status === 'open' ? t('prCi.prOpen', { n: prState.number })
                : prState.status === 'draft' ? t('prCi.prDraft', { n: prState.number })
                : prState.status === 'merged' ? t('prCi.prMerged', { n: prState.number })
                : `PR #${prState.number}`}
            </span>
            <a
              href={prState.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-[10px] underline opacity-70 hover:opacity-100 ${muted}`}
            >
              {t('prCi.openOnGitHub')}
            </a>
          </div>

          {prState.reviewers.length > 0 && (
            <div className="space-y-0.5">
              <div className={`text-[9px] uppercase tracking-[0.18em] ${faint}`}>
                {t('prCi.reviewers')}
              </div>
              <div className="flex flex-wrap gap-1">
                {prState.reviewers.map((r) => {
                  const tone = r.state === 'approved'
                    ? (isDark ? 'text-emerald-300 border-emerald-400/30' : 'text-emerald-700 border-emerald-500/30')
                    : r.state === 'changes_requested'
                      ? (isDark ? 'text-rose-300 border-rose-400/30' : 'text-rose-700 border-rose-500/30')
                      : (isDark ? 'text-white/55 border-white/[0.10]' : 'text-black/55 border-black/[0.10]');
                  return (
                    <span
                      key={r.handle}
                      className={`inline-flex items-center gap-1 px-1.5 py-px rounded text-[10px] font-mono border ${tone}`}
                    >
                      {r.state === 'approved' ? '✓' : r.state === 'changes_requested' ? '⚠' : '○'}
                      {r.handle}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {prState.checks.length > 0 && (
            <div className="space-y-0.5">
              <div className={`text-[9px] uppercase tracking-[0.18em] ${faint}`}>
                {t('prCi.checks')}
              </div>
              <div className="space-y-px">
                {prState.checks.map((c, i) => {
                  const tone = checkTone(c.status);
                  return (
                    <div
                      key={`${c.name}:${i}`}
                      className={`flex items-center gap-2 text-[10px] font-mono ${muted}`}
                    >
                      <span className={`coding-ci-dot ${tone.dot} ${tone.running ? 'coding-ci-dot--running' : ''}`} />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className={faint}>{t(`prCi.check${c.status.charAt(0).toUpperCase() + c.status.slice(1)}`)}</span>
                      {c.durationMs != null && (
                        <span className={faint}>{(c.durationMs / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {prState.conflicts > 0 && (
            <div className={`text-[10px] ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
              ⚠ {t('prCi.conflicts', { n: prState.conflicts })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IntegrationRow({
  integration, isDark, t,
}: {
  integration: Integration;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const Icon = INTEGRATION_ICON[integration.kind];
  const labelColor = isDark ? 'text-white/85' : 'text-black/85';
  const subColor = isDark ? 'text-white/40' : 'text-black/45';
  const dotTone = integration.connected ? 'bg-emerald-400/85' : (isDark ? 'bg-white/20' : 'bg-black/20');
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${
      isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-black/[0.025]'
    } transition-colors`}>
      <Icon className={`w-3 h-3 shrink-0 ${subColor}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] font-semibold truncate ${labelColor}`}>
          {t(`integrations.kind.${integration.kind}`)}
        </div>
        <div className={`text-[10px] font-mono truncate ${subColor}`}>
          {integration.label}
        </div>
      </div>
      <span
        className={`shrink-0 w-1.5 h-1.5 rounded-full ${dotTone} ${integration.connected ? 'animate-pulse' : ''}`}
        title={integration.connected ? t('integrations.connected') : t('integrations.disconnected')}
      />
    </div>
  );
}

function ContextSection({
  label, isDark, children,
}: { label: string; isDark: boolean; children: React.ReactNode }) {
  const color = isDark ? 'text-white/40' : 'text-black/40';
  return (
    <div>
      <div className={`mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] ${color}`}>
        {label}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({
  label, value, mono, isDark,
}: { label: string; value: string; mono?: boolean; isDark: boolean }) {
  const labelColor = isDark ? 'text-white/40' : 'text-black/40';
  const valueColor = isDark ? 'text-white/85' : 'text-black/85';
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-[11px] ${labelColor}`}>{label}</span>
      <span className={`text-[11px] truncate ${mono ? 'font-mono' : ''} ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}

function ActivityRow({
  icon: Icon, text, time, isDark,
}: { icon: React.ComponentType<{ className?: string }>; text: string; time: string; isDark: boolean }) {
  const iconColor = isDark ? 'text-white/40' : 'text-black/40';
  const textColor = isDark ? 'text-white/70' : 'text-black/70';
  const timeColor = isDark ? 'text-white/30' : 'text-black/30';
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-3 h-3 shrink-0 ${iconColor}`} />
      <span className={`text-[11px] flex-1 truncate ${textColor}`}>{text}</span>
      <span className={`text-[10px] font-mono ${timeColor}`}>{time}</span>
    </div>
  );
}

function KeyHint({
  label, keys, isDark,
}: { label: string; keys: string[]; isDark: boolean }) {
  const labelColor = isDark ? 'text-white/55' : 'text-black/55';
  const kbdBg = isDark ? 'bg-white/[0.05] text-white/70 border-white/[0.08]' : 'bg-black/[0.04] text-black/70 border-black/[0.08]';
  return (
    <div className="flex items-center justify-between">
      <span className={`text-[11px] ${labelColor}`}>{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k) => (
          <kbd
            key={k}
            className={`px-1.5 h-5 inline-flex items-center justify-center rounded-md border text-[10px] font-mono ${kbdBg}`}
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────

function deriveTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 60) return cleaned;
  return cleaned.slice(0, 60).trimEnd() + '…';
}

function pickKeyword(text: string): string {
  // Pick the longest alphabetic word, fall back to "context".
  const tokens = text.split(/[^a-zA-Z]+/).filter(Boolean);
  if (tokens.length === 0) return 'context';
  return tokens.sort((a, b) => b.length - a.length)[0];
}
