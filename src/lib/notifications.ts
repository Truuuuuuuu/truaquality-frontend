import type { AppNotification } from "@/lib/api"
import { PARAMETER_BY_ID, type ReadingStatus } from "@/lib/parameters"

// A resolved alert reads as nominal (back in range); an open or escalated one takes its severity's color.
export function notificationStatus(
  notification: AppNotification
): Exclude<ReadingStatus, "stale"> {
  if (notification.kind === "ALERT_RESOLVED") return "nominal"
  return notification.severity === "CRITICAL" ? "critical" : "warning"
}

// Human-readable pieces of a notification, e.g. "Dissolved Oxygen too low" + "3.84 mg/L".
export function describeNotification(notification: AppNotification) {
  const parameter = PARAMETER_BY_ID[notification.alert.parameter]
  const label = parameter?.label ?? notification.alert.parameter
  // The server decides this: thresholds depend on the pond's type, and it holds them.
  const direction = notification.direction

  const title =
    notification.kind === "ALERT_RESOLVED"
      ? `${label} back to normal`
      : notification.kind === "ALERT_ESCALATED"
        ? `${label} critically ${direction}`
        : `${label} too ${direction}`

  const reading = parameter
    ? `${notification.value.toFixed(parameter.precision)} ${parameter.unit}`
    : String(notification.value)

  return { title, reading, status: notificationStatus(notification) }
}
