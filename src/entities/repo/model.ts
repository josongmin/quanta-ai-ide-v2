import { primitives } from '@shared/tokens';

export type StatusKey = 'STABLE' | 'MODIFIED' | 'NEW' | 'SECURITY_ALERT';

// Status labels are now resolved in the UI layer via i18n (`common:status.*`).
// Only the css palette remains here — colors are presentation-agnostic.

export const STATUS_CSS: Record<StatusKey, string> = {
  STABLE: primitives.colors.grey[500],
  MODIFIED: primitives.colors.green[500],
  NEW: primitives.colors.green[500],
  SECURITY_ALERT: primitives.colors.red[400],
};

export type Layer = 'view' | 'controller' | 'service' | 'repository' | 'util' | 'test' | 'vendor';

// Boundary markers — where this repo touches the outside world.
// Rendered as monochrome low-opacity glyphs around the dot in DotFieldMode,
// gated by BoundaryContext toggles so heat overlays stay readable.
export type IngressProtocol = 'http' | 'webhook' | 'queue' | 'grpc';
export type EgressProtocol = 'http' | 'db' | 'fs' | 'queue';

export type Boundary =
  | { kind: 'entry'; label: string }
  | { kind: 'ingress'; protocol: IngressProtocol; method?: string; path?: string }
  | { kind: 'egress'; protocol: EgressProtocol; target: string };

// Spec §1/§4: every metric exposed to the UI must carry a confidence band so we
// don't pretend approximations are exact. UI maps these to dot color + tooltip.
export type Confidence = 'exact' | 'overapprox' | 'unknown' | 'stale';

// Spec §6/§7: AI edit safety + analysis freshness for the Honesty layer.
type IndexState = 'fresh' | 'indexing' | 'stale' | 'timeout';

export type FileRecord = {
  id: number;
  name: string;
  folderPath: string;     // dotted path: src.core
  folderParts: string[];
  ix: number;             // grid x
  iz: number;             // grid z
  status: StatusKey;
  language: 'ts' | 'tsx' | 'js' | 'css' | 'md';
  layer: Layer;
  owner: string;          // CODEOWNERS-like (single owner team)
  isTest: boolean;
  isGenerated: boolean;
  isDeprecated: boolean;
  metrics: {
    // size & shape
    complexity: number;       // 0..50 — kept for back-compat (treated as cyclomatic)
    cyclomatic: number;       // 1..50
    cognitive: number;        // 0..120
    halstead: number;         // arbitrary units
    maintainability: number;  // 0..100 (higher = better)
    maxNesting: number;       // 0..12
    fnCount: number;          // 1..80
    largestFnLoc: number;     // 1..1500
    loc: number;              // 1..~3000

    // graph
    fanIn: number;
    fanOut: number;
    pagerank: number;

    // git / evolution
    churn: number;            // 0..1 normalized recent activity (90d)
    daysSinceTouched: number; // 0..365
    authors: number;          // 1..12
    recentPRs: number;        // 0..40

    // type safety
    anyCount: number;         // 0..120
    tsIgnoreCount: number;    // 0..30
    strictOptOut: boolean;
    unsafeAssertions: number; // 0..40

    // tests / coverage
    lineCoverage: number;     // 0..100
    branchCoverage: number;   // 0..100
    mutationScore: number;    // 0..100
    hasTestFile: boolean;

    // lints / hygiene
    eslintErrors: number;     // 0..40
    eslintWarnings: number;   // 0..120
    todoCount: number;        // 0..40
    consoleCount: number;     // 0..30

    // security
    secretsLikely: boolean;
    sastFindings: number;     // 0..15

    // perf
    bundleKB: number;         // 0..400

    // architecture
    cyclic: boolean;          // part of an import cycle
    dead: boolean;            // no incoming refs and not entry point
    layerViolation: boolean;
    publicApi: boolean;       // re-exported by package barrel

    // docs
    jsdocCoverage: number;    // 0..100

    // ── Honesty / Confidence layer (Spec §4, §11) ──
    confidence: Confidence;       // overall analyzer confidence on this file
    indexState: IndexState;       // is the analyzer's view of this file fresh?
    // Reason chips (max 2-3): "dynamic dispatch", "reflection",
    // "config-driven", "runtime-only", "missing types", "fallback"
    unknownReasons: string[];

    // ── AI Edit Safety (Spec §6, §7, §10) ──
    // 0..100. Composite of coverage × test presence × maintainability ×
    // (1 - blastRadius/N) × (no secrets) × (no SAST findings). Mapped to a
    // green→amber→red border in DotField + DSL field `safety:`.
    editSafety: number;
    blastRadius: number;          // estimated count of transitively impacted files

    // legacy
    security: boolean;
  };
  deps: number[];
  boundaries?: Boundary[];
};

