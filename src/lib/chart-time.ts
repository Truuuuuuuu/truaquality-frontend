import { STALE_AFTER_MS, type ReadingPoint } from "@/lib/parameters"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const TIME_STEPS = [
  5 * MINUTE,
  10 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  2 * HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  2 * DAY,
  7 * DAY,
]

// Ticks land on round local clock times (every 30 min, every 6 h…) rather than on `domainStart + n·step`,
// so they line up with how staff actually read a clock.
export function timeTicks(start: number, end: number, maxTicks: number) {
  const step =
    TIME_STEPS.find((s) => (end - start) / s <= maxTicks) ??
    TIME_STEPS[TIME_STEPS.length - 1]
  const offset = new Date(start).getTimezoneOffset() * MINUTE
  const ticks: number[] = []
  for (
    let t = Math.ceil((start - offset) / step) * step + offset;
    t <= end;
    t += step
  ) {
    ticks.push(t)
  }
  return { ticks, step }
}

export function formatTick(t: number, step: number) {
  const date = new Date(t)
  const isMidnight = date.getHours() === 0 && date.getMinutes() === 0
  if (step >= DAY || isMidnight) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  }
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function formatTooltipTime(t: number) {
  return new Date(t).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

// A device that stops reporting shouldn't have its last and next readings joined by a straight line — that
// line would claim readings that were never taken. A run breaks wherever consecutive points sit further
// apart than this; hourly rollups (long ranges) get a proportionally wider allowance via the median.
export function gapToleranceMs(series: ReadingPoint[][]) {
  const diffs = series
    .flatMap((points) => points.slice(1).map((p, i) => p.t - points[i].t))
    .sort((a, b) => a - b)
  const median = diffs.length ? diffs[Math.floor(diffs.length / 2)] : 0
  return Math.max(median * 3, STALE_AFTER_MS)
}

export function splitRuns(points: ReadingPoint[], toleranceMs: number) {
  const runs: ReadingPoint[][] = []
  for (const point of points) {
    const run = runs.at(-1)
    if (run && point.t - run[run.length - 1].t <= toleranceMs) run.push(point)
    else runs.push([point])
  }
  return runs
}

// Binary search over a time-sorted series; ties go to the earlier point.
export function nearestPoint(points: ReadingPoint[], t: number) {
  let lo = 0
  let hi = points.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (points[mid].t < t) lo = mid + 1
    else hi = mid
  }
  const after = points[lo]
  const before = points[lo - 1]
  if (before && Math.abs(before.t - t) <= Math.abs(after.t - t)) return before
  return after
}
