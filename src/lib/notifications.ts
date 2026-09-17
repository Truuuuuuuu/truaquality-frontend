import type { AppNotification } from "@/lib/api"
import { PARAMETER_BY_ID, type ReadingStatus } from "@/lib/parameters"

// A resolved alert, or a device back online, reads as nominal; an open/escalated alert or a device gone
// offline takes its severity's color (DEVICE_OFFLINE is always CRITICAL — see backend/CLAUDE.md).
export function notificationStatus(
  notification: AppNotification
): Exclude<ReadingStatus, "stale"> {
  if (
    notification.kind === "ALERT_RESOLVED" ||
    notification.kind === "DEVICE_ONLINE"
  )
    return "nominal"
  return notification.severity === "CRITICAL" ? "critical" : "warning"
}

// The pond a notification is about, whether it came from a reading alert or a device event.
export function notificationPond(notification: AppNotification) {
  return notification.alert?.pond ?? notification.device!.pond
}

// Human-readable pieces of a notification, e.g. "Dissolved Oxygen too low" + "3.84 mg/L", or
// "DO Sensor 2 went offline" + "DO Sensor 2".
export function describeNotification(notification: AppNotification) {
  if (
    notification.kind === "DEVICE_OFFLINE" ||
    notification.kind === "DEVICE_ONLINE"
  ) {
    const device = notification.device!
    const label = device.label ?? device.serial
    const title =
      notification.kind === "DEVICE_OFFLINE"
        ? `${label} went offline`
        : `${label} back online`
    return { title, reading: label, status: notificationStatus(notification) }
  }

  const alert = notification.alert!
  const parameter = PARAMETER_BY_ID[alert.parameter]
  const label = parameter?.label ?? alert.parameter
  // The server decides this: thresholds depend on the pond's type, and it holds them.
  const direction = notification.direction

  const title =
    notification.kind === "ALERT_RESOLVED"
      ? `${label} back to normal`
      : notification.kind === "ALERT_ESCALATED"
        ? `${label} critically ${direction}`
        : `${label} too ${direction}`

  const reading = parameter
    ? `${notification.value!.toFixed(parameter.precision)} ${parameter.unit}`
    : String(notification.value)

  return { title, reading, status: notificationStatus(notification) }
}
