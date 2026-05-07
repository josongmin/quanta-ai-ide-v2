import type {
  Boundary,
  EgressProtocol,
  FileRecord,
  FolderRecord,
  IngressProtocol,
  Layer,
  RepoData,
  StatusKey,
} from '../model';
import { makeRng } from '@shared/lib';

const OWNERS = ['@team-core', '@team-ui', '@team-platform', '@team-data', '@team-experiments'];

// Plausible filename pools per folder leaf, so the demo reads like a real repo.
// We cycle through these (with numeric suffix when exhausted) so names stay
// stable for a given seed and are unique within a folder.
const NAME_POOLS: Record<string, string[]> = {
  core: [
    'auth', 'session', 'user', 'account', 'permissions', 'roles', 'tokens',
    'http', 'rpc', 'graphql', 'rest', 'queue', 'scheduler', 'cache', 'redis',
    'logger', 'metrics', 'tracing', 'config', 'env', 'feature-flags',
    'crypto', 'hash', 'jwt', 'oauth', 'rate-limit', 'circuit-breaker',
    'pubsub', 'event-bus', 'pipeline', 'worker', 'job-runner',
    'db', 'orm', 'migrations', 'transactions', 'pool', 'replica',
    'serializer', 'parser', 'validator', 'schema', 'mapper', 'router',
    'middleware', 'errors', 'retry', 'backoff', 'health', 'lifecycle',
    'storage', 'fs', 's3-client', 'kv-store', 'lock', 'mutex',
    'analytics', 'audit', 'billing', 'invoices', 'subscriptions',
    'notifications', 'email-sender', 'webhooks', 'search-index',
    'i18n', 'locale', 'time', 'date-utils', 'currency',
    'ai-client', 'embedding', 'vector-store', 'prompt-cache', 'token-counter',
    'agent-runtime', 'tool-bus', 'context-window', 'sandbox',
  ],
  hooks: [
    'use-auth', 'use-session', 'use-user', 'use-account', 'use-router',
    'use-query', 'use-mutation', 'use-fetch', 'use-stream', 'use-debounce',
    'use-throttle', 'use-interval', 'use-timeout', 'use-event-listener',
    'use-local-storage', 'use-session-storage', 'use-clipboard',
    'use-media-query', 'use-resize-observer', 'use-intersection',
    'use-keyboard', 'use-hotkeys', 'use-focus', 'use-click-outside',
    'use-form', 'use-field', 'use-validation', 'use-async', 'use-toggle',
    'use-pagination', 'use-infinite-scroll', 'use-virtualizer',
    'use-theme', 'use-dark-mode', 'use-tokens', 'use-prefs',
    'use-feature-flag', 'use-permission', 'use-tracking',
    'use-dropzone', 'use-upload', 'use-drag', 'use-portal',
    'use-controlled-state', 'use-prev', 'use-mounted', 'use-id',
    'use-notification', 'use-toast', 'use-modal', 'use-tour',
    'use-search', 'use-filter', 'use-sort', 'use-selection',
    'use-graph', 'use-canvas', 'use-three', 'use-animation', 'use-spring',
  ],
  atoms: [
    'Button', 'IconButton', 'Input', 'TextArea', 'Select', 'Checkbox',
    'Radio', 'Switch', 'Slider', 'Badge', 'Tag', 'Chip', 'Avatar',
    'Tooltip', 'Spinner', 'Skeleton', 'Divider', 'Label', 'Link',
    'Kbd', 'Code', 'Pre', 'Heading', 'Text', 'Caption', 'Icon',
    'Card', 'Surface', 'Pill', 'ProgressBar', 'Bar', 'Dot', 'Ring',
    'Logo', 'LogoMark', 'Glyph', 'Stripe', 'Ribbon', 'Indicator',
  ],
  molecules: [
    'SearchBar', 'CommandPalette', 'Combobox', 'DatePicker', 'TimePicker',
    'ColorPicker', 'FileUploader', 'Dropzone', 'TagInput', 'Stepper',
    'Pagination', 'Toolbar', 'Breadcrumb', 'Tabs', 'TabList', 'Accordion',
    'Disclosure', 'Modal', 'Drawer', 'Sheet', 'Popover', 'Menu',
    'ContextMenu', 'Toast', 'Alert', 'Banner', 'Snackbar', 'EmptyState',
    'ErrorBoundary', 'AsyncBoundary', 'Suspense', 'FormRow', 'FormSection',
    'FormGroup', 'FieldArray', 'FilePreview', 'ImageGallery', 'Carousel',
    'Lightbox', 'Tree', 'TreeView', 'Table', 'DataGrid', 'VirtualList',
    'List', 'CardGrid', 'StatGrid', 'Chart', 'BarChart', 'LineChart',
    'AreaChart', 'PieChart', 'Sparkline', 'Heatmap', 'TimelineEvent',
    'UserMenu', 'OrgSwitcher', 'PlanBadge', 'NotificationBell',
    'SettingsDialog', 'OnboardingTour', 'HelpWidget', 'KeyboardCheatsheet',
  ],
  ui: [
    'AppShell', 'Sidebar', 'TopBar', 'Footer', 'PageLayout', 'SplitView',
    'PanelGroup', 'Workspace', 'CommandBar', 'StatusBar', 'NavRail',
    'Layout', 'Frame', 'Stage', 'Canvas', 'Viewport',
  ],
  tests: [
    'auth.spec', 'session.spec', 'user.spec', 'http.spec', 'cache.spec',
    'queue.spec', 'router.spec', 'pipeline.spec', 'worker.spec',
    'db.spec', 'orm.spec', 'migrations.spec', 'serializer.spec',
    'use-auth.test', 'use-router.test', 'use-query.test', 'use-form.test',
    'use-debounce.test', 'use-clipboard.test', 'use-theme.test',
    'Button.test', 'Input.test', 'Modal.test', 'Tabs.test', 'Table.test',
    'DataGrid.test', 'SearchBar.test', 'CommandPalette.test',
    'Tree.test', 'Chart.test', 'Heatmap.test',
    'integration.auth.e2e', 'integration.billing.e2e', 'integration.search.e2e',
    'snapshot.shell', 'snapshot.layout', 'a11y.button', 'a11y.modal',
    'perf.virtual-list', 'perf.canvas', 'perf.heatmap',
    'fixtures.users', 'fixtures.invoices', 'fixtures.events',
    'helpers.mock-server', 'helpers.render', 'helpers.factory',
  ],
  vendor: [
    'react', 'react-dom', 'react-router', 'zustand', 'jotai', 'recoil',
    'redux-toolkit', 'tanstack-query', 'tanstack-table', 'tanstack-virtual',
    'radix-dialog', 'radix-menu', 'radix-popover', 'radix-tabs',
    'framer-motion', 'react-spring', 'gsap', 'lottie-web',
    'three', 'three-orbit-controls', 'react-three-fiber', 'drei',
    'd3-scale', 'd3-shape', 'd3-array', 'd3-hierarchy', 'd3-force',
    'lodash-es', 'ramda', 'date-fns', 'dayjs', 'luxon',
    'zod', 'yup', 'valibot', 'superstruct',
    'axios', 'ky', 'undici', 'graphql-request', 'urql',
    'socket-io-client', 'pusher-js', 'ably',
    'firebase-app', 'firebase-auth', 'firebase-firestore',
    'aws-sdk-s3', 'aws-sdk-cognito', 'aws-amplify',
    'sentry-browser', 'sentry-tracing', 'datadog-rum', 'logrocket',
    'mixpanel', 'amplitude', 'segment', 'posthog',
    'stripe-js', 'stripe-react', 'paddle-js',
    'auth0-spa-js', 'clerk-react', 'supabase-js',
    'openai', 'anthropic-sdk', 'langchain', 'tiktoken',
    'monaco-editor', 'codemirror-state', 'codemirror-view',
    'pdfjs-dist', 'mammoth', 'jszip', 'file-saver',
    'react-markdown', 'remark-gfm', 'rehype-highlight', 'shiki',
    'react-hook-form', 'formik', 'final-form',
    'msw', 'fast-check', 'vitest-runner',
    'lucide-react', 'phosphor-icons', 'react-icons', 'heroicons',
  ],
  root: [
    'index', 'main', 'app', 'router', 'bootstrap', 'config',
  ],
};

