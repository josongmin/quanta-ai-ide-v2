import { createContext, useContext, type ReactNode } from 'react';

// Per-tab visibility signal. Each TabPanel publishes its own visibility on
// the context so heavy descendants (WebGL animation loops, polling
// intervals, IntersectionObservers) can pause when their tab is hidden
// behind `display: none`.
//
// Outside a TabPanel the value is `true` — consumers default to "visible"
// so they keep working in routes that aren't tab-hosted (auth pages,
// settings sub-pages, etc.).
const TabVisibilityCtx = createContext<boolean>(true);

export function TabVisibilityProvider({
  visible,
  children,
}: {
  visible: boolean;
  children: ReactNode;
}) {
  return <TabVisibilityCtx.Provider value={visible}>{children}</TabVisibilityCtx.Provider>;
}

/** Read the current tab's visibility. Returns `true` outside a tab panel. */
export function useTabVisibility(): boolean {
  return useContext(TabVisibilityCtx);
}
