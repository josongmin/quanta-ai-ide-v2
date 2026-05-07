import { useEffect, useRef, useState } from 'react';
import {
  Code2, MessageSquare, GitBranch, ChevronDown, Paperclip, Globe,
  Sparkles, ArrowUp, Square, Command, AtSign, Hash, Slash, Image as ImageIcon,
  Cpu,
} from 'lucide-react';

// Composer with intent toggle, model picker, slash commands, and a small
// branch chip. Submission goes via Cmd/Ctrl+Enter or Enter (Shift+Enter
// inserts a newline). Slash menu pops above the textarea when the input
// starts with `/`.

type Intent = 'code' | 'ask';

const SLASH_COMMANDS: { cmd: string; desc: string }[] = [
  { cmd: '/plan', desc: 'Outline a plan before coding' },
  { cmd: '/test', desc: 'Add tests for changed surfaces' },
  { cmd: '/fix', desc: 'Diagnose and fix the latest failure' },
  { cmd: '/explain', desc: 'Explain a region of code' },
  { cmd: '/review', desc: 'Review the working branch' },
  { cmd: '/clean', desc: 'Refactor for clarity, no behavior change' },
];

const MODELS = [
  { id: 'claude-opus-4-7', label: 'opus 4.7', tag: 'most capable' },
  { id: 'claude-sonnet-4-6', label: 'sonnet 4.6', tag: 'balanced' },
  { id: 'claude-haiku-4-5', label: 'haiku 4.5', tag: 'fastest' },
];

type Props = {
  draft: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  intent: Intent;
  onIntent: (v: Intent) => void;
  isDark: boolean;
  t: (k: string) => string;
  isStreaming: boolean;
  branch: string;
  baseBranch: string;
};

