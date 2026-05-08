import type { FileRecord, FolderRecord, RepoData } from '@entities/repo';
import { pct, round1 } from '@shared/lib';
import type { Verdict } from '../model';

// ─── Shared ranking helpers ────────────────────────────────────────────
// Both repo-level and folder-level stats answer the same two "where do I
// look first?" questions ("worst edit-safety" and "highest churn × cx").
// Keeping the sort/tie-break/projection in one place means the two surfaces
// stay aligned automatically; before, the folder version omitted `churn`
// from the riskFiles projection — a real divergence that would have grown.

function rankRiskFiles(files: readonly FileRecord[]): {
  id: number; name: string; path: string;
  safety: number; blast: number; churn: number; vulnerable: boolean;
}[] {
  return [...files]
    .filter((f) => !f.isGenerated && !f.isTest)
    .sort((a, b) => {
      const s = a.metrics.editSafety - b.metrics.editSafety;
      if (s !== 0) return s;
      return b.metrics.blastRadius - a.metrics.blastRadius;
    })
    .slice(0, 5)
    .map((f) => ({
      id: f.id,
      name: f.name,
      path: f.folderPath,
      safety: f.metrics.editSafety,
      blast: f.metrics.blastRadius,
      churn: f.metrics.churn,
      vulnerable: f.status === 'SECURITY_ALERT',
    }));
}

function rankChurnHotspots(files: readonly FileRecord[]): {
  id: number; name: string; path: string;
  churn: number; complexity: number; authors: number;
}[] {
  return [...files]
    .filter((f) => !f.isGenerated && !f.isTest)
    .sort((a, b) => (b.metrics.churn * b.metrics.complexity) - (a.metrics.churn * a.metrics.complexity))
    .slice(0, 5)
    .map((f) => ({
      id: f.id,
      name: f.name,
      path: f.folderPath,
      churn: f.metrics.churn,
      complexity: f.metrics.complexity,
      authors: f.metrics.authors,
    }));
}

