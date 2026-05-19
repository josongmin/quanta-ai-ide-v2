import { useEffect, useRef, useState } from 'react';
import {
  Code2, MessageSquare, GitBranch, ChevronDown, Paperclip, Globe,
  Sparkles, ArrowUp, Command, AtSign, Hash, Image as ImageIcon,
  Cpu, Save,
} from 'lucide-react';
import { MentionPicker } from './palette/MentionPicker';
import { useClickOutside } from '@shared/lib';
import { ToolBtn } from './composer/ComposerToolBtn';
import { Kbd } from './composer/ComposerKbd';
import { VoiceBtn } from './composer/ComposerVoiceBtn';
import { SecretChallengeModal } from './composer/ComposerSecretChallengeModal';
import { PressHoldStop } from './composer/ComposerPressHoldStop';
import { SlashMenu } from './composer/SlashMenu';
import { useVoiceInput } from './composer/useVoiceInput';
import { useSecretScanning } from './composer/useSecretScanning';
import { useSlashCommands } from './composer/useSlashCommands';
import { useMentionPicker } from './composer/useMentionPicker';

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

  // Live voice transcript + transcript-append handler. The recogniser
  // lifecycle lives in <VoiceBtn>; this owns the composer-side state.
  const { voiceInterim, setVoiceInterim, onTranscript } = useVoiceInput(draft, onChange);

  // Secret guard: scan on every change. Critical matches block submit
  // until the user explicitly resolves; warn matches surface a soft
  // toast that allows send-as-is. Pattern from GitHub Secret Scanning
  // in editor + Slack DLP.
  const {
    secretChallenge, setSecretChallenge, guardedSubmit, maskAndSend, sendAsIs,
  } = useSecretScanning(draft, onChange, onSubmit);

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

  // Slash command menu state (showSlash / filtered list / highlight).
  const { showSlash, slashFiltered, slashIndex, setSlashIndex } = useSlashCommands(draft);

  // Mention picker state. We probe the textarea's caret position on every
  // change/selection event; when the caret sits inside a `#…` or `@…`
  // token, `mention` becomes non-null and the picker renders.
  const {
    mention, setMention, mentionIndex, setMentionIndex,
    mentionItemsRef, setMentionItems, applyMention, insertTrigger, syncCaret,
  } = useMentionPicker(taRef, draft, onChange);

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

  // Close model menu on outside click
  const modelRef = useRef<HTMLDivElement>(null);
  useClickOutside(modelRef, modelOpen, () => { setModelOpen(false); });

  const card = 'bg-[var(--bg-surface)] border-[color:var(--border-default)] focus-within:border-[color:var(--border-strong)]';
  const textPrimary = 'text-[color:var(--fg-strong)]';
  const textMuted = 'text-[color:var(--fg-subtle)]';
  const chipActive = 'bg-[color:var(--bg-selected)] text-[color:var(--fg-strong)]';
  const chipIdle = 'text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-hover)]';

  // Stop button styling escalates with stopHeat. Heat 0 = neutral muted,
  // heat 1 = amber, heat 2 = rose. The press-and-hold safety belongs in a
  // future patch; for now the colour escalation already nudges the user
  // away from the "oops, killed a 5-min run" outcome.
  const stopStyles = stopHeat === 0
    ? 'bg-[color:var(--bg-elevated)] text-[color:var(--fg-default)] hover:bg-[color:var(--bg-active)] border border-[color:var(--border-default)]'
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
        <SlashMenu
          slashFiltered={slashFiltered}
          slashIndex={slashIndex}
          setSlashIndex={setSlashIndex}
          onChange={onChange}
          isDark={isDark}
          textMuted={textMuted}
          focusTextarea={() => { taRef.current?.focus(); }}
        />
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
              className="pointer-events-none absolute left-0 right-0 bottom-0 px-4 pb-2.5 text-[13px] leading-relaxed italic text-[color:var(--fg-subtle)]"
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
              onTranscript={onTranscript}
            />
            <ToolBtn icon={Globe} title={t('composer.web')} isDark={isDark} disabled />
            <ToolBtn icon={Sparkles} title={t('composer.suggest')} isDark={isDark} disabled />
            <span className="mx-1 h-3.5 w-px bg-[color:var(--border-default)]" />
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
                  className="absolute bottom-full left-0 mb-1 w-[210px] rounded-lg border shadow-2xl overflow-hidden border-[color:var(--border-default)] bg-[var(--bg-elevated)]"
                  style={isDark ? {
                    backdropFilter: 'blur(22px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(22px) saturate(160%)',
                  } : undefined}
                >
                  {COMPOSER_MODELS.map((m) => {
                    const active = m.id === model.id;
                    return (
                      <button type="button"
                        key={m.id}
                        onClick={() => { onModelChange(m.id); setModelOpen(false); }}
                        className={`w-full text-left px-2.5 py-2 transition-colors ${
                          active
                            ? 'bg-[color:var(--bg-elevated)]'
                            : 'hover:bg-[color:var(--bg-surface-muted)]'
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
                        <div className="mt-0.5 font-mono text-[10px] text-[color:var(--fg-subtle)]">
                          {m.id}
                        </div>
                      </button>
                    );
                  })}
                  {onSaveProjectDefaultModel && (
                    <button
                      type="button"
                      onClick={() => { onSaveProjectDefaultModel(); setModelOpen(false); }}
                      className="w-full text-left px-2.5 py-2 transition-colors flex items-center gap-2 border-t border-[color:var(--border-muted)] text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-hover)]"
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
                  ? 'bg-[color:var(--fg-strong)] text-[color:var(--bg-surface)] hover:opacity-90'
                  : 'bg-[color:var(--bg-elevated)] text-[color:var(--fg-subtle)] cursor-not-allowed'
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
