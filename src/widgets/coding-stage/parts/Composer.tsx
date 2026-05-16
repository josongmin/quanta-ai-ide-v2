import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Code2, MessageSquare, GitBranch, ChevronDown, Paperclip, Globe,
  Sparkles, ArrowUp, Square, Command, AtSign, Hash, Slash, Image as ImageIcon,
  Cpu, Mic, Save,
} from 'lucide-react';
import {
  MentionPicker, findMentionAtCaret,
  type MentionItem, type MentionTrigger,
} from './palette/MentionPicker';
import { useClickOutside, scanForSecrets, redactText, type SecretMatch } from '@shared/lib';

// Composer with intent toggle, model picker, slash commands, mention
// pickers (`#` for files, `@` for symbols), and a small branch chip.
// Submission goes via Cmd/Ctrl+Enter or Enter (Shift+Enter inserts a
// newline). Slash menu pops above the textarea when the input starts
// with `/`.
//
// IME-safe: Enter is suppressed while a CJK composition is in progress
// so Korean/Japanese/Chinese hangul/kana/IME candidates can land without
// accidentally submitting the draft.

type Intent = 'code' | 'ask';

const SLASH_COMMANDS: { cmd: string; desc: string }[] = [
  { cmd: '/plan', desc: 'Outline a plan before coding' },
  { cmd: '/diff', desc: 'Preview a branch or PR diff inline' },
  { cmd: '/test', desc: 'Add tests for changed surfaces' },
  { cmd: '/fix', desc: 'Diagnose and fix the latest failure' },
  { cmd: '/explain', desc: 'Explain a region of code' },
  { cmd: '/review', desc: 'Review the working branch' },
  { cmd: '/clean', desc: 'Refactor for clarity, no behavior change' },
];

// Exported so the parent (CodingStage) can lift the model selection up
// and persist it / record it on each agent turn. The Composer renders
// the picker but no longer owns the chosen model.
export const COMPOSER_MODELS = [
  { id: 'claude-opus-4-7', label: 'opus 4.7', tagKey: 'capable' as const },
  { id: 'claude-sonnet-4-6', label: 'sonnet 4.6', tagKey: 'balanced' as const },
  { id: 'claude-haiku-4-5', label: 'haiku 4.5', tagKey: 'fast' as const },
];
export type ComposerModelId = typeof COMPOSER_MODELS[number]['id'];

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
  model: ComposerModelId;
  onModelChange: (id: ComposerModelId) => void;
  // Save the current model as the active project's default. Optional —
  // when omitted (e.g. ChatAgent ambient widget), the menu item hides.
  onSaveProjectDefaultModel?: () => void;
  // Per-task prompt history. ↑/↓ on an empty (or pristine-history)
  // textarea recalls past prompts shell-style. Optional — ChatAgent
  // and other lighter consumers can omit it.
  history?: string[];
};

