import { ArrowRight } from 'lucide-react';
import type { Cycle } from './types';

export function CycleToggle({ value, onChange }: { value: Cycle; onChange: (v: Cycle) => void }) {
  return (
    <div
      className="inline-flex items-center p-1 rounded-full mt-2"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 1px 2px color-mix(in srgb, var(--fg-strong) 8%, transparent)',
      }}
    >
      {(['monthly', 'annual'] as Cycle[]).map((id) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => { onChange(id); }}
            className="relative h-9 px-4 rounded-full text-[12px] font-semibold transition-colors"
            style={{
              color: active ? 'var(--bg-canvas)' : 'var(--fg-muted)',
              background: active ? 'var(--fg-strong)' : 'transparent',
            }}
          >
            <span className="capitalize">{id}</span>
            {id === 'annual' && (
              <span
                className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  background: active ? 'color-mix(in srgb, var(--bg-canvas) 22%, transparent)' : 'var(--intent-success-bg)',
                  color: active ? 'var(--bg-canvas)' : 'var(--intent-success-fg)',
                }}
              >
                Save 17%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TrustStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[16px] font-semibold tabular-nums" style={{ color: 'var(--fg-strong)' }}>{value}</span>
      <span style={{ color: 'var(--fg-subtle)' }}>{label}</span>
    </div>
  );
}

export function Divider() {
  return <span aria-hidden className="w-px h-3" style={{ background: 'var(--border-muted)' }} />;
}

export function SectionWrap({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <section className={`${narrow ? 'max-w-[760px]' : 'max-w-[1080px]'} mx-auto px-8 mt-16`}>
      {children}
    </section>
  );
}

export function PrimaryCta({ children, block = false }: { children: React.ReactNode; block?: boolean }) {
  return (
    <button
      type="button"
      className={`${block ? 'w-full' : ''} inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-md text-[12px] font-semibold transition-transform`}
      style={{
        background: 'var(--fg-strong)',
        color: 'var(--bg-canvas)',
        boxShadow: '0 4px 14px -4px color-mix(in srgb, var(--fg-strong) 50%, transparent)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {children}
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );
}

export function SecondaryCta({ children, block = false }: { children: React.ReactNode; block?: boolean }) {
  return (
    <button
      type="button"
      className={`${block ? 'w-full' : ''} inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-md text-[12px] font-semibold transition-colors`}
      style={{
        background: 'var(--bg-canvas)',
        color: 'var(--fg-strong)',
        border: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-canvas)'; }}
    >
      {children}
    </button>
  );
}
