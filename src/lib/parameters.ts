import type { ComponentType } from "react"
import { Thermometer, Waves } from "lucide-react"

export type ReadingStatus = "nominal" | "warning" | "critical" | "stale"

// Display metadata only. The safe/critical numbers used to live here too, duplicated from the
// backend and kept in step by hand; they can depend on a pond's type, so the server resolves them
// per pond and sends them as `pond.thresholds`.
export type ParameterConfig = {
  id: string
  label: string
  // For compact spots like pond cards, where the full label would truncate.
  shortLabel: string
  unit: string
  precision: number
  // The value is an estimate (a low-cost sensor, not a lab instrument), so every surface prefixes "≈"
  // and says "approx." rather than presenting it as exact.
  approximate?: boolean
  // Tile foot copy explaining why the value is approximate.
  approximateHint?: string
  // The highest value the sensor can report. A reading here means "at least this", shown as "≥ N".
  // A display limit only: never a threshold, never passed to severityFor/statusFor.
  sensorCeiling?: number
  ceilingHint?: string
  // The first firmware version that sends this parameter at all. Absent means every firmware sends it.
  // A unit on an older firmware is "not reported" for it rather than "silent" (D-09), so it never pins
  // the pond to stale. Set this on every parameter added after the first firmware release.
  sinceFirmware?: string
}

// One parameter's safe/critical band for a particular pond, as `Pond.thresholds` carries it.
export type Threshold = {
  safeMin: number
  safeMax: number
  criticalMin: number
  criticalMax: number
  // Mirrors the backend marker: the critical line is pending BFAR's figure and criticalMax is only a
  // placeholder. While set, charts and range bars draw no critical band and keep the axis off the
  // placeholder (D-02, D-03).
  criticalPending?: boolean
}

export type ReadingPoint = { t: number; v: number }

export type ReadingState = {
  parameter: ParameterConfig
  threshold: Threshold
  current: number
  history: ReadingPoint[]
  updatedAt: number
  status: ReadingStatus
}

// Ids match the parameter ids the backend accepts from devices.
export const PARAMETERS: ParameterConfig[] = [
  {
    id: "temperature",
    label: "Temperature",
    shortLabel: "Temp",
    unit: "°C",
    precision: 1,
  },
  {
    id: "turbidity",
    label: "Turbidity",
    shortLabel: "Turb",
    unit: "NTU",
    precision: 1,
    approximate: true,
    approximateHint:
      "Estimated by a low-cost optical sensor. Good for spotting trends, not a lab measurement.",
    // The firmware clamps water muddier than it can measure to 3000 NTU (Phase 3 D-02), so a reading
    // there means "at least this" and shows as "≥ 3000 NTU" (D-05). Kept as a frontend display
    // constant because no endpoint carries per-parameter display metadata, and it is not an alert
    // threshold.
    sensorCeiling: 3000,
    ceilingHint:
      "Beyond what the sensor can measure. The water is at least this cloudy.",
    sinceFirmware: "0.4.0",
  },
]

// Illustrative bands for the signed-out range key on the auth pages (components/auth-shell.tsx).
// Those pages have no pond in context and no token to fetch one with, so they can't use the real
// per-pond thresholds. These mirror the backend's UNSET profile — what it applies to a pond nobody
// has classified yet — which is the honest reading for "some pond, type unknown". Nothing that
// judges an actual reading may use these; live surfaces read `pond.thresholds`.
export const SIGNED_OUT_THRESHOLDS: Record<string, Threshold> = {
  temperature: { safeMin: 20, safeMax: 30, criticalMin: 15, criticalMax: 35.5 },
  turbidity: {
    safeMin: 0,
    safeMax: 25,
    criticalMin: 0,
    criticalMax: 3000,
    criticalPending: true,
  },
}

export const PARAMETER_ICONS: Record<
  string,
  ComponentType<{ className?: string }>
> = {
  temperature: Thermometer,
  turbidity: Waves,
}

export const PARAMETER_BY_ID: Record<string, ParameterConfig> =
  Object.fromEntries(PARAMETERS.map((parameter) => [parameter.id, parameter]))

// "All parameters" plus one entry per parameter, for filter controls (the reading-history table's Select
// and its filter dialog) that need an unfiltered option alongside the real parameter list.
export const PARAMETER_FILTER_ITEMS = [
  { value: "all", label: "All parameters" },
  ...PARAMETERS.map((parameter) => ({
    value: parameter.id,
    label: parameter.label,
  })),
]

// Devices report about once a minute, so five minutes of silence means the value can't be trusted as current.
export const STALE_AFTER_MS = 5 * 60_000

const STATUS_SEVERITY: Record<ReadingStatus, number> = {
  nominal: 0,
  stale: 1,
  warning: 2,
  critical: 3,
}

// The in-range/warning/critical read on a value alone, with no notion of staleness — useful for a
// historical row (e.g. a table of past readings) where "now - updatedAt" doesn't mean anything.
// Mirrors the backend's severityFor, but reads the band it was given rather than looking one up —
// the pond it belongs to is what decides the numbers.
export function severityFor(
  threshold: Threshold,
  value: number
): Exclude<ReadingStatus, "stale"> {
  if (value < threshold.criticalMin || value > threshold.criticalMax)
    return "critical"
  if (value < threshold.safeMin || value > threshold.safeMax) return "warning"
  return "nominal"
}

export function statusFor(
  threshold: Threshold,
  value: number,
  updatedAt: number,
  now: number
): ReadingStatus {
  if (now - updatedAt > STALE_AFTER_MS) return "stale"
  return severityFor(threshold, value)
}

export function worstStatus(statuses: ReadingStatus[]): ReadingStatus {
  return statuses.reduce<ReadingStatus>(
    (worst, status) =>
      STATUS_SEVERITY[status] > STATUS_SEVERITY[worst] ? status : worst,
    "nominal"
  )
}

export function compareStatus(a: ReadingStatus, b: ReadingStatus) {
  return STATUS_SEVERITY[b] - STATUS_SEVERITY[a]
}

// Builds a tile's state from a parameter's history (oldest first). Returns null when there is nothing to show.
// `threshold` travels with the state so every consumer draws its safe band from the same numbers that
// decided the status.
export function toReadingState(
  parameter: ParameterConfig,
  threshold: Threshold,
  history: ReadingPoint[],
  now: number
): ReadingState | null {
  const last = history.at(-1)
  if (!last) return null
  return {
    parameter,
    threshold,
    current: last.v,
    history,
    updatedAt: last.t,
    status: statusFor(threshold, last.v, last.t, now),
  }
}
