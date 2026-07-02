import { useRef, useState, type RefObject } from 'react';
import { ArrowUp, Paperclip, Hash, AtSign, Cpu, ChevronDown } from 'lucide-react';
import { useClickOutside } from '@shared/lib';
import { MODELS, type TFn } from './types';

export function Composer({
  inputRef,
  value,
  pending,
  onChange,
  onKeyDown,
  onSend,
  t,
}: {
  inputRef: RefObject<HTMLTextAreaElement>;
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  t: TFn;
}) {
  const canSend = value.trim() !== '' && !pending;
  return (
    <div className="shrink-0 border-t" style={{ borderColor: 'var(--border-default)' }}>
      <div className="px-3 pt-2.5 pb-2">
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          onKeyDown={onKeyDown}
          placeholder={t('composer.placeholder')}
          spellCheck={false}
          className="w-full bg-transparent resize-none text-[12px] leading-relaxed font-medium focus:outline-none placeholder:text-[color:var(--fg-subtle)]"
          style={{ maxHeight: 120, color: 'var(--fg-strong)' }}
        />
      </div>
      <div
        className="flex items-center justify-between px-2 pb-2 pt-1 border-t"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <div className="flex items-center gap-1">
          <ToolChip title={t('composer.attachFile')} icon={Paperclip} />
          <ToolChip title={t('composer.mentionFile')} icon={Hash} />
          <ToolChip title={t('composer.mentionPerson')} icon={AtSign} />
          <span className="mx-1 h-3 w-px" style={{ background: 'var(--border-default)' }} />
          <ModelChip t={t} />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-mono"
            style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
          >
            <kbd
              className="px-1 py-0.5 rounded-md"
              style={{ background: 'var(--bg-elevated)', color: 'var(--fg-subtle)' }}
            >↵</kbd> {t('composer.hintSend')}
            <span className="mx-1.5 opacity-50">·</span>
            <kbd
              className="px-1 py-0.5 rounded-md"
              style={{ background: 'var(--bg-elevated)', color: 'var(--fg-subtle)' }}
            >⇧↵</kbd> {t('composer.hintNewline')}
          </span>
          <button type="button"
            onClick={onSend}
            disabled={!canSend}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-all"
            style={
              canSend
                ? { background: 'var(--intent-success-vivid)', color: 'var(--bg-canvas)' }
                : { background: 'var(--bg-elevated)', color: 'var(--fg-subtle)' }
            }
            title={t('composer.send')}
            aria-label={t('composer.sendAria')}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ModelChip({
  t,
}: {
  t: TFn;
}) {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState(MODELS[0]);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, open, () => { setOpen(false); });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        title={t('composer.model')}
        className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[9px] font-mono transition-colors hover-surface"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--fg-muted)',
        }}
      >
        <Cpu className="w-2.5 h-2.5" />
        <span>{model}</span>
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-1 w-[180px] rounded-lg border shadow-2xl chat-agent-model-pop"
          style={{
            borderColor: 'var(--border-default)',
            background: 'var(--bg-overlay)',
          }}
        >
          {MODELS.map((m) => {
            const a = m === model;
            return (
              <button type="button"
                key={m}
                onClick={() => { setModel(m); setOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 text-[10px] font-mono transition-colors hover-surface"
                style={
                  a
                    ? { background: 'var(--bg-active)', color: 'var(--fg-strong)' }
                    : { color: 'var(--fg-muted)' }
                }
              >
                {m}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToolChip({
  title, icon: Icon,
}: {
  title: string; icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button type="button"
      title={title}
      aria-label={title}
      className="p-1.5 rounded-md transition-colors hover-surface"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