export function computeRepoStats(repo: RepoData) {
  const files = repo.files;
  const total = files.length;
  let totalLoc = 0;
  let sumComplexity = 0;
  let sumCov = 0;
  let sumSafety = 0;
  let sumMaint = 0;
  let sumFanOut = 0;
  let sumBlast = 0;
  let sumChurn = 0;
  let sumPRs = 0;
  let vulnerable = 0;
  let untested = 0;
  let hotspots = 0;
  let autoFixable = 0;
  let humanOnly = 0;
  let typeLoose = 0;
  let staleIndex = 0;
  let cyclic = 0;
  let layerViolations = 0;
  let dead = 0;
  let edges = 0;
  let maxFanInVal = -1;
  let maxFanInFile: FileRecord | null = null;
  let minDaysSince = Number.POSITIVE_INFINITY;
  let activeRecent = 0;       // touched in last 30d
  let staleFiles = 0;         // not touched in 180d+
  let busFactor1 = 0;
  const conf = { exact: 0, overapprox: 0, unknown: 0, stale: 0 };
  const byLayer: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};
  const owners: Record<string, number> = {};

  for (const f of files) {
    const m = f.metrics;
    totalLoc += m.loc;
    sumComplexity += m.complexity;
    sumCov += m.lineCoverage;
    sumSafety += m.editSafety;
    sumMaint += m.maintainability;
    sumFanOut += m.fanOut;
    sumBlast += m.blastRadius;
    sumChurn += m.churn;
    sumPRs += m.recentPRs;
    edges += m.fanOut;

    if (f.status === 'SECURITY_ALERT') vulnerable++;
    if (!m.hasTestFile && !f.isTest) untested++;
    if (m.complexity >= 30 && m.churn > 0.4) hotspots++;
    if (m.editSafety >= 70) autoFixable++;
    if (m.editSafety < 40) humanOnly++;
    if (m.anyCount > 20 || m.tsIgnoreCount > 5 || m.strictOptOut) typeLoose++;
    if (m.indexState === 'stale' || m.indexState === 'timeout') staleIndex++;
    if (m.cyclic) cyclic++;
    if (m.layerViolation) layerViolations++;
    if (m.dead) dead++;
    if (m.daysSinceTouched < minDaysSince) minDaysSince = m.daysSinceTouched;
    if (m.daysSinceTouched <= 30) activeRecent++;
    if (m.daysSinceTouched >= 180) staleFiles++;
    if (m.authors === 1 && !f.isGenerated) busFactor1++;

    if (m.fanIn > maxFanInVal) {
      maxFanInVal = m.fanIn;
      maxFanInFile = f;
    }

    conf[m.confidence]++;
    byLayer[f.layer] = (byLayer[f.layer] ?? 0) + 1;
    byLanguage[f.language] = (byLanguage[f.language] ?? 0) + 1;
    owners[f.owner] = (owners[f.owner] ?? 0) + 1;
  }
  const topOwners = Object.entries(owners)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([owner, n]) => ({ owner, n }));

  // Top risk files: lowest editSafety, ties broken by blast radius desc.
  const riskFiles = rankRiskFiles(files);
  // Recent hotspots: highest churn × complexity intersection.
  const churnHotspots = rankChurnHotspots(files);

  const safe = Math.max(1, total);

  // ── Edit-safety histogram (Spec §6/§7 — agent-readable distribution) ──
  // Five bins line up with how the agent system reasons about a file:
  //   0–20  Don't touch · 21–40 Human-only · 41–60 Review needed
  //   61–80 Auto-fixable · 81–100 Safe to apply
  const safetyBins = [0, 0, 0, 0, 0]; // index 0 = lowest, 4 = highest
  for (const f of files) {
    const s = f.metrics.editSafety;
    const i = s >= 81 ? 4 : s >= 61 ? 3 : s >= 41 ? 2 : s >= 21 ? 1 : 0;
    safetyBins[i]++;
  }

  // ── Stack detection (Spec §1) — frameworks/build/test/manifests are
  // synthesized from the repo shape so UI can render them without needing
  // a real tsconfig. Numbers stay deterministic across reloads (PRNG seed).
  const hasReact = (byLanguage['tsx'] ?? 0) > 0 || (byLanguage['jsx'] ?? 0) > 0;
  const hasCss   = (byLanguage['css'] ?? 0) > 0;
  const hasMd    = (byLanguage['md']  ?? 0) > 0;
  const frameworks: { name: string; tone?: 'ok' | 'warn' }[] = [];
  if (hasReact) frameworks.push({ name: 'React 19' });
  if (hasReact) frameworks.push({ name: 'Vite 5' });
  if (hasCss)   frameworks.push({ name: 'Tailwind 3' });
  // Three.js usage hint — show whenever there's any vendor folder (we have one).
  if ((byLayer['vendor'] ?? 0) > 0) frameworks.push({ name: 'three.js 0.160' });
  const buildTools = ['pnpm', 'tsc', 'vite'];
  const manifests = ['package.json', 'tsconfig.json'];
  if (hasMd) manifests.push('README.md');
  // We deliberately don't generate a test runner — the absence is the
  // headline finding. Caller treats `testRunner` falsy as "alert".
  const testRunner: string | null = null;

  // ── Verdict (Spec §10 — Admission / Change Readiness) ──
  // Three orthogonal signals → one verbal "ship light":
  //   merge-readiness (vulnerable + cyclic + layer violations)
  //   maintenance load (untested + stale)
  //   index health (stale or timing-out analyses)
  const verdict: Verdict = (() => {
    if (total === 0) {
      return { tone: 'info', key: 'noData' };
    }
    if (vulnerable > 0) {
      return { tone: 'critical', key: 'criticalBlock', params: { vulnerable } };
    }
    if (humanOnly / safe > 0.25) {
      return { tone: 'warn', key: 'highHumanReview',
        params: { humanOnly, humanOnlyPct: pct(humanOnly, safe) } };
    }
    if (untested / safe > 0.4) {
      return { tone: 'warn', key: 'verificationGap', params: { untested } };
    }
    if (staleIndex > safe * 0.05) {
      return { tone: 'info', key: 'staleIndex', params: { staleIndex } };
    }
    return { tone: 'ok', key: 'shipReady' };
  })();

  // ── Maintainability trend (synthesized but stable across reloads) ──
  // Hash of file ids → small ±delta. Lets the demo show a trend arrow.
  const maintTrend = (() => {
    let seed = 0;
    for (const f of files) seed = (seed * 31 + f.id) | 0;
    const delta = ((seed % 11) - 5); // -5..+5
    return { delta, dir: delta > 0 ? 'up' as const : delta < 0 ? 'down' as const : 'flat' as const };
  })();

  return {
    files: total,
    folders: repo.folders.length,
    totalLoc,
    avgComplexity: round1(sumComplexity / safe),
    avgCoverage: Math.round(sumCov / safe),
    avgEditSafety: Math.round(sumSafety / safe),
    maintainability: Math.round(sumMaint / safe),
    avgFanOut: round1(sumFanOut / safe),
    avgBlast: round1(sumBlast / safe),
    avgChurn: sumChurn / safe,
    totalRecentPRs: sumPRs,
    edges,
    maxFanIn: { n: maxFanInVal, name: maxFanInFile?.name ?? '—' },
    vulnerable,
    untested,
    hotspots,
    autoFixable,
    humanOnly,
    typeLoose,
    staleIndex,
    cyclic,
    layerViolations,
    dead,
    busFactor1,
    minDaysSince: Number.isFinite(minDaysSince) ? minDaysSince : 0,
    activeRecent,
    staleFiles,
    confidence: conf,
    byLayer,
    byLanguage,
    topOwners,
    riskFiles,
    churnHotspots,
    safetyBins,
    frameworks,
    buildTools,
    manifests,
    testRunner,
    verdict,
    maintTrend,
  };
}

