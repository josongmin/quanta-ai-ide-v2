// Public API for the ai-activity feature: components other widgets
// compose with, plus the activity store for chrome consumers (app-shell
// StatusBar). The demo prefs types stay slice-private.
export { ActivityDemo } from './model/demoSimulator';
export { useActivityStore } from './model/activityStore';
export { ActivityTray } from './ui/ActivityTray';
export { ActivityControlPanel } from './ui/ActivityControlPanel';
export { ActivityOverlay } from './ui/ActivityOverlay';
export { AgentFeedPanel } from './ui/AgentFeedPanel';
