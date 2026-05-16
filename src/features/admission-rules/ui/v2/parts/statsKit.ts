// Statistical primitives used by the data-driven Health widgets.
//
// Everything here is pure and deterministic so the demo's "scientific"
// look isn't fake numerology — the formulas are the same ones a real
// admissions analytics dashboard would use, just fed with the demo's
// per-seed retrospective rolls instead of production telemetry.

// ─── Wilson score interval ───────────────────────────────────────────
// Better than naive Normal CI for proportions, especially with small N
// or extreme rates. Used when we want "what's the *true* pass-rate this
// gate would have, given we observed k passes in n PRs?"

export type WilsonCI = {
  point: number;     // sample proportion k/n
  lo: number;        // lower bound of CI
  hi: number;        // upper bound of CI
  n: number;
  z: number;
};

// `z` defaults to 1.96 → ~95% CI. Pass 2.576 for 99%.
export function wilson(k: number, n: number, z = 1.96): WilsonCI {
  if (n <= 0) return { point: 0, lo: 0, hi: 0, n: 0, z };
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  const lo = Math.max(0, center - margin);
  const hi = Math.min(1, center + margin);
  return { point: p, lo, hi, n, z };
}

// ─── EWMA — exponentially weighted moving average ───────────────────
// Smooths a noisy time series with a tunable half-life. α close to 1
// reacts fast (low latency, noisy); α close to 0 is smooth (lagging).
// 0.3 is the textbook default for "control-chart" style monitoring.

export function ewma(values: number[], alpha = 0.3): number[] {
  if (values.length === 0) return [];
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  }
  return out;
}

// ─── Z-score anomaly detection ──────────────────────────────────────
// For each point return its *standardised* deviation from the rolling
// mean using the rolling stddev. |z| > 2 → flag as anomaly. Uses a
// trailing window so today doesn't mark itself as normal.

export type ZPoint = {
  value: number;
  mean: number;
  std: number;
  z: number;
  anomaly: boolean;
};

export function zscoreSeries(values: number[], window = 7, threshold = 2): ZPoint[] {
  const out: ZPoint[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window);
    const slice = values.slice(start, i); // strictly trailing
    if (slice.length < 3) {
      out.push({ value: values[i], mean: values[i], std: 0, z: 0, anomaly: false });
      continue;
    }
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance =
      slice.reduce((a, b) => a + (b - mean) * (b - mean), 0) / slice.length;
    const std = Math.sqrt(variance);
    const z = std === 0 ? 0 : (values[i] - mean) / std;
    out.push({
      value: values[i],
      mean,
      std,
      z,
      anomaly: Math.abs(z) >= threshold,
    });
  }
  return out;
}

// ─── Cohen's d — effect size between two groups ─────────────────────
// Standardised mean difference. The conventional bands (Cohen 1988):
//   |d| < 0.2  → negligible
//   < 0.5      → small
//   < 0.8      → medium
//   ≥ 0.8      → large
// Used to quantify "did adding this rule actually move the needle?"

export type EffectSize = {
  d: number;
  band: 'negligible' | 'small' | 'medium' | 'large';
  meanA: number;
  meanB: number;
  pooledSd: number;
};

export function cohensD(a: number[], b: number[]): EffectSize {
  if (a.length === 0 || b.length === 0) {
    return { d: 0, band: 'negligible', meanA: 0, meanB: 0, pooledSd: 0 };
  }
  const meanA = mean(a);
  const meanB = mean(b);
  const pooledSd = Math.sqrt(
    ((a.length - 1) * variance(a, meanA) +
     (b.length - 1) * variance(b, meanB)) /
    Math.max(1, a.length + b.length - 2),
  );
  const d = pooledSd === 0 ? 0 : (meanB - meanA) / pooledSd;
  const abs = Math.abs(d);
  const band: EffectSize['band'] =
    abs < 0.2 ? 'negligible' :
    abs < 0.5 ? 'small' :
    abs < 0.8 ? 'medium' :
                'large';
  return { d, band, meanA, meanB, pooledSd };
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function variance(xs: number[], m: number): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += (x - m) * (x - m);
  return s / xs.length;
}

// ─── F1 / precision / recall ────────────────────────────────────────
// Standard classification scoring. We treat each rule's firing on a PR
// as a "predicted positive" (would block) and compare to the ground-
// truth label (PR was actually problematic). The demo synthesises a
// label per retro PR from severity × seed so the numbers are stable.

export type Confusion = { tp: number; fp: number; tn: number; fn: number };

export type ClassifierStats = {
  precision: number;
  recall: number;
  f1: number;
  support: number;        // total positives in ground truth
  fpr: number;            // false-positive rate
};

export function classifierStats({ tp, fp, tn, fn }: Confusion): ClassifierStats {
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0
    ? 0
    : (2 * precision * recall) / (precision + recall);
  const fpr = fp + tn === 0 ? 0 : fp / (fp + tn);
  return {
    precision,
    recall,
    f1,
    support: tp + fn,
    fpr,
  };
}

