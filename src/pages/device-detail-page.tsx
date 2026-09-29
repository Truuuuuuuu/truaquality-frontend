import * as React from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  CheckCircle2,
  Cpu,
  Download,
  HeartPulse,
  History,
  Link2,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Wifi,
  WifiOff,
  Wrench,
} from "lucide-react"
import { Link, useParams } from "react-router"
import { cn } from "cn"
import { BoardEmptyState } from "@/components/board-empty-state"
import { DeviceUnitView } from "@/components/devices/device-unit-view"
import { ManageDeviceDialog } from "@/components/devices/manage-device-dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useDeviceDiagnostics, useDevices } from "@/hooks/use-ponds"
import { useNow } from "@/hooks/use-now"
import type {
  Device,
  DeviceDiagnostics,
  DeviceEvent,
  DeviceEventKind,
  DeviceHealth,
} from "@/lib/api"
import {
  completeness,
  eventDescription,
  formatBytes,
  formatDuration,
  healthFlags,
  resetReasonLabel,
  restartedAt,
  sensorDisplay,
  sensorHealth,
  signalQuality,
  type DeviceState,
  type EventDescription,
} from "@/lib/device-health"
import { formatClock, formatDate, formatRelative } from "@/lib/format-time"
import { isDeviceOnline } from "@/lib/pond-status"
import { STALE_AFTER_MS } from "@/lib/parameters"
import { STATUS_STYLES } from "@/lib/status-styles"

// A unit is exactly one of these, in the same order the Devices page decides it: disabled beats
// reachability, because a disabled unit's silence is a decision rather than a fault.
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
  const diagnostics = useDeviceDiagnostics(deviceId)
  const now = useNow()
  const [manageOpen, setManageOpen] = React.useState(false)
  const [selectedSensor, setSelectedSensor] = React.useState<string | null>(
    null
  )

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

      {diagnostics.error ? (
        <BoardEmptyState icon={AlertTriangle} tone="error">
          {`Couldn't load diagnostics: ${diagnostics.error.message}`}
        </BoardEmptyState>
      ) : diagnostics.data ? (
        <DiagnosticsSections
          device={device}
          state={state}
          diagnostics={diagnostics.data}
          selected={selectedSensor}
          onSelect={setSelectedSensor}
          now={now}
        />
      ) : (
        <p className="font-sans text-sm text-board-muted">
          Loading diagnostics…
        </p>
      )}

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

function SectionHeading({
  id,
  icon: Icon,
  children,
}: {
  id?: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <h2
      id={id}
      className="flex items-center gap-2 font-sans text-xs font-medium tracking-[0.08em] text-board-muted uppercase"
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </h2>
  )
}

