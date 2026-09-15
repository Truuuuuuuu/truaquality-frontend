import type { Pond } from "@/lib/api"
import {
  PARAMETERS,
  STALE_AFTER_MS,
  statusFor,
  toReadingState,
  worstStatus,
  type ReadingPoint,
  type ReadingState,
  type ReadingStatus,
} from "@/lib/parameters"

export function latestPondReadings(pond: Pond, now: number) {
  return PARAMETERS.map((parameter) => {
    const latest = pond.latest[parameter.id]
    if (!latest) return { parameter, reading: null }
    const updatedAt = Date.parse(latest.recordedAt)
    return {
      parameter,
      reading: {
        value: latest.value,
        updatedAt,
        status: statusFor(parameter, latest.value, updatedAt, now),
      },
    }
  })
}

export function pondStatus(pond: Pond, now: number): ReadingStatus {
  const statuses = latestPondReadings(pond, now).flatMap(({ reading }) =>
    reading ? [reading.status] : []
  )
  // A pond that has never reported can't be vouched for, so it reads as stale rather than normal.
  return statuses.length === 0 ? "stale" : worstStatus(statuses)
}

// One entry per monitored parameter (same order as PARAMETERS), built from a pond's fetched 2 h
// history — the shared basis for both the per-parameter tile grid and the dashboard's combined
// trend chart. A device silent for longer than the history window still has a last known value;
// that's shown (it reads as stale) rather than claiming the pond has no data at all. `reading` is
// null only when the parameter has no reading ever (not even the pond's own `latest`).
export function pondReadingStates(
  pond: Pond,
  now: number,
  historyByParameter: Map<string, ReadingPoint[]>
): { parameter: (typeof PARAMETERS)[number]; reading: ReadingState | null }[] {
  return PARAMETERS.map((parameter) => {
    let history = historyByParameter.get(parameter.id) ?? []
    const latest = pond.latest[parameter.id]
    if (history.length === 0 && latest) {
      history = [{ t: Date.parse(latest.recordedAt), v: latest.value }]
    }
    return { parameter, reading: toReadingState(parameter, history, now) }
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

// Overrides the generic "stale" label ("No recent data") with the more specific reason, when the pond's
// status is "stale" because of the device itself rather than, say, a freshly-assigned device with no data yet.
// Returns null when the device is online — the default per-status label already covers that case.
export function pondConnectionLabel(pond: Pond, now: number): string | null {
  if (!pond.device) return "No device"
  if (!isDeviceOnline(pond.device.lastSeenAt, now)) return "Offline"
  return null
}
