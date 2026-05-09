import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  FIXTURE_NOTEBOOKS,
  type BundleStatus,
  type ContextBundle,
  type InvestigationAnswer,
  type InvestigationTarget,
  type NotebookEntry,
  type NotebookQuestion,
  type QuestionType,
} from '@entities/investigation';
import { gatherContext, rankEvidence } from '../planner/gatherContext';
import { composeAnswer, enrichBundle } from '../planner/answerComposer';

type Ctx = {
  activeTarget: InvestigationTarget | null;
  bundle: ContextBundle | null;
  answer: InvestigationAnswer | null;
  status: BundleStatus;
  questionType: QuestionType;
  panelOpen: boolean;
  pickedEvidenceId: string | null;
  start: (target: InvestigationTarget, questionType?: QuestionType) => void;
  cancel: () => void;
  regenerate: () => void;
  setQuestionType: (qt: QuestionType) => void;
  clear: () => void;
  openPanel: () => void;
  closePanel: () => void;
  pickEvidence: (id: string | null) => void;
  // Phase 2: notebook
  notebook: NotebookEntry[];
  activeNotebookId: string | null;
  addQuestion: (targetId: string, text: string, questionType: QuestionType) => string;
  answerQuestion: (questionId: string, answer: InvestigationAnswer, bundleId: string) => void;
  archiveQuestion: (questionId: string) => void;
  pinNotebook: (id: string) => void;
  unpinNotebook: (id: string) => void;
  setActiveNotebook: (id: string | null) => void;
  clearNotebook: (id: string) => void;
};

const InvestigationCtx = createContext<Ctx | null>(null);

function notebookIdForTarget(targetId: string): string {
  return `nb-${targetId}`;
}

