import {
  createContext, useContext, useMemo, type ReactNode,
} from 'react';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';

// The i18n translate fn for the 'coding' namespace, typed exactly as
// `useTranslation('coding')` returns it. Kept in a named alias so consumers
// that previously took a looser `(k, opts?) => string` prop stay assignable.
type CodingTranslate = ReturnType<typeof useTranslation<'coding'>>['t'];

type CodingStageCtx = {
  t: CodingTranslate;
  isDark: boolean;
};

const CodingStageC = createContext<CodingStageCtx | null>(null);

// Provides the app-wide i18n translate fn (coding namespace) + theme bool to
// every coding-stage part, so they no longer need `t` / `isDark` prop-drilled
// through ~20 component signatures.
export function CodingStageProvider({ children }: { children: ReactNode }) {
  const { isDark } = useTheme();
  const { t } = useTranslation('coding');

  const value = useMemo<CodingStageCtx>(() => ({ t, isDark }), [t, isDark]);

  return <CodingStageC.Provider value={value}>{children}</CodingStageC.Provider>;
}

export function useCodingStage(): CodingStageCtx {
  const c = useContext(CodingStageC);
  if (!c) throw new Error('useCodingStage must be inside CodingStageProvider');
  return c;
}
