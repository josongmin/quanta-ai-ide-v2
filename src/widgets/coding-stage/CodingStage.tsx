import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GitBranch, FileCode, CheckCircle2, Clock, Sparkles, MoreHorizontal,
  GitPullRequest, Activity, Cpu, Zap,
} from 'lucide-react';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { TaskRail } from './parts/TaskRail';
import { Composer } from './parts/Composer';
import { BlockView } from './parts/Blocks';
import { SAMPLE_PROJECTS, getSampleTasks } from './parts/data';
import type { AgentBlock, AgentTurn, Project, Task, Turn, UserTurn } from './parts/types';

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
  const streamRef = useRef<{ taskId: string; turnId: string; timer: number } | null>(null);

  function stopStream() {
    if (streamRef.current) {
      window.clearTimeout(streamRef.current.timer);
      patchTurn(streamRef.current.taskId, streamRef.current.turnId, { streaming: false });
      streamRef.current = null;
    }
  }

  function runSyntheticAgent(taskId: string, turnId: string, blocks: AgentBlock[]) {
    let i = 0;
    const tick = () => {
      if (i >= blocks.length) {
        patchTurn(taskId, turnId, { streaming: false, elapsed: `${(blocks.length * 0.7).toFixed(1)}s`, tokens: { in: 1200 + blocks.length * 320, out: 300 + blocks.length * 110 } });
        streamRef.current = null;
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
      streamRef.current = { taskId, turnId, timer };
    };
    tick();
  }

  function onSubmitComposer() {
    const trimmed = draft.trim();
    if (!trimmed || !active) return;

    const userTurn: UserTurn = {
      id: `u-${Date.now()}`, role: 'user', text: trimmed, at: 'now',
    };
    const agentTurn: AgentTurn = {
      id: `a-${Date.now()}`, role: 'agent', at: 'now', streaming: true, blocks: [],
    };
    appendTurns(active.id, userTurn, agentTurn);
    setDraft('');

    // Build a plausible synthetic response: thinking → text → tool → diff
    const synthetic: AgentBlock[] = [
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

    // Defer one frame so the user message paints first.
    requestAnimationFrame(() => {
      runSyntheticAgent(active.id, agentTurn.id, synthetic);
    });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.projectId]);

  if (!active || !activeProject) return null;

  const surface = isDark ? 'bg-[#0b0d10]' : 'bg-[#f7f8fa]';

  return (
    <div className={`absolute inset-0 flex font-sans ${surface}`}>
      <TaskRail
        projects={projects}
        tasks={tasks}
        activeId={activeId}
        onSelect={setActiveId}
        onNewTask={startNewTask}
        onNewProject={startNewProject}
        isDark={isDark}
        t={t}
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
      />

      <ContextRail task={active} project={activeProject} isDark={isDark} t={t} />
    </div>
  );
}

// ─── Center pane ──────────────────────────────────────────────────────────

function ThreadPane({
  task, project, isDark, draft, onDraftChange, onSubmit, onStop, intent, onIntent, isStreaming, t,
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
  t: (k: string) => string;
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
            {task.thread.map((turn) => (
              <TurnView key={turn.id} turn={turn} isDark={isDark} />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className={`shrink-0 border-t ${border} ${isDark ? 'bg-[#0b0d10]/85' : 'bg-white/70'} backdrop-blur`}>
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

function TurnView({ turn, isDark }: { turn: Turn; isDark: boolean }) {
  if (turn.role === 'user') return <UserTurnView turn={turn} isDark={isDark} />;
  return <AgentTurnView turn={turn} isDark={isDark} />;
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

function AgentTurnView({ turn, isDark }: { turn: AgentTurn; isDark: boolean }) {
  const muted = isDark ? 'text-white/40' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  return (
    <div className="flex gap-3">
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
          {turn.streaming && (
            <span className={`flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-mono ${
              isDark ? 'bg-white/[0.06] text-white/70' : 'bg-black/[0.05] text-black/65'
            }`}>
              <span className={`w-1 h-1 rounded-full animate-pulse ${
                isDark ? 'bg-white/60' : 'bg-black/55'
              }`} />
              streaming
            </span>
          )}
          {!turn.streaming && turn.tokens && (
            <span className={`flex items-center gap-2 ml-auto text-[10px] font-mono ${muted}`}>
              <span className="flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" />
                {turn.tokens.in.toLocaleString()} in · {turn.tokens.out.toLocaleString()} out
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
        <div className="space-y-2">
          {turn.blocks.map((block, i) => (
            <BlockView key={i} block={block} isDark={isDark} />
          ))}
          {turn.streaming && turn.blocks.length === 0 && <StreamingDots isDark={isDark} />}
        </div>
      </div>
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
}: {
  task: Task;
  project: Project;
  isDark: boolean;
  t: (k: string) => string;
}) {
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
      </div>

      <div className={`shrink-0 px-4 py-3 border-t ${border} text-[10px] font-mono ${textFaint}`}>
        {t('context.footer')}
      </div>
    </aside>
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
