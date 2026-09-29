import * as React from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Cpu,
  Link2,
  Settings2,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Link, useParams } from "react-router"
import { cn } from "cn"
import { BoardEmptyState } from "@/components/board-empty-state"
import { ManageDeviceDialog } from "@/components/devices/manage-device-dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useDevices } from "@/hooks/use-ponds"
import { useNow } from "@/hooks/use-now"
import type { Device } from "@/lib/api"
import { formatClock, formatDate, formatRelative } from "@/lib/format-time"
import { isDeviceOnline } from "@/lib/pond-status"
import { STATUS_STYLES } from "@/lib/status-styles"

// A unit is exactly one of these, in the same order the Devices page decides it: disabled beats
// reachability, because a disabled unit's silence is a decision rather than a fault.
type DeviceState = "ONLINE" | "OFFLINE" | "NEVER" | "DISABLED"

function deviceState(device: Device, now: number): DeviceState {
  if (device.status === "DISABLED") return "DISABLED"
  if (!device.lastSeenAt) return "NEVER"
  return isDeviceOnline(device.lastSeenAt, now) ? "ONLINE" : "OFFLINE"
}

const STATE_LABELS: Record<DeviceState, string> = {
  ONLINE: "Online",
  OFFLINE: "Offline",
  NEVER: "Never connected",
  DISABLED: "Disabled",
}

function formatDateTime(timestamp: number) {
  return `${formatDate(timestamp)}, ${formatClock(timestamp)}`
}

// One sensor unit: what it is, where it reports from, and whether it's reporting. There is no
// GET /devices/:id — the registry list is small (one office's units) and already polled and cached by
// useDevices, so the page reads its device out of that list instead of adding an endpoint for it.
export function DeviceDetailPage() {
  const { deviceId = "" } = useParams()
  const { profile } = useAuth()
  const isAdmin = profile?.systemRole === "ADMIN"
  const { data: devices, error } = useDevices()
  const now = useNow()
  const [manageOpen, setManageOpen] = React.useState(false)

  const device = devices?.find((candidate) => candidate.id === deviceId)

  const backLink = (
    <Link
      to="/devices"
      className="inline-flex w-fit items-center gap-1 font-sans text-xs text-board-muted hover:text-board-fg"
    >
      <ArrowLeft className="size-3" />
      Devices
    </Link>
  )

  if (!device) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        {error ? (
          <BoardEmptyState icon={AlertTriangle} tone="error">
            {`Couldn't load this device: ${error.message}`}
          </BoardEmptyState>
        ) : devices ? (
          <BoardEmptyState icon={AlertTriangle} tone="error">
            This device doesn't exist.
          </BoardEmptyState>
        ) : (
          <p className="font-sans text-sm text-board-muted">Loading device…</p>
        )}
      </div>
    )
  }

  const state = deviceState(device, now)
  const online = state === "ONLINE"
  const name = device.label ?? device.serial
  const lastSeen = device.lastSeenAt ? Date.parse(device.lastSeenAt) : null

  return (
    <div className="flex flex-col gap-8">
      {/* The same split title bar as a pond's header: what the unit is on the left, whether it's
          reporting on the right — so moving between a pond and its unit keeps the reading order. */}
      <header className="flex flex-col gap-3">
        {backLink}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="font-sans text-2xl leading-tight font-semibold tracking-tight text-balance text-board-fg">
              {name}
            </h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-sm text-board-muted">
              <span className="inline-flex items-center gap-1.5">
                <Cpu className="size-4 shrink-0" aria-hidden="true" />
                <span className="font-heading text-board-fg">
                  {device.serial}
                </span>
              </span>
              {device.hardwareModel ? (
                <span>{device.hardwareModel}</span>
              ) : null}
            </p>
            {isAdmin ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-fit"
                onClick={() => setManageOpen(true)}
                aria-haspopup="dialog"
              >
                <Settings2 />
                Manage device
              </Button>
            ) : null}
          </div>

          <DeviceStatusReadout
            state={state}
            lastSeen={lastSeen}
            firmwareVersion={device.firmwareVersion}
            now={now}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
        <SpecPanel icon={Link2} title="Assignment">
          <SpecRow label="Pond">
            {device.pond ? (
              <Link
                to={`/ponds/${device.pond.id}`}
                className="text-board-fg underline decoration-board-border-strong underline-offset-2 hover:decoration-board-fg"
              >
                {device.pond.name}
              </Link>
            ) : (
              <span className="text-board-muted">Unassigned</span>
            )}
          </SpecRow>
          <SpecRow label="Assigned since">
            {device.assignedAt ? (
              <span className="font-heading tabular-nums">
                {formatDateTime(Date.parse(device.assignedAt))}
              </span>
            ) : (
              <span className="text-board-muted">—</span>
            )}
          </SpecRow>
        </SpecPanel>

        <SpecPanel icon={online ? Wifi : WifiOff} title="Connection">
          <SpecRow label="Status">
            <span className={cn(!online && "text-board-stale")}>
              {STATE_LABELS[state]}
            </span>
          </SpecRow>
          <SpecRow label="Last seen">
            {lastSeen ? (
              <span className="font-heading tabular-nums">
                {formatDateTime(lastSeen)}
                <span className="text-board-muted">
                  {" "}
                  · {formatRelative(lastSeen, now)}
                </span>
              </span>
            ) : (
              <span className="text-board-muted">Never</span>
            )}
          </SpecRow>
          {/* The SSID is the last network the unit reported, so once it is offline the value is history. */}
          <SpecRow
            label={online || !device.wifiSsid ? "WiFi" : "Last known WiFi"}
          >
            {device.wifiSsid ? (
              <span className={cn(!online && "text-board-stale")}>
                {device.wifiSsid}
              </span>
            ) : (
              <span className="text-board-muted">Not reported yet</span>
            )}
          </SpecRow>
        </SpecPanel>

        <SpecPanel icon={Cpu} title="Hardware">
          <SpecRow label="Serial">
            <span className="font-heading">{device.serial}</span>
          </SpecRow>
          <SpecRow label="Model">
            {device.hardwareModel ?? (
              <span className="text-board-muted">Not recorded</span>
            )}
          </SpecRow>
          <SpecRow label="Firmware">
            {device.firmwareVersion ? (
              <span className="font-heading">{device.firmwareVersion}</span>
            ) : (
              <span className="text-board-muted">Not reported yet</span>
            )}
          </SpecRow>
        </SpecPanel>

        <SpecPanel icon={ShieldCheck} title="Registration">
          <SpecRow label="Registered">
            <span className="font-heading tabular-nums">
              {formatDateTime(Date.parse(device.createdAt))}
            </span>
          </SpecRow>
          {/* Only the version is shown: the secret itself is displayed once, when an admin registers or
              rotates it, and is never stored where this page could read it back. */}
          <SpecRow label="Device key version">
            <span className="font-heading tabular-nums">
              v{device.secretVersion}
            </span>
          </SpecRow>
          <SpecRow label="Last updated">
            <span className="font-heading tabular-nums">
              {formatDateTime(Date.parse(device.updatedAt))}
            </span>
          </SpecRow>
        </SpecPanel>
      </div>

      {isAdmin ? (
        <ManageDeviceDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          device={device}
        />
      ) : null}
    </div>
  )
}