export function computeFolderStats(repo: RepoData, folder: FolderRecord) {
  const inScope = (f: FileRecord) => f.folderPath === folder.path || f.folderPath.startsWith(folder.path + '.');
  const scoped = repo.files.filter(inScope);

  let totalLoc = 0;
  let sumComplexity = 0;
  let sumCov = 0;
  let sumSafety = 0;
  let sumMaint = 0;
  let sumChurn = 0;
  let sumPRs = 0;
  let sumBlast = 0;
  let vulnerable = 0;
  let untested = 0;
  let hotspots = 0;
  let autoFixable = 0;
  let humanOnly = 0;
  let typeLoose = 0;
  let cyclic = 0;
  let layerViolations = 0;
  let dead = 0;
  let busFactor1 = 0;
  let activeRecent = 0;
  let staleFiles = 0;
  let minDaysSince = Number.POSITIVE_INFINITY;
  let inboundEdges = 0;   // imports from outside this folder
  let outboundEdges = 0;  // imports to outside this folder
  const conf = { exact: 0, overapprox: 0, unknown: 0, stale: 0 };
  const byLayer: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};
  const owners: Record<string, number> = {};
  const depCounts: Record<string, number> = {};
  const inboundCounts: Record<string, number> = {};

  const scopedIds = new Set(scoped.map((f) => f.id));

  for (const f of scoped) {
    const m = f.metrics;
    totalLoc += m.loc;
    sumComplexity += m.complexity;
    sumCov += m.lineCoverage;
    sumSafety += m.editSafety;
    sumMaint += m.maintainability;
    sumChurn += m.churn;
    sumPRs += m.recentPRs;
    sumBlast += m.blastRadius;

    if (f.status === 'SECURITY_ALERT') vulnerable++;
    if (!m.hasTestFile && !f.isTest) untested++;
    if (m.complexity >= 30 && m.churn > 0.4) hotspots++;
    if (m.editSafety >= 70) autoFixable++;
    if (m.editSafety < 40) humanOnly++;
    if (m.anyCount > 20 || m.tsIgnoreCount > 5 || m.strictOptOut) typeLoose++;
    if (m.cyclic) cyclic++;
    if (m.layerViolation) layerViolations++;
    if (m.dead) dead++;
    if (m.authors === 1 && !f.isGenerated) busFactor1++;
    if (m.daysSinceTouched < minDaysSince) minDaysSince = m.daysSinceTouched;
    if (m.daysSinceTouched <= 30) activeRecent++;
    if (m.daysSinceTouched >= 180) staleFiles++;

    conf[m.confidence]++;
    byLayer[f.layer] = (byLayer[f.layer] ?? 0) + 1;
    byLanguage[f.language] = (byLanguage[f.language] ?? 0) + 1;
    owners[f.owner] = (owners[f.owner] ?? 0) + 1;

    for (const tid of f.deps) {
      const t = repo.files[tid];
      if (!t) continue;
      if (scopedIds.has(tid)) continue; // count only outbound
      outboundEdges++;
      depCounts[t.folderPath] = (depCounts[t.folderPath] ?? 0) + 1;
    }
  }

  // Inbound: scan all out-of-scope files once for imports into this folder.
  for (const f of repo.files) {
    if (scopedIds.has(f.id)) continue;
    for (const tid of f.deps) {
      if (scopedIds.has(tid)) {
        inboundEdges++;
        inboundCounts[f.folderPath] = (inboundCounts[f.folderPath] ?? 0) + 1;
      }
    }
  }

  const total = Math.max(1, scoped.length);
  const ownersList = Object.entries(owners)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([owner, n]) => ({ owner, n }));
  const depFolders = Object.entries(depCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, n]) => ({ path, n }));
  const inboundFolders = Object.entries(inboundCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, n]) => ({ path, n }));

  const riskFiles = rankRiskFiles(scoped);
  const churnHotspots = rankChurnHotspots(scoped);

  return {
    totalFiles: scoped.length,
    directFiles: folder.fileIds.length,
    subfolders: folder.childPaths.length,
    totalLoc,
    avgComplexity: round1(sumComplexity / total),
    avgCoverage: Math.round(sumCov / total),
    avgEditSafety: Math.round(sumSafety / total),
    maintainability: Math.round(sumMaint / total),
    avgChurn: sumChurn / total,
    avgBlast: round1(sumBlast / total),
    totalRecentPRs: sumPRs,
    minDaysSince: Number.isFinite(minDaysSince) ? minDaysSince : 0,
    activeRecent,
    staleFiles,
    vulnerable,
    untested,
    hotspots,
    autoFixable,
    humanOnly,
    typeLoose,
    cyclic,
    layerViolations,
    dead,
    busFactor1,
    inboundEdges,
    outboundEdges,
    confidence: conf,
    byLayer,
    byLanguage,
    owners: ownersList,
    depFolders,
    inboundFolders,
    riskFiles,
    churnHotspots,
  };
}
