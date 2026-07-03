import { Paperclip, Send } from 'lucide-react';
import { SectionHead } from '@shared/ui/marketing';
import { Field } from './Field';
import { PRIORITIES, PRIORITY_TONE, type Priority } from './types';

export function ComposeForm({
  priority, onPriorityChange,
}: { priority: Priority; onPriorityChange: (p: Priority) => void }) {
  return (
    <div className="col-span-2">
      <SectionHead eyebrow="New ticket" title="Tell us what's going on" align="left" />
      <div
        className="rounded-xl p-6 flex flex-col gap-5"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Field label="Subject">
          <input
            placeholder="Short description"
            className="w-full bg-transparent outline-none text-base h-9 px-3 rounded-md"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          />
        </Field>

        <Field label="Category">
          <select
            className="w-full bg-transparent outline-none text-base h-9 px-3 rounded-md"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          >
            <option>Admission rules</option>
            <option>Agents</option>
            <option>Authentication / SSO</option>
            <option>Billing</option>
            <option>Webhooks</option>
            <option>Other</option>
          </select>
        </Field>

        <Field label="Priority" hint="Urgent paged 24/7 (Business+)">
          <div className="grid grid-cols-4 gap-1.5">
            {PRIORITIES.map((p) => {
              const active = priority === p;
              const tone = PRIORITY_TONE[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => { onPriorityChange(p); }}
                  className="h-8 rounded-md text-sm font-semibold uppercase tracking-[0.08em] transition-colors"
                  style={{
                    color: active ? tone : 'var(--fg-muted)',
                    background: active
                      ? `color-mix(in srgb, ${tone} 14%, transparent)`
                      : 'transparent',
                    border: `1px solid ${active ? `color-mix(in srgb, ${tone} 40%, transparent)` : 'var(--border-default)'}`,
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Describe the issue" hint="Reproduction steps help.">
          <textarea
            rows={6}
            placeholder="What did you do? What did you expect? What happened?"
            className="w-full bg-transparent outline-none text-base p-3 rounded-md resize-y"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          />
        </Field>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-colors"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-default)',
            }}
          >
            <Paperclip className="w-3.5 h-3.5" />
            Attach files
          </button>
          <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
            Max 25MB · logs, screenshots, HAR
          </span>
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1.5 h-9 px-5 rounded-md text-base font-semibold transition-colors"
            style={{ background: 'var(--fg-accent)', color: '#fff' }}
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
