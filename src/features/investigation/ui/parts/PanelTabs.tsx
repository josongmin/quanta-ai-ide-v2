import type { QuestionType } from '@entities/investigation';
import { QUESTION_TYPES, QUESTION_TYPE_META } from '../../lib';

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
      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.12em] transition-colors hover:[background:var(--bg-hover)]"
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
      className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.12em] transition-colors hover:[background:var(--bg-hover)]"
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
        aria-label="Investigation view mode"
        className="flex items-center gap-1"
      >
        <ModeTab label="Answer" active={mode === 'answer'} onClick={() => { onModeChange('answer'); }} />
        <ModeTab label="Notebook" active={mode === 'notebook'} onClick={() => { onModeChange('notebook'); }} />
      </div>
      {mode === 'answer' ? (
        <div className="flex items-center gap-1 ml-1">
          {QUESTION_TYPES.map((qt) => (
            <QuestionTab
              key={qt}
              label={QUESTION_TYPE_META[qt].tab}
              active={questionType === qt}
              onClick={() => { onQuestionTypeChange(qt); }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
