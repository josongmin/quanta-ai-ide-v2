import {
  createContext, useContext, useMemo, useState, type ReactNode,
} from 'react';
import type { ViewModeId } from '@entities/viz-mode';

type Ctx = { mode: ViewModeId; setMode: (m: ViewModeId) => void };
const C = createContext<Ctx | null>(null);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewModeId>('dot-field');
  const value = useMemo<Ctx>(() => ({ mode, setMode }), [mode]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useViewMode(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useViewMode must be inside ViewModeProvider');
  return c;
}
