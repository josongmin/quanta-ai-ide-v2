import { useEffect } from 'react';
import { isEditableTarget } from '@shared/lib';
import type { InvestigationTarget } from '@entities/investigation';

type ViewMode = 'answer' | 'notebook';

export function usePanelKeyboardNav(opts: {
  panelOpen: boolean;
  mode: ViewMode;
  visibleQuestionIds: string[];
  selectedQuestionId: string | null;
  activeTarget: InvestigationTarget | null;
  onClose: () => void;
  onModeToggle: () => void;
  onSelectQuestion: (id: string | null) => void;
  onRegenerate: () => void;
}): void {
  const {
    panelOpen,
    mode,
    visibleQuestionIds,
    selectedQuestionId,
    activeTarget,
    onClose,
    onModeToggle,
    onSelectQuestion,
    onRegenerate,
  } = opts;

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (isEditableTarget(e.target)) return;

      if ((e.key === '`' && (e.metaKey || e.ctrlKey)) || e.key === 'n' || e.key === 'N') {
        if (e.key === 'n' || e.key === 'N') {
          if (e.metaKey || e.ctrlKey || e.altKey) return;
        }
        e.preventDefault();
        onModeToggle();
        return;
      }

      if ((e.key === 'j' || e.key === 'k') && mode === 'notebook') {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (visibleQuestionIds.length === 0) return;
        const cur = selectedQuestionId
          ? visibleQuestionIds.indexOf(selectedQuestionId)
          : -1;
        const delta = e.key === 'j' ? 1 : -1;
        let next = cur + delta;
        if (next < 0) next = 0;
        if (next >= visibleQuestionIds.length) next = visibleQuestionIds.length - 1;
        e.preventDefault();
        onSelectQuestion(visibleQuestionIds[next] ?? null);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'r' || e.key === 'R')) {
        if (!activeTarget) return;
        e.preventDefault();
        onRegenerate();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [
    panelOpen,
    mode,
    visibleQuestionIds,
    selectedQuestionId,
    activeTarget,
    onClose,
    onModeToggle,
    onSelectQuestion,
    onRegenerate,
  ]);
}