export function Composer({
  draft, onChange, onSubmit, onStop, intent, onIntent, isDark, t, isStreaming, branch, baseBranch,
  model: modelId, onModelChange, onSaveProjectDefaultModel, history,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const model = COMPOSER_MODELS.find((m) => m.id === modelId) ?? COMPOSER_MODELS[0];
  const [modelOpen, setModelOpen] = useState(false);

  // IME composition: when the user is mid-composition (e.g. typing 한글),
  // browsers fire keydown for the *raw* trigger key (Enter to commit,
  // arrow keys to pick a candidate). Submitting on those keys destroys
  // the input. `composing` mirrors compositionstart/end so the keydown
  // handler can bail.
  const [composing, setComposing] = useState(false);

  // Live voice transcript that hasn't yet been committed to the draft.
  // Rendered as ghost text overlaid on the textarea; cleared when speech
  // ends or the recogniser commits a final result.
  const [voiceInterim, setVoiceInterim] = useState('');

  // Secret guard: scan on every change. Critical matches block submit
  // until the user explicitly resolves; warn matches surface a soft
  // toast that allows send-as-is. Pattern from GitHub Secret Scanning
  // in editor + Slack DLP.
  const secretMatches = useMemo<SecretMatch[]>(() => scanForSecrets(draft), [draft]);
  const criticalSecrets = useMemo(
    () => secretMatches.filter((m) => m.pattern.severity === 'critical'),
    [secretMatches],
  );
  const warnSecrets = useMemo(
    () => secretMatches.filter((m) => m.pattern.severity === 'warn'),
    [secretMatches],
  );
  // Modal state: null = no challenge; { …matches } = block-or-mask
  // dialog floats above the composer until the user resolves.
  const [secretChallenge, setSecretChallenge] = useState<{ matches: SecretMatch[]; mode: 'block' | 'warn' } | null>(null);
  const [warnDismissed, setWarnDismissed] = useState(false);

  // Guarded submit: block on critical, soft-warn once on warn-severity,
  // pass through after user dismisses or masks. The mask path edits the
  // draft *first* (so the user sees what's about to be sent) and lets
  // the next keystroke or click trigger the actual submit.
  const guardedSubmit = useCallback(() => {
    if (criticalSecrets.length > 0) {
      setSecretChallenge({ matches: criticalSecrets, mode: 'block' });
      return;
    }
    if (warnSecrets.length > 0 && !warnDismissed) {
      setSecretChallenge({ matches: warnSecrets, mode: 'warn' });
      return;
    }
    onSubmit();
  }, [criticalSecrets, warnSecrets, warnDismissed, onSubmit]);

  function maskAndSend() {
    const all = [...criticalSecrets, ...warnSecrets];
    const { text } = redactText(draft, all);
    onChange(text);
    setSecretChallenge(null);
    // Defer one frame so the redacted draft paints before submit.
    requestAnimationFrame(() => { onSubmit(); });
  }

  function sendAsIs() {
    setSecretChallenge(null);
    setWarnDismissed(true);
    requestAnimationFrame(() => { onSubmit(); });
  }

  // Prompt-history navigation. `historyIdx === null` means "live draft".
  // Walking back into history saves the current draft so ↓ past the
  // newest entry restores what you were typing — shell-style.
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const savedDraftRef = useRef<string>('');
  function recallHistory(direction: 'up' | 'down') {
    if (history == null || history.length === 0) return false;
    if (direction === 'up') {
      // Only step into history when the textarea is empty or already
      // mirroring a history entry — otherwise ↑ should move the caret.
      if (historyIdx == null) {
        if (draft.trim().length > 0 && !history.includes(draft)) return false;
        savedDraftRef.current = draft;
        const newIdx = history.length - 1;
        setHistoryIdx(newIdx);
        onChange(history[newIdx]);
        return true;
      }
      if (historyIdx > 0) {
        const newIdx = historyIdx - 1;
        setHistoryIdx(newIdx);
        onChange(history[newIdx]);
        return true;
      }
      return false;
    }
    // down
    if (historyIdx == null) return false;
    if (historyIdx < history.length - 1) {
      const newIdx = historyIdx + 1;
      setHistoryIdx(newIdx);
      onChange(history[newIdx]);
      return true;
    }
    // Past the newest entry → restore the saved draft.
    setHistoryIdx(null);
    onChange(savedDraftRef.current);
    return true;
  }

  // Stop button "warm-up": gentler tone in the first ~5s, then escalates
  // to amber/rose. Resets every time streaming starts.
  const [stopHeat, setStopHeat] = useState<0 | 1 | 2>(0);
  /* eslint-disable react-hooks/set-state-in-effect --
   * The stop-button heat is *driven by* the external isStreaming prop and
   * a timer; setState inside the effect is the only sensible place to
   * reset/escalate that visual state. */
  useEffect(() => {
    if (!isStreaming) {
      setStopHeat(0);
      return;
    }
    setStopHeat(0);
    const t1 = window.setTimeout(() => { setStopHeat(1); }, 5000);
    const t2 = window.setTimeout(() => { setStopHeat(2); }, 15000);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [isStreaming]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  // Mention picker state. We probe the textarea's caret position on every
  // change/selection event; when the caret sits inside a `#…` or `@…`
  // token, `mention` becomes non-null and the picker renders.
  const [caret, setCaret] = useState(0);
  type Mention = { trigger: MentionTrigger; query: string; start: number };
  const [mention, setMention] = useState<Mention | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionItemsRef = useRef<MentionItem[]>([]);
  const setMentionItems = useCallback((items: MentionItem[]) => {
    mentionItemsRef.current = items;
  }, []);

  // Recompute mention region whenever draft or caret moves. The trigger
  // is the textarea's caret — not a React-owned value — so an effect is
  // the right place to mirror it back into state for rendering the picker.
  /* eslint-disable react-hooks/set-state-in-effect -- mirroring DOM caret state */
  useEffect(() => {
    const next = findMentionAtCaret(draft, caret);
    if (!next) { setMention(null); return; }
    setMention(next);
    setMentionIndex(0);
  }, [draft, caret]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-grow the textarea up to 240px.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(240, ta.scrollHeight)}px`;
  }, [draft]);

  // Submit is gated on draft only — streaming no longer blocks send.
  // SOTA pattern (Cursor/Claude Code show both surfaces): the Stop button
  // stays visible during streaming, but Send is independently available
  // so the user can queue/dispatch a follow-up turn without first cancelling.
  const canSubmit = draft.trim().length > 0;

  // Replace the active mention region with the picked label. Adds a
  // trailing space so the user can keep typing without manual spacing.
  const applyMention = useCallback((item: MentionItem) => {
    if (!mention) return;
    const label = item.kind === 'file' ? item.path : item.name;
    const before = draft.slice(0, mention.start);
    const after = draft.slice(caret);
    const insertion = `${mention.trigger}${label} `;
    const next = before + insertion + after;
    onChange(next);
    const nextCaret = before.length + insertion.length;
    setMention(null);
    // Restore caret on the next frame; React will have re-rendered with
    // the new value but the textarea's selection survives only after
    // value is in the DOM.
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(nextCaret, nextCaret);
      setCaret(nextCaret);
    });
  }, [mention, draft, caret, onChange]);

  // Insert a trigger character into the textarea at caret. Used by the
  // `#`/`@` ToolBtns so they actually do something.
  const insertTrigger = useCallback((trigger: MentionTrigger) => {
    const ta = taRef.current;
    const c = ta?.selectionStart ?? caret ?? draft.length;
    const before = draft.slice(0, c);
    const after = draft.slice(c);
    // Add a leading space if we're not at start/whitespace, so the
    // trigger can be recognised by `findMentionAtCaret`.
    const needsSpace = before.length > 0 && !/[\s]$/.test(before);
    const insertion = `${needsSpace ? ' ' : ''}${trigger}`;
    onChange(before + insertion + after);
    const nextCaret = before.length + insertion.length;
    requestAnimationFrame(() => {
      taRef.current?.focus();
      taRef.current?.setSelectionRange(nextCaret, nextCaret);
      setCaret(nextCaret);
    });
  }, [draft, caret, onChange]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Mention picker keys take precedence when active.
    if (mention) {
      const items = mentionItemsRef.current;
      if (items.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setMentionIndex((i) => (i + 1) % items.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setMentionIndex((i) => (i - 1 + items.length) % items.length);
          return;
        }
        if ((e.key === 'Tab' || e.key === 'Enter') && !e.shiftKey && !composing && !e.nativeEvent.isComposing) {
          e.preventDefault();
          applyMention(items[mentionIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMention(null);
        return;
      }
    }

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
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && !composing && !e.nativeEvent.isComposing)) {
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

    // Bail on any Enter that's part of an active IME composition.
    if (e.nativeEvent.isComposing || composing) return;

    // Prompt history recall (shell-style). Only fires when the textarea
    // is at the boundaries (first/last line) so ↑↓ keep working as
    // ordinary cursor navigation in multi-line drafts.
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const ta = taRef.current;
      if (ta != null) {
        const value = ta.value;
        const sel = ta.selectionStart ?? 0;
        const atFirstLine = !value.slice(0, sel).includes('\n');
        const atLastLine = !value.slice(sel).includes('\n');
        if (e.key === 'ArrowUp' && atFirstLine && recallHistory('up')) {
          e.preventDefault();
          return;
        }
        if (e.key === 'ArrowDown' && atLastLine && recallHistory('down')) {
          e.preventDefault();
          return;
        }
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canSubmit) guardedSubmit();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) guardedSubmit();
    }
  }

  // Track caret on selection / click / arrow keys without relying on
  // every onKeyDown firing.
  function syncCaret() {
    const ta = taRef.current;
    if (!ta) return;
    setCaret(ta.selectionStart ?? 0);
  }

  // Close model menu on outside click
  const modelRef = useRef<HTMLDivElement>(null);
  useClickOutside(modelRef, modelOpen, () => { setModelOpen(false); });

  const card = isDark
    ? 'bg-[#11141a] border-white/[0.08] focus-within:border-white/[0.20]'
    : 'bg-white border-black/[0.08] focus-within:border-black/[0.20]';
  const textPrimary = 'text-[color:var(--fg-strong)]';
  const textMuted = 'text-[color:var(--fg-subtle)]';
  const chipActive = isDark ? 'bg-white/[0.10] text-white' : 'bg-black/[0.08] text-black';
  const chipIdle = 'text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-hover)]';

  // Stop button styling escalates with stopHeat. Heat 0 = neutral muted,
  // heat 1 = amber, heat 2 = rose. The press-and-hold safety belongs in a
  // future patch; for now the colour escalation already nudges the user
  // away from the "oops, killed a 5-min run" outcome.
  const stopStyles = stopHeat === 0
    ? (isDark
        ? 'bg-white/[0.06] text-white/70 hover:bg-white/[0.10] border border-white/[0.10]'
        : 'bg-black/[0.05] text-black/70 hover:bg-black/[0.10] border border-black/[0.10]')
    : '';
  const stopInlineStyle: React.CSSProperties | undefined = stopHeat === 0
    ? undefined
    : stopHeat === 1
      ? {
          background: 'color-mix(in srgb, var(--intent-warn-vivid) 15%, transparent)',
          color: 'var(--intent-warn-vivid)',
          border: '1px solid color-mix(in srgb, var(--intent-warn-vivid) 30%, transparent)',
        }
      : {
          background: 'color-mix(in srgb, var(--intent-danger-vivid) 15%, transparent)',
          color: 'var(--intent-danger-fg)',
          border: '1px solid color-mix(in srgb, var(--intent-danger-vivid) 30%, transparent)',
        };

  return (
    <div className="relative">
      {secretChallenge && (
        <SecretChallengeModal
          matches={secretChallenge.matches}
          mode={secretChallenge.mode}
          isDark={isDark}
          t={t}
          onMaskAndSend={maskAndSend}
          onSendAsIs={sendAsIs}
          onCancel={() => { setSecretChallenge(null); }}
        />
      )}
      {/* Mention picker — pops above slash menu. Mutually exclusive with slash. */}
      {mention && !showSlash && (
        <MentionPicker
          trigger={mention.trigger}
          query={mention.query}
          isDark={isDark}
          t={t}
          index={mentionIndex}
          onIndexChange={setMentionIndex}
          onItemsChange={setMentionItems}
          onPick={applyMention}
          onClose={() => { setMention(null); }}
        />
      )}

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
                  <span
                    style={{ color: 'var(--intent-success-fg)' }}
                    className="font-mono text-[12px] font-semibold"
                  >
                    {c.cmd}
                  </span>
                  <span className={`text-[11px] ${textMuted}`}>{c.desc}</span>
                  {active && (
                    <span className="ml-auto text-[9px] font-mono text-[color:var(--fg-subtle)]">
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

        {/* Textarea + voice ghost overlay. The ghost renders interim
            speech-recognition text in a muted italic style aligned to
            the textarea so the user sees what's being heard before it
            commits to the draft. */}
        <div className="relative">
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => {
              // Once the user types, leave history-recall mode so ↓
              // doesn't snap back to the saved-draft they were never
              // going to keep.
              if (historyIdx != null && history != null && e.target.value !== history[historyIdx]) {
                setHistoryIdx(null);
              }
              onChange(e.target.value);
            }}
            onKeyDown={onKeyDown}
            onKeyUp={syncCaret}
            onClick={syncCaret}
            onSelect={syncCaret}
            onCompositionStart={() => { setComposing(true); }}
            onCompositionEnd={() => { setComposing(false); }}
            placeholder={intent === 'code' ? t('composer.placeholder.code') : t('composer.placeholder.ask')}
            rows={2}
            className={`w-full px-4 py-2.5 bg-transparent outline-none resize-none text-[13px] leading-relaxed ${textPrimary} placeholder:text-[color:var(--fg-subtle)] scrollbar-thin`}
            style={{ minHeight: 60, maxHeight: 240 }}
            spellCheck={false}
          />
          {voiceInterim.length > 0 && (
            <div
              aria-hidden
              className={`pointer-events-none absolute left-0 right-0 bottom-0 px-4 pb-2.5 text-[13px] leading-relaxed italic ${
                isDark ? 'text-white/30' : 'text-black/35'
              }`}
            >
              {/* Mic prefix so the ghost is unmistakably-from-voice */}
              <span className="mr-1.5 not-italic opacity-70">🎙</span>
              {voiceInterim}
            </div>
          )}
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-0.5">
            <ToolBtn icon={Paperclip} title={t('composer.attach')} isDark={isDark} disabled />
            <ToolBtn icon={ImageIcon} title={t('composer.image')} isDark={isDark} disabled />
            <ToolBtn
              icon={Hash}
              title={t('composer.mentionFile')}
              isDark={isDark}
              onClick={() => { insertTrigger('#'); }}
            />
            <ToolBtn
              icon={AtSign}
              title={t('composer.mentionSymbol')}
              isDark={isDark}
              onClick={() => { insertTrigger('@'); }}
            />
            <VoiceBtn
              isDark={isDark}
              t={t}
              onInterim={setVoiceInterim}
              onTranscript={(text) => {
                // Append to whatever is in the draft, separated by a
                // space so users can dictate alongside typed prefixes.
                const sep = draft.length > 0 && !/\s$/.test(draft) ? ' ' : '';
                onChange(draft + sep + text);
              }}
            />
            <ToolBtn icon={Globe} title={t('composer.web')} isDark={isDark} disabled />
            <ToolBtn icon={Sparkles} title={t('composer.suggest')} isDark={isDark} disabled />
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
                  className="absolute bottom-full left-0 mb-1 w-[210px] rounded-lg border shadow-2xl overflow-hidden border-[color:var(--border-default)]"
                  style={{
                    background: isDark ? 'rgba(15,18,24,0.96)' : 'rgba(255,255,255,0.98)',
                    backdropFilter: 'blur(22px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(22px) saturate(160%)',
                  }}
                >
                  {COMPOSER_MODELS.map((m) => {
                    const active = m.id === model.id;
                    return (
                      <button type="button"
                        key={m.id}
                        onClick={() => { onModelChange(m.id); setModelOpen(false); }}
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
                          <span className={`text-[10px] ${textMuted}`}>
                            {t(`composer.modelTag.${m.tagKey}`)}
                          </span>
                        </div>
                        <div className={`mt-0.5 font-mono text-[10px] ${
                          isDark ? 'text-white/30' : 'text-black/40'
                        }`}>
                          {m.id}
                        </div>
                      </button>
                    );
                  })}
                  {onSaveProjectDefaultModel && (
                    <button
                      type="button"
                      onClick={() => { onSaveProjectDefaultModel(); setModelOpen(false); }}
                      className={`w-full text-left px-2.5 py-2 transition-colors flex items-center gap-2 border-t ${
                        isDark
                          ? 'border-white/[0.06] text-white/65 hover:bg-white/[0.04]'
                          : 'border-black/[0.06] text-black/65 hover:bg-black/[0.04]'
                      }`}
                    >
                      <Save className="w-3 h-3 opacity-70" />
                      <span className="text-[11px]">{t('defaultModel.save')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-[10px] font-mono ${textMuted}`}>
              <Kbd isDark={isDark}><Command className="w-2.5 h-2.5" /></Kbd>
              <Kbd isDark={isDark}>↵</Kbd>
            </span>
            {isStreaming && (
              <PressHoldStop
                heat={stopHeat}
                onStop={onStop}
                styles={stopStyles}
                styleObj={stopInlineStyle}
                label={t('composer.stop')}
                holdLabel={t('stop.holdToStop')}
              />
            )}
            <button
              type="button"
              onClick={guardedSubmit}
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
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  icon: Icon, title, isDark, onClick, disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  isDark: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  // Buttons without an onClick are demo-only. We mark them aria-disabled
  // and disable the cursor so users get truthful affordance instead of a
  // dead click.
  const interactive = !!onClick && !disabled;
  return (
    <button type="button"
      title={disabled ? `${title} · demo only` : title}
      aria-label={title}
      aria-disabled={!interactive}
      onClick={interactive ? onClick : undefined}
      tabIndex={interactive ? 0 : -1}
      className={`p-1.5 rounded-md transition-colors ${
        interactive
          ? (isDark ? 'text-white/40 hover:text-white/85 hover:bg-white/[0.05] cursor-pointer' : 'text-black/40 hover:text-black/85 hover:bg-black/[0.04] cursor-pointer')
          : (isDark ? 'text-white/20 cursor-not-allowed' : 'text-black/20 cursor-not-allowed')
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

// Web Speech API typings — the spec is shipped under `webkitSpeechRecognition`
// in Chromium-based browsers and `SpeechRecognition` in Safari/Firefox.
// We type just the surface we touch; full lib.dom typings vary by version.
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Voice input button. Uses the Web Speech API when available; otherwise
// renders disabled with an "unsupported" tooltip. While listening the
// mic icon pulses with the breath animation; final transcripts are
// pushed up via `onTranscript` so the parent can append to the draft.
function VoiceBtn({
  isDark, t, onTranscript, onInterim,
}: {
  isDark: boolean;
  t: (k: string) => string;
  onTranscript: (text: string) => void;
  // Called with in-flight (non-final) transcript so the composer can
  // ghost-render it. The empty string signals "clear ghost" — fired on
  // recognition end so the ghost doesn't linger after the mic stops.
  onInterim?: (text: string) => void;
}) {
  const [supported] = useState(() => getSpeechRecognitionCtor() != null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const cbRef = useRef(onTranscript);
  const interimRef = useRef(onInterim);
  useEffect(() => { cbRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { interimRef.current = onInterim; }, [onInterim]);

  useEffect(() => () => {
    try { recRef.current?.abort(); } catch { /* fine */ }
  }, []);

  function start() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    // Continuous + interim — SOTA pattern (Whisper UI, Granola). Final
    // results commit to draft; interim renders as ghost text so the user
    // can correct mid-sentence without waiting for the pause.
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = (typeof document !== 'undefined' ? document.documentElement.lang : '') || 'en-US';
    rec.onresult = (e) => {
      let finalText = '';
      let interimText = '';
      for (const r of Array.from(e.results)) {
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText.trim()) cbRef.current(finalText.trim());
      // Always push interim — even an empty string clears any ghost
      // left over after the user paused.
      interimRef.current?.(interimText);
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      interimRef.current?.('');
    };
    rec.onerror = () => {
      setListening(false);
      recRef.current = null;
      interimRef.current?.('');
    };
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function stop() {
    try { recRef.current?.stop(); } catch { /* fine */ }
    setListening(false);
  }

  const idle = isDark
    ? 'text-white/40 hover:text-white/85 hover:bg-white/[0.05]'
    : 'text-black/40 hover:text-black/85 hover:bg-black/[0.04]';
  const off = isDark ? 'text-white/20 cursor-not-allowed' : 'text-black/20 cursor-not-allowed';
  const activeStyle: React.CSSProperties = {
    color: 'var(--intent-danger-fg)',
    background: 'color-mix(in srgb, var(--intent-danger-vivid) 15%, transparent)',
  };

  return (
    <button
      type="button"
      title={!supported ? t('voice.unsupported') : listening ? t('voice.stop') : t('voice.start')}
      aria-label={!supported ? t('voice.unsupported') : listening ? t('voice.stop') : t('voice.start')}
      aria-pressed={listening}
      aria-disabled={!supported}
      onClick={() => { if (!supported) return; if (listening) stop(); else start(); }}
      tabIndex={supported ? 0 : -1}
      style={supported && listening ? activeStyle : undefined}
      className={`p-1.5 rounded-md transition-colors ${supported ? (listening ? '' : idle) : off}`}
    >
      <Mic className={`w-3.5 h-3.5 ${listening ? 'coding-breath' : ''}`} />
    </button>
  );
}

// Secret guard modal. `block` mode forces a choice (mask or cancel);
// `warn` mode adds a third option ("send as-is") for soft PII matches
// the user may have pasted intentionally. Pattern: Slack DLP banner +
// 1Password vault paste warning.
function SecretChallengeModal({
  matches, mode, isDark, t, onMaskAndSend, onSendAsIs, onCancel,
}: {
  matches: SecretMatch[];
  mode: 'block' | 'warn';
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
  onMaskAndSend: () => void;
  onSendAsIs: () => void;
  onCancel: () => void;
}) {
  // Esc cancels; Enter triggers mask-and-send (the safe default).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      if (e.key === 'Enter')  { e.preventDefault(); onMaskAndSend(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [onCancel, onMaskAndSend]);

  const surface = isDark
    ? 'bg-[#11141a] border-white/[0.10]'
    : 'bg-white border-black/[0.10]';
  const heading = isDark ? 'text-white/90' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const toneStyle: React.CSSProperties = mode === 'block'
    ? {
        borderColor: 'color-mix(in srgb, var(--intent-danger-vivid) 40%, transparent)',
        background: 'color-mix(in srgb, var(--intent-danger-vivid) 8%, transparent)',
      }
    : {
        borderColor: 'color-mix(in srgb, var(--intent-warn-vivid) 40%, transparent)',
        background: 'color-mix(in srgb, var(--intent-warn-vivid) 8%, transparent)',
      };

  return (
    <div
      className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 rounded-xl border shadow-2xl overflow-hidden coding-pill-rise"
      style={{
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      }}
    >
      <div style={toneStyle} className={`border rounded-xl ${surface}`}>
        <div className={`px-4 py-3`}>
          <div className={`flex items-center gap-2 mb-1.5`}>
            <span className="text-[14px]" aria-hidden>{mode === 'block' ? '🔐' : '⚠'}</span>
            <span className={`text-[12px] font-bold ${heading}`}>
              {mode === 'block' ? t('secretGuard.blockTitle') : t('secretGuard.warnTitle')}
            </span>
          </div>
          <p className={`text-[11px] ${muted} mb-2`}>
            {t('secretGuard.blockBody', { count: matches.length })}
          </p>
          <ul className="space-y-1 mb-3">
            {matches.map((m, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-mono ${
                  isDark ? 'bg-white/[0.04]' : 'bg-black/[0.03]'
                }`}
              >
                <span
                  style={{ background: m.pattern.severity === 'critical' ? 'var(--intent-danger-vivid)' : 'var(--intent-warn-vivid)' }}
                  className="shrink-0 w-1.5 h-1.5 rounded-full"
                />
                <span className={muted}>{t(`secretGuard.patterns.${m.pattern.id}`, { defaultValue: m.pattern.label })}</span>
                <span className={`ml-auto opacity-70 ${heading}`}>
                  {/* Show only first 4 chars + ellipsis. Reveal-once
                      could go here in a future iteration. */}
                  {m.value.slice(0, 4)}…
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={onCancel}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${muted} ${
                isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.04]'
              }`}
            >
              {t('secretGuard.cancel')}
            </button>
            {mode === 'warn' && (
              <button
                type="button"
                onClick={onSendAsIs}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  isDark
                    ? 'bg-white/[0.08] text-white/85 hover:bg-white/[0.14] border border-white/[0.10]'
                    : 'bg-black/[0.06] text-black/85 hover:bg-black/[0.12] border border-black/[0.10]'
                }`}
              >
                {t('secretGuard.sendAsIs')}
              </button>
            )}
            <button
              type="button"
              onClick={onMaskAndSend}
              style={{
                background: 'var(--intent-success-bg)',
                color: 'var(--intent-success-fg)',
                border: '1px solid color-mix(in srgb, var(--intent-success-vivid) 40%, transparent)',
              }}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors"
            >
              {t('secretGuard.maskNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
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

// Stop button with press-and-hold safety. Heat 0 (first 5s) is a normal
// click — the user just kicked it off, accidental cancel is cheap. Heat
// 1+ requires 400ms hold; a circular progress ring fills as the user
// holds. Releasing early surfaces the original label so the affordance
// stays discoverable. Vercel's "press to cancel" flow.
function PressHoldStop({
  heat, onStop, styles, styleObj, label, holdLabel,
}: {
  heat: 0 | 1 | 2;
  onStop?: () => void;
  styles: string;
  styleObj?: React.CSSProperties;
  label: string;
  holdLabel: string;
}) {
  const HOLD_MS = 400;
  const [progress, setProgress] = useState(0); // 0..1 while holding
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const stopProgress = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    setProgress(0);
  }, []);

  // Cleanup on unmount in case the user leaves mid-hold.
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  function tick() {
    if (startRef.current == null) return;
    const elapsed = performance.now() - startRef.current;
    const p = Math.min(1, elapsed / HOLD_MS);
    setProgress(p);
    if (p >= 1 && !firedRef.current) {
      firedRef.current = true;
      onStop?.();
      stopProgress();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    if (heat === 0) {
      // Cheap to cancel; immediate click semantics.
      onStop?.();
      return;
    }
    firedRef.current = false;
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }

  function onPointerEnd() {
    if (!firedRef.current) stopProgress();
  }

  const radius = 8;
  const circ = 2 * Math.PI * radius;
  const dash = circ * progress;

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onPointerCancel={onPointerEnd}
      // Allow keyboard activation (Enter/Space) to trigger an immediate
      // stop — keyboard users don't have a press-and-hold gesture.
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStop?.(); }
      }}
      style={styleObj}
      className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-semibold transition-colors select-none touch-none ${styles}`}
      aria-label={heat === 0 ? label : holdLabel}
      title={heat === 0 ? label : holdLabel}
    >
      {heat === 0 ? (
        <Square className="w-2.5 h-2.5" fill="currentColor" />
      ) : (
        <span className="relative w-3 h-3 inline-flex items-center justify-center">
          {/* progress ring overlay */}
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 24 24" width="12" height="12">
            <circle
              cx="12" cy="12" r={radius}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="2.5"
            />
            <circle
              cx="12" cy="12" r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              style={{ transition: progress === 0 ? 'stroke-dasharray 120ms ease-out' : undefined }}
            />
          </svg>
          <Square className="w-1.5 h-1.5" fill="currentColor" />
        </span>
      )}
      {heat === 0 ? label : (progress > 0.05 ? holdLabel : label)}
    </button>
  );
}
