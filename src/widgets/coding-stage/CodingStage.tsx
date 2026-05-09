import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { TaskRail } from './parts/TaskRail';
import { type ComposerModelId } from './parts/Composer';
import { sliceToHead } from './parts/TimelineScrubber';
import { CommandPalette, type PaletteAction } from './parts/CommandPalette';
import { TurnContextMenu } from './parts/TurnContextMenu';
import { ACCENT_HEX, ThreadPane } from './parts/ThreadPane';
import { ContextRail } from './parts/ContextRail';
import { SAMPLE_PROJECTS, getSampleTasks } from './parts/data';
import {
  buildTurnMenuItems,
  deriveTitle,
  isModelId,
  MODEL_PRICING,
  pickKeyword,
} from './lib/codingStageHelpers';
import type {
  AgentBlock, AgentTurn, DiffBlock, Project, Task, Turn, ReactionKind,
} from './parts/types';
import {
  candidatesFromFinding,
  seedFromFinding,
  useVerifiedFixStore,
} from '@features/verified-fix';
import type { EngineFinding } from '@entities/pr';

// Top-level coding workspace. Three columns:
//   - Left rail: project-grouped task threads
//   - Center: thread (user + agent turns) + bottom-pinned composer
//   - Right: project context, activity, shortcuts
// Everything is local state; no agent backend round-trips.

export default function CodingStage() {
  const { isDark } = useTheme();
  const { t } = useTranslation('coding');
  // Verified-fix store action — used at agent-turn-end to seed a fix
  // case so the review-stage card has something to pick up.
  const seedVerifiedFix = useVerifiedFixStore((s) => s.seed);

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

  // Build a synthetic EngineFinding from the agent's diff block and
  // funnel it through the same fixtures pipeline the demo seeds use.
  // The `rule` we pick determines which validation outcome bucket the
  // mock engine will produce — so we choose deterministically based on
  // diff size: tiny → console-usage (first-pass success), medium →
  // edit-safety (post-critique success), large/api → public-surface
  // (human checkpoint). That way a long agent run *feels* like a
  // human-checkpoint candidate without us hard-coding it.
  function seedVerifiedFixFromDiff(taskId: string, diff: DiffBlock) {
    const totalChanged = diff.added + diff.removed;
    const firstFile = diff.files[0];
    if (firstFile === undefined) return;

    const isApi = firstFile.path.includes('/api/') || /\.d\.ts$/.test(firstFile.path);
    const rule = isApi ? 'public-surface'
      : totalChanged > 80 ? 'edit-safety'
      : 'console-usage';
    const finding: EngineFinding = {
      id: `coding-${taskId}-${String(Date.now())}`,
      severity: rule === 'public-surface' ? 'medium' : rule === 'edit-safety' ? 'high' : 'low',
      category: rule === 'public-surface' ? 'API' : rule === 'edit-safety' ? 'STRUCT-INTEGRITY' : 'STYLE',
      rule,
      title: `Agent edits to ${firstFile.path.split('/').pop() ?? firstFile.path}`,
      body: `${String(diff.added)} additions, ${String(diff.removed)} removals across ${String(diff.files.length)} file${diff.files.length === 1 ? '' : 's'}.`,
      filePath: firstFile.path,
      fileId: null,
      line: firstFile.hunks[0]?.startLine ?? null,
      autoFixable: true,
      fixRationale: rule === 'console-usage'
        ? 'Mechanical replacement; tests cover all callsites.'
        : null,
    };
    const seed = seedFromFinding(finding);
    const candidates = candidatesFromFinding(seed, finding);
    seedVerifiedFix(seed, candidates);
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
        // Verified-fix handoff: when the agent's last block is a diff,
        // seed a fix case so the review-stage card has something to
        // pick up. We don't blow away the curated demo fixtures — we
        // just make the freshly-seeded case the active one.
        if (last?.kind === 'diff') {
          seedVerifiedFixFromDiff(taskId, last);
        }
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
     
    // closes over `active?.projectId` and several setters; including it
    // would re-bind the global keydown listener on every render. The narrow
    // dep is intentional — re-bind only when the active project changes.
  }, [active?.projectId]);

  if (!active || !activeProject) return null;

  // Match the Intelligence DotField canvas background (#0d1117) so the
  // coding workspace reads as the same blueprint surface, not a separate
  // black sheet. Light mode keeps the cool off-white pair.
  const surface = isDark ? 'bg-[#0d1117]' : 'bg-[#f7f8fa]';

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

// ─── Right rail ───────────────────────────────────────────────────────────


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

// ─── helpers ──────────────────────────────────────────────────────────────
