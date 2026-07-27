import type { Industry, CompanySize } from '../../wizard';

// Industry ids only — labels are resolved via t(`org.industries.${id}`).
export const INDUSTRIES: { id: Industry }[] = [
  { id: 'software' },
  { id: 'finance' },
  { id: 'healthcare' },
  { id: 'retail' },
  { id: 'media' },
  { id: 'gov-edu' },
  { id: 'manufacturing' },
  { id: 'other' },
];

// `label` is a numeric range (locale-agnostic); `sub` is resolved via
// t(`org.sizes.${id}Sub`).
export const SIZES: { id: CompanySize; label: string }[] = [
  { id: '1-4',     label: '1–4' },
  { id: '5-19',    label: '5–19' },
  { id: '20-99',   label: '20–99' },
  { id: '100-499', label: '100–499' },
  { id: '500+',    label: '500+' },
];

export type RecognizedOrgMeta = { name: string; plan: string; members: number };

// Demo invite-code → org lookup. The prefix→meta map replaces the previous
// `startsWith` if/else chain so a new demo org is one entry, not a new branch.
const RECOGNIZED_BY_PREFIX: { prefix: string; meta: RecognizedOrgMeta }[] = [
  { prefix: 'ACME',    meta: { name: 'ACME, Inc.',         plan: 'Team',     members: 18 } },
  { prefix: 'GLOBEX',  meta: { name: 'Globex Industries',  plan: 'Business', members: 47 } },
  { prefix: 'INITECH', meta: { name: 'Initech',            plan: 'Free',     members: 4  } },
];

const UNKNOWN_ORG: RecognizedOrgMeta = { name: 'Unknown', plan: '—', members: 0 };

export function recognizedOrgFor(code: string): RecognizedOrgMeta {
  return RECOGNIZED_BY_PREFIX.find((o) => code.startsWith(o.prefix))?.meta ?? UNKNOWN_ORG;
}
