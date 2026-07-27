import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('investigation');
  return (
    <section role="region" aria-label={t('tabs.notebook')}>
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
          {t('notebook.body.noEntry')}
        </div>
      )}
    </section>
  );
}
