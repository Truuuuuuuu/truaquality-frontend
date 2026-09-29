import type { Pond } from "@/lib/api"
import {
  PARAMETER_BY_ID,
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

// The pond's latest reading of a parameter, but only if the unit assigned now sent it. `pond.latest` is
// pond-scoped (any unit that was ever assigned here), while the unit's status map and firmware are
// device-scoped, so a previous unit's reading must not stand in for the current one's.
function currentUnitLatest(pond: Pond, parameterId: string) {
  const latest = pond.latest[parameterId]
  if (!latest) return undefined
  const assignedAt = pond.device?.assignedAt
  if (assignedAt && Date.parse(latest.recordedAt) < Date.parse(assignedAt))
    return undefined
  return latest
}

// Dotted numeric compare ("0.10.0" > "0.9.2"); anything after a "-" or "+" is ignored.
function firmwareAtLeast(version: string, minimum: string) {
  const parse = (v: string) =>
    v
      .split(/[-+]/)[0]
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0)
  const a = parse(version)
  const b = parse(minimum)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff > 0
  }
  return true
}

// Whether this unit is known not to send the parameter at all: a unit that reports a sensors map
// (firmware 0.6.0+) and leaves the parameter out of it, or a unit whose firmware predates the
// parameter. Without either fact the unit can't be said to lack it, so a missing value is a fault.
function unitLacksParameter(pond: Pond, parameter: ParameterConfig) {
  const statuses = pond.sensorStatus ?? {}
  if (Object.hasOwn(statuses, parameter.id)) return false
  if (Object.keys(statuses).length > 0) return true
  const firmware = pond.device?.firmwareVersion
  return (
    parameter.sinceFirmware !== undefined &&
    firmware != null &&
    !firmwareAtLeast(firmware, parameter.sinceFirmware)
  )
}

// How much a parameter's latest value can be trusted, per the tile state matrix (first match wins):
// - unit_offline: no device, or the device itself went quiet. The existing whole-unit treatment covers
//   it, so parameters are not flagged one by one (D-10).
// - not_reported: the current unit has sent no reading of it since it was assigned, and is known not to
//   send it at all (its sensors map leaves it out, or its firmware predates it — firmware older than
//   0.4.0 and turbidity, D-09). Not a fault, so it never counts as stale.
// - silent: the unit is online and should send this parameter, but it stopped (or never started)
//   arriving (D-06) — including firmware 0.4.x/0.5.x with an uncalibrated turbidity probe, which sends
//   no value and no status.
// - live: a current reading from the current unit.
export type ParameterSignal =
  "unit_offline" | "not_reported" | "silent" | "live"

export function parameterSignal(
  pond: Pond,
  parameterId: string,
  now: number
): ParameterSignal {
  if (!pond.device || !isDeviceOnline(pond.device.lastSeenAt, now))
    return "unit_offline"
  const latest = currentUnitLatest(pond, parameterId)
  const parameter = PARAMETER_BY_ID[parameterId]
  if (!latest && parameter && unitLacksParameter(pond, parameter))
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
  const statuses: ReadingStatus[] = []
  for (const parameter of PARAMETERS) {
    const signal = parameterSignal(pond, parameter.id, now)
    // A parameter the current unit doesn't send contributes nothing, so old firmware doesn't pin the
    // pond to the top of the board (D-09).
    if (signal === "not_reported") continue
    // With the unit offline the whole pond is judged on its last readings, whichever unit sent them.
    const latest =
      signal === "unit_offline"
        ? pond.latest[parameter.id]
        : currentUnitLatest(pond, parameter.id)
    const threshold = pond.thresholds[parameter.id]
    if (latest && threshold) {
      statuses.push(
        statusFor(threshold, latest.value, Date.parse(latest.recordedAt), now)
      )
    } else if (signal === "silent") {
      // Expected from this unit but never delivered since it was assigned (D-06).
      statuses.push("stale")
    }
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
