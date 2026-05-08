import { useState } from 'react';
import { useTheme } from '@shared/theme';
import AdmissionWorkspace from './AdmissionWorkspace';
import AdmissionV2 from './v2/AdmissionV2';

// Top-level admission page with a v1 / v2 switcher pinned to the
// bottom-right. v2 is the dark-only statement layout; v1 is kept
// available for comparison while the new design beds in.

type Variant = 'v1' | 'v2';

export default function AdmissionRoot() {
  const [variant, setVariant] = useState<Variant>('v2');
  const { isDark } = useTheme();

  return (
    <div className="absolute inset-0">
      {variant === 'v1' ? <AdmissionWorkspace /> : <AdmissionV2 />}
      <div
        className="absolute bottom-4 right-4 z-50 flex items-center gap-px rounded-full overflow-hidden"
        style={{
          background: isDark ? 'rgba(13,17,23,0.75)' : 'rgba(255,255,255,0.75)',
          border: '1px solid var(--border-default)',
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {(['v1', 'v2'] as Variant[]).map((v) => {
          const active = variant === v;
          return (
            <button type="button"
              key={v}
              onClick={() => { setVariant(v); }}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${
                active
                  ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                  : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg-strong)]'
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
