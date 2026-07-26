import { createContext, useContext, type ComponentType, type ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

// Surface runtime injection (P0-3/P1). The app layer composes the surface
// catalog (view + icon) and injects it here keyed on `surfaceId`. Features read
// it without importing widget code and without a closed `TabKind` switch.
export type SurfaceRuntimeEntry = {
  Component: ComponentType;
  icon: ComponentType<LucideProps>;
};

const SurfaceRuntimeContext = createContext<Readonly<Record<string, SurfaceRuntimeEntry>> | null>(null);

export function SurfaceRuntimeProvider({
  registry,
  children,
}: {
  registry: Readonly<Record<string, SurfaceRuntimeEntry>>;
  children: ReactNode;
}) {
  return <SurfaceRuntimeContext.Provider value={registry}>{children}</SurfaceRuntimeContext.Provider>;
}

export function useSurfaceRuntime(): Readonly<Record<string, SurfaceRuntimeEntry>> {
  const registry = useContext(SurfaceRuntimeContext);
  if (!registry) {
    throw new Error('SurfaceRuntimeProvider is missing above this subtree');
  }
  return registry;
}

export function useSurfaceEntry(surfaceId: string): SurfaceRuntimeEntry | undefined {
  return useSurfaceRuntime()[surfaceId];
}
