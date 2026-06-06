import type { QuestionType } from '@entities/investigation';

// Single source of truth for QuestionType presentation. Three label variants
// were copy-pasted across the panel tabs (full question), the notebook
// composer pills (short), and the question-list badge (uppercase). Centralizing
// them here means a new question type is one entry, not edits across N files
// (Open/Closed), and the canonical ordering lives in exactly one place.
//
// Each label set is preserved verbatim so rendered text is identical to before.

type QuestionTypeMeta = {
  /** Full question form — panel question tabs. */
  tab: string;
  /** Short composer-pill label — notebook "Ask" row. */
  short: string;
  /** Uppercase badge — question-list rows. */
  badge: string;
};

export const QUESTION_TYPE_META: Record<QuestionType, QuestionTypeMeta> = {
  why_risky: { tab: 'Why risky?', short: 'Risk', badge: 'RISK' },
  blast_of_change: { tab: 'Blast of change?', short: 'Blast', badge: 'BLAST' },
  incident_suspect: { tab: 'Suspect for incident?', short: 'Suspect', badge: 'SUSPECT' },
};

/** Canonical display order for question types. */
export const QUESTION_TYPES: QuestionType[] = [
  'why_risky',
  'blast_of_change',
  'incident_suspect',
];