function pickName(folderLeaf: string, idxInFolder: number, language: 'ts' | 'tsx'): string {
  const pool = NAME_POOLS[folderLeaf] ?? NAME_POOLS.core;
  const base = pool[idxInFolder % pool.length];
  // Once the pool is exhausted, append a numeric suffix to keep names unique.
  const suffix = idxInFolder >= pool.length ? `-${Math.floor(idxInFolder / pool.length) + 1}` : '';
  return `${base}${suffix}.${language}`;
}

function layerFor(parts: string[], isTest: boolean): Layer {
  if (isTest) return 'test';
  const last = parts[parts.length - 1] ?? '';
  if (last === 'vendor') return 'vendor';
  if (last === 'core') return 'service';
  if (last === 'hooks') return 'controller';
  if (last === 'atoms' || last === 'molecules' || last === 'ui') return 'view';
  return 'util';
}

// ── Boundary synthesis (Spec §4) ────────────────────────────────────────────
// Tags ~3-6 entry points + ~25-40 ingress + ~30-50 egress files based on
// realistic name/folder/layer heuristics. Mutates `file.boundaries` in place.
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

const INGRESS_FOLDER_LEAVES = new Set([
  'controllers', 'routes', 'api', 'webhooks', 'handlers', 'hooks',
]);
const EGRESS_FOLDER_LEAVES = new Set([
  'service', 'services', 'repository', 'repositories', 'clients', 'infra', 'core',
]);

