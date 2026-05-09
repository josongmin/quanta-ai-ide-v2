import type { CSSProperties } from 'react';
import { X } from 'lucide-react';
import type {
  NotebookQuestion,
  NotebookQuestionStatus,
  QuestionType,
} from '@entities/investigation';

type Props = {
  questions: NotebookQuestion[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onArchive?: (id: string) => void;
};

const STATUS_TONE: Record<NotebookQuestionStatus, { bg: string; fg: string; label: string }> = {
  pending: {
    bg: 'var(--bg-surface-muted)',
    fg: 'var(--intent-warning-vivid)',
    label: 'pending',
  },
  answered: {
    bg: 'var(--bg-surface-muted)',
    fg: 'var(--intent-success-vivid)',
    label: 'answered',
  },
  partial: {
    bg: 'var(--bg-surface-muted)',
    fg: 'var(--fg-default)',
    label: 'partial',
  },
  archived: {
    bg: 'var(--bg-surface-muted)',
    fg: 'var(--fg-subtle)',
    label: 'archived',
  },
};

const QT_LABEL: Record<QuestionType, string> = {
  why_risky: 'RISK',
  blast_of_change: 'BLAST',
  incident_suspect: 'SUSPECT',
};

function StatusPill({ status }: { status: NotebookQuestionStatus }) {
  const tone = STATUS_TONE[status];
  const style: CSSProperties = {
    background: tone.bg,
    color: tone.fg,
    border: '1px solid var(--border-default)',
    fontSize: '9px',
    lineHeight: 1.1,
  };
  return (
    <span
      style={style}
      className="inline-flex items-center px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
    >
      {tone.label}
    </span>
  );
}

function QtBadge({ qt }: { qt: QuestionType }) {
  const style: CSSProperties = {
    color: 'var(--fg-subtle)',
    fontSize: '9px',
    lineHeight: 1.1,
  };
  return (
    <span className="font-mono uppercase tracking-wider" style={style}>
      {QT_LABEL[qt]}
    </span>
  );
}

export function QuestionList({ questions, selectedId, onSelect, onArchive }: Props) {
  if (questions.length === 0) {
    return (
      <div
        className="px-2 py-3"
        style={{ color: 'var(--fg-subtle)', fontSize: '11px' }}
      >
        No questions yet.
      </div>
    );
  }
  return (
    <ul className="m-0 p-0 list-none flex flex-col">
      {questions.map((q) => {
        const isSelected = selectedId === q.id;
        const rowStyle: CSSProperties = {
          background: isSelected ? 'var(--bg-active)' : 'transparent',
          borderTop: '1px solid var(--border-muted)',
          color: q.status === 'archived' ? 'var(--fg-subtle)' : 'var(--fg-default)',
          fontSize: '12px',
          lineHeight: 1.4,
          cursor: onSelect ? 'pointer' : 'default',
        };
        return (
          <li key={q.id} style={rowStyle}>
            <div
              className="flex items-start gap-2 px-2 py-2"
              onClick={onSelect ? () => onSelect(q.id) : undefined}
            >
              <div className="flex flex-col items-start gap-1 pt-0.5">
                <StatusPill status={q.status} />
                <QtBadge qt={q.questionType} />
              </div>
              <div
                className="flex-1 min-w-0"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {q.text}
              </div>
              {onArchive && q.status !== 'archived' ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(q.id);
                  }}
                  title="Archive question"
                  className="p-0.5 rounded hover:[background:var(--bg-hover)]"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default QuestionList;
