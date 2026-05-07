import { useMemo, useState } from 'react';
import {
  Search, Plus, ChevronRight, MessageSquare,
  Pin, FolderPlus, ListFilter,
} from 'lucide-react';
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
  isDark: boolean;
  t: (k: string) => string;
};

// Tone down: all projects share a single neutral accent so the rail isn't
// rainbow-keyed by project.
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
  projects, tasks, activeId, onSelect, onNewTask, onNewProject, isDark, t,
}: Props) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'mine' | 'archived'>('all');

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (filter === 'archived') list = list.filter((task) => task.status === 'merged');
    else list = list.filter((task) => task.status !== 'merged' || task.pinned);
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((task) =>
      task.title.toLowerCase().includes(q) ||
      task.branch.toLowerCase().includes(q),
    );
  }, [tasks, query, filter]);

  // Project order: pinned first, then alphabetical. Empty projects (no
  // matching tasks) are still shown so "new task" works for them.
  const visibleProjects = useMemo(() => {
    const order = [...projects].sort((a, b) => {
      const ap = a.pinned ? 0 : 1;
      const bp = b.pinned ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return a.name.localeCompare(b.name);
    });
    if (!query.trim() && filter === 'all') return order;
    // When searching/filtering, hide projects with zero matching tasks.
    return order.filter((p) => filteredTasks.some((task) => task.projectId === p.id));
  }, [projects, filteredTasks, query, filter]);

  const panel = isDark ? 'bg-[#0a0c0f]' : 'bg-white';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';
  const textMuted = isDark ? 'text-white/40' : 'text-black/55';
  const inputBg = isDark ? 'bg-white/[0.03]' : 'bg-black/[0.025]';

  const totalActive = tasks.filter((task) => task.status === 'running' || task.status === 'review').length;

  return (
    <aside className={`shrink-0 w-[284px] flex flex-col ${panel} border-r ${border}`}>
      {/* Top: brand-ish header with running count */}
      <div className="shrink-0 px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${textFaint}`}>
              {t('rail.title')}
            </span>
            {totalActive > 0 && (
              <span className={`flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-mono ${
                isDark ? 'bg-white/[0.06] text-white/70' : 'bg-black/[0.05] text-black/65'
              }`}>
                <span className={`w-1 h-1 rounded-full animate-pulse ${
                  isDark ? 'bg-white/60' : 'bg-black/55'
                }`} />
                {totalActive}
              </span>
            )}
          </div>
          <button type="button"
            onClick={onNewProject}
            title={t('rail.newProject')}
            aria-label={t('rail.newProject')}
            className={`p-1 rounded-md transition-colors ${
              isDark ? 'text-white/40 hover:text-white/85 hover:bg-white/[0.05]' : 'text-black/40 hover:text-black/85 hover:bg-black/[0.04]'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
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

      {/* Filter chips */}
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

      {/* Project groups */}
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
}: {
  project: Project;
  tasks: Task[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewTask: () => void;
  onToggle: () => void;
  collapsed: boolean;
  isDark: boolean;
  t: (k: string) => string;
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
              className="shrink-0 w-1.5 h-1.5 rounded-full animate-pulse"
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
          className="ml-[14px] pl-1 border-l flex flex-col gap-px"
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
                accent={accent}
                isDark={isDark}
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
  task, active, onClick, accent, isDark,
}: {
  task: Task;
  active: boolean;
  onClick: () => void;
  accent: string;
  isDark: boolean;
}) {
  const titleColor = active
    ? (isDark ? 'text-white' : 'text-black')
    : (isDark ? 'text-white/70' : 'text-black/70');
  const subColor = isDark ? 'text-white/40' : 'text-black/40';
  const hoverBg = isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-black/[0.025]';

  return (
    <button type="button"
      onClick={onClick}
      className={`relative w-full text-left rounded-md pl-2.5 pr-2 py-1.5 transition-colors ${hoverBg}`}
      style={{
        background: active ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)') : undefined,
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r"
          style={{ background: accent, boxShadow: `0 0 6px ${accent}80` }}
        />
      )}
      <div className="flex items-start gap-2">
        <StatusDot status={task.status} className="mt-1.5" />
        <div className="flex-1 min-w-0">
          <div className={`text-[12px] leading-snug line-clamp-2 ${titleColor}`}>
            {task.title}
          </div>
          <div className={`mt-1 flex items-center gap-1.5 text-[10px] font-mono ${subColor}`}>
            <span>{task.timeAgo}</span>
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
            {task.pinned && (
              <Pin className={`w-2.5 h-2.5 ml-auto`} fill="currentColor" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function StatusDot({ status, className = '' }: { status: TaskStatus; className?: string }) {
  // Single neutral dot; running gets a pulse, others are static. Status is
  // still readable from the row text + count badges.
  const pulse = status === 'running' ? 'animate-pulse' : '';
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-zinc-400/70 ${pulse} ${className}`}
    />
  );
}
