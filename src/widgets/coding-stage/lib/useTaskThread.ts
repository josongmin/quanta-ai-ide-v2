import { useCallback, useMemo, useRef, useState } from 'react';
import { safeLocalSet, STORAGE_KEY_PREFIX } from '@shared/lib';
import { SAMPLE_PROJECTS, getSampleTasks } from '../parts/data';
import { sliceToHead } from '../parts/timeline/TimelineScrubber';
import { deriveTitle, MODEL_PRICING } from './codingStageHelpers';
import type { ComposerModelId } from '../parts/Composer';
import type {
  AgentBlock, AgentTurn, DiffBlock, Project, Task, Turn, ReactionKind,
} from '../parts/types';
import {
  candidatesFromFinding,
  seedFromFinding,
} from '@features/verified-fix';
import type { EngineFinding } from '@entities/pr';

// Thread / task / turn cluster lifted out of CodingStage. This owns the
// projects + tasks + activeId state, the derived view memos (active,
// activeProject, isStreaming, annotatedThread, visibleThread, cost), the
// scrubber head, the synthetic-stream registry, and every thread
// mutation (fork, inverse, reactions, append, patch, stop, stream).
//
// Behaviour-preserving: the internal hook-call order matches the original
// inline order, the memo dependency arrays are identical, and the
// synthetic streaming timing/cleanup is unchanged.
export function useTaskThread(
  t: (k: string) => string,
  seedVerifiedFix: (
    seed: ReturnType<typeof seedFromFinding>,
    candidates: ReturnType<typeof candidatesFromFinding>,
  ) => void,
) {
  // Demo fixtures live in coding.json under `demo.*`. Resolve once on mount
  // so the rail title / chat thread / plans use the user's chosen locale.
  const initialTasks = useMemo(() => getSampleTasks(t), [t]);
  const [projects, setProjects] = useState<Project[]>(() => SAMPLE_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(() => initialTasks);
  const [activeId, setActiveId] = useState<string>(initialTasks[1]?.id ?? initialTasks[0]?.id ?? '');

  // Time-travel scrubber preview state. null = live; otherwise the
  // index of the turn the user has scrubbed back to. Composer locks
  // while scrubbed (handled below).
  const [scrubHead, setScrubHead] = useState<number | null>(null);

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

  // Save the active model as a per-project default. Clicked from the
  // Composer's model dropdown footer.
  const saveProjectDefaultModel = useCallback((projectId: string, next: ComposerModelId) => {
    safeLocalSet(`${STORAGE_KEY_PREFIX.codingProjectDefaultModel}${projectId}`, next);
    setProjects((cur) => cur.map((p) =>
      p.id === projectId ? { ...p, defaultModel: next } : p,
    ));
  }, []);

  // Synthesised streaming. Drops blocks into the agent turn over time so
  // the demo "looks alive" without a real model. Cancellable via the stop
  // button, which clears the pending interval and freezes the turn.
  // Keyed by turnId so multiple in-flight turns (follow-up sent while a
  // prior turn is still streaming) coexist without clobbering each other.
  const streamRef = useRef<Map<string, { taskId: string; timer: number }>>(new Map());

  // Recovery-engine: append a synthetic agent turn that *describes* the
  // inverse of the targeted turn. History is preserved (audit trail),
  // working state is what the user actually wanted. Replaces the old
  // destructive `rewindTo`.
  const applyInverseOf = useCallback((taskId: string, turnId: string) => {
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
  }, []);

  // Fork creates a new task seeded with the thread up through `turnId`.
  const forkFrom = useCallback((taskId: string, turnId: string) => {
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
  }, [tasks]);

  // Toggle a reaction on a specific agent turn. Reactions live on the
  // turn so they persist across task switches.
  const toggleReaction = useCallback((taskId: string, turnId: string, kind: ReactionKind) => {
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
  }, []);

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

  // Compose new turn into the active thread. If the thread is empty we
  // also flip the task title so the rail shows something useful.
  const appendTurns = useCallback((taskId: string, ...turns: Turn[]) => {
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
  }, []);

  // Build a synthetic EngineFinding from the agent's diff block and
  // funnel it through the same fixtures pipeline the demo seeds use.
  // The `rule` we pick determines which validation outcome bucket the
  // mock engine will produce — so we choose deterministically based on
  // diff size: tiny → console-usage (first-pass success), medium →
  // edit-safety (post-critique success), large/api → public-surface
  // (human checkpoint). That way a long agent run *feels* like a
  // human-checkpoint candidate without us hard-coding it.
  const seedVerifiedFixFromDiff = useCallback((taskId: string, diff: DiffBlock) => {
    const totalChanged = diff.added + diff.removed;
    const firstFile = diff.files[0];
    if (firstFile === undefined) return;

    const isApi = firstFile.path.includes('/api/') || firstFile.path.endsWith(".d.ts");
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
  }, [seedVerifiedFix]);

  const patchTurn = useCallback((taskId: string, turnId: string, patch: Partial<AgentTurn>) => {
    setTasks((cur) => cur.map((task) => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        thread: task.thread.map((tn) =>
          tn.role === 'agent' && tn.id === turnId ? { ...tn, ...patch } : tn,
        ),
      };
    }));
  }, []);

  const stopStream = useCallback(() => {
    if (!active) return;
    for (const [turnId, entry] of streamRef.current) {
      if (entry.taskId !== active.id) continue;
      window.clearTimeout(entry.timer);
      patchTurn(entry.taskId, turnId, { streaming: false });
      streamRef.current.delete(turnId);
    }
  }, [active, patchTurn]);

  const runSyntheticAgent = useCallback((taskId: string, turnId: string, blocks: AgentBlock[]) => {
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
  }, [patchTurn, seedVerifiedFixFromDiff]);

  return {
    projects, setProjects,
    tasks, setTasks,
    activeId, setActiveId,
    scrubHead, setScrubHead,
    active,
    activeProject,
    isStreaming,
    saveProjectDefaultModel,
    streamRef,
    applyInverseOf,
    forkFrom,
    toggleReaction,
    annotatedThread,
    visibleThread,
    isScrubbed,
    cost,
    appendTurns,
    seedVerifiedFixFromDiff,
    patchTurn,
    stopStream,
    runSyntheticAgent,
  };
}