const DB_TARGETS = ['postgres:main', 'redis:cache', 'postgres:replica', 'mongo:events'];
const HTTP_EGRESS_TARGETS = ['api.stripe.com', 'api.github.com', 'sentry.io', 'api.openai.com', 'hooks.slack.com'];
const FS_TARGETS = ['/var/log', '/tmp/uploads', '/var/cache', '/etc/app'];
const QUEUE_TARGETS = ['kafka:events', 'sqs:notifications', 'kafka:audit', 'sqs:emails'];

function deriveEntryLabel(file: FileRecord): string {
  const base = file.name.replace(/\.(ts|tsx|js)$/, '');
  if (/^worker/i.test(base) || /worker$/i.test(base)) return 'worker:queue';
  if (/^cli/i.test(base) || /cli$/i.test(base)) return 'cli:migrate';
  if (/server/i.test(base)) return 'server:http';
  if (/job-runner/i.test(base)) return 'worker:jobs';
  if (/scheduler/i.test(base)) return 'worker:scheduler';
  if (/bootstrap/i.test(base)) return 'app:bootstrap';
  if (/router/i.test(base)) return 'app:router';
  if (/main/i.test(base)) return 'app:main';
  return 'app';
}

function isEntryCandidate(file: FileRecord): boolean {
  const base = file.name.replace(/\.(ts|tsx|js)$/, '');
  // Top-level entry files at the package root only.
  if (file.folderPath === 'src' && (base === 'main' || base === 'index')) return true;
  if (file.folderPath === '' && base === 'main') return true;
  // Worker / job-runner names — explicit, exact base names only.
  if (base === 'worker' || base === 'job-runner') return true;
  // CLI / server suffix — must be an explicit named file.
  if (base === 'cli' || base === 'server') return true;
  return false;
}

function pickIngressProtocol(rng: () => number): IngressProtocol {
  const r = rng();
  if (r < 0.70) return 'http';
  if (r < 0.85) return 'webhook';
  if (r < 0.95) return 'queue';
  return 'grpc';
}

function pickEgressProtocol(rng: () => number): EgressProtocol {
  const r = rng();
  if (r < 0.40) return 'db';
  if (r < 0.70) return 'http';
  if (r < 0.90) return 'fs';
  return 'queue';
}

function pickFrom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function makeIngressBoundary(file: FileRecord, rng: () => number): Boundary {
  const protocol = pickIngressProtocol(rng);
  if (protocol === 'http') {
    const method: HttpMethod = pickFrom(HTTP_METHODS, rng);
    const folderLeaf = file.folderParts[file.folderParts.length - 1] ?? 'root';
    const path = `/api/${folderLeaf}/:id`;
    return { kind: 'ingress', protocol, method, path };
  }
  return { kind: 'ingress', protocol };
}

function makeEgressBoundary(rng: () => number): Boundary {
  const protocol = pickEgressProtocol(rng);
  let target: string;
  switch (protocol) {
    case 'db':    target = pickFrom(DB_TARGETS, rng); break;
    case 'http':  target = pickFrom(HTTP_EGRESS_TARGETS, rng); break;
    case 'fs':    target = pickFrom(FS_TARGETS, rng); break;
    case 'queue': target = pickFrom(QUEUE_TARGETS, rng); break;
  }
  return { kind: 'egress', protocol, target };
}

