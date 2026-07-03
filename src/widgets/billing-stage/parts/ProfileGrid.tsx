import type { BillingProfile } from './data';

type Props = { profile: BillingProfile };

export function ProfileGrid({ profile }: Props) {
  return (
    <dl className="grid grid-cols-2 gap-x-12 gap-y-5 max-w-[600px]">
      <Field label="Legal name"   value={profile.legalName} />
      <Field label="Billing email" value={profile.email} mono />
      <Field label="Country"      value={profile.country} />
      <Field label="Tax ID"       value={profile.taxId} mono />
      <Field label="Address"      value={profile.address} colSpan={2} />
      {profile.poNumber && <Field label="PO number" value={profile.poNumber} mono />}
    </dl>
  );
}

function Field({
  label, value, mono = false, colSpan = 1,
}: { label: string; value: string; mono?: boolean; colSpan?: 1 | 2 }) {
  return (
    <div className={`flex flex-col gap-1 ${colSpan === 2 ? 'col-span-2' : ''}`}>
      <dt
        className="text-xs uppercase tracking-eyebrow font-medium"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {label}
      </dt>
      <dd
        className={`text-base ${mono ? 'font-mono' : ''}`}
        style={{ color: 'var(--fg-default)' }}
      >
        {value}
      </dd>
    </div>
  );
}
