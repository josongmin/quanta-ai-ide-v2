import { type ReactNode } from 'react';

import { CopyableField } from './CopyableField';

// Copyable code block used 4+ times (reveal-once secret value, invite link,
// webhook signing secret, endpoint IDs): a canvas-surfaced box holding a
// monospaced value plus a Copy button that briefly flips to a "Copied" check.
//
// Thin wrapper over the generalized CopyableField (block layout, text button)
// kept for the existing call sites and export name.

type Props = {
  value: string;
  /** Optional eyebrow label rendered above the box. */
  label?: ReactNode;
  /** Copy button text. Defaults to "Copy" / "Copied". */
  copyLabel?: string;
  copiedLabel?: string;
};

export function CopyableCode({
  value, label, copyLabel = 'Copy', copiedLabel = 'Copied',
}: Props) {
  return (
    <CopyableField
      value={value}
      layout="block"
      button="text"
      label={label}
      copyLabel={copyLabel}
      copiedLabel={copiedLabel}
    />
  );
}