// What the unit says about itself and its probes. Every value is either reported by the unit or derived by
// the server; the plain-language meaning comes from lib/device-health.ts, so this component only lays it out.
function DiagnosticsSections({
  device,
  state,
  diagnostics,
  selected,
  onSelect,
  now,
}: {
  device: Device
  state: DeviceState
  diagnostics: DeviceDiagnostics
  selected: string | null
  onSelect: (parameter: string | null) => void
  now: number
}) {
  const rowButtons = React.useRef(new Map<string, HTMLButtonElement>())
  const sensors = diagnostics.sensors.map((sensor) => ({
    sensor,
    display: sensorDisplay(sensor.parameter),
    health: sensorHealth({ sensor, deviceState: state, now }),
  }))

  // A click on a probe in the model moves keyboard focus to its row, so the list — the accessible
  // equivalent of the model — is where the user lands.
  function selectFromModel(parameter: string) {
    onSelect(parameter)
    rowButtons.current.get(parameter)?.focus()
  }

  return (
    <>
      <section
        aria-labelledby="unit-view-heading"
        className="flex flex-col gap-3"
      >
        <SectionHeading id="unit-view-heading" icon={Box}>
          Unit view
        </SectionHeading>
        <div className="grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-[3fr_2fr]">
          <DeviceUnitView
            deviceState={state}
            probes={sensors.map(({ sensor, display, health }) => ({
              parameter: sensor.parameter,
              label: display.label,
              stateLabel: health.label,
              tone: health.tone,
            }))}
            selected={selected}
            onSelect={selectFromModel}
          />
          <div className="flex flex-col gap-2">
            <h3 className="font-sans text-sm font-semibold text-board-fg">
              Sensors
            </h3>
            {sensors.length === 0 ? (
              <p className="font-sans text-sm text-board-muted">
                This unit hasn't reported any sensors yet.
              </p>
            ) : (
              <ul className="board-groove-rows flex flex-col">
                {sensors.map(({ sensor, display, health }) => {
                  const Icon = display.icon
                  const isSelected = selected === sensor.parameter
                  const fraction = completeness(
                    sensor.readings24h,
                    device.createdAt,
                    now
                  )
                  const percent =
                    fraction === null ? null : Math.round(fraction * 100)
                  return (
                    <li
                      key={sensor.parameter}
                      className={cn(
                        "flex flex-col gap-1.5 px-2 py-3 transition-colors",
                        isSelected && "bg-board-panel-raised/40"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                        <button
                          type="button"
                          ref={(node) => {
                            if (node)
                              rowButtons.current.set(sensor.parameter, node)
                            else rowButtons.current.delete(sensor.parameter)
                          }}
                          aria-pressed={isSelected}
                          onClick={() =>
                            onSelect(isSelected ? null : sensor.parameter)
                          }
                          className="inline-flex items-center gap-2 rounded-sm font-sans text-sm font-medium text-board-fg hover:underline hover:decoration-board-border-strong hover:underline-offset-2"
                        >
                          <Icon className="size-4 shrink-0 text-board-muted" />
                          {display.label}
                        </button>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 font-sans text-xs",
                            health.tone === "ok"
                              ? "text-board-fg"
                              : STATUS_STYLES[health.status].label
                          )}
                        >
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              STATUS_STYLES[health.status].led
                            )}
                            aria-hidden="true"
                          />
                          {health.label}
                          {health.inferred ? (
                            <span className="text-board-muted">
                              (estimated — older firmware)
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <p className="pl-6 font-sans text-xs text-board-muted">
                        {sensor.lastValue !== null &&
                        sensor.lastReadingAt !== null ? (
                          <>
                            <span className="font-heading text-sm text-board-fg tabular-nums">
                              {sensor.lastValue.toFixed(display.precision)}
                              {display.unit ? ` ${display.unit}` : ""}
                            </span>{" "}
                            ·{" "}
                            {formatRelative(
                              Date.parse(sensor.lastReadingAt),
                              now
                            )}
                          </>
                        ) : (
                          "No reading yet"
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-6 font-sans text-xs text-board-muted">
                        {percent === null ? (
                          <span>Not enough history</span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <span
                              role="meter"
                              aria-valuenow={percent}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${display.label} readings received in the last 24 hours`}
                              className="h-1.5 w-20 overflow-hidden rounded-full bg-board-panel-raised"
                            >
                              <span
                                className={cn(
                                  "block h-full rounded-full",
                                  percent >= 90
                                    ? "bg-board-accent"
                                    : "bg-board-warn"
                                )}
                                style={{ width: `${percent}%` }}
                              />
                            </span>
                            <span className="tabular-nums">
                              {percent}% of expected (24 h)
                            </span>
                          </span>
                        )}
                        <span>
                          Longest gap{" "}
                          <span className="font-heading text-board-fg tabular-nums">
                            {formatDuration(sensor.longestGapMin24h * 60)}
                          </span>
                        </span>
                      </div>
                      {health.action ? (
                        <p
                          className={cn(
                            "flex items-start gap-1.5 pl-6 font-sans text-xs",
                            health.tone === "fault"
                              ? "text-board-critical"
                              : "text-board-muted"
                          )}
                        >
                          <Wrench
                            className="mt-0.5 size-3 shrink-0"
                            aria-hidden="true"
                          />
                          {health.action}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
        <HealthPanel
          health={diagnostics.health}
          uptime24h={diagnostics.uptime24h}
          events={diagnostics.events}
          now={now}
        />
        <EventLog events={diagnostics.events} now={now} />
      </div>
    </>
  )
}

const NOT_REPORTED = "Not reported — needs firmware 0.6.0 or newer"

function HealthPanel({
  health,
  uptime24h,
  events,
  now,
}: {
  health: DeviceHealth
  uptime24h: number | null
  events: DeviceEvent[]
  now: number
}) {
  const reported = health.diagnosticsAt !== null
  const signal = signalQuality(health.rssi)
  const restart = restartedAt(health)
  const diagnosticsAt = health.diagnosticsAt
    ? Date.parse(health.diagnosticsAt)
    : null
  const flags = healthFlags({ health, events, now })
  const missing = <span className="text-board-muted">{NOT_REPORTED}</span>

  return (
    <SpecPanel icon={HeartPulse} title="Health">
      <SpecRow label="Signal">
        {reported && health.rssi !== null && signal ? (
          <span>
            <span className="font-heading tabular-nums">{health.rssi} dBm</span>
            {" · "}
            <span
              className={cn(signal.tone === "warning" && "text-board-warn")}
            >
              {signal.label}
            </span>
          </span>
        ) : (
          missing
        )}
      </SpecRow>
      <SpecRow label="Uptime">
        {reported && health.uptimeS !== null ? (
          <span className="font-heading tabular-nums">
            {formatDuration(health.uptimeS)}
          </span>
        ) : (
          missing
        )}
      </SpecRow>
      <SpecRow label="Last restart">
        {reported && restart !== null ? (
          <span>
            <span className="font-heading tabular-nums">
              {formatDateTime(restart)}
            </span>
            {" · "}
            {resetReasonLabel(health.resetReason)}
          </span>
        ) : (
          missing
        )}
      </SpecRow>
      <SpecRow label="Free memory">
        {reported && health.freeHeap !== null ? (
          <span className="font-heading tabular-nums">
            {formatBytes(health.freeHeap)}
          </span>
        ) : (
          missing
        )}
      </SpecRow>
      <SpecRow label="Queued uploads">
        {reported && health.queuedSamples !== null ? (
          <span>
            <span className="font-heading tabular-nums">
              {health.queuedSamples}
            </span>{" "}
            readings waiting
          </span>
        ) : (
          missing
        )}
      </SpecRow>
      {/* Worked out by the server from its own online/offline record, so it doesn't need new firmware. */}
      <SpecRow label="24 h availability">
        {uptime24h !== null ? (
          <span>
            <span className="font-heading tabular-nums">
              {uptime24h.toFixed(1)}%
            </span>
            <span className="text-board-muted">
              {" "}
              of the last 24 hours online
            </span>
          </span>
        ) : (
          <span className="text-board-muted">Not enough history</span>
        )}
      </SpecRow>
      <SpecRow label="Diagnostics as of">
        {diagnosticsAt !== null ? (
          <span
            className={cn(
              "font-heading tabular-nums",
              now - diagnosticsAt > STALE_AFTER_MS && "text-board-stale"
            )}
          >
            {formatDateTime(diagnosticsAt)}
            <span className="text-board-muted">
              {" "}
              · {formatRelative(diagnosticsAt, now)}
            </span>
          </span>
        ) : (
          missing
        )}
      </SpecRow>
      {flags.map((flag) => (
        <div
          key={flag.id}
          className="grid grid-cols-[9rem_1fr] items-baseline gap-4 py-2.5 text-board-warn"
        >
          <dt className="inline-flex items-center gap-1.5 font-sans text-xs font-medium">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
            {flag.label}
          </dt>
          <dd className="font-sans text-sm">{flag.detail}</dd>
        </div>
      ))}
    </SpecPanel>
  )
}

const EVENT_ICONS: Record<
  DeviceEventKind,
  React.ComponentType<{ className?: string }>
> = {
  OFFLINE: WifiOff,
  ONLINE: Wifi,
  REBOOT: RotateCcw,
  SENSOR_FAULT: AlertTriangle,
  SENSOR_RECOVERED: CheckCircle2,
  FIRMWARE_CHANGED: Download,
}

const EVENT_TONE_CLASS: Record<EventDescription["tone"], string> = {
  fault: "text-board-critical",
  ok: "text-board-accent",
  stale: "text-board-stale",
  neutral: "text-board-muted",
}

function EventLog({ events, now }: { events: DeviceEvent[]; now: number }) {
  return (
    <section
      aria-labelledby="event-log-heading"
      className="flex flex-col gap-2"
    >
      <SectionHeading id="event-log-heading" icon={History}>
        Event log
      </SectionHeading>
      {events.length === 0 ? (
        <p className="py-2.5 font-sans text-sm text-board-muted">
          No events recorded yet. Restarts, disconnections and sensor faults
          will appear here.
        </p>
      ) : (
        <ol className="board-groove-rows flex flex-col">
          {events.map((event) => {
            const description = eventDescription(event)
            const Icon = EVENT_ICONS[event.kind] ?? AlertTriangle
            const at = Date.parse(event.createdAt)
            return (
              <li
                key={event.id}
                className="grid grid-cols-[1rem_1fr] gap-x-3 gap-y-0.5 py-2.5"
              >
                <Icon
                  className={cn(
                    "mt-0.5 size-4",
                    EVENT_TONE_CLASS[description.tone]
                  )}
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-sans text-sm text-board-fg">
                    {description.title}
                    {description.detail ? (
                      <span className="text-board-muted">
                        {" · "}
                        {description.detail}
                      </span>
                    ) : null}
                  </span>
                  <time
                    dateTime={event.createdAt}
                    className="font-sans text-xs text-board-muted"
                  >
                    {formatRelative(at, now)} ·{" "}
                    <span className="font-heading tabular-nums">
                      {formatDateTime(at)}
                    </span>
                  </time>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
