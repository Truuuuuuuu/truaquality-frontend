import type { Pond } from "@/lib/api"
import {
  PARAMETERS,
  STALE_AFTER_MS,
  statusFor,
  toReadingState,
  worstStatus,
  type ParameterConfig,
  type ReadingPoint,
  type ReadingState,
  type ReadingStatus,
} from "@/lib/parameters"

export function pondTabId(pondId: string) {
  return `pond-tab-${pondId}`
}

export function pondPanelId(pondId: string) {
  return `pond-panel-${pondId}`
}

export function latestPondReadings(pond: Pond, now: number) {
  return PARAMETERS.map((parameter) => {
    const latest = pond.latest[parameter.id]
    const threshold = pond.thresholds[parameter.id]
    if (!latest || !threshold) return { parameter, reading: null }
    const updatedAt = Date.parse(latest.recordedAt)
    return {
      parameter,
      reading: {
        value: latest.value,
        updatedAt,
        status: statusFor(threshold, latest.value, updatedAt, now),
      },
    }
  })
}

// How much a parameter's latest value can be trusted, per the tile state matrix (first match wins):
// - unit_offline: no device, or the device itself went quiet. The existing whole-unit treatment covers
//   it, so parameters are not flagged one by one (D-10).
// - not_reported: this unit has never sent the parameter at all — no reading and no status for it, as
//   with firmware older than 0.4.0 and turbidity (D-09). Not a fault, so it never counts as stale.
// - silent: the unit is online but this parameter stopped (or never started) arriving (D-06).
// - live: a current reading.
export type ParameterSignal =
  "unit_offline" | "not_reported" | "silent" | "live"

export function parameterSignal(
  pond: Pond,
  parameterId: string,
  now: number
): ParameterSignal {
  if (!pond.device || !isDeviceOnline(pond.device.lastSeenAt, now))
    return "unit_offline"
  const latest = pond.latest[parameterId]
  if (!latest && !Object.hasOwn(pond.sensorStatus ?? {}, parameterId))
    return "not_reported"
  if (!latest || now - Date.parse(latest.recordedAt) > STALE_AFTER_MS)
    return "silent"
  return "live"
}

export function silentParameters(pond: Pond, now: number): ParameterConfig[] {
  return PARAMETERS.filter(
    (parameter) => parameterSignal(pond, parameter.id, now) === "silent"
  )
}

export function pondStatus(pond: Pond, now: number): ReadingStatus {
  const statuses: ReadingStatus[] = latestPondReadings(pond, now).flatMap(
    ({ reading }) => (reading ? [reading.status] : [])
  )
  // A parameter the unit reports a status for but has never delivered a value is silent too (D-06);
  // one it has never mentioned contributes nothing, so old firmware doesn't pin the pond to the top of
  // the board (D-09).
  for (const parameter of PARAMETERS) {
    if (
      !pond.latest[parameter.id] &&
      parameterSignal(pond, parameter.id, now) === "silent"
    )
      statuses.push("stale")
  }
  // A pond that has never reported can't be vouched for, so it reads as stale rather than normal.
  return statuses.length === 0 ? "stale" : worstStatus(statuses)
}

export type PondReadingEntry = {
  parameter: ParameterConfig
  reading: ReadingState | null
  signal: ParameterSignal
  // The unit's own last status token for this sensor, or null when it never sent one.
  sensorStatus: string | null
}

// One entry per monitored parameter (same order as PARAMETERS), built from a pond's fetched 2 h
// history — the shared basis for both the per-parameter tile grid and the stacked per-parameter
// history charts. A device silent for longer than the history window still has a last known value;
// that's shown (it reads as stale) rather than claiming the pond has no data at all. `reading` is
// null only when the parameter has no reading ever (not even the pond's own `latest`).
export function pondReadingStates(
  pond: Pond,
  now: number,
  historyByParameter: Map<string, ReadingPoint[]>
): PondReadingEntry[] {
  return PARAMETERS.map((parameter) => {
    let history = historyByParameter.get(parameter.id) ?? []
    const latest = pond.latest[parameter.id]
    const threshold = pond.thresholds[parameter.id]
    if (history.length === 0 && latest) {
      history = [{ t: Date.parse(latest.recordedAt), v: latest.value }]
    }
    // No threshold means the server doesn't know this parameter, so there's nothing to judge it by.
    return {
      parameter,
      reading: threshold
        ? toReadingState(parameter, threshold, history, now)
        : null,
      signal: parameterSignal(pond, parameter.id, now),
      sensorStatus: pond.sensorStatus?.[parameter.id] ?? null,
    }
  })
}

export function lastReadingAt(pond: Pond): number | null {
  const times = Object.values(pond.latest).map((latest) =>
    Date.parse(latest.recordedAt)
  )
  return times.length === 0 ? null : Math.max(...times)
}

export function isDeviceOnline(lastSeenAt: string | null, now: number) {
  return lastSeenAt !== null && now - Date.parse(lastSeenAt) <= STALE_AFTER_MS
}

// Overrides the generic "stale" label ("No recent data") with the more specific reason: the device
// itself ("No device" / "Offline"), or, with the unit online, which sensor went quiet ("No turbidity
// reading" / "No reading from 2 sensors"). The sensor wording only applies while the pond reads stale,
// so a Warning/Critical pond keeps its severity label (D-06). Returns null otherwise — the default
// per-status label already covers it.
export function pondConnectionLabel(pond: Pond, now: number): string | null {
  if (!pond.device) return "No device"
  if (!isDeviceOnline(pond.device.lastSeenAt, now)) return "Offline"
  if (pondStatus(pond, now) !== "stale") return null
  const silent = silentParameters(pond, now)
  if (silent.length === 1) return `No ${silent[0].label.toLowerCase()} reading`
  if (silent.length > 1) return `No reading from ${silent.length} sensors`
  return null
}
