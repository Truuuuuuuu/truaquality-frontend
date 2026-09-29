import type { ComponentType } from "react"
import { Gauge, Waves } from "lucide-react"
import type {
  DeviceEvent,
  DeviceHealth,
  ResetReason,
  SensorDiagnostics,
} from "@/lib/api"
import {
  PARAMETER_BY_ID,
  PARAMETER_ICONS,
  STALE_AFTER_MS,
  type ReadingStatus,
} from "@/lib/parameters"

// Plain-language maintenance meaning for what a unit reports about itself. Everything here is about the
// hardware (is the probe plugged in, why did it restart); none of it judges a water-quality reading —
// those thresholds stay on the server.

export type DeviceState = "ONLINE" | "OFFLINE" | "NEVER" | "DISABLED"

export type SignalQuality = {
  label: "Excellent" | "Good" | "Fair" | "Weak"
  tone: "nominal" | "warning"
}

// Common WiFi rules of thumb in dBm: -67 is where streaming stays reliable, below -75 drops start.
export function signalQuality(rssi: number | null): SignalQuality | null {
  if (rssi === null) return null
  if (rssi >= -55) return { label: "Excellent", tone: "nominal" }
  if (rssi >= -67) return { label: "Good", tone: "nominal" }
  if (rssi >= -75) return { label: "Fair", tone: "nominal" }
  return { label: "Weak", tone: "warning" }
}

export const RESET_REASON_LABELS: Record<ResetReason, string> = {
  power_on: "Power loss / plug-in",
  software: "Restarted by its software",
  panic: "Crash (panic)",
  int_wdt: "Watchdog reset (interrupt)",
  task_wdt: "Watchdog reset (task)",
  wdt: "Watchdog reset",
  brownout: "Brown-out (low voltage)",
  deep_sleep: "Woke from sleep",
  external: "Reset button pressed",
  unknown: "Unknown reason",
}

// A newer firmware may send a token this build doesn't know yet; that should read as unknown, not crash.
export function resetReasonLabel(token: string | null): string {
  if (token && Object.hasOwn(RESET_REASON_LABELS, token))
    return RESET_REASON_LABELS[token as ResetReason]
  return RESET_REASON_LABELS.unknown
}

// Restarts that point at a hardware problem (power or a crash) rather than a normal plug-in.
const TROUBLE_RESETS = new Set([
  "brownout",
  "panic",
  "int_wdt",
  "task_wdt",
  "wdt",
])

// One table for a sensor fault's wording, shared by the Sensors list and the Event log so the two never
// describe the same fault differently.
const STATUS_TEXT: Record<string, { label: string; action: string | null }> = {
  ok: { label: "Connected", action: null },
  not_found: {
    label: "Probe not detected",
    action: "Check the probe plug and the 4.7 kΩ pull-up resistor",
  },
  disconnected: {
    label: "Probe disconnected",
    action: "Check the probe cable and plug",
  },
  power_on_value: {
    label: "Probe reset (bad reading)",
    action: "Check the probe's power wire; a loose supply resets the probe",
  },
  no_signal: {
    label: "No signal",
    action: "Check the 5 V supply and signal wire",
  },
  uncalibrated: {
    label: "Needs calibration",
    action: "Run the clear-water calibration",
  },
  over_range: {
    label: "Reading out of sensor range",
    action: "Clean the probe window and check the voltage divider",
  },
}

function statusText(token: string) {
  return Object.hasOwn(STATUS_TEXT, token)
    ? STATUS_TEXT[token]
    : { label: "Reported a fault", action: `Unit reported: ${token}` }
}

export type SensorTone = "ok" | "fault" | "stale"

export const SENSOR_TONE_STATUS: Record<SensorTone, ReadingStatus> = {
  ok: "nominal",
  fault: "critical",
  stale: "stale",
}

export type SensorHealth = {
  tone: SensorTone
  status: ReadingStatus
  label: string
  action: string | null
  // True when the unit didn't say (firmware older than 0.6.0) and the state is guessed from reading times.
  inferred: boolean
}

function health(
  tone: SensorTone,
  label: string,
  action: string | null,
  inferred = false
): SensorHealth {
  return { tone, status: SENSOR_TONE_STATUS[tone], label, action, inferred }
}

// The unit's own state wins over its last sensor report: a sensor status from before a unit went offline
// says nothing about the probe now, so an offline unit's sensors all read as unknown.
export function sensorHealth({
  sensor,
  deviceState,
  now,
}: {
  sensor: SensorDiagnostics
  deviceState: DeviceState
  now: number
}): SensorHealth {
  if (deviceState === "NEVER")
    return health(
      "stale",
      "Never reported",
      "Power the unit and check its WiFi setup"
    )
  if (deviceState === "DISABLED")
    return health("stale", "Not monitored (unit disabled)", null)
  if (deviceState === "OFFLINE")
    return health(
      "stale",
      "Unknown (unit offline)",
      "Check the unit's power and WiFi"
    )

  if (sensor.reportedStatus !== null) {
    const text = statusText(sensor.reportedStatus)
    return sensor.reportedStatus === "ok"
      ? health("ok", text.label, null)
      : health("fault", text.label, text.action)
  }

  const wiringHint = "Check the probe's plug and wiring"
  if (sensor.lastReadingAt === null)
    return health("stale", "Never reported", wiringHint, true)
  if (now - Date.parse(sensor.lastReadingAt) <= STALE_AFTER_MS)
    return health("ok", "Connected", null, true)
  return health("stale", "Not reporting", wiringHint, true)
}

