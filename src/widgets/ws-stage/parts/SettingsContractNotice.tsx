import { AlertTriangle } from 'lucide-react';

type Props = {
  title: string;
  message: string;
};

export function SettingsContractNotice({ title, message }: Props) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 px-3 py-2 rounded-md text-sm"
      style={{
        background: 'var(--intent-warn-bg)',
        color: 'var(--intent-warn-fg)',
        border: '1px solid var(--border-default)',
      }}
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div>{message}</div>
      </div>
    </div>
  );
}
