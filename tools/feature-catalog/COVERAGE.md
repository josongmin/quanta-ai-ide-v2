# SOTA coverage

| Feature | Tier | cursor | claude code | devin | openhands | cody | continue ide | windsurf | copilot ws | Ours |
|---|---|---|---|---|---|---|---|---|---|---|
| `composer-ime-safe` IME-safe input (Korean / Japanese / Chinese) | 🟢 parity | ✅ | ✅ | ✅ | · | · | · | · | · | ✅ |
| `composer-mention-file` `#` file mention picker | 🟢 parity | ✅ | ✅ | · | · | ✅ | · | · | · | ✅ |
| `composer-mention-symbol` `@` symbol mention picker | 🟢 parity | ✅ | · | · | · | ✅ | · | · | · | ✅ |
| `composer-resize` ChatAgent vertical resize | 🟢 parity | ✅ | · | · | · | · | · | · | · | ✅ |
| `composer-slash-commands` Slash commands | 🟢 parity | ✅ | ✅ | ◐ | · | ✅ | · | · | · | ✅ |
| `model-picker-turn-level` Model picker with turn-level recording | 🟢 parity | ✅ | ✅ | · | · | · | ✅ | · | · | ✅ |
| `per-project-default-model` Per-project default model + saved override | 🔵 leading | ◐ | · | · | · | · | · | · | · | ✅ |
| `prompt-history` Prompt history (↑↓ shell-style) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `stop-heat` Stop button heat (neutral → amber → rose) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `stop-press-and-hold` Press-and-hold stop with progress ring | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `voice-interim` Voice input + interim ghost text | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `secret-mask-modal` Mask-and-send modal | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `secret-pattern-scan` Pattern + entropy secret scan | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `secret-redact-replace` Deterministic placeholder replacement | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `secret-three-tier` 3-tier severity (critical / warn / info) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `budget-pulse-animation` Heart-rate pulse on alert tier | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `budget-soft-cap-modal` Soft-cap modal (auto-downgrade / override / stop) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `budget-three-tier` 3-tier budget (alert / soft-cap / hard-cap) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `cost-forecast` Streaming-time next-turn forecast | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `cost-meter` Cumulative cost meter (tokens + USD) | 🟡 progressive | ◐ | ◐ | · | · | · | ✅ | · | · | ✅ |
| `cost-projection` Per-turn average projection | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `citation-staleness` Citation staleness detection | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `citations` Per-turn citations | 🟡 progressive | · | · | · | · | ✅ | · | · | · | ✅ |
| `drift-detection` Anomaly drift detector (stuck / noisy) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `latency-baseline` Latency baseline comparison (vs task average) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `latency-profile` Latency profile (per-phase stacked bar) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `per-turn-confidence` Self-eval confidence chip | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `phase-label` Phase label during streaming | 🟢 parity | · | ◐ | ✅ | · | · | · | · | · | ✅ |
| `tool-success-rate` Per-tool / per-model success rate | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `tps-live` TPS live meter (tok/s during streaming) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `branch-from-turn` Branch from turn (fork the task) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `inverse-op-recovery` Inverse-op append (non-destructive rewind) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `timeline-scrubber` Timeline scrubber (turn-level time travel) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `turn-menu-recover` Per-turn menu (rewind / branch / copy) | 🟢 parity | ◐ | · | · | · | · | · | · | · | ✅ |
| `working-tree-drift` Working-tree drift markers (clean / shifted / overlap / gone) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `diff-conflict-overlay` Conflict overlay on overlapping hunks | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `hunk-level-apply` Per-hunk apply / reject | 🟢 parity | ✅ | ◐ | · | · | ✅ | · | · | · | ✅ |
| `review-comments-inline` Inline review comments per hunk | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `side-by-side-diff` Side-by-side diff (with intra-line highlights) | 🟢 parity | ✅ | · | · | · | ✅ | · | · | · | ✅ |
| `test-hunk-mapping` Test ↔ hunk attribution scoring | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `background-tasks` Background streaming with notification badge | 🔵 leading | · | · | ✅ | · | · | · | · | · | ✅ |
| `per-task-budget` Per-task budget independent of project budget | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `task-archive` Archive completed tasks (with restore) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `task-rename-inline` Inline task rename (auto-suggested from first prompt) | 🟢 parity | ✅ | ✅ | · | · | · | · | · | · | ✅ |
| `task-sidebar` Multi-task sidebar with quick switch | 🟢 parity | ◐ | ✅ | ✅ | · | · | · | · | · | ✅ |
| `branch-name-suggest` Auto branch-name suggestion from task title | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `ci-failure-attribution` CI failure → suspect-hunk routing | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `pr-checks-inline` PR checks status inline | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `pr-description-export` Export thread as PR description (Markdown) | 🟢 parity | · | · | ◐ | · | · | · | · | · | ✅ |
| `plan-block` Agent-authored plan blocks | 🟢 parity | · | ◐ | ✅ | · | · | · | · | · | ✅ |
| `plan-edit-inline` User-editable plan steps | 🔵 leading | · | · | ◐ | · | · | · | · | · | ✅ |
| `plan-progress-meter` Plan progress meter (steps done / total) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `plan-skip-with-reason` Skip step with logged reason | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `density-toggle` Density toggle (comfortable / compact) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `keyboard-shortcut-overlay` Keyboard shortcut overlay (?) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `locale-sync-audit` i18n key parity audit (ko/en/ja/zh) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `prefers-contrast-aware` `prefers-contrast` aware tokens | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `prefers-reduced-motion` `prefers-reduced-motion` aware | 🟢 parity | · | ◐ | · | · | · | · | · | · | ✅ |
| `skip-to-composer` Skip-to-composer link | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `blueprint-surface` Blueprint surface utility (mode-aware bg) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `button-tone-system` Button tone system (primary / secondary / ghost / danger) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `click-outside-hook` useClickOutside (popover / menu dismiss) | ⚪ table-stakes | · | · | · | · | · | · | · | · | ✅ |
| `confidence-meter` ConfidenceMeter (calibrated 0..1 bar) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `deterministic-rng` Seeded RNG (deterministic demo data) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `dialog-a11y-hook` useDialogA11y (focus trap + restore) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `drawer-popover-modal-stack` Layered overlay primitives (Drawer / Popover / Modal) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `glass-card` GlassCard component (mode-aware glass) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `resize-handle` ResizeHandle (Fitts-correct rail/panel grip) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `section-component` Section component (titled, collapsible region) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `shortcut-registry` useShortcut (keyboard registry hook) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `stacked-ratio-bar` StackedRatioBar (segmented proportions) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `token-primitives` Token primitives (semantic, not literal) | 🔵 leading | ◐ | · | · | · | · | · | · | · | ✅ |
| `command-palette` ⌘K command palette | 🟢 parity | ✅ | ✅ | ◐ | · | · | · | · | · | ✅ |
| `live-snapshot-card` Live snapshot card (post-task summary) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `mention-caret-detection` Caret-anchored mention detection | 🟢 parity | ✅ | · | · | · | ✅ | · | · | · | ✅ |
| `task-drag-reorder` Drag-reorder tasks within project | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `task-rail-resize` TaskRail width resize | 🟢 parity | ✅ | · | · | · | · | · | · | · | ✅ |
| `turn-reactions` Per-turn reactions (👍 👎 ❤️ 🎯) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `turn-status-classification` Turn status / cost / risk classification helpers | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `chord-diagram` ChordDiagram (module ↔ module flows) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `cycle-graph` CycleGraph (find import cycles) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `dependency-matrix` DependencyMatrix (DSM) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `deps-carousel` DepsCarousel (dependency story strip) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `edge-bundling-map` EdgeBundlingMap (hierarchical edge bundling) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `focus-scan-stack` FocusScanStack (multi-pane focus view) | 🔵 leading | · | · | · | · | ◐ | · | · | · | ✅ |
| `inspect-panel` Inspect panel (multi-tab visualizer host) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `layered-box-diagram` LayeredBoxDiagram (architecture layers) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `risk-heatmap` RiskHeatmap (file × risk-axis) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `sunburst-hierarchy` SunburstHierarchy (radial folder hierarchy) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `symbol-time-machine` SymbolTimeMachine (per-symbol git history) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `treemap` Treemap (rectangular folder hierarchy) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `admission-workspace` Admission workspace (top-level) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `anomaly-sentinel` AnomalySentinel (z-score outlier surfacing) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `confidence-band` ConfidenceBand (CI ribbon overlay) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `confidence-mix` ConfidenceMix (rule confidence breakdown) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `cost-badge` CostBadge (per-rule cost overlay) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `counterfactual-impact` Counterfactual impact card | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `cusum-drift-card` CUSUM drift card (rule performance drift) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `effect-size-bar` Effect-size bar (Cohen's d / log-odds) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `reliability-diagram` Reliability diagram (rule calibration plot) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `rule-editor` RuleEditor (declarative predicate editor) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `rules-board` RulesBoard (kanban-style rule lifecycle) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `survival-curve` Survival curve (rule TTL) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `facet-renderer` FacetRenderer (declarative facet host) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `filter-bar` FilterBar (faceted filter host) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `folder-tree-nav` FolderTree (workspace navigator) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `preset-facet` PresetFacet (saved filter presets) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `project-selector` Project selector (filter scope) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `range-facet` RangeFacet (numeric range filter) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `search-dsl-bar` Search DSL bar (typed search syntax) | 🔵 leading | · | · | · | · | ◐ | · | · | · | ✅ |
| `avatar-component` Avatar (login → display) | ⚪ table-stakes | · | · | · | · | · | · | · | · | ✅ |
| `conversation-log` ConversationLog (timeline of review events) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `diff-view` DiffView (unified / split toggle) | 🟢 parity | ✅ | · | · | · | ✅ | · | · | · | ✅ |
| `inline-comment-composer` Inline comment composer | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `inline-thread` Inline review thread (per-line conversation) | 🔵 leading | · | · | · | · | ◐ | · | · | · | ✅ |
| `pr-preview-trigger` PR preview trigger (open the bar) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `review-action-bar` Review action bar (approve / request-changes / comment) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `ai-activity-control` ActivityControlPanel (operation throttle / kill) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `ai-activity-overlay` AI activity overlay (mode-scoped status) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `ai-activity-tray` ActivityTray (recent operations log) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `dotfield-mode` DotField mode (data-density view) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `mode-registry` Lazy mode registry | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `universe-mode` Universe mode (3D dependency space) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `view-mode-context` ViewModeContext (mode-aware components) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `app-shell` AppShell (chrome host) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `engine-findings-rail` EngineFindingsRail (CI / scanner findings) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `git-actions-menu` GitActionsMenu (branch-scoped quick actions) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `heat-overlay-picker` HeatOverlayPicker (heat-metric chooser) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `overlay-context` OverlayContext (heat / risk / time overlay state) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `pr-context-rail` PrContextRail (PR-level context) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `pr-ticket-rail` PrTicketRail (PR list scoped to me / team) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `prefs-context` PrefsContext (cross-feature preferences) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `risk-lens-switcher` RiskLensSwitcher (risk-axis cycler) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `settings-panel` SettingsPanel (top-level prefs UI) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `shortcuts-modal` ShortcutsModal (?-triggered cheat sheet) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `stage-host` Stage (top-level page host) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `time-window-picker` TimeWindowPicker (rolling window) | 🟢 parity | · | · | · | · | · | · | · | · | ✅ |
| `chat-agent-resize` ChatAgent vertical resize (top-grip handle) | 🔵 leading | ✅ | · | · | · | · | · | · | · | ✅ |
| `chat-agent-widget` ChatAgent (bottom-pinned conversational widget) | 🔵 leading | · | · | · | · | · | · | · | · | ✅ |
| `proactive-suggestions` Proactive suggestions (low-safety / unknown-flag / refactor / blast-radius) | 🔵 leading | ◐ | · | · | · | · | · | · | · | ✅ |
| `tokens-panel` TokensPanel (live cost + tokens drawer) | 🔵 leading | · | · | · | · | · | ✅ | · | · | ✅ |