// ─── Tabular CUSUM (Page 1954) ───────────────────────────────────────
// Cumulative-sum control chart for drift detection. Where EWMA smooths
// and asks "is today high/low," CUSUM accumulates *all* deviations from
// a target μ₀, scaled by an allowance K (~half the size of the smallest
// shift you care about). When the cumulative sum exceeds H (typically
// 4σ–5σ), an alarm fires and we can read off when the drift *started*
// — the earliest index where the running sum was zero before the
// monotonic climb. EWMA can't tell you that.
//
// Conventions: target μ₀ usually = baseline mean; K ≈ 0.5σ; H ≈ 4σ–5σ.

export type CusumPoint = {
  value: number;
  // Upper-arm CUSUM: detects positive drift away from target.
  cuPos: number;
  // Lower-arm CUSUM: detects negative drift.
  cuNeg: number;
  alarmHi: boolean;
  alarmLo: boolean;
};

export type CusumResult = {
  points: CusumPoint[];
  H: number;
  K: number;
  target: number;
  // Earliest index where the alarming arm started its climb above 0,
  // i.e. an estimate of the change point. null if no alarm.
  changePoint: number | null;
};

export function cusum(
  values: number[],
  target?: number,
  k?: number,   // multiple of σ
  h?: number,   // multiple of σ
): CusumResult {
  if (values.length === 0) {
    return { points: [], H: 0, K: 0, target: 0, changePoint: null };
  }
  // If caller doesn't supply target/k/h, use the series itself for
  // baseline μ and σ. Sensible default for a demo with no historic
  // baseline, equivalent to a self-calibrated chart.
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - m) * (b - m), 0) / values.length;
  const sd = Math.sqrt(variance) || 1;
  const T = target ?? m;
  const K = (k ?? 0.5) * sd;
  const H = (h ?? 4) * sd;

  const points: CusumPoint[] = [];
  let cuPos = 0;
  let cuNeg = 0;
  let firstAlarm: number | null = null;
  let lastZeroBeforeAlarm = 0;
  let lastZeroPos = 0;
  let lastZeroNeg = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const diff = v - T;
    cuPos = Math.max(0, cuPos + diff - K);
    cuNeg = Math.max(0, cuNeg - diff - K);
    if (cuPos === 0) lastZeroPos = i;
    if (cuNeg === 0) lastZeroNeg = i;
    const alarmHi = cuPos > H;
    const alarmLo = cuNeg > H;
    if (firstAlarm === null && (alarmHi || alarmLo)) {
      firstAlarm = i;
      lastZeroBeforeAlarm = alarmHi ? lastZeroPos : lastZeroNeg;
    }
    points.push({ value: v, cuPos, cuNeg, alarmHi, alarmLo });
  }

  return {
    points,
    H,
    K,
    target: T,
    changePoint: firstAlarm === null ? null : lastZeroBeforeAlarm + 1,
  };
}

// ─── Difference-in-Differences (DiD) ─────────────────────────────────
// Counterfactual estimator: did adopting the rule actually move the
// metric, or did it just track the underlying trend? Compares the
// before→after delta in the *treated* group to the same span's delta
// in a *control* group. The DiD estimate isolates the rule's effect
// from time-varying confounders that hit both groups equally.
//
//   ATE = (after_treat − before_treat) − (after_ctrl − before_ctrl)
//
// We also surface a 95% CI assuming independent samples, which is
// adequate for the demo's i.i.d. retro slots; production would cluster
// errors at the PR level.

export type DiDResult = {
  ate: number;             // Average Treatment Effect (DiD)
  se: number;              // Standard error
  loCI: number;
  hiCI: number;
  beforeT: number;         // mean before, treated
  afterT: number;
  beforeC: number;
  afterC: number;
  nT: number;
  nC: number;
};

export function diffInDiff(
  treatedBefore: number[],
  treatedAfter: number[],
  controlBefore: number[],
  controlAfter: number[],
): DiDResult {
  const muTB = mean(treatedBefore);
  const muTA = mean(treatedAfter);
  const muCB = mean(controlBefore);
  const muCA = mean(controlAfter);
  const ate = (muTA - muTB) - (muCA - muCB);
  // Variance of DiD ≈ sum of group variances / n
  const v =
    safeVar(treatedBefore) / Math.max(1, treatedBefore.length) +
    safeVar(treatedAfter)  / Math.max(1, treatedAfter.length) +
    safeVar(controlBefore) / Math.max(1, controlBefore.length) +
    safeVar(controlAfter)  / Math.max(1, controlAfter.length);
  const se = Math.sqrt(v);
  return {
    ate,
    se,
    loCI: ate - 1.96 * se,
    hiCI: ate + 1.96 * se,
    beforeT: muTB,
    afterT: muTA,
    beforeC: muCB,
    afterC: muCA,
    nT: treatedBefore.length + treatedAfter.length,
    nC: controlBefore.length + controlAfter.length,
  };
}