function assignBoundaries(file: FileRecord, rng: () => number): void {
  // Skip vendor + tests + generated — they're not domain-meaningful boundaries.
  if (file.layer === 'vendor' || file.isTest || file.isGenerated) return;

  const folderLeaf = file.folderParts[file.folderParts.length - 1] ?? '';
  const boundaries: Boundary[] = [];

  // ── Entry points: rare, name-driven ──
  if (isEntryCandidate(file)) {
    boundaries.push({ kind: 'entry', label: deriveEntryLabel(file) });
  }

  // ── Ingress: controllers / hooks / route-like folders ──
  const ingressEligible =
    file.layer === 'controller' || INGRESS_FOLDER_LEAVES.has(folderLeaf);
  // ~50% of eligible files become ingress points → ~30 total given ~60 hook files.
  let isIngress = false;
  if (ingressEligible && rng() < 0.50) {
    boundaries.push(makeIngressBoundary(file, rng));
    isIngress = true;
  }

  // ── Egress: services / repositories / infra ──
  const egressEligible =
    file.layer === 'service' || file.layer === 'repository' || EGRESS_FOLDER_LEAVES.has(folderLeaf);
  // ~45% of eligible files get an egress edge; ~10% of ingress files ALSO get one.
  if ((egressEligible && rng() < 0.45) || (isIngress && rng() < 0.10)) {
    boundaries.push(makeEgressBoundary(rng));
  }

  if (boundaries.length > 0) file.boundaries = boundaries;
}

export const CELL_SIZE = 2.4;
export const GRID_COUNT = 240;
const BOUNDARY_MARGIN = 2;

type RepoNode = {
  name: string;
  children: RepoNode[];
  fileCount: number;
  meanLoc: number;
};

const repoTree: RepoNode = {
  name: 'root',
  fileCount: 5,
  meanLoc: 60,
  children: [
    {
      name: 'src',
      fileCount: 10,
      meanLoc: 180,
      children: [
        { name: 'core', children: [], fileCount: 80, meanLoc: 320 },
        {
          name: 'ui',
          fileCount: 20,
          meanLoc: 90,
          children: [
            { name: 'atoms', children: [], fileCount: 40, meanLoc: 60 },
            { name: 'molecules', children: [], fileCount: 50, meanLoc: 140 },
          ],
        },
        { name: 'hooks', children: [], fileCount: 60, meanLoc: 110 },
      ],
    },
    { name: 'tests', children: [], fileCount: 70, meanLoc: 80 },
    { name: 'vendor', children: [], fileCount: 100, meanLoc: 220 },
  ],
};

