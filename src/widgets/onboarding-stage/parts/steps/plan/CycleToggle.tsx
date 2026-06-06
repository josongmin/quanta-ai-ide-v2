import { SegmentedToggle } from '../../primitives/SegmentedToggle';

const CYCLES = ['monthly', 'annual'] as const;

export function CycleToggle({
  cycle, onChange,
}: { cycle: 'monthly' | 'annual'; onChange: (c: 'monthly' | 'annual') => void }) {
  return (
    <SegmentedToggle
      options={CYCLES}
      value={cycle}
      onChange={onChange}
      className="self-start"
      segmentPadding="px-3"
      renderLabel={(c) => (
        c === 'annual' ? (
          <span className="flex items-center gap-1.5">
            Annual
            <span
              className="text-[8px] uppercase tracking-[0.14em] font-semibold px-1 py-0.5 rounded"
              style={{ background: 'var(--fg-accent)', color: 'var(--bg-canvas)' }}
            >
              −17%
            </span>
          </span>
        ) : 'Monthly'
      )}
    />
  );
}
