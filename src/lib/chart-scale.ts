import type { Threshold } from "@/lib/parameters"

const NICE_STEPS = [1, 2, 2.5, 5, 10]

// Round-number value ticks (24, 26, 28 … rather than 23.7, 25.9 …) so the axis reads like a gauge.
export function valueTicks(min: number, max: number, target: number) {
  const raw = (max - min) / target
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = (NICE_STEPS.find((s) => s * magnitude >= raw) ?? 10) * magnitude
  const ticks: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
    ticks.push(Number(v.toFixed(6)))
  }
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9))
  return { ticks, decimals: step % 1 === 0 ? 0 : Math.max(decimals, 1) }
}

// A parameter with no low-side band (turbidity: cloudier is worse, clear is never a problem) has its
// safe and critical floors at the same value.
export function hasLowSide(threshold: Threshold): boolean {
  return threshold.safeMin !== threshold.criticalMin
}

// While the critical line is pending (D-02, D-03), fitting the axis to criticalMax would squash a
// clear-water pond into a flat line along the bottom of a placeholder range. Instead the axis fits the
// data, always keeps the safe line in view, and stretches for a spike rather than letting it go
// off-scale (D-01 supersedes "clamped scale, off-scale points marked"). The criticalMax placeholder is
// never read. Returns null when the marker isn't set, so callers keep their existing domain and a real
// BFAR critical figure restores the old rule with no frontend edit.
export function pendingScaleDomain(
  threshold: Threshold,
  dataMin: number,
  dataMax: number
): { lo: number; hi: number } | null {
  if (!threshold.criticalPending) return null
  let lo: number
  if (!hasLowSide(threshold) && dataMin >= threshold.safeMin) {
    lo = threshold.safeMin
  } else {
    const bottom = Math.min(dataMin, threshold.safeMin)
    const span = Math.max(dataMax, threshold.safeMax) - bottom
    lo = bottom - (span > 0 ? span * 0.1 : 1)
  }
  const rawHi = Math.max(threshold.safeMax * 1.2, dataMax * 1.1)
  const raw = (rawHi - lo) / 8
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = (NICE_STEPS.find((s) => s * magnitude >= raw) ?? 10) * magnitude
  const hi = Math.ceil(rawHi / step) * step
  return { lo, hi }
}