function safeVar(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  return variance(xs, m);
}

// ─── Kaplan-Meier survival estimator ─────────────────────────────────
// Estimates S(t) = P(event hasn't happened by time t) from right-
// censored event-time data. Each "PR" has either an observed merge
// time (event=1) or a still-open observation window (event=0,
// censored). The product-limit formula handles censoring without bias:
//
//   S(t) = ∏_{t_i ≤ t} (1 − d_i / n_i)
//
// where d_i = events at t_i, n_i = at-risk at t_i. Standard error via
// Greenwood's formula gives a 95% CI band.

export type SurvivalEvent = {
  time: number;     // time-to-event (or to censoring)
  event: 0 | 1;     // 1 = merged, 0 = still open at observation time
};

export type SurvivalPoint = {
  t: number;
  s: number;        // S(t)
  loCI: number;
  hiCI: number;
  atRisk: number;
  events: number;
  censored: number;
};

export function kaplanMeier(events: SurvivalEvent[]): SurvivalPoint[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => a.time - b.time);
  const out: SurvivalPoint[] = [{ t: 0, s: 1, loCI: 1, hiCI: 1, atRisk: sorted.length, events: 0, censored: 0 }];

  let s = 1;
  let greenwoodSum = 0;
  let i = 0;
  let atRisk = sorted.length;

  while (i < sorted.length) {
    const t = sorted[i].time;
    let d = 0;
    let c = 0;
    while (i < sorted.length && sorted[i].time === t) {
      if (sorted[i].event === 1) d++; else c++;
      i++;
    }
    if (atRisk > 0 && d > 0) {
      s *= (atRisk - d) / atRisk;
      // Greenwood: Var[S(t)] = S(t)² · Σ d / (n(n-d))
      greenwoodSum += d / (atRisk * Math.max(1, atRisk - d));
    }
    const seSq = s * s * greenwoodSum;
    const se = Math.sqrt(Math.max(0, seSq));
    out.push({
      t,
      s,
      loCI: Math.max(0, s - 1.96 * se),
      hiCI: Math.min(1, s + 1.96 * se),
      atRisk,
      events: d,
      censored: c,
    });
    atRisk -= (d + c);
  }

  return out;
}

// Median survival time = smallest t with S(t) ≤ 0.5. null if not
// reached within observation window.
export function medianSurvival(curve: SurvivalPoint[]): number | null {
  for (const p of curve) if (p.s <= 0.5) return p.t;
  return null;
}

// ─── Reliability diagram + Expected Calibration Error ────────────────
// Bins predicted probabilities and compares them to observed positive
// rates within each bin. Perfectly calibrated classifier → diagonal.
// ECE = Σ (n_b / N) · |conf_b − acc_b| → single-number summary, lower
// is better. Used by Guo et al. 2017 ("On Calibration of Modern Neural
// Networks") and now standard for ML model trust scoring.

export type CalibrationBin = {
  lo: number;          // bin lower edge
  hi: number;          // bin upper edge
  count: number;
  meanConfidence: number;
  observedRate: number;
};

export type ReliabilityResult = {
  bins: CalibrationBin[];
  ece: number;
  totalN: number;
};

export function reliability(
  predictions: { p: number; outcome: 0 | 1 }[],
  nBins = 10,
): ReliabilityResult {
  const bins: CalibrationBin[] = [];
  for (let b = 0; b < nBins; b++) {
    bins.push({
      lo: b / nBins,
      hi: (b + 1) / nBins,
      count: 0,
      meanConfidence: 0,
      observedRate: 0,
    });
  }

  // Accumulate
  const sumConfidence = new Array<number>(nBins).fill(0);
  const sumOutcome = new Array<number>(nBins).fill(0);
  for (const { p, outcome } of predictions) {
    const idx = Math.min(nBins - 1, Math.max(0, Math.floor(p * nBins)));
    bins[idx].count++;
    sumConfidence[idx] += p;
    sumOutcome[idx] += outcome;
  }
  for (let i = 0; i < nBins; i++) {
    if (bins[i].count > 0) {
      bins[i].meanConfidence = sumConfidence[i] / bins[i].count;
      bins[i].observedRate = sumOutcome[i] / bins[i].count;
    }
  }

  const N = predictions.length || 1;
  let ece = 0;
  for (const b of bins) {
    if (b.count === 0) continue;
    ece += (b.count / N) * Math.abs(b.meanConfidence - b.observedRate);
  }

  return { bins, ece, totalN: predictions.length };
}

// ─── Cheap deterministic PRNG ───────────────────────────────────────
// Seeded so the demo's "data" is stable across renders without us
// having to memoise giant arrays in every consumer. mulberry32.

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function rand() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