export function InvestigationProvider({ children }: { children: ReactNode }) {
  const [activeTarget, setActiveTarget] = useState<InvestigationTarget | null>(null);
  const [bundle, setBundle] = useState<ContextBundle | null>(null);
  const [answer, setAnswer] = useState<InvestigationAnswer | null>(null);
  const [status, setStatus] = useState<BundleStatus>('idle');
  const [questionType, setQuestionTypeState] = useState<QuestionType>('why_risky');
  const [panelOpen, setPanelOpen] = useState(false);
  const [pickedEvidenceId, setPickedEvidenceId] = useState<string | null>(null);

  const [notebook, setNotebook] = useState<NotebookEntry[]>(FIXTURE_NOTEBOOKS);
  const [activeNotebookId, setActiveNotebookIdState] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  // Avoid auto-answering the same pending question twice for one completion.
  const lastAutoAnsweredRef = useRef<string | null>(null);

  const cancelInternal = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelInternal();
    };
  }, [cancelInternal]);

  const ensureNotebookForTarget = useCallback((target: InvestigationTarget): string => {
    const wantId = notebookIdForTarget(target.id);
    setNotebook((cur) => {
      if (cur.some((e) => e.id === wantId)) return cur;
      const fresh: NotebookEntry = {
        id: wantId,
        target,
        questions: [],
        pinned: false,
        createdAt: Date.now(),
      };
      return [...cur, fresh];
    });
    return wantId;
  }, []);

  const runStart = useCallback((target: InvestigationTarget, qt: QuestionType) => {
    cancelInternal();
    const controller = new AbortController();
    abortRef.current = controller;
    const myRunId = ++runIdRef.current;

    setActiveTarget(target);
    setBundle(null);
    setAnswer(null);
    setStatus('gathering');
    setQuestionTypeState(qt);
    setPanelOpen(true);
    setPickedEvidenceId(null);

    // Ensure a notebook entry exists for this target and mark it active.
    const nbId = ensureNotebookForTarget(target);
    setActiveNotebookIdState(nbId);
    lastAutoAnsweredRef.current = null;

    const onPartial = (partial: ContextBundle) => {
      if (myRunId !== runIdRef.current) return;
      setBundle(partial);
      setStatus('partial');
    };

    gatherContext(target, qt, onPartial, controller.signal)
      .then((finalBundle) => {
        if (myRunId !== runIdRef.current) return;
        const enriched = enrichBundle(finalBundle);
        const composed = composeAnswer(enriched);
        setBundle(enriched);
        setAnswer(composed);
        setStatus('complete');
      })
      .catch((err: unknown) => {
        if (myRunId !== runIdRef.current) return;
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setStatus('error');
      });
  }, [cancelInternal, ensureNotebookForTarget]);

  const start = useCallback((target: InvestigationTarget, qt: QuestionType = 'why_risky') => {
    runStart(target, qt);
  }, [runStart]);

  const cancel = useCallback(() => {
    cancelInternal();
    runIdRef.current += 1;
    setStatus((cur) => (cur === 'gathering' || cur === 'partial' ? 'idle' : cur));
  }, [cancelInternal]);

  const regenerate = useCallback(() => {
    if (!activeTarget) return;
    runStart(activeTarget, questionType);
  }, [activeTarget, questionType, runStart]);

  const setQuestionType = useCallback((qt: QuestionType) => {
    setQuestionTypeState(qt);
    if (!activeTarget) return;
    // If we already have a complete bundle for this target, just rerank +
    // recompose locally — no need to re-stream the same fixture evidence.
    // This is the same shortcut a real backend should take when the
    // evidence pool hasn't changed: rank is cheap, gathering isn't.
    if (bundle && bundle.target.id === activeTarget.id && status === 'complete') {
      const ranked: ContextBundle = {
        ...bundle,
        questionType: qt,
        evidence: rankEvidence(bundle.evidence, qt),
      };
      const enriched = enrichBundle(ranked);
      setBundle(enriched);
      setAnswer(composeAnswer(enriched));
      setPickedEvidenceId(null);
      return;
    }
    runStart(activeTarget, qt);
  }, [activeTarget, bundle, status, runStart]);

  const clear = useCallback(() => {
    cancelInternal();
    runIdRef.current += 1;
    setActiveTarget(null);
    setBundle(null);
    setAnswer(null);
    setStatus('idle');
    setPickedEvidenceId(null);
    setPanelOpen(false);
  }, [cancelInternal]);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const pickEvidence = useCallback((id: string | null) => {
    setPickedEvidenceId((cur) => (cur === id ? null : id));
  }, []);

  // ── Notebook actions ──────────────────────────────────────────
  const addQuestion = useCallback((targetId: string, text: string, qt: QuestionType): string => {
    const trimmed = text.trim();
    const newId = `nbq-${targetId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const wantId = notebookIdForTarget(targetId);

    setNotebook((cur) => {
      const idx = cur.findIndex((e) => e.id === wantId);
      const newQuestion: NotebookQuestion = {
        id: newId,
        text: trimmed,
        questionType: qt,
        status: 'pending',
        askedAt: Date.now(),
      };
      if (idx === -1) {
        // Need a target to create the entry; fall back to a stub one if none
        // available — caller must usually have an active target.
        const stubTarget: InvestigationTarget = activeTarget && activeTarget.id === targetId
          ? activeTarget
          : { kind: 'file', id: targetId, label: targetId };
        const fresh: NotebookEntry = {
          id: wantId,
          target: stubTarget,
          questions: [newQuestion],
          pinned: false,
          createdAt: Date.now(),
        };
        return [...cur, fresh];
      }
      return cur.map((e, i) =>
        i === idx ? { ...e, questions: [...e.questions, newQuestion] } : e,
      );
    });
    setActiveNotebookIdState(wantId);
    return newId;
  }, [activeTarget]);

  const answerQuestion = useCallback((questionId: string, ans: InvestigationAnswer, bundleId: string) => {
    setNotebook((cur) =>
      cur.map((entry) => {
        if (!entry.questions.some((q) => q.id === questionId)) return entry;
        return {
          ...entry,
          questions: entry.questions.map((q) =>
            q.id === questionId
              ? { ...q, status: 'answered' as const, answer: ans, bundleId }
              : q,
          ),
        };
      }),
    );
  }, []);

  const archiveQuestion = useCallback((questionId: string) => {
    setNotebook((cur) =>
      cur.map((entry) => {
        if (!entry.questions.some((q) => q.id === questionId)) return entry;
        return {
          ...entry,
          questions: entry.questions.map((q) =>
            q.id === questionId ? { ...q, status: 'archived' as const } : q,
          ),
        };
      }),
    );
  }, []);

  const pinNotebook = useCallback((id: string) => {
    setNotebook((cur) => cur.map((e) => (e.id === id ? { ...e, pinned: true } : e)));
  }, []);

  const unpinNotebook = useCallback((id: string) => {
    setNotebook((cur) => cur.map((e) => (e.id === id ? { ...e, pinned: false } : e)));
  }, []);

  const setActiveNotebook = useCallback((id: string | null) => {
    setActiveNotebookIdState(id);
  }, []);

  const clearNotebook = useCallback((id: string) => {
    setNotebook((cur) => cur.map((e) => (e.id === id ? { ...e, questions: [] } : e)));
  }, []);

  // Auto-answer wiring: when the active investigation completes, find the
  // most recent `pending` question on the active notebook entry whose
  // questionType matches the current run, and flip it to `answered`.
  useEffect(() => {
    if (status !== 'complete') return;
    if (!answer || !bundle) return;
    if (!activeNotebookId) return;
    const entry = notebook.find((e) => e.id === activeNotebookId);
    if (!entry) return;

    // Walk newest-first; pick first pending matching the active questionType.
    const candidates = [...entry.questions]
      .filter((q) => q.status === 'pending' && q.questionType === questionType)
      .sort((a, b) => b.askedAt - a.askedAt);
    const target = candidates[0];
    if (!target) return;
    if (lastAutoAnsweredRef.current === target.id) return;
    lastAutoAnsweredRef.current = target.id;
    answerQuestion(target.id, answer, bundle.id);
  }, [status, answer, bundle, activeNotebookId, questionType, notebook, answerQuestion]);

  const value = useMemo<Ctx>(() => ({
    activeTarget,
    bundle,
    answer,
    status,
    questionType,
    panelOpen,
    pickedEvidenceId,
    start,
    cancel,
    regenerate,
    setQuestionType,
    clear,
    openPanel,
    closePanel,
    pickEvidence,
    notebook,
    activeNotebookId,
    addQuestion,
    answerQuestion,
    archiveQuestion,
    pinNotebook,
    unpinNotebook,
    setActiveNotebook,
    clearNotebook,
  }), [
    activeTarget, bundle, answer, status, questionType, panelOpen, pickedEvidenceId,
    start, cancel, regenerate, setQuestionType, clear, openPanel, closePanel, pickEvidence,
    notebook, activeNotebookId,
    addQuestion, answerQuestion, archiveQuestion, pinNotebook, unpinNotebook, setActiveNotebook, clearNotebook,
  ]);

  return (
    <InvestigationCtx.Provider value={value}>
      {children}
    </InvestigationCtx.Provider>
  );
}

export function useInvestigation(): Ctx {
  const ctx = useContext(InvestigationCtx);
  if (!ctx) throw new Error('useInvestigation must be used inside InvestigationProvider');
  return ctx;
}
