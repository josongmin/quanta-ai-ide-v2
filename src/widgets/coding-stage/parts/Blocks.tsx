import { useState } from 'react';
import {
  FileCode, Terminal, Search, Sparkles, Globe,
  ChevronRight, Check, Brain, ArrowRight, GitPullRequest,
  CheckCircle2, XCircle, Loader2, Copy, ExternalLink,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type {
  AgentBlock, ToolBlock, DiffBlock, TextBlock, ThinkingBlock, PlanBlock, CodingFileChange,
} from './types';

// Each block knows how to render itself. Tool blocks expand inline to show
// terminal output; diff blocks expand each file to show hunks. The
// expandability is local UI state — refreshing the page would reset it.

export function BlockView({ block, isDark }: { block: AgentBlock; isDark: boolean }) {
  if (block.kind === 'text') return <TextBlockView block={block} isDark={isDark} />;
  if (block.kind === 'thinking') return <ThinkingBlockView block={block} isDark={isDark} />;
  if (block.kind === 'plan') return <PlanBlockView block={block} isDark={isDark} />;
  if (block.kind === 'tool') return <ToolBlockView block={block} isDark={isDark} />;
  return <DiffBlockView block={block} isDark={isDark} />;
}

// ─── text ─────────────────────────────────────────────────────────────────

function TextBlockView({ block, isDark }: { block: TextBlock; isDark: boolean }) {
  const color = isDark ? 'text-white/85' : 'text-black/85';
  // Tiny inline-code formatter: anything between backticks gets a chip.
  const parts = block.text.split(/(`[^`]+`)/g);
  return (
    <div className={`text-[13px] leading-[1.65] ${color} whitespace-pre-wrap break-words`}>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') && p.length > 2 ? (
          <code
            key={i}
            className={`mx-px px-1 py-px rounded-md text-[12px] font-mono ${
              isDark
                ? 'bg-white/[0.08] text-emerald-300/90 border border-white/[0.06]'
                : 'bg-black/[0.05] text-emerald-700 border border-black/[0.05]'
            }`}
          >
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
}

// ─── thinking ─────────────────────────────────────────────────────────────

function ThinkingBlockView({ block, isDark }: { block: ThinkingBlock; isDark: boolean }) {
  const { t } = useTranslation('coding');
  const [open, setOpen] = useState(false);
  const seconds = (block.durationMs / 1000).toFixed(1);
  const muted = isDark ? 'text-white/40' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  return (
    <div>
      <button type="button"
        onClick={() => { setOpen((v) => !v); }}
        className={`group flex items-center gap-1.5 text-[11px] font-medium transition-colors ${muted} hover:${isDark ? 'text-white/70' : 'text-black/70'}`}
      >
        <Brain className="w-3 h-3" />
        <span>{t('block.thoughtFor', { seconds })}</span>
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div
          className={`mt-1.5 ml-4 pl-3 border-l text-[12px] leading-[1.6] italic ${
            isDark ? 'border-white/[0.08] text-white/55' : 'border-black/[0.08] text-black/55'
          }`}
        >
          {block.text}
        </div>
      )}
      {!open && (
        <div className={`ml-4 mt-0.5 text-[11px] ${faint} italic line-clamp-1`}>
          {block.text}
        </div>
      )}
    </div>
  );
}

// ─── plan ─────────────────────────────────────────────────────────────────

function PlanBlockView({ block, isDark }: { block: PlanBlock; isDark: boolean }) {
  const done = block.items.filter((i) => i.done).length;
  const total = block.items.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const card = isDark
    ? 'bg-gradient-to-b from-white/[0.04] to-white/[0.015] border-white/[0.08]'
    : 'bg-gradient-to-b from-black/[0.025] to-transparent border-black/[0.08]';
  const labelColor = isDark ? 'text-white/85' : 'text-black/85';
  const sub = isDark ? 'text-white/40' : 'text-black/55';
  const checkOff = isDark ? 'border-white/15' : 'border-black/15';
  const checkOn = isDark ? 'bg-emerald-400/90 border-emerald-400/90' : 'bg-emerald-600 border-emerald-600';
  return (
    <div className={`rounded-lg border ${card} p-3`}>
      <div className="flex items-center gap-2 mb-2.5">
        <Sparkles className={`w-3 h-3 ${sub}`} />
        <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${sub}`}>plan</span>
        <span className={`text-[12px] font-semibold ${labelColor}`}>{block.title}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <div className={`w-16 h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.08]' : 'bg-black/[0.06]'}`}>
            <div
              className="h-full bg-emerald-500/80 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-[11px] font-mono ${sub}`}>{done}/{total}</span>
        </div>
      </div>
      <ol className="space-y-1.5">
        {block.items.map((item, i) => (
          <li key={item.id} className="flex items-start gap-2">
            <span
              className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-[5px] border shrink-0 ${
                item.done ? checkOn : checkOff
              }`}
            >
              {item.done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
            </span>
            <span className={`text-[12px] leading-relaxed ${
              item.done
                ? (isDark ? 'text-white/40 line-through' : 'text-black/40 line-through')
                : labelColor
            }`}>
              <span className={`mr-1.5 font-mono text-[11px] ${sub}`}>{i + 1}.</span>
              {item.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── tool ─────────────────────────────────────────────────────────────────

const TOOL_META = {
  read:   { Icon: FileCode, label: 'read',   tone: { d: 'text-sky-300',     l: 'text-sky-700' } },
  edit:   { Icon: FileCode, label: 'edit',   tone: { d: 'text-emerald-300', l: 'text-emerald-700' } },
  run:    { Icon: Terminal, label: 'run',    tone: { d: 'text-amber-300',   l: 'text-amber-700' } },
  search: { Icon: Search,   label: 'search', tone: { d: 'text-violet-300',  l: 'text-violet-700' } },
  plan:   { Icon: Sparkles, label: 'plan',   tone: { d: 'text-pink-300',    l: 'text-pink-700' } },
  web:    { Icon: Globe,    label: 'web',    tone: { d: 'text-cyan-300',    l: 'text-cyan-700' } },
} as const;

function ToolBlockView({ block, isDark }: { block: ToolBlock; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[block.tool];
  const Icon = meta.Icon;
  const tone = isDark ? meta.tone.d : meta.tone.l;
  const card = isDark ? 'bg-white/[0.025] border-white/[0.06] hover:border-white/[0.12]' : 'bg-white border-black/[0.06] hover:border-black/[0.12]';
  const textPrimary = isDark ? 'text-white/85' : 'text-black/85';
  const textFaint = isDark ? 'text-white/40' : 'text-black/40';
  const StatusIcon = block.status === 'fail' ? XCircle : block.status === 'running' ? Loader2 : CheckCircle2;
  const statusTone = block.status === 'fail' ? 'text-rose-400' : block.status === 'running' ? 'text-amber-400 animate-spin' : 'text-emerald-400';

  return (
    <div className={`rounded-md border overflow-hidden transition-colors ${card}`}>
      <button type="button"
        onClick={() => { if (block.output) setOpen((v) => !v); }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <Icon className={`w-3 h-3 shrink-0 ${tone}`} />
        <span className={`uppercase tracking-[0.18em] text-[9px] font-bold shrink-0 ${tone}`}>
          {meta.label}
        </span>
        <span className={`flex-1 truncate font-mono text-[12px] ${textPrimary}`}>{block.label}</span>
        {block.detail && (
          <span className={`shrink-0 font-mono text-[11px] ${textFaint}`}>{block.detail}</span>
        )}
        {block.status && (
          <StatusIcon className={`w-3 h-3 shrink-0 ${statusTone}`} />
        )}
        {block.output && (
          <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${textFaint} ${open ? 'rotate-90' : ''}`} />
        )}
      </button>
      {open && block.output && (
        <div className={`border-t ${isDark ? 'border-white/[0.06] bg-black/40' : 'border-black/[0.05] bg-black/[0.92]'}`}>
          <pre className={`px-3 py-2 text-[11px] leading-[1.55] font-mono overflow-x-auto whitespace-pre ${
            isDark ? 'text-white/70' : 'text-white/85'
          } scrollbar-thin`}>
            {block.output}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── diff ─────────────────────────────────────────────────────────────────

function DiffBlockView({ block, isDark }: { block: DiffBlock; isDark: boolean }) {
  const { t } = useTranslation('coding');
  const textMuted = isDark ? 'text-white/55' : 'text-black/55';
  const textFaint = isDark ? 'text-white/40' : 'text-black/40';
  const card = isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-black/[0.08]';
  const headerBorder = isDark ? 'border-white/[0.06]' : 'border-black/[0.05]';

  return (
    <div className={`rounded-lg border overflow-hidden ${card} shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${headerBorder}`}>
        <GitPullRequest className={`w-3 h-3 ${textMuted}`} />
        <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${textFaint}`}>
          changes
        </span>
        <span className={`text-[11px] font-mono ${textMuted}`}>
          {block.files.length} {block.files.length === 1 ? t('block.fileOne') : t('block.fileMany')}
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-emerald-500">+{block.added}</span>
          <span className="text-rose-500">−{block.removed}</span>
        </div>
      </div>

      <div className={isDark ? 'divide-y divide-white/[0.04]' : 'divide-y divide-black/[0.04]'}>
        {block.files.map((file) => (
          <FileRow key={file.path} file={file} isDark={isDark} />
        ))}
      </div>

      <div className={`flex items-center justify-between px-2.5 py-2 border-t ${headerBorder} ${
        isDark ? 'bg-white/[0.015]' : 'bg-black/[0.02]'
      }`}>
        <span className={`text-[11px] font-mono ${textFaint}`}>{t('block.readyToReview')}</span>
        <div className="flex items-center gap-1">
          <button type="button" className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
            isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.06]' : 'text-black/55 hover:text-black hover:bg-black/[0.06]'
          }`}>
            <Copy className="w-2.5 h-2.5" />
            {t('block.patch')}
          </button>
          <button type="button" className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
            isDark
              ? 'text-emerald-200 bg-emerald-400/10 hover:bg-emerald-400/15 border border-emerald-400/20'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
          }`}>
            <ExternalLink className="w-2.5 h-2.5" />
            {t('block.openPr')}
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FileRow({ file, isDark }: { file: CodingFileChange; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const expandable = file.hunks.length > 0;
  const textPrimary = isDark ? 'text-white/85' : 'text-black/85';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';
  return (
    <div>
      <button type="button"
        disabled={!expandable}
        onClick={() => { if (expandable) setOpen((v) => !v); }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors ${
          expandable
            ? (isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-black/[0.025]')
            : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {expandable && (
            <ChevronRight className={`w-3 h-3 transition-transform ${textFaint} ${open ? 'rotate-90' : ''}`} />
          )}
          {!expandable && <span className="w-3 h-3 shrink-0" />}
          <span className={`text-[11px] font-mono truncate ${textPrimary}`}>{file.path}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
          <span className="text-emerald-500">+{file.added}</span>
          <span className="text-rose-500">−{file.removed}</span>
          <DiffBar added={file.added} removed={file.removed} isDark={isDark} />
        </div>
      </button>
      {open && expandable && (
        <div className={`px-3 pb-2`}>
          {file.hunks.map((hunk, i) => (
            <div key={i} className={`mt-1 rounded-md overflow-hidden border ${
              isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'
            }`}>
              <div className={`px-2 py-1 text-[10px] font-mono ${
                isDark ? 'bg-white/[0.02] text-white/40' : 'bg-black/[0.025] text-black/55'
              }`}>
                {hunk.header}
              </div>
              <div className="font-mono text-[11px] leading-[1.55]">
                {hunk.lines.map((line, j) => (
                  <div
                    key={j}
                    className={`px-2 py-px whitespace-pre ${
                      line.kind === 'add'
                        ? (isDark ? 'bg-emerald-400/[0.08] text-emerald-200/90' : 'bg-emerald-100/60 text-emerald-900')
                        : line.kind === 'del'
                        ? (isDark ? 'bg-rose-400/[0.08] text-rose-200/90' : 'bg-rose-100/60 text-rose-900')
                        : (isDark ? 'text-white/55' : 'text-black/55')
                    }`}
                  >
                    <span className={`select-none mr-2 inline-block w-3 ${
                      line.kind === 'add' ? 'text-emerald-500' : line.kind === 'del' ? 'text-rose-500' : (isDark ? 'text-white/30' : 'text-black/30')
                    }`}>
                      {line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '}
                    </span>
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tiny visual bar showing add/remove ratio. Caps at 5 segments total.
function DiffBar({ added, removed, isDark }: { added: number; removed: number; isDark: boolean }) {
  const total = added + removed;
  if (total === 0) return null;
  const segs = 5;
  const a = Math.round((added / total) * segs);
  const d = segs - a;
  const idle = isDark ? 'bg-white/[0.10]' : 'bg-black/[0.08]';
  return (
    <div className="flex items-center gap-px ml-1">
      {Array.from({ length: a }).map((_, i) => (
        <span key={`a${i}`} className="w-1 h-1.5 rounded-sm bg-emerald-500/80" />
      ))}
      {Array.from({ length: d }).map((_, i) => (
        <span key={`d${i}`} className={`w-1 h-1.5 rounded-sm ${i < removed ? 'bg-rose-500/70' : idle}`} />
      ))}
    </div>
  );
}
