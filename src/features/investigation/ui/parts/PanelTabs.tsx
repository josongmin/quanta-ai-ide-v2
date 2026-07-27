import { useTranslation } from 'react-i18next';
import type { QuestionType } from '@entities/investigation';
import { QUESTION_TYPES } from '../../lib';

type ViewMode = 'answer' | 'notebook';

function ModeTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:[background:var(--bg-hover)]"
      style={{
        background: active ? 'var(--bg-active)' : 'transparent',
        color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
        border: '1px solid var(--border-default)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function QuestionTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-[0.12em] transition-colors hover:[background:var(--bg-hover)]"
      style={{
        background: active ? 'var(--bg-active)' : 'transparent',
        color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export function PanelTabs({
  mode,
  onModeChange,
  questionType,
  onQuestionTypeChange,
}: {
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
  questionType: QuestionType;
  onQuestionTypeChange: (qt: QuestionType) => void;
}) {
  const { t } = useTranslation('investigation');
  return (
    <div
      className="flex items-center gap-2 px-3 shrink-0"
      style={{
        minHeight: 36,
        borderBottom: '1px solid var(--border-default)',
        flexWrap: 'wrap',
        paddingTop: 4,
        paddingBottom: 4,
      }}
    >
      <div
        role="tablist"
        aria-label={t('tabs.modeAria')}
        className="flex items-center gap-1"
      >
        <ModeTab label={t('tabs.answer')} active={mode === 'answer'} onClick={() => { onModeChange('answer'); }} />
        <ModeTab label={t('tabs.notebook')} active={mode === 'notebook'} onClick={() => { onModeChange('notebook'); }} />
      </div>
      {mode === 'answer' ? (
        <div className="flex items-center gap-1 ml-1">
          {QUESTION_TYPES.map((qt) => (
            <QuestionTab
              key={qt}
              label={t(`tabs.questionType.${qt}`)}
              active={questionType === qt}
              onClick={() => { onQuestionTypeChange(qt); }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
