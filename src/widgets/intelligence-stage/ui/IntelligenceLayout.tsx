import { Suspense, lazy } from 'react';
import { ErrorBoundary } from '@shared/ui';
import { useTheme } from '@shared/theme';
import { SearchBar } from '@features/search-dsl';
import { ModeSwitcher, useViewMode } from '@features/switch-mode';
import { Stage } from '@widgets/stage';
import FilterBarHost from './FilterBarHost';
import {
  getCenterMaxWidth,
  getFloatingToolbarLeft,
  INTELLIGENCE_LAYOUT,
  LEFT_PANEL,
  RIGHT_PANEL,
  usePersistedPanelWidth,
} from '@shared/lib/panelLayout';

const ChatAgent = lazy(() =>
  import('@features/chat-agent').then((m) => ({ default: m.ChatAgent })),
);

const InvestigatePanel = lazy(() =>
  import('@features/investigation').then((m) => ({ default: m.InvestigatePanel })),
);

const InvestigateLauncher = lazy(() =>
  import('@features/investigation').then((m) => ({ default: m.InvestigateLauncher })),
);

const JobsTray = lazy(() =>
  import('@features/investigation').then((m) => ({ default: m.JobsTray })),
);

// OverlayPopover (~880 lines) and FocusScanStack (drag-down inspect panels;
// pulls WorkspaceBody/FolderBody/Treemap/etc.) are landing-page-resident but
// not painted on first frame — popover is closed and stack is empty until
// the user interacts. Lazy-loaded so they leave the initial chunk.
const OverlayPopover = lazy(() =>
  import('@features/apply-overlay').then((m) => ({ default: m.OverlayPopover })),
);

const FocusScanStack = lazy(() =>
  import('@features/inspect-target').then((m) => ({ default: m.FocusScanStack })),
);

export default function IntelligenceLayout() {
  const { mode } = useViewMode();
  const { isDark } = useTheme();
  const [leftPanelWidth, setLeftPanelWidth] = usePersistedPanelWidth(LEFT_PANEL);
  const [rightPanelWidth, setRightPanelWidth] = usePersistedPanelWidth(RIGHT_PANEL);

  const bgVar = mode === 'universe'
    ? 'var(--bg-stage-universe)'
    : 'var(--bg-stage)';
  const centerMaxWidth = getCenterMaxWidth(leftPanelWidth, rightPanelWidth);

  return (
    <div
      className="absolute inset-0 overflow-hidden font-sans select-none"
      style={{ backgroundColor: bgVar }}
    >
      <ErrorBoundary label="Stage">
        <Stage />
      </ErrorBoundary>

      <div
        className="absolute z-40 pointer-events-auto flex"
        style={{
          top: 0,
          bottom: 0,
          left: INTELLIGENCE_LAYOUT.sideInset,
        }}
      >
        <FilterBarHost
          width={leftPanelWidth}
          onWidthChange={setLeftPanelWidth}
        />
      </div>

      <SearchBar maxWidth={centerMaxWidth} />

      <div
        className="absolute z-30 pointer-events-auto flex items-start gap-2 flex-wrap"
        style={{
          top: INTELLIGENCE_LAYOUT.topInset,
          left: getFloatingToolbarLeft(leftPanelWidth),
          maxWidth: centerMaxWidth,
        }}
      >
        <ModeSwitcher />
        <Suspense fallback={null}>
          <OverlayPopover />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <FocusScanStack
          isDark={isDark}
          width={rightPanelWidth}
          minWidth={RIGHT_PANEL.min}
          maxWidth={RIGHT_PANEL.max}
          defaultWidth={RIGHT_PANEL.defaultWidth}
          onWidthChange={setRightPanelWidth}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ChatAgent maxWidth={centerMaxWidth} />
      </Suspense>

      <Suspense fallback={null}>
        <InvestigateLauncher />
        <InvestigatePanel />
        <JobsTray />
      </Suspense>
    </div>
  );
}
