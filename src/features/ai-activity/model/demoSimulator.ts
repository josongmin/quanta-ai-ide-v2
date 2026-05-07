import { useEffect } from 'react';
import { useTranslation } from '@shared/i18n';
import { useFilterStore } from '@features/filter-files';
import {
  useActivityStore, pickHue,
  type AiActivity, type ActivityAction, type ActivityTarget,
} from './activityStore';
import type { FileRecord } from '@entities/repo';

type ActivityT = (key: string, opts?: Record<string, unknown>) => string;

// ─── Demo simulator ───────────────────────────────────────────────────
// In a real product the ChatAgent would push activities into the store
// directly. Until that wiring exists, this component synthesizes a small
// stream so the visualization is observable.
//
// Behaviour:
//   1. Picks 1–3 simultaneous "chat sessions"
//   2. Each session locks onto a small cluster of files (same folder when
//      possible) for 4–8s, then jumps to a different cluster.
//   3. State cycles thinking → editing → done.

const TICK_MS = 800;       // animate state every ~tick
const SWITCH_MS = 6000;    // each chat picks new targets every 6s
const MAX_CHATS = 2;       // demo runs with 2 concurrent chats

const AGENTS = ['claude-opus-4.7', 'claude-sonnet-4.6', 'gpt-5'] as const;

// Plausible top-level tasks a coding agent might be working on. Each task
// biases what the simulator chooses to do per file (e.g. "Adding rate limit"
// → editing/refactoring on auth/handler-ish files). Localised via i18n
// (chat.activity.tasks.*) so the strings stay in sync with the user's
// language; the keys here are stable and locale-agnostic.
const TASK_KEYS = [
  'rateLimit',
  'flakyTest',
  'reactMigration',
  'prod500',
  'strictTypes',
  'bundleSize',
  'serviceTests',
  'routingRefactor',
  'cve',
  'reviewPr',
] as const;
function buildTasks(t: ActivityT): readonly string[] {
  return TASK_KEYS.map((k) => t(`activity.tasks.${k}`));
}

export function ActivityDemo() {
  const repo = useFilterStore((s) => s.repo);
  const { t: tr } = useTranslation('chat');

  useEffect(() => {
    if (!repo || repo.files.length === 0) return;
    const store = useActivityStore;
    const TASKS = buildTasks(tr);

    // Respect demoMode. If a real producer (e.g. ChatAgent wiring) has
    // already pushed activities into the store and demoMode is off, don't
    // synthesize on top of them. demoMode === true keeps the legacy
    // always-on behaviour so visualization stays observable by default.
    const initial = store.getState();
    if (!initial.prefs.demoMode && initial.activities.length > 0) return;

    type Session = {
      chatId: string;
      agent: string;
      task: string;
      hue: string;
      targets: ActivityTarget[];
      lastSwitch: number;
      state: AiActivity['state'];
      stateChangeAt: number;
    };

    const sessions: Session[] = Array.from({ length: MAX_CHATS }).map((_, i) => {
      const targets = buildTargets(repo.files, tr);
      return {
        chatId: `demo-${i}`,
        agent: AGENTS[i % AGENTS.length] ?? AGENTS[0],
        task: TASKS[Math.floor(Math.random() * TASKS.length)] ?? TASKS[0],
        hue: pickHue(i),
        targets,
        lastSwitch: Date.now(),
        state: 'thinking',
        stateChangeAt: Date.now(),
      };
    });

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const now = Date.now();
      const state = store.getState();
      const enabled = state.prefs.enabled;
      if (!enabled) {
        state.clearActivities();
        return;
      }
      // If demoMode is off and any non-demo activity exists, stop
      // synthesizing. We still leave whatever real activity is in the store
      // alone — only clear our own demo-* sessions.
      if (!state.prefs.demoMode) {
        for (const s of sessions) state.removeActivity(s.chatId);
        return;
      }
      for (const s of sessions) {
        // Cycle state every 1.5–3s so the ring color hint changes occasionally.
        if (now - s.stateChangeAt > 1500 + Math.random() * 1500) {
          s.state = nextState(s.state);
          s.stateChangeAt = now;
        }
        // Re-pick targets every SWITCH_MS so the AI appears to "move".
        if (now - s.lastSwitch > SWITCH_MS) {
          s.targets = buildTargets(repo.files, tr);
          s.task = TASKS[Math.floor(Math.random() * TASKS.length)] ?? TASKS[0];
          s.lastSwitch = now;
        }
        store.getState().upsertActivity({
          chatId: s.chatId,
          agent: s.agent,
          task: s.task,
          targets: s.targets,
          fileIds: s.targets.map((t) => t.fileId),
          hue: s.hue,
          state: s.state,
          startedAt: s.lastSwitch,
        });
      }
    };

    tick(); // first frame
    const id = window.setInterval(tick, TICK_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      store.getState().clearActivities();
    };
  }, [repo, tr]);

  return null;
}

function nextState(s: AiActivity['state']): AiActivity['state'] {
  // thinking → editing → done → thinking … with done lingering briefly
  if (s === 'thinking') return 'editing';
  if (s === 'editing') return Math.random() < 0.3 ? 'done' : 'thinking';
  return 'thinking';
}

