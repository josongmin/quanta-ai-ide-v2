import { useCallback, useEffect, useState } from 'react';
import { safeLocalGet, safeLocalSet } from '@shared/lib';
import type { ComposerModelId } from '../parts/Composer';
import { isModelId } from './codingStageHelpers';

// Composer-side input state, lifted out of CodingStage without changing
// behaviour: intent toggle, the draft buffer, the lifted+persisted model
// selection, the side-by-side comparison model, and per-task prompt
// history for shell-style ↑↓ recall.
//
// Hook-call order inside this function mirrors the original inline order
// exactly (intent → draft → sideBySideModel → model + persist effect →
// promptHistory + pushPromptHistory) so effect timing is preserved when
// called from the composition root.
export function useComposerState() {
  const [intent, setIntent] = useState<'code' | 'ask'>('code');
  const [draft, setDraft] = useState('');

  // Side-by-side comparison model. null = single-model run; set =
  // every onSubmit fires both `model` and `sideBySideModel` in parallel
  // and the renderer pairs the two outputs in a 2-column grid so the
  // user can pick the winner.
  const [sideBySideModel] = useState<ComposerModelId | null>(null);

  // Lifted model selection. Persists across task switches; per-project
  // default applies on project change unless the user has overridden in
  // the current session.
  const [model, setModel] = useState<ComposerModelId>(() => {
    if (typeof window === 'undefined') return 'claude-opus-4-7';
    const raw = safeLocalGet('coding:model');
    if (isModelId(raw)) return raw;
    return 'claude-opus-4-7';
  });
  useEffect(() => { safeLocalSet('coding:model', model); }, [model]);

  // Per-task prompt history for shell-style ↑↓ recall.
  const [promptHistory, setPromptHistory] = useState<Record<string, string[]>>(() => {
    if (typeof window === 'undefined') return {};
    // Storage read is wrapped by the helper; the try/catch remains as a parse
    // guard for malformed JSON, preserving the same {} fallback.
    try {
      const raw = safeLocalGet('coding:prompt-history');
      return raw != null ? JSON.parse(raw) as Record<string, string[]> : {};
    } catch { return {}; }
  });
  const pushPromptHistory = useCallback((taskId: string, prompt: string) => {
    setPromptHistory((cur) => {
      const list = cur[taskId] ?? [];
      if (list[list.length - 1] === prompt) return cur;
      const next = [...list, prompt].slice(-50);
      const merged = { ...cur, [taskId]: next };
      safeLocalSet('coding:prompt-history', JSON.stringify(merged));
      return merged;
    });
  }, []);

  return {
    intent, setIntent,
    draft, setDraft,
    sideBySideModel,
    model, setModel,
    promptHistory, pushPromptHistory,
  };
}