// Online reads as nominal, anything else as stale: a unit that isn't reporting is a data-integrity fact,
// not a graded alarm (the Stale-Is-Not-a-Severity Rule), and a disabled one is silent on purpose.
function DeviceStatusReadout({
  state,
  lastSeen,
  firmwareVersion,
  now,
}: {
  state: DeviceState
  lastSeen: number | null
  firmwareVersion: string | null
  now: number
}) {
  const styles = STATUS_STYLES[state === "ONLINE" ? "nominal" : "stale"]
  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={[
        `Device status: ${STATE_LABELS[state]}`,
        lastSeen ? `last seen ${formatRelative(lastSeen, now)}` : null,
        firmwareVersion ? `firmware ${firmwareVersion}` : null,
      ]
        .filter(Boolean)
        .join(", ")}
      className={cn(
        "board-groove flex shrink-0 flex-col gap-2 rounded-xl border px-4 py-3 transition-colors duration-500 lg:min-w-60",
        styles.tile
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5",
          state === "ONLINE" ? "text-board-fg" : styles.label
        )}
      >
        <span
          className={cn("size-2.5 shrink-0 rounded-full", styles.led)}
          aria-hidden="true"
        />
        <span className="font-sans text-sm font-semibold tracking-[0.08em] uppercase">
          {STATE_LABELS[state]}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 pl-5 font-sans text-xs text-board-muted">
        <span>
          {lastSeen
            ? `last seen ${formatRelative(lastSeen, now)}`
            : "No report received yet"}
        </span>
        {firmwareVersion ? (
          <span className="font-heading">Firmware {firmwareVersion}</span>
        ) : null}
      </div>
    </div>
  )
}

function SpecPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    // An open spec sheet, not a card: the heading and the grooved rows (one cut per row, the
    // Groove-Per-Row Rule) carry the structure, so four sections don't turn into four boxed tiles
    // competing with the status readout — the one plate on this page.
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 font-sans text-xs font-medium tracking-[0.08em] text-board-muted uppercase">
        <Icon className="size-3.5" aria-hidden="true" />
        {title}
      </h2>
      <dl className="board-groove-rows flex flex-col">{children}</dl>
    </section>
  )
}

function SpecRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[9rem_1fr] items-baseline gap-4 py-2.5">
      <dt className="font-sans text-xs text-board-muted">{label}</dt>
      <dd className="min-w-0 font-sans text-sm break-words text-board-fg">
        {children}
      </dd>
    </div>
  )
}