export type SensorDisplay = {
  label: string
  unit: string
  precision: number
  icon: ComponentType<{ className?: string }>
}

// Only for a sensor the unit already reports before its parameter lands in PARAMETERS (turbidity today).
// Display metadata only — no range numbers.
const FALLBACK_DISPLAY: Record<string, SensorDisplay> = {
  turbidity: { label: "Turbidity", unit: "NTU", precision: 1, icon: Waves },
}

export function sensorDisplay(parameter: string): SensorDisplay {
  const known = PARAMETER_BY_ID[parameter]
  if (known)
    return {
      label: known.label,
      unit: known.unit,
      precision: known.precision,
      icon: PARAMETER_ICONS[parameter] ?? Gauge,
    }
  if (Object.hasOwn(FALLBACK_DISPLAY, parameter))
    return FALLBACK_DISPLAY[parameter]
  return {
    label: parameter.charAt(0).toUpperCase() + parameter.slice(1),
    unit: "",
    precision: 1,
    icon: Gauge,
  }
}

// Mirrors the firmware's default REPORT_INTERVAL_MS (firmware/include/unit_config.example.h). The API
// doesn't expose a unit's interval, so this only estimates how complete the last day's data is; it is
// never used to judge a reading.
export const REPORT_INTERVAL_S = 30

const DAY_MS = 24 * 60 * 60_000

export function completeness(
  readings24h: number,
  deviceCreatedAt: string,
  now: number
): number | null {
  const windowMs = Math.min(DAY_MS, now - Date.parse(deviceCreatedAt))
  const expected = Math.floor(windowMs / (REPORT_INTERVAL_S * 1000))
  if (expected < 1) return null
  return Math.min(1, Math.max(0, readings24h / expected))
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const parts: [number, string][] = [
    [Math.floor(total / 86_400), "d"],
    [Math.floor((total % 86_400) / 3600), "h"],
    [Math.floor((total % 3600) / 60), "m"],
    [total % 60, "s"],
  ]
  const first = parts.findIndex(([value]) => value > 0)
  if (first === -1) return "0s"
  return parts
    .slice(first, first + 2)
    .filter(([value]) => value > 0)
    .map(([value, unit]) => `${value}${unit}`)
    .join(" ")
}

export function formatBytes(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`
}

export function restartedAt(health: DeviceHealth): number | null {
  if (health.diagnosticsAt === null || health.uptimeS === null) return null
  return Date.parse(health.diagnosticsAt) - health.uptimeS * 1000
}

// Maintenance heuristics for when to look at a unit, not water-quality thresholds.
export const REBOOT_FLAG_COUNT = 3
export const QUEUE_FLAG = 20
export const LOW_HEAP_BYTES = 30 * 1024

export type HealthFlag = { id: string; label: string; detail: string }

export function healthFlags({
  health,
  events,
  now,
}: {
  health: DeviceHealth
  events: DeviceEvent[]
  now: number
}): HealthFlag[] {
  const flags: HealthFlag[] = []
  const restarts = events.filter(
    (event) =>
      event.kind === "REBOOT" && now - Date.parse(event.createdAt) <= DAY_MS
  ).length
  if (restarts >= REBOOT_FLAG_COUNT)
    flags.push({
      id: "reboots",
      label: "Unstable power?",
      detail: `${restarts} restarts in 24 h`,
    })
  if (health.queuedSamples !== null && health.queuedSamples > QUEUE_FLAG)
    flags.push({
      id: "backlog",
      label: "Upload backlog",
      detail: `${health.queuedSamples} readings waiting to upload`,
    })
  if (health.freeHeap !== null && health.freeHeap < LOW_HEAP_BYTES)
    flags.push({
      id: "memory",
      label: "Low memory",
      detail: `${formatBytes(health.freeHeap)} free`,
    })
  return flags
}

export type EventDescription = {
  title: string
  detail: string | null
  tone: SensorTone | "neutral"
}

export function eventDescription(event: DeviceEvent): EventDescription {
  const sensor = event.parameter
    ? sensorDisplay(event.parameter).label
    : "Sensor"
  switch (event.kind) {
    case "OFFLINE":
      return { title: "Went offline", detail: null, tone: "stale" }
    case "ONLINE":
      return { title: "Back online", detail: null, tone: "ok" }
    case "REBOOT":
      return {
        title: "Restarted",
        detail: resetReasonLabel(event.detail),
        tone: TROUBLE_RESETS.has(event.detail ?? "") ? "fault" : "neutral",
      }
    case "SENSOR_FAULT":
      return {
        title: `${sensor}: ${statusText(event.detail ?? "").label}`,
        detail: null,
        tone: "fault",
      }
    case "SENSOR_RECOVERED":
      return { title: `${sensor} reconnected`, detail: null, tone: "ok" }
    case "FIRMWARE_CHANGED":
      return {
        title: "Firmware updated",
        detail: event.detail,
        tone: "neutral",
      }
    default:
      return { title: "Unit event", detail: event.detail, tone: "neutral" }
  }
}
