import type {
  ActionRecommendation,
  ContextBundle,
  NotebookEntry,
  QuestionType,
} from '@entities/investigation';
import { Notebook } from '../../notebook';

export function NotebookBody({
  activeEntry,
  bundle,
  currentQuestionType,
  onAddQuestion,
  onArchive,
  onAction,
}: {
  activeEntry: NotebookEntry | null;
  bundle: ContextBundle | null;
  currentQuestionType: QuestionType;
  onAddQuestion: (text: string, qt: QuestionType) => void;
  onArchive: (questionId: string) => void;
  onAction: (action: ActionRecommendation) => void;
}) {
  return (
    <section role="region" aria-label="Notebook">
      {activeEntry ? (
        <Notebook
          entry={activeEntry}
          bundle={bundle}
          currentQuestionType={currentQuestionType}
          onAddQuestion={onAddQuestion}
          onArchive={onArchive}
          onAction={onAction}
        />
      ) : (
        <div
          style={{ color: 'var(--fg-subtle)', fontSize: 11 }}
          className="py-4"
        >
          No notebook entry for this target yet.
        </div>
      )}
    </section>
  );
}
