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
import type {
  BundleStatus,
  ContextBundle,
  InvestigationAnswer,
  InvestigationTarget,
  QuestionType,
} from '@entities/investigation';
import { gatherContext } from '../planner/gatherContext';
import { composeAnswer } from '../planner/answerComposer';

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
};

const InvestigationCtx = createContext<Ctx | null>(null);

export function InvestigationProvider({ children }: { children: ReactNode }) {
  const [activeTarget, setActiveTarget] = useState<InvestigationTarget | null>(null);
  const [bundle, setBundle] = useState<ContextBundle | null>(null);
  const [answer, setAnswer] = useState<InvestigationAnswer | null>(null);
  const [status, setStatus] = useState<BundleStatus>('idle');
  const [questionType, setQuestionTypeState] = useState<QuestionType>('why_risky');
  const [panelOpen, setPanelOpen] = useState(false);
  const [pickedEvidenceId, setPickedEvidenceId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

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

    const onPartial = (partial: ContextBundle) => {
      if (myRunId !== runIdRef.current) return;
      setBundle(partial);
      setStatus('partial');
    };

    gatherContext(target, qt, onPartial, controller.signal)
      .then((finalBundle) => {
        if (myRunId !== runIdRef.current) return;
        const composed = composeAnswer(finalBundle);
        setBundle(finalBundle);
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
  }, [cancelInternal]);

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
    if (activeTarget) {
      runStart(activeTarget, qt);
    }
  }, [activeTarget, runStart]);

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
  }), [
    activeTarget, bundle, answer, status, questionType, panelOpen, pickedEvidenceId,
    start, cancel, regenerate, setQuestionType, clear, openPanel, closePanel, pickEvidence,
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
