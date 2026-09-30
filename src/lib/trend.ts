// Trend analysis for a history window. Kept free of `@/` imports so the math can be spot-checked with
// plain node (type stripping) — the frontend has no test runner.

export type TrendDirection = "rising" | "falling" | "stable"

export type Trend = {
  direction: TrendDirection
  // Signed rate in the parameter's own unit per `rateUnit`.
  rate: number
  rateUnit: "hr" | "day"
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

// A change smaller than this share of the safe band's width counts as "stable". Tying the deadband to the
// server-provided safe band (rather than a fixed per-parameter number) keeps ranges out of the frontend and
// scales with how much movement actually matters for that parameter: 0.5 °C on a 20–30 °C band.
export const STABLE_SHARE_OF_SAFE_BAND = 0.05

// Ordinary least-squares line through the points. Time is centered on its mean first: epoch
// milliseconds squared lose precision in a double, which would make the slope noise.
export function linearTrend(
  points: { t: number; v: number }[]
): { slopePerMs: number; fittedChange: number; coveredMs: number } | null {
  const n = points.length
  if (n < 2) return null
  let tSum = 0
  let vSum = 0
  for (const { t, v } of points) {
    tSum += t
    vSum += v
  }
  const tMean = tSum / n
  const vMean = vSum / n
  let sxy = 0
  let sxx = 0
  let tFirst = Infinity
  let tLast = -Infinity
  for (const { t, v } of points) {
    const dt = t - tMean
    sxy += dt * (v - vMean)
    sxx += dt * dt
    tFirst = Math.min(tFirst, t)
    tLast = Math.max(tLast, t)
  }
  if (sxx === 0) return null
  const slopePerMs = sxy / sxx
  const coveredMs = tLast - tFirst
  return { slopePerMs, fittedChange: slopePerMs * coveredMs, coveredMs }
}

export function trendDirection(
  fittedChange: number,
  safeBand: { safeMin: number; safeMax: number }
): TrendDirection {
  const deadband =
    (safeBand.safeMax - safeBand.safeMin) * STABLE_SHARE_OF_SAFE_BAND
  if (Math.abs(fittedChange) < deadband) return "stable"
  return fittedChange > 0 ? "rising" : "falling"
}

// A fit through a short burst of readings says nothing about the range around it: 30 minutes of warm-up
// inside a 7-day window extrapolated to "+55 °C/day". So a trend is only reported when the readings span at
// least this share of the selected range.
export const MIN_TREND_COVERAGE = 0.5

// Per hour reads naturally up to a two-day window; past that, hourly rates get too small to show at the
// parameter's precision, so the rate switches to per day.
export function rateUnitFor(spanMs: number): Trend["rateUnit"] {
  return spanMs <= 2 * DAY_MS ? "hr" : "day"
}

export function trendFor(
  points: { t: number; v: number }[],
  spanMs: number,
  safeBand: { safeMin: number; safeMax: number }
): Trend | null {
  const fit = linearTrend(points)
  if (fit === null) return null
  if (fit.coveredMs < spanMs * MIN_TREND_COVERAGE) return null
  const rateUnit = rateUnitFor(spanMs)
  return {
    direction: trendDirection(fit.fittedChange, safeBand),
    rate: fit.slopePerMs * (rateUnit === "hr" ? HOUR_MS : DAY_MS),
    rateUnit,
  }
}
