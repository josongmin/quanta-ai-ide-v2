// Static demo data for the billing surface. Pure data; no effects.

import type { PlanId } from '@entities/plan';

export type { PlanId };

// Copy (name/tagline/highlights/limit labels) is resolved from the `billing`
// i18n namespace at render time. Data here holds only structure: ids, prices,
// i18n key refs, and machine-readable limit values.
export type LimitKey = 'workspaces' | 'seats' | 'agents' | 'retention';
export type LimitValue =
  | { kind: 'raw'; text: string }
  | { kind: 'unlimited' }
  | { kind: 'custom' }
  | { kind: 'days'; count: number }
  | { kind: 'years'; count: number };

export type Plan = {
  id: PlanId;
  monthly: number | null;     // USD per seat / month. null = "Talk to us"
  annual: number | null;
  highlights: string[];       // i18n key suffixes under plans.<id>.highlights.*
  limits: { key: LimitKey; value: LimitValue }[];
};

export const PLANS: Plan[] = [
  {
    id: 'free',
    monthly: 0,
    annual: 0,
    highlights: ['workspaces', 'seats', 'support', 'retention'],
    limits: [
      { key: 'workspaces', value: { kind: 'raw', text: '1' } },
      { key: 'seats', value: { kind: 'raw', text: '3' } },
      { key: 'agents', value: { kind: 'raw', text: '1' } },
      { key: 'retention', value: { kind: 'days', count: 7 } },
    ],
  },
  {
    id: 'team',
    monthly: 24,
    annual: 20,
    highlights: ['workspaces', 'seats', 'admission', 'retention'],
    limits: [
      { key: 'workspaces', value: { kind: 'raw', text: '5' } },
      { key: 'seats', value: { kind: 'unlimited' } },
      { key: 'agents', value: { kind: 'raw', text: '3' } },
      { key: 'retention', value: { kind: 'days', count: 30 } },
    ],
  },
  {
    id: 'business',
    monthly: 64,
    annual: 54,
    highlights: ['workspaces', 'saml', 'residency', 'retention', 'routing'],
    limits: [
      { key: 'workspaces', value: { kind: 'unlimited' } },
      { key: 'seats', value: { kind: 'unlimited' } },
      { key: 'agents', value: { kind: 'raw', text: '10' } },
      { key: 'retention', value: { kind: 'years', count: 1 } },
    ],
  },
  {
    id: 'enterprise',
    monthly: null,
    annual: null,
    highlights: ['selfHost', 'retention', 'sla', 'csm', 'procurement'],
    limits: [
      { key: 'workspaces', value: { kind: 'unlimited' } },
      { key: 'seats', value: { kind: 'unlimited' } },
      { key: 'agents', value: { kind: 'custom' } },
      { key: 'retention', value: { kind: 'custom' } },
    ],
  },
];

// Current usage relative to the active plan. The bars in UsageMeters bind to
// `used / limit`. `limit: null` renders as unmetered ("∞"). Numbers chosen
// to land at varied fill % so the meter visualizations have signal.
// Copy (label/unit/hint) resolved from billing:usage.<key>.* at render time.
// `hintCount` feeds a pluralized hint (e.g. pending invitations).
export type UsageRow = {
  key: string;
  used: number;
  limit: number | null;
  hintCount?: number;
};

export const USAGE: UsageRow[] = [
  { key: 'seats',      used: 18,    limit: 25,    hintCount: 7 },
  { key: 'workspaces', used: 3,     limit: 5 },
  { key: 'agents',     used: 2_184, limit: 5_000 },
  { key: 'tokens',     used: 12.4,  limit: 30 },
  { key: 'scans',      used: 412,   limit: 1_000 },
  { key: 'storage',    used: 7.8,   limit: 50 },
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
  nameKey: string;         // billing:contracts.names.<nameKey>
  abbr: string;            // short tag rendered as monospace pill
  version: string;         // e.g. "v3.2"
  effective: string;       // ISO yyyy-mm-dd
  expires: string | null;  // null = ongoing / evergreen
  sizeKb: number;
  pdfUrl: string;
};

export const CONTRACTS: Contract[] = [
  { id: 'ct_1', nameKey: 'msa', abbr: 'MSA', version: 'v3.2', effective: '2025-09-14', expires: '2027-09-13', sizeKb: 412, pdfUrl: '#' },
  { id: 'ct_2', nameKey: 'dpa', abbr: 'DPA', version: 'v2.1', effective: '2025-09-14', expires: null,         sizeKb: 188, pdfUrl: '#' },
  { id: 'ct_3', nameKey: 'baa', abbr: 'BAA', version: 'v1.4', effective: '2026-01-22', expires: '2027-01-21', sizeKb: 226, pdfUrl: '#' },
  { id: 'ct_4', nameKey: 'scc', abbr: 'SCC', version: 'v1.0', effective: '2025-09-14', expires: null,         sizeKb: 154, pdfUrl: '#' },
];