// Pick a small cluster of files and tag each with a plausible (action, intent,
// symbol) triple based on the file's metrics. The chosen verbs and one-line
// intents are what the user sees in the activity tray, so they need to *match*
// what the file actually looks like — not be random.
function buildTargets(files: FileRecord[], t: ActivityT): ActivityTarget[] {
  const ids = pickCluster(files);
  return ids.map((id) => {
    const file = files[id];
    if (!file) return { fileId: id, action: 'reading', intent: t('activity.intent.lookingAround') };
    const action = inferAction(file);
    const intent = inferIntent(file, action, t);
    const symbol = inferSymbol(file);
    return { fileId: id, action, symbol, intent };
  });
}

function inferAction(f: FileRecord): ActivityAction {
  // Strongest signal first — security findings / secrets dominate.
  if (f.metrics.sastFindings > 0 || f.metrics.secretsLikely) return 'reviewing';
  if (f.isTest) return f.metrics.lineCoverage < 30 ? 'fixing' : 'testing';
  if (f.metrics.eslintErrors > 5 || f.metrics.tsIgnoreCount > 3) return 'fixing';
  if (f.metrics.cyclomatic > 25 || f.metrics.maintainability < 40) return 'refactoring';
  if (!f.metrics.hasTestFile && f.layer === 'service') return 'testing';
  if (f.metrics.todoCount > 2) return 'editing';
  if (f.metrics.jsdocCoverage < 20 && f.metrics.publicApi) return 'documenting';
  if (f.metrics.recentPRs > 5) return 'analyzing';
  return 'reading';
}

function inferIntent(f: FileRecord, action: ActivityAction, t: ActivityT): string {
  // The intent is the "why" — a short phrase that, combined with the verb,
  // tells the user something specific. Chosen from a small pool keyed by
  // (action, dominant metric). Localised via chat.activity.intent.*.
  const m = f.metrics;
  switch (action) {
    case 'reviewing':
      if (m.secretsLikely) return t('activity.intent.triagingSecret');
      if (m.sastFindings > 3) return t('activity.intent.reviewingSast', { n: m.sastFindings });
      return t('activity.intent.reviewingSecurity');
    case 'fixing':
      if (f.isTest && m.lineCoverage < 30) return t('activity.intent.flakyCoverage');
      if (m.eslintErrors > 5) return t('activity.intent.lintCleanup', { n: m.eslintErrors });
      if (m.tsIgnoreCount > 3) return t('activity.intent.removingTsIgnore');
      return t('activity.intent.fixingBug');
    case 'testing':
      if (!m.hasTestFile) return t('activity.intent.backfillTests');
      if (m.lineCoverage < 50) return t('activity.intent.raisingCoverage', { n: m.lineCoverage });
      if (m.mutationScore < 40) return t('activity.intent.strongerAsserts');
      return t('activity.intent.edgeCaseTest');
    case 'refactoring':
      if (m.cyclomatic > 25) return t('activity.intent.splitCyclomatic', { n: m.cyclomatic });
      if (m.maintainability < 40) return t('activity.intent.improveMaintainability');
      if (m.cyclic) return t('activity.intent.breakCycle');
      if (m.layerViolation) return t('activity.intent.fixLayer');
      return t('activity.intent.extractHelper');
    case 'editing':
      if (m.todoCount > 0) return t('activity.intent.resolveTodos', { n: m.todoCount, plural: m.todoCount > 1 ? 's' : '' });
      if (m.publicApi) return t('activity.intent.adjustPublicApi');
      return t('activity.intent.smallChange');
    case 'documenting':
      if (m.publicApi) return t('activity.intent.docPublicApi');
      return t('activity.intent.documenting', { n: m.jsdocCoverage });
    case 'analyzing':
      if (m.recentPRs > 5) return t('activity.intent.reviewRecentPrs', { n: m.recentPRs });
      if (m.churn > 0.6) return t('activity.intent.highChurn');
      return t('activity.intent.callGraph');
    case 'reading':
    default:
      if (m.fanIn > 10) return t('activity.intent.wideModule');
      if (f.metrics.confidence === 'unknown') return t('activity.intent.dynamicDispatch');
      return t('activity.intent.readingContext');
  }
}

function inferSymbol(f: FileRecord): string | undefined {
  // Synthesize a plausible exported symbol name from the filename. Real
  // analysis would use the indexer; for the demo this is a deterministic
  // good-enough heuristic.
  const base = f.name.replace(/\.[^.]+$/, '').replace(/\.(spec|test|d)$/, '');
  if (!base) return undefined;
  // kebab/snake → camel
  const camel = base.replace(/[-_]([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
  if (f.isTest) return camel; // tests describe-the-thing
  if (f.layer === 'view') return /^[A-Z]/.exec(camel) ? camel : `${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
  if (f.metrics.publicApi) return camel;
  // Function-like default
  return camel;
}

function pickCluster(files: { id: number; folderPath: string }[]): number[] {
  // Prefer 2-4 files from the same folder so the visualization can show
  // grouping (rings sharing a hue + a folder zone outline).
  if (files.length === 0) return [];
  const seed = files[Math.floor(Math.random() * files.length)];
  if (!seed) return [];
  const folder = seed.folderPath;
  const sameFolder = files.filter((f) => f.folderPath === folder);
  const pool = sameFolder.length >= 2 ? sameFolder : files;
  const count = Math.min(pool.length, 2 + Math.floor(Math.random() * 3));
  // Shuffle a copy and take the first `count`.
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    copy[i] = b;
    copy[j] = a;
  }
  return copy.slice(0, count).map((f) => f.id);
}
