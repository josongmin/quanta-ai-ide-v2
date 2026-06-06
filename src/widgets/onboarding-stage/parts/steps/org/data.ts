import type { Industry, CompanySize } from '../../wizard';

export const INDUSTRIES: { id: Industry; label: string }[] = [
  { id: 'software',      label: 'Software & SaaS' },
  { id: 'finance',       label: 'Finance & FinTech' },
  { id: 'healthcare',    label: 'Healthcare & BioTech' },
  { id: 'retail',        label: 'Retail & E-commerce' },
  { id: 'media',         label: 'Media & Gaming' },
  { id: 'gov-edu',       label: 'Government & Education' },
  { id: 'manufacturing', label: 'Manufacturing & Logistics' },
  { id: 'other',         label: 'Other' },
];

export const SIZES: { id: CompanySize; label: string; sub: string }[] = [
  { id: '1-4',     label: '1–4',     sub: 'Just starting' },
  { id: '5-19',    label: '5–19',    sub: 'Small team' },
  { id: '20-99',   label: '20–99',   sub: 'Growing' },
  { id: '100-499', label: '100–499', sub: 'Mid-size' },
  { id: '500+',    label: '500+',    sub: 'Enterprise' },
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
