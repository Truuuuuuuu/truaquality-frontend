import type { ComponentType } from "react"
import { Droplets, Thermometer, Waves } from "lucide-react"

export type ReadingStatus = "nominal" | "warning" | "critical" | "stale"

export type ParameterConfig = {
  id: string
  label: string
  // For compact spots like pond cards, where the full label would truncate.
  shortLabel: string
  unit: string
  precision: number
  safeMin: number
  safeMax: number
  criticalMin: number
  criticalMax: number
}

export type ReadingPoint = { t: number; v: number }

export type ReadingState = {
  parameter: ParameterConfig
  current: number
  history: ReadingPoint[]
  updatedAt: number
  status: ReadingStatus
}

// Representative aquaculture pond targets, not a specific site's calibrated thresholds. Ids match the
// parameter ids the backend accepts from devices.
export const PARAMETERS: ParameterConfig[] = [
  {
    id: "temperature",
    label: "Temperature",
    shortLabel: "Temp",
    unit: "°C",
    precision: 1,
    safeMin: 26,
    safeMax: 31,
    criticalMin: 24,
    criticalMax: 33,
  },
  {
    id: "dissolvedOxygen",
    label: "Dissolved Oxygen",
    shortLabel: "DO",
    unit: "mg/L",
    precision: 2,
    safeMin: 5,
    safeMax: 9,
    criticalMin: 3,
    criticalMax: 11,
  },
  {
    id: "salinity",
    label: "Salinity",
    shortLabel: "Salinity",
    unit: "ppt",
    precision: 1,
    safeMin: 10,
    safeMax: 25,
    criticalMin: 5,
    criticalMax: 32,
  },
]

export const PARAMETER_ICONS: Record<
  string,
  ComponentType<{ className?: string }>
> = {
  temperature: Thermometer,
  dissolvedOxygen: Droplets,
  salinity: Waves,
}

export const PARAMETER_BY_ID: Record<string, ParameterConfig> =
  Object.fromEntries(PARAMETERS.map((parameter) => [parameter.id, parameter]))

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
export function severityFor(
  parameter: ParameterConfig,
  value: number
): Exclude<ReadingStatus, "stale"> {
  if (value < parameter.criticalMin || value > parameter.criticalMax)
    return "critical"
  if (value < parameter.safeMin || value > parameter.safeMax) return "warning"
  return "nominal"
}

export function statusFor(
  parameter: ParameterConfig,
  value: number,
  updatedAt: number,
  now: number
): ReadingStatus {
  if (now - updatedAt > STALE_AFTER_MS) return "stale"
  return severityFor(parameter, value)
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
export function toReadingState(
  parameter: ParameterConfig,
  history: ReadingPoint[],
  now: number
): ReadingState | null {
  const last = history.at(-1)
  if (!last) return null
  return {
    parameter,
    current: last.v,
    history,
    updatedAt: last.t,
    status: statusFor(parameter, last.v, last.t, now),
  }
}
