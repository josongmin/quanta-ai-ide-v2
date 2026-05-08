import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from '@shared/i18n';

type Props = {
  isDark: boolean;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (body: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
};

/**
 * Generic inline composer used for both the "new comment" and the
 * "reply to thread" cases. Submission rules:
 *   - ⌘↵ / Ctrl↵  → submit (only if non-empty after trim)
 *   - Esc         → cancel
 *   - Click       → matching button does the same
 */
export default function InlineCommentComposer({
  isDark,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus = true,
}: Props) {
  const { t } = useTranslation('chat');
  const [body, setBody] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    const trimmed = body.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setBody('');
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const surface = isDark
    ? 'bg-white/[0.04] border-[color:var(--border-default)]'
    : 'bg-black/[0.03] border-[color:var(--border-default)]';
  const textCls = 'text-[color:var(--fg-strong)]';
  const muted = 'text-[color:var(--fg-muted)]';
  const cancelBtn = 'text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-hover)]';
  const submitBtn = 'bg-[#4f9a5c] text-black hover:bg-[#4f9a5c]/90';

  return (
    <div className={`mx-2 my-1 rounded-md border p-2 ${surface}`}>
      <textarea
        ref={ref}
        value={body}
        onChange={(e) => { setBody(e.target.value); }}
        onKeyDown={handleKey}
        placeholder={placeholder ?? t('inlineComment.placeholder')}
        rows={3}
        className={`w-full resize-none bg-transparent outline-none text-[12px] leading-snug ${textCls}`}
      />
      <div className="flex items-center justify-between mt-1.5">
        <div className={`text-[9px] uppercase tracking-[0.18em] font-bold ${muted}`}>
          {t('inlineComment.shortcuts')}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCancel}
            className={`text-[11px] font-bold px-2 py-1 rounded-md transition-colors ${cancelBtn}`}
          >
            {t('inlineComment.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={body.trim().length === 0}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${submitBtn}`}
          >
            {submitLabel ?? t('inlineComment.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
