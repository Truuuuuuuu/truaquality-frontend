import type { Pond } from "@/lib/api"
import {
  PARAMETERS,
  STALE_AFTER_MS,
  statusFor,
  worstStatus,
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

export function lastReadingAt(pond: Pond): number | null {
  const times = Object.values(pond.latest).map((latest) =>
    Date.parse(latest.recordedAt)
  )
  return times.length === 0 ? null : Math.max(...times)
}

export function isDeviceOnline(lastSeenAt: string | null, now: number) {
  return lastSeenAt !== null && now - Date.parse(lastSeenAt) <= STALE_AFTER_MS
}
