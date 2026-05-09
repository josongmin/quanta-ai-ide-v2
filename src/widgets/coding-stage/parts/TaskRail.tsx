import { useMemo, useState } from 'react';
import {
  Search, Plus, ChevronRight, MessageSquare,
  Pin, FolderPlus, ListFilter, GripVertical, Cloud,
} from 'lucide-react';
import { ResizeHandle } from '@shared/ui';
import type { Project, Task, TaskStatus } from './types';

// Project-grouped task rail. Each project is a collapsible group; selected
// task gets a left-edge accent matching the project's tone. The rail is
// single-source-of-truth for collapse state, project order, and filter.

type Props = {
  projects: Project[];
  tasks: Task[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewTask: (projectId: string) => void;
  onNewProject: () => void;
  // Drag-and-drop reorder *within the same project*. The parent owns
  // tasks; we hand back "task `srcId` should slot before `dstId`" and
  // let the parent splice. Cross-project drops are rejected (different
  // base branch + project context — needs a confirm dialog, out of v1).
  onReorder?: (srcId: string, dstId: string) => void;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
  width: number;
  onWidthChange: (next: number) => void;
};

export const TASK_RAIL_DEFAULT_WIDTH = 284;
export const TASK_RAIL_MIN_WIDTH = 220;
export const TASK_RAIL_MAX_WIDTH = 480;

const NEUTRAL_ACCENT_DARK = '#a1a1aa';
const NEUTRAL_ACCENT_LIGHT = '#71717a';
const ACCENT_HEX = {
  emerald: NEUTRAL_ACCENT_DARK,
  sky:     NEUTRAL_ACCENT_DARK,
  violet:  NEUTRAL_ACCENT_DARK,
  amber:   NEUTRAL_ACCENT_DARK,
  rose:    NEUTRAL_ACCENT_DARK,
  cyan:    NEUTRAL_ACCENT_DARK,
};
void NEUTRAL_ACCENT_LIGHT;

export function TaskRail({
  projects, tasks, activeId, onSelect, onNewTask, onNewProject, onReorder, isDark, t,
  width, onWidthChange,
}: Props) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'mine' | 'archived'>('all');
  // Drag state — siblings of the dragged row light up an "insert here"
  // indicator on dragOver. Lives at TaskRail so it resets cleanly when
  // the drag ends or leaves the rail.
  const [dragSrcId, setDragSrcId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (filter === 'archived') list = list.filter((task) => task.status === 'merged');
    else if (filter === 'mine') {
      list = list.filter((task) => {
        if (task.pinned === true) return true;
        return task.status === 'open' || task.status === 'running' || task.status === 'review';
      });
    } else list = list.filter((task) => task.status !== 'merged' || task.pinned === true);
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((task) => {
      if (task.title.toLowerCase().includes(q)) return true;
      if (task.branch.toLowerCase().includes(q)) return true;
      if (task.labels?.some((l) => l.toLowerCase().includes(q))) return true;
      for (const turn of task.thread) {
        if (turn.role === 'user' && turn.text.toLowerCase().includes(q)) return true;
        if (turn.role === 'agent') {
          for (const block of turn.blocks) {
            if (block.kind === 'text' && block.text.toLowerCase().includes(q)) return true;
            if (block.kind === 'tool' && block.label.toLowerCase().includes(q)) return true;
          }
        }
      }
      return false;
    });
  }, [tasks, query, filter]);

  const visibleProjects = useMemo(() => {
    const order = [...projects].sort((a, b) => {
      const ap = a.pinned ? 0 : 1;
      const bp = b.pinned ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return a.name.localeCompare(b.name);
    });
    if (!query.trim() && filter === 'all') return order;
    return order.filter((p) => filteredTasks.some((task) => task.projectId === p.id));
  }, [projects, filteredTasks, query, filter]);

  const panel = isDark ? 'bg-[#11161e]' : 'bg-white';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';
  const textMuted = isDark ? 'text-white/40' : 'text-black/55';
  const inputBg = isDark ? 'bg-white/[0.03]' : 'bg-black/[0.025]';

  const runningCount = tasks.filter((task) => task.status === 'running').length;
  const awaitingCount = tasks.filter((task) => task.status === 'review' || task.status === 'failed').length;
  // Background-execution count — distinct from "running" because cloud
  // tasks survive tab close. Surfaced as a small ribbon next to the
  // counters so the user knows tab close is safe.
  const cloudCount = tasks.filter((task) => task.execution?.surface === 'cloud').length;

  return (
    <aside
      className={`relative shrink-0 flex flex-col ${panel} border-r ${border}`}
      style={{ width }}
    >
      <ResizeHandle
        side="right"
        width={width}
        min={TASK_RAIL_MIN_WIDTH}
        max={TASK_RAIL_MAX_WIDTH}
        defaultWidth={TASK_RAIL_DEFAULT_WIDTH}
        onChange={onWidthChange}
        isDark={isDark}
        ariaLabel={t('rail.resize')}
        offset={-5}
      />
      <div className="shrink-0 px-3 pt-3 pb-2">
        {/* Min-w-0 lets the inner flex shrink instead of pushing the
            "+" button off the right edge when the cloud-ribbon arrives. */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${textFaint}`}>
              {t('rail.title')}
            </span>
            {runningCount > 0 && (
              <span
                className={`shrink-0 flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-mono whitespace-nowrap ${
                  isDark ? 'bg-white/[0.06] text-white/70' : 'bg-black/[0.05] text-black/65'
                }`}
                title={t('rail.running', { count: runningCount })}
              >
                <span className={`w-1 h-1 rounded-full coding-breath ${
                  isDark ? 'bg-white/60' : 'bg-black/55'
                }`} />
                {runningCount}
              </span>
            )}
            {awaitingCount > 0 && (
              <span
                className={`shrink-0 flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-mono whitespace-nowrap border ${
                  isDark
                    ? 'border-amber-400/30 text-amber-300 bg-amber-400/10'
                    : 'border-amber-500/30 text-amber-700 bg-amber-50'
                }`}
                title={t('rail.awaitingYou', { count: awaitingCount })}
              >
                <span className="w-1 h-1 rounded-full coding-breath bg-current opacity-80" />
                {awaitingCount}
              </span>
            )}
            {/* Cloud ribbon — present when any task is running off-tab.
                Slides in via coding-bg-arrive to draw attention exactly
                once when a task switches surface. */}
            {cloudCount > 0 && (
              <span
                className={`coding-bg-arrive shrink-0 flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-mono whitespace-nowrap border ${
                  isDark
                    ? 'border-sky-400/30 text-sky-300 bg-sky-400/10'
                    : 'border-sky-500/30 text-sky-700 bg-sky-50'
                }`}
                title={t('background.ribbon', { count: cloudCount })}
              >
                <Cloud className="w-2.5 h-2.5" />
                {cloudCount}
              </span>
            )}
          </div>
          <button type="button"
            onClick={onNewProject}
            title={t('rail.newProject')}
            aria-label={t('rail.newProject')}
            className={`shrink-0 p-1 rounded-md transition-colors ${
              isDark ? 'text-white/40 hover:text-white/85 hover:bg-white/[0.05]' : 'text-black/40 hover:text-black/85 hover:bg-black/[0.04]'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="shrink-0 px-3 pb-2">
        <div className={`group flex items-center gap-2 px-2 h-7 rounded-md transition-colors ${inputBg}`}>
          <Search className={`w-3 h-3 ${textFaint}`} />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
            placeholder={t('rail.searchPlaceholder')}
            className={`flex-1 bg-transparent outline-none text-[11px] ${
              isDark ? 'text-white/85 placeholder:text-white/30' : 'text-black/85 placeholder:text-black/30'
            }`}
          />
          <kbd className={`text-[9px] font-mono ${textFaint}`}>⌘K</kbd>
        </div>
      </div>

      <div className="shrink-0 px-3 pb-2 flex items-center gap-1">
        <ListFilter className={`w-3 h-3 mr-0.5 ${textFaint}`} />
        {(['all', 'mine', 'archived'] as const).map((f) => (
          <button type="button"
            key={f}
            onClick={() => { setFilter(f); }}
            className={`px-2 h-5 rounded-full text-[10px] font-medium transition-colors ${
              filter === f
                ? (isDark ? 'bg-white/[0.10] text-white' : 'bg-black/[0.08] text-black')
                : (isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]' : 'text-black/40 hover:text-black/70 hover:bg-black/[0.04]')
            }`}
          >
            {t(`rail.filter.${f}`)}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-2 pb-3">
        {visibleProjects.map((project) => {
          const projectTasks = filteredTasks.filter((task) => task.projectId === project.id);
          const isCollapsed = collapsed[project.id] ?? false;
          return (
            <ProjectGroup
              key={project.id}
              project={project}
              tasks={projectTasks}
              activeId={activeId}
              onSelect={onSelect}
              onNewTask={() => { onNewTask(project.id); }}
              onToggle={() => { setCollapsed((c) => ({ ...c, [project.id]: !isCollapsed })); }}
              collapsed={isCollapsed}
              isDark={isDark}
              t={t}
              dragSrcId={dragSrcId}
              dragOverId={dragOverId}
              onDragStart={(id) => { setDragSrcId(id); }}
              onDragOver={(id) => { setDragOverId(id); }}
              onDragEnd={() => { setDragSrcId(null); setDragOverId(null); }}
              onDrop={(srcId, dstId) => {
                if (onReorder != null && srcId !== dstId) {
                  const src = tasks.find((tsk) => tsk.id === srcId);
                  const dst = tasks.find((tsk) => tsk.id === dstId);
                  if (src?.projectId === dst?.projectId && src != null) {
                    onReorder(srcId, dstId);
                  }
                }
                setDragSrcId(null); setDragOverId(null);
              }}
            />
          );
        })}
        {visibleProjects.length === 0 && (
          <div className={`px-2 py-8 text-center text-[11px] ${textMuted}`}>
            {t('rail.empty')}
          </div>
        )}
      </div>
    </aside>
  );
}

function ProjectGroup({
  project, tasks, activeId, onSelect, onNewTask, onToggle, collapsed, isDark, t,
  dragSrcId, dragOverId, onDragStart, onDragOver, onDragEnd, onDrop,
}: {
  project: Project;
  tasks: Task[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewTask: () => void;
  onToggle: () => void;
  collapsed: boolean;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
  dragSrcId: string | null;
  dragOverId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (srcId: string, dstId: string) => void;
}) {
  const accent = ACCENT_HEX[project.accent];
  const textPrimary = isDark ? 'text-white/85' : 'text-black/85';
  const textMuted = isDark ? 'text-white/40' : 'text-black/55';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';
  const running = tasks.filter((task) => task.status === 'running').length;

  return (
    <div className="mb-1">
      <div
        className={`group relative flex items-center gap-1.5 px-1.5 py-1.5 rounded-md transition-colors ${
          isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-black/[0.025]'
        }`}
      >
        <button type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <ChevronRight
            className={`w-3 h-3 shrink-0 transition-transform ${textFaint} ${collapsed ? '' : 'rotate-90'}`}
          />
          <span
            className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-md font-mono text-[9px] font-bold"
            style={{
              background: `${accent}1f`,
              color: accent,
              boxShadow: `inset 0 0 0 1px ${accent}33`,
            }}
          >
            {project.initial}
          </span>
          <span className={`text-[12px] font-semibold truncate ${textPrimary}`}>
            {project.name}
          </span>
          {project.pinned && (
            <Pin className={`w-2.5 h-2.5 shrink-0 ${textFaint}`} fill="currentColor" />
          )}
          <span className="flex-1" />
          <span className={`shrink-0 text-[10px] font-mono ${textFaint}`}>
            {tasks.length}
          </span>
          {running > 0 && (
            <span
              className="shrink-0 w-1.5 h-1.5 rounded-full coding-breath"
              style={{ background: accent }}
            />
          )}
        </button>
        <button type="button"
          onClick={(e) => { e.stopPropagation(); onNewTask(); }}
          title={t('rail.newTaskInProject')}
          aria-label={t('rail.newTaskInProject')}
          className={`opacity-0 group-hover:opacity-100 p-0.5 rounded-md transition-opacity ${
            isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-black/40 hover:text-black hover:bg-black/[0.06]'
          }`}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {!collapsed && (
        <div
          className="ml-[10px] pl-0.5 border-l flex flex-col gap-px"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
        >
          {tasks.length === 0 ? (
            <button type="button"
              onClick={onNewTask}
              className={`text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]' : 'text-black/40 hover:text-black/70 hover:bg-black/[0.03]'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus className="w-3 h-3" />
                {t('rail.newTaskInProject')}
              </span>
            </button>
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                active={task.id === activeId}
                onClick={() => { onSelect(task.id); }}
                isDark={isDark}
                t={t}
                isDragging={dragSrcId === task.id}
                isDropTarget={dragOverId === task.id && dragSrcId !== null && dragSrcId !== task.id}
                onDragStart={() => { onDragStart(task.id); }}
                onDragOver={() => { onDragOver(task.id); }}
                onDragEnd={onDragEnd}
                onDrop={(srcId) => { onDrop(srcId, task.id); }}
              />
            ))
          )}
        </div>
      )}
      {collapsed && tasks.length > 0 && (
        <div className={`ml-7 mt-px text-[10px] font-mono ${textMuted}`}>
          {tasks.length} {tasks.length === 1 ? t('rail.taskOne') : t('rail.taskMany')}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task, active, onClick, isDark, t,
  isDragging, isDropTarget, onDragStart, onDragOver, onDragEnd, onDrop,
}: {
  task: Task;
  active: boolean;
  onClick: () => void;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  onDrop: (srcId: string) => void;
}) {
  const titleColor = active
    ? (isDark ? 'text-white' : 'text-black')
    : (isDark ? 'text-white/70' : 'text-black/70');
  const subColor = isDark ? 'text-white/40' : 'text-black/40';
  const hoverBg = isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-black/[0.025]';

  // Surface the *current* phase of any in-flight agent turn so the user
  // can scan the rail and see "ah, that one's reading files, that one's
  // editing". Multi-task fleet monitoring at a glance.
  const streamingPhase = (() => {
    for (let i = task.thread.length - 1; i >= 0; i--) {
      const tn = task.thread[i];
      if (tn.role === 'agent' && tn.streaming && tn.phase) return tn.phase;
    }
    return null;
  })();

  return (
    <div
      className="relative"
      // Drop indicator above the row when it's the active target. Drawn
      // as a 2px line on the *top* (never as a left-edge stripe — that
      // violates the no-coloured-stripes rule).
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDrop={(e) => {
        e.preventDefault();
        const srcId = e.dataTransfer.getData('application/x-coding-task');
        if (srcId) onDrop(srcId);
      }}
    >
      {isDropTarget && (
        <div
          className={`absolute -top-px left-2 right-2 h-0.5 rounded-full ${
            isDark ? 'bg-white/60' : 'bg-black/60'
          }`}
        />
      )}
      <button type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/x-coding-task', task.id);
          e.dataTransfer.effectAllowed = 'move';
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        onClick={onClick}
        className={`group/row relative w-full text-left rounded-md pl-1.5 pr-1.5 py-1.5 transition-colors ${hoverBg} ${
          active ? 'coding-task-active' : ''
        } ${isDragging ? 'opacity-50' : ''}`}
        style={{
          background: active ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)') : undefined,
        }}
      >
        <div className="flex items-start gap-2">
          {/* Drag handle — only visible on hover so it doesn't crowd the row. */}
          <span
            className={`shrink-0 mt-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity cursor-grab active:cursor-grabbing ${
              isDark ? 'text-white/30' : 'text-black/30'
            }`}
            title="drag to reorder"
            aria-hidden
          >
            <GripVertical className="w-3 h-3" />
          </span>
          <StatusDot status={task.status} className="mt-1" />
          <div className="flex-1 min-w-0">
            <div className={`text-[12px] leading-snug line-clamp-2 ${titleColor}`}>
              {task.title}
            </div>
            <div className={`mt-1 flex items-center gap-1.5 text-[10px] font-mono ${subColor}`}>
              {streamingPhase ? (
                <span
                  className={`inline-flex items-center gap-1 px-1 py-px rounded text-[9px] ${
                    isDark ? 'bg-white/[0.05] text-white/65' : 'bg-black/[0.05] text-black/65'
                  }`}
                  title={t(`phase.${streamingPhase}`)}
                >
                  <span className="inline-flex items-center gap-px">
                    <span className={`w-0.5 h-0.5 rounded-full coding-breath ${isDark ? 'bg-white/65' : 'bg-black/55'}`} />
                    <span className={`w-0.5 h-0.5 rounded-full coding-breath ${isDark ? 'bg-white/65' : 'bg-black/55'}`} style={{ animationDelay: '180ms' }} />
                    <span className={`w-0.5 h-0.5 rounded-full coding-breath ${isDark ? 'bg-white/65' : 'bg-black/55'}`} style={{ animationDelay: '360ms' }} />
                  </span>
                  {t(`phase.${streamingPhase}`)}
                </span>
              ) : (
                <span>{task.timeAgo}</span>
              )}
              {task.diffStats.added + task.diffStats.removed > 0 && (
                <>
                  <span className="opacity-50">·</span>
                  <span className="opacity-80">+{task.diffStats.added}</span>
                  <span className="opacity-60">−{task.diffStats.removed}</span>
                </>
              )}
              {task.thread.length > 0 && (
                <>
                  <span className="opacity-50">·</span>
                  <span className="flex items-center gap-0.5">
                    <MessageSquare className="w-2.5 h-2.5" />
                    {task.thread.length}
                  </span>
                </>
              )}
              {/* Cloud chip — surfaces background-execution status on
                  the row itself. Stays visible regardless of streaming
                  state because that's the whole point: the user can
                  close the tab and come back. */}
              {task.execution?.surface === 'cloud' && (
                <>
                  <span className="opacity-50">·</span>
                  <Cloud
                    className={`w-2.5 h-2.5 ${isDark ? 'text-sky-300' : 'text-sky-700'}`}
                    aria-label="cloud"
                  />
                </>
              )}
              {task.pinned && (
                <Pin className={`w-2.5 h-2.5 ml-auto`} fill="currentColor" />
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

function StatusDot({ status, className = '' }: { status: TaskStatus; className?: string }) {
  // Status communicated by *shape* rather than colour, so the rail stays
  // monochrome (per the no-coloured-stripes design rule).
  const base = 'inline-block w-2 h-2 shrink-0';
  if (status === 'running') {
    return (
      <span
        className={`${base} rounded-full bg-zinc-400/80 coding-breath ${className}`}
        aria-label="running"
      />
    );
  }
  if (status === 'review') {
    return (
      <span
        className={`${base} rounded-full ${className}`}
        style={{ boxShadow: 'inset 0 0 0 1.5px rgb(161 161 170 / 0.85)' }}
        aria-label="review"
      />
    );
  }
  if (status === 'merged') {
    return (
      <span
        className={`${base} rounded-full bg-zinc-500/85 ${className}`}
        aria-label="merged"
      />
    );
  }
  if (status === 'failed') {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 w-2 h-2 ${className}`}
        aria-label="failed"
      >
        <span className="block w-2 h-px bg-zinc-400/80 rotate-45" />
        <span className="block w-2 h-px bg-zinc-400/80 -rotate-45 -ml-2" />
      </span>
    );
  }
  return (
    <span
      className={`${base} rounded-full ${className}`}
      style={{ boxShadow: 'inset 0 0 0 1px rgb(161 161 170 / 0.55)' }}
      aria-label="open"
    />
  );
}
