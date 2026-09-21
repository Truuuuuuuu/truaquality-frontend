import { Cpu, Wifi, WifiOff } from "lucide-react"
import { cn } from "cn"
import type { Pond } from "@/lib/api"
import { formatRelative } from "@/lib/format-time"
import { isDeviceOnline } from "@/lib/pond-status"

// The device serial/model — or the "no device" fallback text when none is assigned. No wrapping
// element of its own, so a caller can combine it inline with PondConnectionStatus (PondDeviceMeta,
// below) or place it on its own line elsewhere (the dashboard's pond header).
export function PondDeviceIdentity({
  pond,
  now,
}: {
  pond: Pond
  now?: number
}) {
  const device = pond.device
  if (!device) {
    return (
      <>No monitoring device assigned — assign one from the Devices page.</>
    )
  }
  // The SSID is the last network the unit reported, so once it is offline the value is history:
  // dim it and say so rather than presenting it as the current connection.
  const stale = now !== undefined && !isDeviceOnline(device.lastSeenAt, now)
  return (
    <>
      <Cpu className="size-3" />
      <span className="font-heading">{device.serial}</span>
      {device.hardwareModel ? <span>· {device.hardwareModel}</span> : null}
      <span
        className={cn(
          "inline-flex items-center gap-1",
          stale && "text-board-stale"
        )}
      >
        <Wifi className="size-3" />
        {device.wifiSsid
          ? `${stale ? "last known " : ""}${device.wifiSsid}`
          : "WiFi not reported yet"}
      </span>
    </>
  )
}

// The online-or-last-seen fragment (with the wifi-off glyph while offline) — null when there's no
// device to report on, since a status badge elsewhere already covers that case.
export function PondConnectionStatus({
  pond,
  now,
  className,
}: {
  pond: Pond
  now: number
  className?: string
}) {
  const device = pond.device
  if (!device) return null
  const deviceOnline = isDeviceOnline(device.lastSeenAt, now)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        !deviceOnline && "text-board-stale",
        className
      )}
    >
      {deviceOnline ? null : <WifiOff className="size-3" />}
      {device.lastSeenAt
        ? `last seen ${formatRelative(Date.parse(device.lastSeenAt), now)}`
        : "never connected"}
    </span>
  )
}

type PondDeviceMetaProps = {
  pond: Pond
  now: number
  className?: string
}

// The device serial/model + online-or-last-seen line, all on one row — used where there's no
// separate status badge to hang the connection state off of (the pond detail page's header).
export function PondDeviceMeta({ pond, now, className }: PondDeviceMetaProps) {
  const device = pond.device
  const identityLabel = device
    ? `Device ${device.serial}${device.hardwareModel ? `, ${device.hardwareModel}` : ""}, WiFi ${device.wifiSsid ?? "not reported yet"}`
    : "No monitoring device assigned"
  const connectionLabel = device
    ? device.lastSeenAt
      ? `last seen ${formatRelative(Date.parse(device.lastSeenAt), now)}`
      : "never connected"
    : null

  return (
    <p
      tabIndex={0}
      role="group"
      aria-label={[identityLabel, connectionLabel].filter(Boolean).join(", ")}
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-sans text-xs text-board-muted",
        className
      )}
    >
      <PondDeviceIdentity pond={pond} now={now} />
      {pond.device ? (
        <>
          <span>·</span>
          <PondConnectionStatus pond={pond} now={now} />
        </>
      ) : null}
    </p>
  )
}
