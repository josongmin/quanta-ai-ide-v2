import { useTheme } from '@shared/theme';
import type { WizardData } from './wizard';
import { Header } from './done/Header';
import { DotFieldPreview } from './done/DotFieldPreview';
import { IndexingTerminal } from './done/IndexingTerminal';
import { NextActions } from './done/NextActions';
import { SummaryTile } from './done/SummaryTile';
import { CtaRow } from './done/CtaRow';

type Props = { data: WizardData };

// Final landing for the wizard. Streams a fake indexing log into a tiny
// terminal pane while a dot-field preview animates. Once indexing reaches
// 100% we surface a next-action checklist + a single CTA into /intelligence.
export function DonePage({ data }: Props) {
  const { isDark } = useTheme();
  const pageBg = isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)';

  return (
    <div
      className="absolute inset-0 flex flex-col items-center overflow-y-auto"
      style={{ background: pageBg }}
    >
      <div className="w-full max-w-[720px] px-6 pt-12 pb-16 flex flex-col gap-7 z-10 onb-step-in">
        <Header data={data} />

        <div className="grid grid-cols-2 gap-4">
          <DotFieldPreview />
          <IndexingTerminal repo={data.workspace.repo || 'acme/acme-monorepo'} />
        </div>

        <NextActions data={data} />

        <SummaryTile data={data} />

        <CtaRow data={data} />
      </div>
    </div>
  );
}