export function Composer({
  draft, onChange, onSubmit, onStop, intent, onIntent, isDark, t, isStreaming, branch, baseBranch,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [model, setModel] = useState(MODELS[0]);
  const [modelOpen, setModelOpen] = useState(false);

  const showSlash = draft.startsWith('/');
  const slashFiltered = showSlash
    ? SLASH_COMMANDS.filter((c) => c.cmd.startsWith(draft.split(/\s+/, 1)[0]))
    : [];
  const [slashIndex, setSlashIndex] = useState(0);
  // Reset slash highlight when the filtered list changes shape. Using the
  // "derive from prop" pattern (state-reset-during-render) avoids the
  // cascading re-render warning that the effect-based version triggered.
  const [prevDraft, setPrevDraft] = useState(draft);
  if (draft !== prevDraft) {
    setPrevDraft(draft);
    setSlashIndex(0);
  }

  // Auto-grow the textarea up to 240px.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(240, ta.scrollHeight)}px`;
  }, [draft]);

  const canSubmit = draft.trim().length > 0 && !isStreaming;

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showSlash && slashFiltered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % slashFiltered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + slashFiltered.length) % slashFiltered.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        const picked = slashFiltered[slashIndex];
        const rest = draft.includes(' ') ? draft.slice(draft.indexOf(' ')) : '';
        onChange(picked.cmd + rest + ' ');
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onChange('');
        return;
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canSubmit) onSubmit();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  // Close model menu on outside click
  const modelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!modelOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
    };
    window.addEventListener('mousedown', onDoc);
    return () => { window.removeEventListener('mousedown', onDoc); };
  }, [modelOpen]);

  const card = isDark
    ? 'bg-[#11141a] border-white/[0.08] focus-within:border-white/[0.20]'
    : 'bg-white border-black/[0.08] focus-within:border-black/[0.20]';
  const textPrimary = isDark ? 'text-white/85' : 'text-black/85';
  const textMuted = isDark ? 'text-white/40' : 'text-black/40';
  const chipActive = isDark ? 'bg-white/[0.10] text-white' : 'bg-black/[0.08] text-black';
  const chipIdle = isDark ? 'text-white/40 hover:text-white/85 hover:bg-white/[0.04]' : 'text-black/40 hover:text-black/85 hover:bg-black/[0.04]';

  return (
    <div className="relative">
      {/* Slash command menu */}
      {showSlash && slashFiltered.length > 0 && (
        <div
          className={`absolute bottom-[calc(100%+8px)] left-0 right-0 rounded-xl border shadow-2xl overflow-hidden ${
            isDark ? 'border-white/[0.10] bg-[#0f1218]/95' : 'border-black/[0.10] bg-white/95'
          }`}
          style={{
            backdropFilter: 'blur(22px) saturate(160%)',
            WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          }}
        >
          <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
            isDark ? 'text-white/40 bg-white/[0.02]' : 'text-black/40 bg-black/[0.02]'
          }`}>
            <Slash className="inline w-2.5 h-2.5 mr-1" />
            slash commands
          </div>
          <div className={isDark ? 'divide-y divide-white/[0.04]' : 'divide-y divide-black/[0.04]'}>
            {slashFiltered.map((c, i) => {
              const active = i === slashIndex;
              return (
                <button type="button"
                  key={c.cmd}
                  onMouseEnter={() => { setSlashIndex(i); }}
                  onClick={() => {
                    onChange(c.cmd + ' ');
                    taRef.current?.focus();
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                    active
                      ? (isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]')
                      : (isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.02]')
                  }`}
                >
                  <span className={`font-mono text-[12px] font-semibold ${
                    isDark ? 'text-emerald-300' : 'text-emerald-700'
                  }`}>
                    {c.cmd}
                  </span>
                  <span className={`text-[11px] ${textMuted}`}>{c.desc}</span>
                  {active && (
                    <span className={`ml-auto text-[9px] font-mono ${
                      isDark ? 'text-white/40' : 'text-black/40'
                    }`}>
                      ↵
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`rounded-2xl border ${card} shadow-[0_4px_24px_-8px_rgba(0,0,0,0.10)] transition-colors`}>
        {/* Top row: intent + branch */}
        <div className="flex items-center gap-1 px-2 pt-2">
          <button type="button"
            onClick={() => { onIntent('code'); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              intent === 'code' ? chipActive : chipIdle
            }`}
          >
            <Code2 className="w-3 h-3" />
            {t('composer.code')}
          </button>
          <button type="button"
            onClick={() => { onIntent('ask'); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              intent === 'ask' ? chipActive : chipIdle
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            {t('composer.ask')}
          </button>
          <div className="flex-1" />
          <button type="button" className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${chipIdle}`}>
            <GitBranch className="w-3 h-3" />
            <span>{branch}</span>
            <span className={`opacity-50`}>← {baseBranch}</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => { onChange(e.target.value); }}
          onKeyDown={onKeyDown}
          placeholder={intent === 'code' ? t('composer.placeholder.code') : t('composer.placeholder.ask')}
          rows={2}
          className={`w-full px-4 py-2.5 bg-transparent outline-none resize-none text-[13px] leading-relaxed ${textPrimary} ${
            isDark ? 'placeholder:text-white/30' : 'placeholder:text-black/30'
          } scrollbar-thin`}
          style={{ minHeight: 60, maxHeight: 240 }}
          spellCheck={false}
        />

        {/* Bottom row */}
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-0.5">
            <ToolBtn icon={Paperclip} title={t('composer.attach')} isDark={isDark} />
            <ToolBtn icon={ImageIcon} title={t('composer.image')} isDark={isDark} />
            <ToolBtn icon={Hash} title={t('composer.mentionFile')} isDark={isDark} />
            <ToolBtn icon={AtSign} title={t('composer.mentionSymbol')} isDark={isDark} />
            <ToolBtn icon={Globe} title={t('composer.web')} isDark={isDark} />
            <ToolBtn icon={Sparkles} title={t('composer.suggest')} isDark={isDark} />
            <span className={`mx-1 h-3.5 w-px ${isDark ? 'bg-white/[0.08]' : 'bg-black/[0.08]'}`} />
            <div ref={modelRef} className="relative">
              <button type="button"
                onClick={() => { setModelOpen((v) => !v); }}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${chipIdle}`}
              >
                <Cpu className="w-3 h-3" />
                <span>{model.label}</span>
                <ChevronDown className={`w-2.5 h-2.5 opacity-60 transition-transform ${modelOpen ? 'rotate-180' : ''}`} />
              </button>
              {modelOpen && (
                <div
                  className={`absolute bottom-full left-0 mb-1 w-[210px] rounded-lg border shadow-2xl overflow-hidden ${
                    isDark ? 'border-white/[0.10]' : 'border-black/[0.10]'
                  }`}
                  style={{
                    background: isDark ? 'rgba(15,18,24,0.96)' : 'rgba(255,255,255,0.98)',
                    backdropFilter: 'blur(22px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(22px) saturate(160%)',
                  }}
                >
                  {MODELS.map((m) => {
                    const active = m.id === model.id;
                    return (
                      <button type="button"
                        key={m.id}
                        onClick={() => { setModel(m); setModelOpen(false); }}
                        className={`w-full text-left px-2.5 py-2 transition-colors ${
                          active
                            ? (isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]')
                            : (isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.02]')
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-mono text-[11px] font-semibold ${textPrimary}`}>
                            {m.label}
                          </span>
                          <span className={`text-[10px] ${textMuted}`}>{m.tag}</span>
                        </div>
                        <div className={`mt-0.5 font-mono text-[10px] ${
                          isDark ? 'text-white/30' : 'text-black/40'
                        }`}>
                          {m.id}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-[10px] font-mono ${textMuted}`}>
              <Kbd isDark={isDark}><Command className="w-2.5 h-2.5" /></Kbd>
              <Kbd isDark={isDark}>↵</Kbd>
            </span>
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-semibold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 transition-colors"
              >
                <Square className="w-2.5 h-2.5" fill="currentColor" />
                {t('composer.stop')}
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-semibold transition-all ${
                  canSubmit
                    ? (isDark
                        ? 'bg-white text-black hover:bg-white/90 shadow-[0_2px_8px_rgba(255,255,255,0.10)]'
                        : 'bg-black text-white hover:bg-black/90 shadow-[0_2px_8px_rgba(0,0,0,0.20)]')
                    : (isDark ? 'bg-white/[0.06] text-white/30 cursor-not-allowed' : 'bg-black/[0.05] text-black/30 cursor-not-allowed')
                }`}
              >
                {intent === 'code' ? t('composer.runCode') : t('composer.runAsk')}
                <ArrowUp className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  icon: Icon, title, isDark,
}: { icon: React.ComponentType<{ className?: string }>; title: string; isDark: boolean }) {
  return (
    <button type="button"
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-md transition-colors ${
        isDark ? 'text-white/40 hover:text-white/85 hover:bg-white/[0.05]' : 'text-black/40 hover:text-black/85 hover:bg-black/[0.04]'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function Kbd({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  return (
    <kbd className={`px-1 h-4 inline-flex items-center justify-center rounded-md ${
      isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]'
    }`}>
      {children}
    </kbd>
  );
}