export function buildRepo(seed = 0xC0DEF1ED): RepoData {
  const rng = makeRng(seed);
  const files: FileRecord[] = [];
  const folders: FolderRecord[] = [];
  const foldersByPath = new Map<string, FolderRecord>();

  function layoutFolder(
    node: RepoNode,
    parts: string[],
    xStart: number,
    zStart: number,
    width: number,
    height: number,
    depth: number,
  ): FolderRecord {
    const PADDING = 6;
    const FOLDER_GAP = 12;
    const LABEL_ZONE_H = 5;
    const occupied = new Set<string>();

    for (let ix = 0; ix < width; ix++) {
      for (let iz = 0; iz < height; iz++) {
        if (
          ix < BOUNDARY_MARGIN ||
          ix >= width - BOUNDARY_MARGIN ||
          iz < BOUNDARY_MARGIN ||
          iz >= height - BOUNDARY_MARGIN
        )
          occupied.add(`${xStart + ix},${zStart + iz}`);
      }
    }
    if (depth > 0) {
      for (let lx = 0; lx < Math.min(width, 25); lx++)
        for (let lz = 0; lz < LABEL_ZONE_H; lz++)
          occupied.add(`${xStart + lx},${zStart + lz}`);
    }

    const path = parts.join('.');
    const folder: FolderRecord = {
      path,
      parts: [...parts],
      name: node.name,
      fileIds: [],
      childPaths: [],
      parentPath: parts.length === 0 ? null : parts.slice(0, -1).join('.'),
      xStart, zStart, width, height, depth,
    };
    folders.push(folder);
    foldersByPath.set(path, folder);

    if (node.children?.length) {
      const cols = Math.ceil(Math.sqrt(node.children.length));
      const rows = Math.ceil(node.children.length / cols);
      const childW = Math.floor((width - PADDING * 2 - (cols - 1) * FOLDER_GAP) / cols);
      const childH = Math.floor((height - PADDING * 2 - LABEL_ZONE_H - (rows - 1) * FOLDER_GAP) / rows);
      node.children.forEach((child, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cX = xStart + PADDING + col * (childW + FOLDER_GAP);
        const cZ = zStart + PADDING + LABEL_ZONE_H + row * (childH + FOLDER_GAP);
        if (childW > 0 && childH > 0) {
          for (let ox = cX - BOUNDARY_MARGIN; ox < cX + childW + BOUNDARY_MARGIN; ox++)
            for (let oz = cZ - BOUNDARY_MARGIN; oz < cZ + childH + BOUNDARY_MARGIN; oz++)
              occupied.add(`${ox},${oz}`);
          const childRec = layoutFolder(
            child,
            [...parts, child.name],
            cX, cZ, childW, childH, depth + 1,
          );
          folder.childPaths.push(childRec.path);
        }
      });
    }

    let placed = 0;
    let attempts = 0;
    let folderFileIdx = 0;
    while (placed < node.fileCount && attempts < width * height) {
      attempts++;
      const rx = Math.floor(rng() * (width - 1)) + xStart;
      const rz = Math.floor(rng() * (height - 1)) + zStart;
      if (!occupied.has(`${rx},${rz}`)) {
        occupied.add(`${rx},${rz}`);

        const id = files.length;
        const cyclomatic = Math.floor(rng() * 50);
        const security = rng() > 0.98;
        const status: StatusKey = security
          ? 'SECURITY_ALERT'
          : rng() > 0.92 ? 'NEW'
          : rng() > 0.78 ? 'MODIFIED' : 'STABLE';

        const loc = Math.max(8, Math.round(node.meanLoc * Math.exp((rng() - 0.5) * 1.4)));
        const isTest = parts[0] === 'tests';
        const isGenerated = !isTest && rng() > 0.97;
        const isDeprecated = rng() > 0.95;
        const language: FileRecord['language'] =
          parts[parts.length - 1] === 'atoms' || parts[parts.length - 1] === 'molecules'
            ? (rng() > 0.4 ? 'tsx' : 'ts')
            : 'ts';

        const churn =
          status === 'NEW' ? 0.55 + rng() * 0.45 :
          status === 'MODIFIED' ? 0.30 + rng() * 0.45 :
          status === 'SECURITY_ALERT' ? 0.65 + rng() * 0.3 :
          rng() * 0.18;

        const daysSinceTouched =
          status === 'NEW' ? Math.floor(rng() * 14) :
          status === 'MODIFIED' ? Math.floor(rng() * 60) :
          status === 'SECURITY_ALERT' ? Math.floor(rng() * 7) :
          Math.floor(60 + rng() * 305);

        // Quality
        const cognitive = Math.min(120, Math.round(cyclomatic * (1.4 + rng() * 1.2)));
        const halstead = Math.round(loc * (4 + rng() * 8));
        // maintainability: higher LOC + cyclomatic → lower
        const maintainability = Math.max(0, Math.min(100, Math.round(
          100 - (cyclomatic / 50) * 50 - Math.log10(loc + 1) * 10 + rng() * 10,
        )));
        const maxNesting = Math.min(12, 1 + Math.floor((cyclomatic / 50) * 8 + rng() * 3));
        const fnCount = Math.max(1, Math.round(loc / (15 + rng() * 25)));
        const largestFnLoc = Math.max(3, Math.round(loc * (0.15 + rng() * 0.5)));

        // Type safety
        const tsLikely = language === 'ts' || language === 'tsx';
        const anyCount = tsLikely ? Math.round(Math.pow(rng(), 2) * 60) : 0;
        const tsIgnoreCount = tsLikely ? Math.round(Math.pow(rng(), 3) * 18) : 0;
        const strictOptOut = tsLikely && rng() > 0.92;
        const unsafeAssertions = tsLikely ? Math.round(Math.pow(rng(), 2) * 30) : 0;

        // Coverage
        const baseCov = isTest ? 95 + rng() * 5 : 30 + rng() * 65;
        const lineCoverage = Math.round(baseCov);
        const branchCoverage = Math.max(0, Math.round(baseCov - 5 + (rng() - 0.5) * 15));
        const mutationScore = Math.max(0, Math.round(baseCov - 20 + (rng() - 0.5) * 30));
        const hasTestFile = isTest || rng() > 0.55;

        // Lints / hygiene
        const eslintWarnings = Math.round(Math.pow(rng(), 1.7) * 90);
        const eslintErrors = rng() > 0.85 ? Math.round(rng() * 12) : 0;
        const todoCount = Math.round(Math.pow(rng(), 2.5) * 20);
        const consoleCount = Math.round(Math.pow(rng(), 3) * 15);

        // Security
        const secretsLikely = rng() > 0.985;
        const sastFindings = security ? 1 + Math.round(rng() * 8) : Math.round(Math.pow(rng(), 4) * 6);

        // Perf
        const bundleKB = Math.round(loc * (0.05 + rng() * 0.15) + (rng() > 0.95 ? 60 + rng() * 200 : 0));

        // Architecture
        const cyclic = rng() > 0.94;
        const layerViolation = !isTest && rng() > 0.96;
        const publicApi = (parts[parts.length - 1] === 'core' || parts[parts.length - 1] === 'molecules') && rng() > 0.7;

        // Git
        const authors = Math.max(1, Math.min(12, Math.round(1 + rng() * 6 + churn * 4)));
        const recentPRs = Math.round(churn * 30 + rng() * 6);

        // Docs
        const jsdocCoverage = publicApi ? 50 + Math.round(rng() * 50) : Math.round(Math.pow(rng(), 1.4) * 80);

        const layer = layerFor(parts, isTest);
        const owner = OWNERS[Math.floor(rng() * OWNERS.length)];

        const folderLeaf = parts[parts.length - 1] ?? 'root';
        files.push({
          id,
          name: pickName(folderLeaf, folderFileIdx, language),
          folderPath: path,
          folderParts: [...parts],
          ix: rx, iz: rz,
          status,
          language,
          layer,
          owner,
          isTest,
          isGenerated,
          isDeprecated,
          metrics: {
            complexity: cyclomatic,
            cyclomatic,
            cognitive,
            halstead,
            maintainability,
            maxNesting,
            fnCount,
            largestFnLoc,
            loc,
            fanIn: 0, fanOut: 0,
            pagerank: 0,
            churn,
            daysSinceTouched,
            authors,
            recentPRs,
            anyCount,
            tsIgnoreCount,
            strictOptOut,
            unsafeAssertions,
            lineCoverage,
            branchCoverage,
            mutationScore,
            hasTestFile,
            eslintErrors,
            eslintWarnings,
            todoCount,
            consoleCount,
            secretsLikely,
            sastFindings,
            bundleKB,
            cyclic,
            dead: false,           // patched after fan-in computed
            layerViolation,
            publicApi,
            jsdocCoverage,

            // ── Honesty layer (confidence + freshness + unknown reasons) ──
            // patched after deps + fan-in are known
            confidence: 'exact',
            indexState: 'fresh',
            unknownReasons: [],

            // ── Edit Safety (patched after fan-in + blastRadius) ──
            editSafety: 0,
            blastRadius: 0,

            security,
          },
          deps: [],
        });
        assignBoundaries(files[id], rng);
        folder.fileIds.push(id);
        placed++;
        folderFileIdx++;
      }
    }

    return folder;
  }

  layoutFolder(repoTree, [], -100, -100, 200, 200, 0);

  // ── synthesize dependency graph ──
  // Targets: same-folder bias + folder-pair rules (similar to v1 design)
  const folderByPath = foldersByPath;
  function targetFolders(srcPath: string): FolderRecord[] {
    const f = folderByPath.get(srcPath)!;
    const out: FolderRecord[] = [f];
    const has = (p: string) => folderByPath.has(p);
    if (srcPath.startsWith('src')) {
      if (has('vendor')) out.push(folderByPath.get('vendor')!);
      if (has('src.core')) out.push(folderByPath.get('src.core')!);
    }
    if (srcPath === 'src.ui.molecules') {
      if (has('src.ui.atoms')) out.push(folderByPath.get('src.ui.atoms')!);
      if (has('src.hooks')) out.push(folderByPath.get('src.hooks')!);
    }
    if (srcPath === 'src.hooks' && has('src.core')) out.push(folderByPath.get('src.core')!);
    if (srcPath === 'tests') {
      ['src.core', 'src.hooks', 'src.ui.molecules'].forEach((p) => has(p) && out.push(folderByPath.get(p)!));
    }
    if (srcPath === 'vendor') return [];
    return out;
  }

  for (const f of files) {
    const cands = targetFolders(f.folderPath);
    if (cands.length === 0) continue;
    const k = Math.max(1, Math.floor(1 + Math.pow(rng(), 2.5) * 6));
    const picked = new Set<number>();
    let attempts = 0;
    while (picked.size < k && attempts < k * 6) {
      attempts++;
      const idx = Math.min(cands.length - 1, Math.floor(Math.pow(rng(), 1.6) * cands.length));
      const tf = cands[idx];
      if (tf.fileIds.length === 0) continue;
      const tid = tf.fileIds[Math.floor(rng() * tf.fileIds.length)];
      if (tid !== f.id) picked.add(tid);
    }
    f.deps = [...picked];
  }

  // fan-in / fan-out
  for (const f of files) {
    f.metrics.fanOut = f.deps.length;
    for (const t of f.deps) files[t].metrics.fanIn++;
  }

  // PageRank (sparse power iteration)
  const N = files.length;
  const pr = new Float64Array(N).fill(1 / N);
  const damping = 0.85;
  for (let iter = 0; iter < 30; iter++) {
    const next = new Float64Array(N).fill((1 - damping) / N);
    let dangling = 0;
    for (let i = 0; i < N; i++) if (files[i].deps.length === 0) dangling += pr[i];
    const danglingShare = (damping * dangling) / N;
    for (let i = 0; i < N; i++) next[i] += danglingShare;
    for (const f of files) {
      if (f.deps.length === 0) continue;
      const share = (damping * pr[f.id]) / f.deps.length;
      for (const t of f.deps) next[t] += share;
    }
    let s = 0;
    for (let i = 0; i < N; i++) s += next[i];
    for (let i = 0; i < N; i++) pr[i] = next[i] / s;
  }
  for (const f of files) f.metrics.pagerank = pr[f.id];

  // Dead code: 0 incoming refs and not a public API entry point
  for (const f of files) {
    f.metrics.dead = f.metrics.fanIn === 0 && !f.metrics.publicApi && !f.isTest;
  }

  // ── Blast radius: BFS over reverse-dep graph, capped at 4 hops ──
  const reverseDeps: number[][] = Array.from({ length: files.length }, () => []);
  for (const f of files) for (const t of f.deps) reverseDeps[t].push(f.id);
  for (const f of files) {
    const seen = new Set<number>([f.id]);
    let frontier: number[] = [f.id];
    for (let hop = 0; hop < 4 && frontier.length > 0; hop++) {
      const next: number[] = [];
      for (const id of frontier) {
        for (const r of reverseDeps[id]) {
          if (!seen.has(r)) { seen.add(r); next.push(r); }
        }
      }
      frontier = next;
    }
    f.metrics.blastRadius = seen.size - 1;
  }

  // ── Honesty layer: confidence + index state + unknown reasons ──
  // Heuristic mirrors Spec §11: weak typing / dynamic dispatch / config-driven
  // / runtime-only / fallback. We synthesize from existing signals so it lines
  // up with the rest of the file's metrics (e.g. lots of `any` → "missing types").
  for (const f of files) {
    const m = f.metrics;
    const reasons: string[] = [];
    if (m.anyCount > 30 || m.strictOptOut) reasons.push('missing types');
    if (m.cyclic) reasons.push('dynamic dispatch');
    if (rng() > 0.93) reasons.push('reflection');
    if (f.folderPath === 'vendor') reasons.push('runtime-only');
    if (rng() > 0.96) reasons.push('config-driven');
    if (m.tsIgnoreCount > 5) reasons.push('fallback');
    f.metrics.unknownReasons = reasons.slice(0, 3);

    // confidence band
    if (m.layerViolation || reasons.length >= 2) f.metrics.confidence = 'unknown';
    else if (reasons.length === 1 || m.cyclic || m.tsIgnoreCount > 2) f.metrics.confidence = 'overapprox';
    else if (m.daysSinceTouched > 240 && rng() > 0.7) f.metrics.confidence = 'stale';
    else f.metrics.confidence = 'exact';

    // index state — "what does the analyzer think it knows about this file"
    const r = rng();
    if (m.confidence === 'unknown' && r > 0.6) f.metrics.indexState = 'timeout';
    else if (m.confidence === 'stale') f.metrics.indexState = 'stale';
    else if (r > 0.97) f.metrics.indexState = 'indexing';
    else f.metrics.indexState = 'fresh';
  }

  // ── Edit Safety score (Spec §6/§7) ──
  // safety = 0..100. Drops sharply for high blast × low coverage / vulnerable /
  // deprecated / unknown confidence files. AI agent should *not* touch these.
  const blastMax = files.reduce((a, b) => Math.max(a, b.metrics.blastRadius), 1);
  for (const f of files) {
    const m = f.metrics;
    const cov = m.lineCoverage / 100;                          // 0..1
    const maint = m.maintainability / 100;                     // 0..1
    const blast = m.blastRadius / blastMax;                    // 0..1
    const testWeight = m.hasTestFile ? 1 : 0.6;
    let safety = 100 *
      (0.30 * cov + 0.25 * maint + 0.20 * (1 - blast) + 0.15 * testWeight + 0.10 * (m.confidence === 'exact' ? 1 : 0.5));
    if (m.security) safety -= 35;
    if (m.secretsLikely) safety -= 25;
    if (f.isDeprecated) safety -= 15;
    if (m.confidence === 'unknown') safety -= 15;
    if (m.layerViolation) safety -= 10;
    if (f.isGenerated) safety = Math.min(safety, 20); // never let agents touch generated
    f.metrics.editSafety = Math.max(0, Math.min(100, Math.round(safety)));
  }

  // ranges
  type Range = [number, number];
  const init = (): Range => [Infinity, -Infinity];
  const ranges = {
    complexity: init(),
    cyclomatic: init(),
    cognitive: init(),
    halstead: init(),
    maintainability: init(),
    maxNesting: init(),
    fnCount: init(),
    largestFnLoc: init(),
    loc: init(),
    fanIn: init(),
    fanOut: init(),
    churn: init(),
    daysSinceTouched: init(),
    authors: init(),
    recentPRs: init(),
    anyCount: init(),
    tsIgnoreCount: init(),
    unsafeAssertions: init(),
    lineCoverage: init(),
    branchCoverage: init(),
    mutationScore: init(),
    eslintErrors: init(),
    eslintWarnings: init(),
    todoCount: init(),
    consoleCount: init(),
    sastFindings: init(),
    bundleKB: init(),
    jsdocCoverage: init(),
    editSafety: init(),
    blastRadius: init(),
  };

  function expand(r: Range, v: number) {
    if (v < r[0]) r[0] = v;
    if (v > r[1]) r[1] = v;
  }
  for (const f of files) {
    const m = f.metrics;
    expand(ranges.complexity, m.complexity);
    expand(ranges.cyclomatic, m.cyclomatic);
    expand(ranges.cognitive, m.cognitive);
    expand(ranges.halstead, m.halstead);
    expand(ranges.maintainability, m.maintainability);
    expand(ranges.maxNesting, m.maxNesting);
    expand(ranges.fnCount, m.fnCount);
    expand(ranges.largestFnLoc, m.largestFnLoc);
    expand(ranges.loc, m.loc);
    expand(ranges.fanIn, m.fanIn);
    expand(ranges.fanOut, m.fanOut);
    expand(ranges.churn, m.churn);
    expand(ranges.daysSinceTouched, m.daysSinceTouched);
    expand(ranges.authors, m.authors);
    expand(ranges.recentPRs, m.recentPRs);
    expand(ranges.anyCount, m.anyCount);
    expand(ranges.tsIgnoreCount, m.tsIgnoreCount);
    expand(ranges.unsafeAssertions, m.unsafeAssertions);
    expand(ranges.lineCoverage, m.lineCoverage);
    expand(ranges.branchCoverage, m.branchCoverage);
    expand(ranges.mutationScore, m.mutationScore);
    expand(ranges.eslintErrors, m.eslintErrors);
    expand(ranges.eslintWarnings, m.eslintWarnings);
    expand(ranges.todoCount, m.todoCount);
    expand(ranges.consoleCount, m.consoleCount);
    expand(ranges.sastFindings, m.sastFindings);
    expand(ranges.bundleKB, m.bundleKB);
    expand(ranges.jsdocCoverage, m.jsdocCoverage);
    expand(ranges.editSafety, m.editSafety);
    expand(ranges.blastRadius, m.blastRadius);
  }

  // Owner list (deduped)
  const owners = Array.from(new Set(files.map((f) => f.owner))).sort();

  return { files, folders, foldersByPath, ranges, owners };
}
