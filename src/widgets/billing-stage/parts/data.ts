// Static demo data for the billing surface. Pure data; no effects.

import type { PlanId } from '@entities/plan';

export type { PlanId };

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number | null;     // USD per seat / month. null = "Talk to us"
  annual: number | null;
  highlights: string[];
  limits: { label: string; value: string }[];
};

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'For individuals exploring the dot-field.',
    monthly: 0,
    annual: 0,
    highlights: [
      '1 workspace',
      'Up to 3 seats',
      'Community support',
      '7-day audit retention',
    ],
    limits: [
      { label: 'Workspaces', value: '1' },
      { label: 'Seats', value: '3' },
      { label: 'AI agents (concurrent)', value: '1' },
      { label: 'Audit retention', value: '7 days' },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For small teams shipping together.',
    monthly: 24,
    annual: 20,
    highlights: [
      '5 workspaces',
      'Unlimited seats',
      'Custom admission rules',
      '30-day audit retention',
    ],
    limits: [
      { label: 'Workspaces', value: '5' },
      { label: 'Seats', value: 'Unlimited' },
      { label: 'AI agents (concurrent)', value: '3' },
      { label: 'Audit retention', value: '30 days' },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For organizations standardizing review & gating.',
    monthly: 64,
    annual: 54,
    highlights: [
      'Unlimited workspaces',
      'SAML / SCIM',
      'Data residency',
      '1-year audit retention',
      'Priority routing',
    ],
    limits: [
      { label: 'Workspaces', value: 'Unlimited' },
      { label: 'Seats', value: 'Unlimited' },
      { label: 'AI agents (concurrent)', value: '10' },
      { label: 'Audit retention', value: '1 year' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For regulated and self-hosted deployments.',
    monthly: null,
    annual: null,
    highlights: [
      'Self-host / VPC option',
      'Custom data retention',
      'Custom SLA',
      'Dedicated CSM',
      'Procurement & MSA support',
    ],
    limits: [
      { label: 'Workspaces', value: 'Unlimited' },
      { label: 'Seats', value: 'Unlimited' },
      { label: 'AI agents (concurrent)', value: 'Custom' },
      { label: 'Audit retention', value: 'Custom' },
    ],
  },
];

// Current usage relative to the active plan. The bars in UsageMeters bind to
// `used / limit`. `limit: null` renders as unmetered ("∞"). Numbers chosen
// to land at varied fill % so the meter visualizations have signal.
export type UsageRow = {
  key: string;
  label: string;
  used: number;
  limit: number | null;
  unit: string;
  hint?: string;
};

export const USAGE: UsageRow[] = [
  { key: 'seats',     label: 'Seats',                 used: 18,    limit: 25,    unit: 'seats',  hint: '7 invitations pending' },
  { key: 'workspaces',label: 'Workspaces',            used: 3,     limit: 5,     unit: 'ws' },
  { key: 'agents',    label: 'AI agent runs',         used: 2_184, limit: 5_000, unit: 'runs',   hint: 'Resets May 31' },
  { key: 'tokens',    label: 'AI tokens',             used: 12.4,  limit: 30,    unit: 'M tok',  hint: '$0.42 / M overage' },
  { key: 'scans',     label: 'Repository scans',      used: 412,   limit: 1_000, unit: 'scans' },
  { key: 'storage',   label: 'Artifact storage',      used: 7.8,   limit: 50,    unit: 'GB' },
];

export type Invoice = {
  id: string;
  number: string;
  date: string;        // ISO yyyy-mm-dd, rendered locally
  amount: number;      // cents
  currency: 'USD';
  status: 'paid' | 'open' | 'void' | 'past_due';
  pdfUrl: string;
};

export const INVOICES: Invoice[] = [
  { id: 'in_1', number: 'INV-2026-0005', date: '2026-05-01', amount: 48_000, currency: 'USD', status: 'paid',     pdfUrl: '#' },
  { id: 'in_2', number: 'INV-2026-0004', date: '2026-04-01', amount: 48_000, currency: 'USD', status: 'paid',     pdfUrl: '#' },
  { id: 'in_3', number: 'INV-2026-0003', date: '2026-03-01', amount: 43_200, currency: 'USD', status: 'paid',     pdfUrl: '#' },
  { id: 'in_4', number: 'INV-2026-0002', date: '2026-02-01', amount: 43_200, currency: 'USD', status: 'paid',     pdfUrl: '#' },
  { id: 'in_5', number: 'INV-2026-0001', date: '2026-01-01', amount: 38_400, currency: 'USD', status: 'paid',     pdfUrl: '#' },
  { id: 'in_6', number: 'INV-2025-0012', date: '2025-12-01', amount: 38_400, currency: 'USD', status: 'past_due', pdfUrl: '#' },
];

export type PaymentMethod = {
  id: string;
  brand: 'visa' | 'mastercard' | 'amex';
  last4: string;
  exp: string;          // MM/YY
  default: boolean;
  holder: string;
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm_1', brand: 'visa',       last4: '4242', exp: '08/28', default: true,  holder: 'ACME, Inc.' },
  { id: 'pm_2', brand: 'mastercard', last4: '8210', exp: '11/27', default: false, holder: 'Sora Kim'   },
];

export type BillingProfile = {
  legalName: string;
  email: string;
  country: string;
  taxId: string;
  address: string;
  poNumber?: string;
};

export const BILLING_PROFILE: BillingProfile = {
  legalName: 'ACME, Inc.',
  email: 'billing@acme.example',
  country: 'United States',
  taxId: 'EIN 88-1234567',
  address: '500 Howard St, San Francisco, CA 94105',
  poNumber: 'PO-2026-Q2',
};

// Tax IDs registered for the org. Multi-jurisdiction: when an invoice is
// issued from a billing entity in a country where the customer holds a
// matching tax ID, the engine flips into reverse-charge / zero-rated mode.
export type TaxId = {
  id: string;
  country: string;        // ISO-2 letters, displayed as flag-letter monogram
  countryName: string;
  type: string;           // human label, e.g. "EU VAT", "US EIN"
  value: string;          // the actual identifier
  verified: boolean;
};

export const TAX_IDS: TaxId[] = [
  { id: 'tax_1', country: 'US', countryName: 'United States', type: 'US EIN',  value: '88-1234567',     verified: true  },
  { id: 'tax_2', country: 'DE', countryName: 'Germany',       type: 'EU VAT',  value: 'DE 312 094 871', verified: true  },
  { id: 'tax_3', country: 'GB', countryName: 'United Kingdom',type: 'UK VAT',  value: 'GB 421 998 12',  verified: false },
  { id: 'tax_4', country: 'KR', countryName: 'South Korea',   type: 'KR BRN',  value: '220-81-62517',   verified: true  },
];

// Enterprise contracts — counter-signed PDFs the org has on file. The list
// is intentionally short; a real workspace would paginate.
export type Contract = {
  id: string;
  name: string;
  abbr: string;            // short tag rendered as monospace pill
  version: string;         // e.g. "v3.2"
  effective: string;       // ISO yyyy-mm-dd
  expires: string | null;  // null = ongoing / evergreen
  sizeKb: number;
  pdfUrl: string;
};

export const CONTRACTS: Contract[] = [
  { id: 'ct_1', name: 'Master Services Agreement',     abbr: 'MSA', version: 'v3.2', effective: '2025-09-14', expires: '2027-09-13', sizeKb: 412, pdfUrl: '#' },
  { id: 'ct_2', name: 'Data Processing Addendum',      abbr: 'DPA', version: 'v2.1', effective: '2025-09-14', expires: null,         sizeKb: 188, pdfUrl: '#' },
  { id: 'ct_3', name: 'Business Associate Agreement',  abbr: 'BAA', version: 'v1.4', effective: '2026-01-22', expires: '2027-01-21', sizeKb: 226, pdfUrl: '#' },
  { id: 'ct_4', name: 'Standard Contractual Clauses',  abbr: 'SCC', version: 'v1.0', effective: '2025-09-14', expires: null,         sizeKb: 154, pdfUrl: '#' },
];