export type FolderRecord = {
  path: string;           // dotted path
  parts: string[];
  name: string;
  fileIds: number[];
  childPaths: string[];
  parentPath: string | null;
  // Geometry (drawn rectangle), in cell units
  xStart: number;
  zStart: number;
  width: number;
  height: number;
  depth: number;
};

export type Range = [number, number];

// SINGLE source of truth for the filterable numeric metric keys. The RangeKey
// type is DERIVED from this tuple, and filter-state's RANGE_KEYS + facet's
// RangeKey both re-export it — so the key universe lives in exactly one place
// (previously it was hand-listed in 4 spots and drifted: e.g. `halstead` was in
// the ranges type/build but not in RANGE_KEYS). Lives in the base `repo` entity
// so facet/filter-state depend DOWN onto it (no cross-entity coupling upward).
export const RANGE_KEYS = [
  'complexity', 'cyclomatic', 'cognitive', 'maintainability', 'maxNesting',
  'fnCount', 'largestFnLoc', 'loc', 'fanIn', 'fanOut', 'churn',
  'daysSinceTouched', 'authors', 'recentPRs',
  'anyCount', 'tsIgnoreCount', 'unsafeAssertions',
  'lineCoverage', 'branchCoverage', 'mutationScore',
  'eslintErrors', 'eslintWarnings', 'todoCount', 'consoleCount',
  'sastFindings', 'bundleKB', 'jsdocCoverage',
  'editSafety', 'blastRadius',
] as const;
export type RangeKey = typeof RANGE_KEYS[number];

export type RepoData = {
  files: FileRecord[];
  folders: FolderRecord[];
  foldersByPath: Map<string, FolderRecord>;
  // Every filterable metric + `halstead` (computed for display, not filtered).
  ranges: Record<RangeKey, Range> & { halstead: Range };
  owners: string[];
};

export type SortKey =
  | 'none'
  | 'loc-desc'
  | 'complexity-desc'
  | 'cognitive-desc'
  | 'maintainability-asc'
  | 'fanIn-desc'
  | 'fanOut-desc'
  | 'churn-desc'
  | 'pagerank-desc'
  | 'coverage-asc'
  | 'eslint-desc'
  | 'anyCount-desc'
  | 'todo-desc'
  | 'authors-desc'
  | 'staleness-desc'
  | 'safety-asc'         // worst safety first
  | 'safety-desc'        // safest first
  | 'blast-desc'         // largest blast radius first
  | 'confidence-asc';    // unknown / stale first

export type PresetKey =
  | 'hotspot'           // high churn × high complexity
  | 'vulnerable-hub'    // status=VULNERABLE + fanIn>5
  | 'stale'             // daysSinceTouched > 180 + churn < 0.05
  | 'long-files'        // loc > 500
  | null;

export type SearchMode = 'text' | 'regex' | 'dsl';

export type FilterState = {
  // identity
  selectedFolders: Set<string>;
  search: string;
  searchRegex: boolean;     // back-compat; ignored when searchMode is set
  searchMode: SearchMode;
  languages: Set<FileRecord['language']>;
  layers: Set<Layer>;
  owners: Set<string>;

  // status flags
  statuses: Set<StatusKey>;
  isTest: boolean | null;        // null = any, true/false = filter
  isGenerated: boolean | null;
  isDeprecated: boolean | null;
  publicApiOnly: boolean;

  // ranges
  complexity: Range;
  cyclomatic: Range;
  cognitive: Range;
  maintainability: Range;
  maxNesting: Range;
  fnCount: Range;
  largestFnLoc: Range;
  loc: Range;
  fanIn: Range;
  fanOut: Range;
  churn: Range;
  daysSinceTouched: Range;
  authors: Range;
  recentPRs: Range;
  anyCount: Range;
  tsIgnoreCount: Range;
  unsafeAssertions: Range;
  lineCoverage: Range;
  branchCoverage: Range;
  mutationScore: Range;
  eslintErrors: Range;
  eslintWarnings: Range;
  todoCount: Range;
  consoleCount: Range;
  sastFindings: Range;
  bundleKB: Range;
  jsdocCoverage: Range;
  editSafety: Range;
  blastRadius: Range;

  // confidence facets (multi-select; empty = all)
  confidences: Set<Confidence>;
  unknownOnly: boolean;     // any unknownReason → high-uncertainty surface

  // boolean toggles
  cyclicOnly: boolean;
  deadOnly: boolean;
  layerViolationOnly: boolean;
  strictOptOutOnly: boolean;
  hasNoTest: boolean;
  secretsOnly: boolean;
  busFactor1Only: boolean;       // authors === 1

  // ranking
  sort: SortKey;
  topNHighlight: number;
  preset: PresetKey;
};
