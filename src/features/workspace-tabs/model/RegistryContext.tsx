import { createContext, useContext, type ComponentType, type ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import type { TabKind, TabMeta } from '@shared/config/workspaceTabs';

export type TabKindDef = TabMeta & {
  icon: ComponentType<LucideProps>;
  Component: ComponentType;
};

const RegistryContext = createContext<Record<TabKind, TabKindDef> | null>(null);

export function WorkspaceTabsRegistryProvider({
  registry,
  children,
}: {
  registry: Record<TabKind, TabKindDef>;
  children: ReactNode;
}) {
  return (
    <RegistryContext.Provider value={registry}>
      {children}
    </RegistryContext.Provider>
  );
}

export function useWorkspaceTabsRegistry(): Record<TabKind, TabKindDef> {
  const registry = useContext(RegistryContext);
  if (!registry) {
    throw new Error('WorkspaceTabsRegistryProvider is missing above this subtree');
  }
  return registry;
}

export function useTabKindDef(kind: TabKind): TabKindDef {
  return useWorkspaceTabsRegistry()[kind];
}
