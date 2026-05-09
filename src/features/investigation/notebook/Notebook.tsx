import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import type {
  ActionRecommendation,
  ContextBundle,
  NotebookEntry,
  QuestionType,
} from '@entities/investigation';
import { ActionButton } from '../evidence';
import { FindingsBlock } from './FindingsBlock';
import { PendingUnknownsBlock } from './PendingUnknownsBlock';

type Props = {
  entry: NotebookEntry;
  bundle: ContextBundle | null;
  currentQuestionType: QuestionType;
  onAddQuestion: (text: string, qt: QuestionType) => void;
  // onArchive is unused at the section level here, but kept on the surface
  // contract so consumers can wire in QuestionList without breaking.
  onArchive: (questionId: string) => void;
  onAction: (action: ActionRecommendation) => void;
};

const QT_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'why_risky', label: 'Risk' },
  { value: 'blast_of_change', label: 'Blast' },
  { value: 'incident_suspect', label: 'Suspect' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  const style: CSSProperties = {
    color: 'var(--fg-subtle)',
    fontSize: '10px',
  };
  return (
    <div className="font-mono uppercase tracking-wider mb-1.5" style={style}>
      {children}
    </div>
  );
}

export function Notebook({
  entry,
  bundle,
  currentQuestionType,
  onAddQuestion,
  onArchive: _onArchive,
  onAction,
}: Props) {
  const [text, setText] = useState('');
  const [pickedQt, setPickedQt] = useState<QuestionType>(currentQuestionType);
  const disabled = !entry || !entry.target;

  const answeredQuestions = useMemo(
    () => entry.questions
      .filter((q) => q.status === 'answered')
      .sort((a, b) => b.askedAt - a.askedAt),
    [entry.questions],
  );

  const aggregatedActions = useMemo<ActionRecommendation[]>(() => {
    const byKind = new Map<string, ActionRecommendation>();
    for (const q of entry.questions) {
      if (q.status !== 'answered' || !q.answer) continue;
      for (const a of q.answer.actions) {
        if (!byKind.has(a.kind)) byKind.set(a.kind, a);
      }
    }
    return Array.from(byKind.values());
  }, [entry.questions]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddQuestion(trimmed, pickedQt);
    setText('');
  };

  const handleResolveUnknown = (label: string) => {
    onAddQuestion(`Resolve unknown: ${label}`, currentQuestionType);
  };

  const sectionDivider: CSSProperties = {
    borderTop: '1px solid var(--border-default)',
  };

  const inputStyle: CSSProperties = {
    background: 'var(--bg-surface)',
    color: 'var(--fg-default)',
    border: '1px solid var(--border-default)',
    fontSize: '12px',
  };

  return (
    <div className="flex flex-col">
      {/* 1. Question composer */}
      <div className="py-3">
        <SectionLabel>Ask</SectionLabel>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                disabled
                  ? 'Pick a target to start asking…'
                  : `Ask about ${entry.target.label}…`
              }
              disabled={disabled}
              style={inputStyle}
              className="flex-1 min-w-0 rounded px-2 py-1.5 outline-none"
            />
            <button
              type="submit"
              disabled={disabled || !text.trim()}
              title="Add question"
              style={{
                background: 'var(--bg-active)',
                color: 'var(--fg-strong)',
                border: '1px solid var(--border-default)',
                cursor: disabled || !text.trim() ? 'not-allowed' : 'pointer',
                opacity: disabled || !text.trim() ? 0.5 : 1,
              }}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-[11px] font-medium"
            >
              <Send size={12} aria-hidden="true" />
              Ask
            </button>
          </div>
          <div className="flex items-center gap-1">
            {QT_OPTIONS.map((opt) => {
              const active = pickedQt === opt.value;
              const pillStyle: CSSProperties = {
                background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
                color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
                border: '1px solid var(--border-default)',
                fontSize: '9px',
                cursor: 'pointer',
              };
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPickedQt(opt.value)}
                  style={pillStyle}
                  className="px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </form>
      </div>

      {/* 2. Findings */}
      <div className="py-3" style={sectionDivider}>
        <SectionLabel>Findings</SectionLabel>
        {answeredQuestions.length === 0 ? (
          <div style={{ color: 'var(--fg-subtle)', fontSize: '11px' }}>
            No findings yet — answered questions will appear here.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {answeredQuestions.map((q) => (
              <FindingsBlock key={q.id} question={q} bundle={bundle} />
            ))}
          </div>
        )}
      </div>

      {/* 3. Pending unknowns */}
      <div className="py-3" style={sectionDivider}>
        <SectionLabel>Pending unknowns</SectionLabel>
        <PendingUnknownsBlock entry={entry} onResolveUnknown={handleResolveUnknown} />
      </div>

      {/* 4. Actions */}
      <div className="py-3" style={sectionDivider}>
        <SectionLabel>Actions</SectionLabel>
        {aggregatedActions.length === 0 ? (
          <div style={{ color: 'var(--fg-subtle)', fontSize: '11px' }}>
            No actions surfaced yet.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {aggregatedActions.map((a) => (
              <ActionButton key={a.id} action={a} onRun={onAction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notebook;
