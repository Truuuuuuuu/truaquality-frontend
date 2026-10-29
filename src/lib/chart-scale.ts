import type { Threshold } from "@/lib/parameters"
import type { NormalReference } from "@/lib/api"
import { referenceResult } from "@/lib/do-display"

const NICE_STEPS = [1, 2, 2.5, 5, 10]

// Layout padding is not a safe/critical limit. Scaling first also keeps the axis finite for
// very large values; missing reference metadata fits only the data, without a substitute edge.
export function referenceScaleDomain(
  reference: NormalReference | null | undefined,
  dataMin: number,
  dataMax: number
) {
  const values = [dataMin, dataMax].filter(Number.isFinite)
  if (referenceResult(0, reference) !== null && reference)
    values.push(reference.boundary)
  const scale = Math.max(...values.map(Math.abs), 1)
  const low = values.length ? Math.min(...values) / scale : -1
  const high = values.length ? Math.max(...values) / scale : 1
  const padding = Math.max((high - low) * 0.12, 0.05)
  const finite = (value: number) =>
    Math.max(-Number.MAX_VALUE, Math.min(Number.MAX_VALUE, value * scale))
  const lo = finite(low - padding)
  const hi = finite(high + padding)
  const normalized = valueTicks(lo / scale, hi / scale, 4)
  const ticks = normalized.ticks.map(finite).filter(Number.isFinite)
  const step = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : scale
  const decimals = Math.min(6, Math.max(0, -Math.floor(Math.log10(step))))
  return { lo, hi, ticks, decimals }
}

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
): { lo: number; hi: number; step?: number } | null {
  if (!threshold.criticalPending) return null
  // Two-sided band (D-05, D-06): the safe band itself is the minimum y-span (UI-09), padded by a
  // margin of a sixth of its width on each side, so a normal daily swing fills a good part of the plot
  // instead of hugging a line. Only safeMin/safeMax are read; the critical placeholders never are.
  // Data inside the margin keeps the margin-wide axis and data beyond it stretches the axis by one more
  // margin. This deliberately departs from the UI-SPEC's literal "min(safe floor minus margin, data
  // minimum minus margin)" formula, which would widen the axis by a full extra margin whenever the data
  // merely touched the margin. The returned step is the tick step the detail chart uses; the compact
  // charts use twice it. When BFAR's critical figure arrives and the backend clears the marker, callers
  // fall back to their existing two-sided domain with no frontend edit.
  if (hasLowSide(threshold)) {
    // The band is the server's, so a zero-width or inverted one must still give a finite axis: a sixth
    // of a zero or negative width would make log10 return -Infinity or NaN and blank every path, zone
    // and tick. Order the edges and fall back to a fixed margin, like the one-sided branch below does.
    const bandLo = Math.min(threshold.safeMin, threshold.safeMax)
    const bandHi = Math.max(threshold.safeMin, threshold.safeMax)
    const width = bandHi - bandLo
    const m = width > 0 ? width / 6 : Math.max(Math.abs(bandHi) * 0.1, 1)
    const magnitude = 10 ** Math.floor(Math.log10(m))
    const step = Number(
      ((NICE_STEPS.find((s) => s * magnitude >= m) ?? 10) * magnitude).toFixed(
        6
      )
    )
    const low = dataMin < bandLo - m ? dataMin - m : bandLo - m
    const high = dataMax > bandHi + m ? dataMax + m : bandHi + m
    const lo = Number((Math.floor(low / step) * step).toFixed(6))
    const hi = Number((Math.ceil(high / step) * step).toFixed(6))
    return { lo, hi, step }
  }
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
